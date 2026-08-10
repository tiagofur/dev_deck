import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── In-memory SQL store ─────────────────────────────────────────────
interface Table {
    rows: Map<string, Record<string, unknown>>
    /** composite key: columns joined by '||' */
    compositeKeys?: string[]
}

const tables: Record<string, Table> = {}

function createTable(name: string, compositeKeys?: string[]) {
    tables[name] = { rows: new Map(), compositeKeys }
}

function rowKey(row: Record<string, unknown>, compositeKeys?: string[]): string {
    if (compositeKeys && compositeKeys.length > 0) {
        return compositeKeys.map(c => String(row[c] ?? '')).join('||')
    }
    return String(row.id ?? '')
}

/** Parse a simple SQL INSERT … VALUES (?,?) and upsert into the in-memory table */
function handleExec(sql: string, params: unknown[]) {
    const trimmed = sql.trim().replace(/\s+/g, ' ')

    // ── DELETE statements ──
    const delMatch = trimmed.match(
        /^DELETE FROM (\w+)\s+WHERE\s+(.+)$/i
    )
    if (delMatch) {
        const tableName = delMatch[1]
        const table = tables[tableName]
        if (!table) return
        const whereClause = delMatch[2]
        // Simple column = ? matching
        const colParts = whereClause.split(' AND ').map(p => p.trim().split('=')[0].trim())
        let idx = 0
        table.rows.forEach((row, key) => {
            let match = true
            for (const col of colParts) {
                const expected = params[idx]
                if (String(row[col] ?? '') !== String(expected ?? '')) {
                    match = false
                    break
                }
                idx++
            }
            if (match) table.rows.delete(key)
            idx = 0
        })
        return
    }

    // ── UPDATE statements ──
    const updMatch = trimmed.match(
        /^UPDATE (\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i
    )
    if (updMatch) {
        const tableName = updMatch[1]
        const table = tables[tableName]
        if (!table) return
        const setParts = updMatch[2].split(',').map(p => p.trim().split('=')[0].trim())
        const whereParts = updMatch[3].split(' AND ').map(p => p.trim().split('=')[0].trim())
        const setCount = setParts.length

        // Params: set values first, then where values
        const setValues = params.slice(0, setCount)
        const whereValues = params.slice(setCount)

        table.rows.forEach((row, key) => {
            let match = true
            for (let i = 0; i < whereParts.length; i++) {
                if (String(row[whereParts[i]] ?? '') !== String(whereValues[i] ?? '')) {
                    match = false
                    break
                }
            }
            if (match) {
                for (let i = 0; i < setCount; i++) {
                    row[setParts[i]] = setValues[i]
                }
            }
        })
        return
    }

    // ── INSERT OR IGNORE (no ON CONFLICT) ──
    const insertIgnoreMatch = trimmed.match(
        /^INSERT OR IGNORE INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i
    )
    if (insertIgnoreMatch) {
        const tableName = insertIgnoreMatch[1]
        const table = tables[tableName]
        if (!table) return
        const cols = insertIgnoreMatch[2].split(',').map(c => c.trim())
        const row: Record<string, unknown> = {}
        cols.forEach((col, i) => { row[col] = params[i] })
        const key = rowKey(row, table.compositeKeys)
        if (!table.rows.has(key)) {
            table.rows.set(key, row)
        }
        return
    }

    // ── INSERT … ON CONFLICT DO UPDATE (UPSERT) ──
    const upsertMatch = trimmed.match(
        /^INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*ON CONFLICT\s*\(([^)]+)\)\s*DO UPDATE SET\s+(.+)$/i
    )
    if (upsertMatch) {
        const tableName = upsertMatch[1]
        const table = tables[tableName]
        if (!table) return
        const cols = upsertMatch[2].split(',').map(c => c.trim())
        const setClause = upsertMatch[5]
        // Parse SET assignments: col=excluded.col, …
        const setAssignments = setClause.split(',').map(p => p.trim().split('=')[0].trim())

        const row: Record<string, unknown> = {}
        cols.forEach((col, i) => { row[col] = params[i] })
        const key = rowKey(row, table.compositeKeys)
        const existing = table.rows.get(key)

        if (existing) {
            // Apply updates from ON CONFLICT SET
            const setValues = params.slice(cols.length, cols.length + setAssignments.length)
            setAssignments.forEach((col, i) => {
                // Map excluded.col back to the column value in the INSERT
                const excludedCol = upsertMatch[5].split(',')[i].trim().split('=')[1]?.trim().replace('excluded.', '')
                if (excludedCol) {
                    const idx = cols.indexOf(excludedCol)
                    if (idx >= 0) existing[col] = params[idx]
                }
            })
            table.rows.set(key, existing)
        } else {
            table.rows.set(key, row)
        }
        return
    }

    // ── Simple INSERT ──
    const insertMatch = trimmed.match(
        /^INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i
    )
    if (insertMatch) {
        const tableName = insertMatch[1]
        const table = tables[tableName]
        if (!table) return
        const cols = insertMatch[2].split(',').map(c => c.trim())
        const row: Record<string, unknown> = {}
        cols.forEach((col, i) => { row[col] = params[i] })
        const key = rowKey(row, table.compositeKeys)
        table.rows.set(key, row)
        return
    }
}

function handleQuery<T extends Record<string, unknown>>(sql: string, params: unknown[]): T[] {
    const trimmed = sql.trim().replace(/\s+/g, ' ')
    const selectMatch = trimmed.match(
        /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+.+)?(?:\s+LIMIT\s+\d+(?:\s+OFFSET\s+\d+)?)?$/i
    )
    if (!selectMatch) return []

    const tableName = selectMatch[2]
    const table = tables[tableName]
    if (!table) return []

    const results: T[] = []
    table.rows.forEach(row => {
        // Simple WHERE match
        if (selectMatch[3]) {
            const whereParts = selectMatch[3].split(' AND ').map(p => p.trim())
            let match = true
            let paramIdx = 0
            for (const part of whereParts) {
                const [col] = part.split('=').map(s => s.trim())
                if (String(row[col] ?? '') !== String(params[paramIdx] ?? '')) {
                    match = false
                    break
                }
                paramIdx++
            }
            if (!match) return
        }
        results.push(row as T)
    })
    return results
}

// ── Setup tables before each test ───────────────────────────────────
function setupTables() {
    Object.keys(tables).forEach(k => delete tables[k])
    createTable('cheatsheets')
    createTable('cheatsheet_entries')
}

// ── Mock dependencies ───────────────────────────────────────────────
let capturedExecCalls: { sql: string; params: unknown[] }[] = []

vi.mock('../local-db/client', () => ({
    execLocal: vi.fn(async (sql: string, params: unknown[] = []) => {
        capturedExecCalls.push({ sql, params })
        handleExec(sql, params)
    }),
    queryLocal: vi.fn(async (sql: string, params: unknown[] = []) => {
        return handleQuery(sql, params)
    }),
}))

vi.mock('../auth/auth', () => ({
    isLoggedIn: vi.fn(() => true),
}))

vi.mock('../preferences', () => ({
    getPreferences: vi.fn(() => ({ clientId: 'test-client', lastSyncAt: null })),
    setPreferences: vi.fn(),
}))

vi.mock('../api-client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    },
}))

vi.mock('./queue', () => ({
    getPendingOps: vi.fn(async () => []),
    markSynced: vi.fn(),
}))

// ── Import after mocks ─────────────────────────────────────────────
import { api } from '../api-client'
import { syncNow } from './engine'

describe('cheatsheets delta sync', () => {
    beforeEach(() => {
        setupTables()
        capturedExecCalls = []
        vi.useFakeTimers({ shouldAdvanceTime: true })
        // Advance timers to let syncNow complete
        vi.advanceTimersByTime(0)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    // Helper to run a full sync cycle with given deltas
    async function runSyncWithDeltas(deltas: unknown[]) {
        vi.mocked(api.get).mockResolvedValue({
            operations: deltas,
            now: new Date().toISOString(),
        })
        vi.mocked(api.post).mockResolvedValue({ operations: [] })

        await syncNow()
    }

    // Helper to insert a cheatsheet directly into the mock store
    function insertCheatsheet(id: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            id,
            user_id: 'user-1',
            slug: `cs-${id}`,
            title: `Cheatsheet ${id}`,
            category: 'general',
            icon: null,
            color: null,
            description: '',
            visibility: 'private',
            parent_id: null,
            is_official: 0,
            fork_count: 0,
            stars_count: 0,
            is_seed: 0,
            created_at: now,
            updated_at: now,
            local_updated_at: now,
            ...overrides,
        }
        tables.cheatsheets.rows.set(id, row)
        return row
    }

    // Helper to insert a cheatsheet entry directly into the mock store
    function insertEntry(id: string, cheatsheetId: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            id,
            cheatsheet_id: cheatsheetId,
            label: `Entry ${id}`,
            command: `echo ${id}`,
            description: '',
            tags: '[]',
            position: 0,
            local_updated_at: now,
            ...overrides,
        }
        tables.cheatsheet_entries.rows.set(id, row)
        return row
    }

    // ── UPSERT tests ───────────────────────────────────────────────
    describe('cheatsheet UPSERT', () => {
        it('stores a new cheatsheet with all fields', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: {
                        id: 'cs-1',
                        user_id: 'user-1',
                        slug: 'docker-commands',
                        title: 'Docker Commands',
                        category: 'devops',
                        icon: '🐳',
                        color: '#2496ED',
                        description: 'Common Docker commands',
                        visibility: 'public',
                        parent_id: null,
                        is_official: true,
                        fork_count: 5,
                        stars_count: 42,
                        is_seed: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.cheatsheets.rows.size).toBe(1)
            const cs = tables.cheatsheets.rows.get('cs-1')!
            expect(cs.slug).toBe('docker-commands')
            expect(cs.title).toBe('Docker Commands')
            expect(cs.category).toBe('devops')
            expect(cs.icon).toBe('🐳')
            expect(cs.color).toBe('#2496ED')
            expect(cs.description).toBe('Common Docker commands')
            expect(cs.visibility).toBe('public')
            expect(cs.is_official).toBe(1)
            expect(cs.fork_count).toBe(5)
            expect(cs.stars_count).toBe(42)
            expect(cs.is_seed).toBe(0)
        })

        it('upserts an existing cheatsheet (ON CONFLICT)', async () => {
            const now = new Date().toISOString()
            insertCheatsheet('cs-1', { title: 'Old Title', stars_count: 10 })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: {
                        id: 'cs-1',
                        user_id: 'user-1',
                        slug: 'docker-commands',
                        title: 'Updated Title',
                        category: 'devops',
                        description: '',
                        visibility: 'private',
                        is_official: false,
                        fork_count: 0,
                        stars_count: 99,
                        is_seed: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.cheatsheets.rows.size).toBe(1)
            const cs = tables.cheatsheets.rows.get('cs-1')!
            expect(cs.title).toBe('Updated Title')
            expect(cs.stars_count).toBe(99)
        })

        it('defaults visibility to "private" when omitted', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: {
                        id: 'cs-1',
                        user_id: 'user-1',
                        slug: 'test',
                        title: 'Test',
                        category: 'general',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            const cs = tables.cheatsheets.rows.get('cs-1')!
            expect(cs.visibility).toBe('private')
        })

        it('sets parent_id when forking', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-2',
                    payload: {
                        id: 'cs-2',
                        user_id: 'user-2',
                        slug: 'docker-fork',
                        title: 'My Docker Fork',
                        category: 'devops',
                        parent_id: 'cs-1',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            const cs = tables.cheatsheets.rows.get('cs-2')!
            expect(cs.parent_id).toBe('cs-1')
        })
    })

    // ── Entry UPSERT tests ────────────────────────────────────────
    describe('cheatsheet_entry UPSERT', () => {
        it('stores a new entry with array tags', async () => {
            insertCheatsheet('cs-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'List containers',
                        command: 'docker ps',
                        description: 'List running containers',
                        tags: ['docker', 'containers'],
                        position: 0,
                    },
                },
            ])

            expect(tables.cheatsheet_entries.rows.size).toBe(1)
            const entry = tables.cheatsheet_entries.rows.get('entry-1')!
            expect(entry.label).toBe('List containers')
            expect(entry.command).toBe('docker ps')
            expect(entry.description).toBe('List running containers')
            expect(entry.tags).toBe('["docker","containers"]')
            expect(entry.position).toBe(0)
        })

        it('normalizes tags from JSON string (pre-serialized)', async () => {
            insertCheatsheet('cs-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'Build image',
                        command: 'docker build .',
                        tags: '["docker","build"]', // JSON string, not array
                        position: 1,
                    },
                },
            ])

            const entry = tables.cheatsheet_entries.rows.get('entry-1')!
            // Should be normalized to a JSON array string, not double-serialized
            expect(entry.tags).toBe('["docker","build"]')
        })

        it('defaults tags to empty array when null', async () => {
            insertCheatsheet('cs-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'Plain command',
                        command: 'ls -la',
                        tags: null,
                        position: 2,
                    },
                },
            ])

            const entry = tables.cheatsheet_entries.rows.get('entry-1')!
            expect(entry.tags).toBe('[]')
        })

        it('defaults tags to empty array when undefined', async () => {
            insertCheatsheet('cs-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'No tags',
                        command: 'pwd',
                        position: 3,
                    },
                },
            ])

            const entry = tables.cheatsheet_entries.rows.get('entry-1')!
            expect(entry.tags).toBe('[]')
        })

        it('handles invalid JSON string tags gracefully', async () => {
            insertCheatsheet('cs-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'Bad tags',
                        command: 'echo hi',
                        tags: 'not-valid-json{',
                        position: 0,
                    },
                },
            ])

            const entry = tables.cheatsheet_entries.rows.get('entry-1')!
            expect(entry.tags).toBe('[]')
        })

        it('upserts an existing entry (ON CONFLICT)', async () => {
            insertCheatsheet('cs-1')
            insertEntry('entry-1', 'cs-1', { label: 'Old Label', command: 'old cmd' })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'Updated Label',
                        command: 'new cmd',
                        tags: ['updated'],
                        position: 5,
                    },
                },
            ])

            expect(tables.cheatsheet_entries.rows.size).toBe(1)
            const entry = tables.cheatsheet_entries.rows.get('entry-1')!
            expect(entry.label).toBe('Updated Label')
            expect(entry.command).toBe('new cmd')
            expect(entry.tags).toBe('["updated"]')
            expect(entry.position).toBe(5)
        })

        it('defaults description to empty string when omitted', async () => {
            insertCheatsheet('cs-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'No desc',
                        command: 'echo',
                    },
                },
            ])

            const entry = tables.cheatsheet_entries.rows.get('entry-1')!
            expect(entry.description).toBe('')
            expect(entry.position).toBe(0)
        })
    })

    // ── DELETE tests ──────────────────────────────────────────────
    describe('cheatsheet DELETE (cascade)', () => {
        it('deletes a cheatsheet and cascades to its entries', async () => {
            insertCheatsheet('cs-1')
            insertEntry('entry-1', 'cs-1')
            insertEntry('entry-2', 'cs-1')
            insertEntry('entry-3', 'cs-1')

            // Also insert an entry for a different cheatsheet to ensure it's not affected
            insertCheatsheet('cs-2')
            insertEntry('entry-4', 'cs-2')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: null,
                },
            ])

            // cs-1 entries should be deleted
            expect(tables.cheatsheet_entries.rows.has('entry-1')).toBe(false)
            expect(tables.cheatsheet_entries.rows.has('entry-2')).toBe(false)
            expect(tables.cheatsheet_entries.rows.has('entry-3')).toBe(false)
            // cs-1 itself should be deleted
            expect(tables.cheatsheets.rows.has('cs-1')).toBe(false)
            // cs-2 and its entry should remain
            expect(tables.cheatsheets.rows.has('cs-2')).toBe(true)
            expect(tables.cheatsheet_entries.rows.has('entry-4')).toBe(true)
        })

        it('deletes a cheatsheet with no entries gracefully', async () => {
            insertCheatsheet('cs-empty')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-empty',
                    payload: null,
                },
            ])

            expect(tables.cheatsheets.rows.has('cs-empty')).toBe(false)
            expect(tables.cheatsheet_entries.rows.size).toBe(0)
        })
    })

    describe('cheatsheet_entry DELETE', () => {
        it('deletes a single entry without affecting others', async () => {
            insertCheatsheet('cs-1')
            insertEntry('entry-1', 'cs-1')
            insertEntry('entry-2', 'cs-1')
            insertEntry('entry-3', 'cs-1')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-2',
                    payload: null,
                },
            ])

            expect(tables.cheatsheet_entries.rows.has('entry-1')).toBe(true)
            expect(tables.cheatsheet_entries.rows.has('entry-2')).toBe(false)
            expect(tables.cheatsheet_entries.rows.has('entry-3')).toBe(true)
            // The cheatsheet itself should remain
            expect(tables.cheatsheets.rows.has('cs-1')).toBe(true)
        })
    })

    // ── Edge cases ────────────────────────────────────────────────
    describe('edge cases', () => {
        it('skips upsert when payload is null', async () => {
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: null,
                },
            ])

            expect(tables.cheatsheets.rows.size).toBe(0)
        })

        it('skips upsert when payload is undefined', async () => {
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    // payload omitted
                },
            ])

            expect(tables.cheatsheet_entries.rows.size).toBe(0)
        })

        it('ignores unknown entity_types without error', async () => {
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'unknown_entity',
                    entity_id: 'x-1',
                    payload: { id: 'x-1' },
                },
            ])

            // No error thrown, no data stored
            expect(tables.cheatsheets.rows.size).toBe(0)
        })

        it('handles multiple operations in a single batch', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: {
                        id: 'cs-1',
                        user_id: 'user-1',
                        slug: 'cs-1',
                        title: 'CS 1',
                        category: 'a',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-2',
                    payload: {
                        id: 'cs-2',
                        user_id: 'user-1',
                        slug: 'cs-2',
                        title: 'CS 2',
                        category: 'b',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'E1',
                        command: 'cmd1',
                        tags: ['a'],
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-2',
                    payload: {
                        id: 'entry-2',
                        cheatsheet_id: 'cs-2',
                        label: 'E2',
                        command: 'cmd2',
                        tags: ['b', 'c'],
                    },
                },
            ])

            expect(tables.cheatsheets.rows.size).toBe(2)
            expect(tables.cheatsheet_entries.rows.size).toBe(2)
            expect(tables.cheatsheet_entries.rows.get('entry-1')!.tags).toBe('["a"]')
            expect(tables.cheatsheet_entries.rows.get('entry-2')!.tags).toBe('["b","c"]')
        })

        it('handles mixed entity types in a batch', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: {
                        id: 'cs-1',
                        user_id: 'user-1',
                        slug: 'cs-1',
                        title: 'CS 1',
                        category: 'a',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet_entry',
                    entity_id: 'entry-1',
                    payload: {
                        id: 'entry-1',
                        cheatsheet_id: 'cs-1',
                        label: 'E1',
                        command: 'cmd1',
                    },
                },
                {
                    operation: 'delete',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: null,
                },
            ])

            // cs-1 should be deleted (cascade removes entry too)
            expect(tables.cheatsheets.rows.has('cs-1')).toBe(false)
            expect(tables.cheatsheet_entries.rows.has('entry-1')).toBe(false)
        })
    })
})
