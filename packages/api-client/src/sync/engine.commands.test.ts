import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── In-memory SQL store ─────────────────────────────────────────────
interface Table {
    rows: Map<string, Record<string, unknown>>
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
        const setAssignments = setClause.split(',').map(p => p.trim().split('=')[0].trim())

        const row: Record<string, unknown> = {}
        cols.forEach((col, i) => { row[col] = params[i] })
        const key = rowKey(row, table.compositeKeys)
        const existing = table.rows.get(key)

        if (existing) {
            setAssignments.forEach((col, i) => {
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
    createTable('item_commands')
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

describe('commands delta sync', () => {
    beforeEach(() => {
        setupTables()
        capturedExecCalls = []
        vi.useFakeTimers({ shouldAdvanceTime: true })
        vi.advanceTimersByTime(0)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    async function runSyncWithDeltas(deltas: unknown[]) {
        vi.mocked(api.get).mockResolvedValue({
            operations: deltas,
            now: new Date().toISOString(),
        })
        vi.mocked(api.post).mockResolvedValue({ operations: [] })

        await syncNow()
    }

    function insertCommand(id: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            id,
            item_id: 'item-1',
            label: `Cmd ${id}`,
            command: `echo ${id}`,
            description: '',
            category: null,
            position: 0,
            created_at: now,
            local_updated_at: now,
            ...overrides,
        }
        tables.item_commands.rows.set(id, row)
        return row
    }

    // ── UPSERT tests ───────────────────────────────────────────────
    describe('command UPSERT', () => {
        it('stores a new command with all fields', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: {
                        id: 'cmd-1',
                        repo_id: 'item-1',
                        label: 'Dev Server',
                        command: 'pnpm dev',
                        description: 'Start dev server',
                        category: 'development',
                        position: 0,
                        created_at: now,
                    },
                },
            ])

            expect(tables.item_commands.rows.size).toBe(1)
            const cmd = tables.item_commands.rows.get('cmd-1')!
            expect(cmd.item_id).toBe('item-1')
            expect(cmd.label).toBe('Dev Server')
            expect(cmd.command).toBe('pnpm dev')
            expect(cmd.description).toBe('Start dev server')
            expect(cmd.category).toBe('development')
            expect(cmd.position).toBe(0)
        })

        it('maps repo_id to item_id in local schema', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: {
                        id: 'cmd-1',
                        repo_id: 'repo-42',
                        label: 'Test',
                        command: 'go test ./...',
                        created_at: now,
                    },
                },
            ])

            const cmd = tables.item_commands.rows.get('cmd-1')!
            expect(cmd.item_id).toBe('repo-42')
        })

        it('upserts an existing command (ON CONFLICT)', async () => {
            const now = new Date().toISOString()
            insertCommand('cmd-1', { label: 'Old Label', command: 'old cmd' })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: {
                        id: 'cmd-1',
                        repo_id: 'item-1',
                        label: 'Updated Label',
                        command: 'new cmd',
                        description: 'Updated',
                        category: 'production',
                        position: 5,
                        created_at: now,
                    },
                },
            ])

            expect(tables.item_commands.rows.size).toBe(1)
            const cmd = tables.item_commands.rows.get('cmd-1')!
            expect(cmd.label).toBe('Updated Label')
            expect(cmd.command).toBe('new cmd')
            expect(cmd.description).toBe('Updated')
            expect(cmd.category).toBe('production')
            expect(cmd.position).toBe(5)
        })

        it('defaults position to 0 when omitted', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: {
                        id: 'cmd-1',
                        repo_id: 'item-1',
                        label: 'No position',
                        command: 'ls',
                        created_at: now,
                    },
                },
            ])

            const cmd = tables.item_commands.rows.get('cmd-1')!
            expect(cmd.position).toBe(0)
        })

        it('defaults description to empty string when omitted', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: {
                        id: 'cmd-1',
                        repo_id: 'item-1',
                        label: 'No desc',
                        command: 'pwd',
                        created_at: now,
                    },
                },
            ])

            const cmd = tables.item_commands.rows.get('cmd-1')!
            expect(cmd.description).toBe('')
        })

        it('defaults category to null when omitted', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: {
                        id: 'cmd-1',
                        repo_id: 'item-1',
                        label: 'No category',
                        command: 'whoami',
                        created_at: now,
                    },
                },
            ])

            const cmd = tables.item_commands.rows.get('cmd-1')!
            expect(cmd.category).toBeNull()
        })

        it('allows multiple commands for the same item', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: {
                        id: 'cmd-1',
                        repo_id: 'item-1',
                        label: 'Dev',
                        command: 'pnpm dev',
                        position: 0,
                        created_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-2',
                    payload: {
                        id: 'cmd-2',
                        repo_id: 'item-1',
                        label: 'Build',
                        command: 'pnpm build',
                        position: 1,
                        created_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-3',
                    payload: {
                        id: 'cmd-3',
                        repo_id: 'item-1',
                        label: 'Test',
                        command: 'pnpm test',
                        position: 2,
                        created_at: now,
                    },
                },
            ])

            expect(tables.item_commands.rows.size).toBe(3)
            expect(tables.item_commands.rows.get('cmd-1')!.position).toBe(0)
            expect(tables.item_commands.rows.get('cmd-2')!.position).toBe(1)
            expect(tables.item_commands.rows.get('cmd-3')!.position).toBe(2)
        })
    })

    // ── DELETE tests ──────────────────────────────────────────────
    describe('command DELETE', () => {
        it('deletes a single command', async () => {
            insertCommand('cmd-1')
            insertCommand('cmd-2')
            insertCommand('cmd-3')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'command',
                    entity_id: 'cmd-2',
                    payload: null,
                },
            ])

            expect(tables.item_commands.rows.has('cmd-1')).toBe(true)
            expect(tables.item_commands.rows.has('cmd-2')).toBe(false)
            expect(tables.item_commands.rows.has('cmd-3')).toBe(true)
        })

        it('deletes a command that does not exist (idempotent)', async () => {
            insertCommand('cmd-1')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'command',
                    entity_id: 'cmd-999',
                    payload: null,
                },
            ])

            expect(tables.item_commands.rows.has('cmd-1')).toBe(true)
        })

        it('deletes all commands for an item one by one', async () => {
            insertCommand('cmd-1')
            insertCommand('cmd-2')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: null,
                },
                {
                    operation: 'delete',
                    entity_type: 'command',
                    entity_id: 'cmd-2',
                    payload: null,
                },
            ])

            expect(tables.item_commands.rows.size).toBe(0)
        })
    })

    // ── Edge cases ────────────────────────────────────────────────
    describe('edge cases', () => {
        it('skips upsert when payload is null', async () => {
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: null,
                },
            ])

            expect(tables.item_commands.rows.size).toBe(0)
        })

        it('skips upsert when payload is undefined', async () => {
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    // payload omitted
                },
            ])

            expect(tables.item_commands.rows.size).toBe(0)
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

            expect(tables.item_commands.rows.size).toBe(0)
        })

        it('handles mixed commands and cheatsheets in a batch', async () => {
            const now = new Date().toISOString()
            createTable('cheatsheets')
            createTable('cheatsheet_entries')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: {
                        id: 'cmd-1',
                        repo_id: 'item-1',
                        label: 'Dev',
                        command: 'pnpm dev',
                        created_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'cheatsheet',
                    entity_id: 'cs-1',
                    payload: {
                        id: 'cs-1',
                        user_id: 'user-1',
                        slug: 'docker',
                        title: 'Docker',
                        category: 'devops',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'delete',
                    entity_type: 'command',
                    entity_id: 'cmd-1',
                    payload: null,
                },
            ])

            expect(tables.item_commands.rows.has('cmd-1')).toBe(false)
            expect(tables.cheatsheets.rows.has('cs-1')).toBe(true)
        })

        it('handles position changes via upsert', async () => {
            const now = new Date().toISOString()
            insertCommand('cmd-1', { position: 0 })
            insertCommand('cmd-2', { position: 1 })
            insertCommand('cmd-3', { position: 2 })

            // Reorder: cmd-3 moves to position 0
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'command',
                    entity_id: 'cmd-3',
                    payload: {
                        id: 'cmd-3',
                        repo_id: 'item-1',
                        label: 'Test',
                        command: 'pnpm test',
                        position: 0,
                        created_at: now,
                    },
                },
            ])

            expect(tables.item_commands.rows.get('cmd-1')!.position).toBe(0)
            expect(tables.item_commands.rows.get('cmd-2')!.position).toBe(1)
            expect(tables.item_commands.rows.get('cmd-3')!.position).toBe(0) // Updated
        })
    })
})
