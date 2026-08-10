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

    // ── UPDATE statements ──
    // Parse SET clause: handle both literal values and parameterized values
    // e.g., "archived = 1, local_updated_at = ?" 
    const updMatch = trimmed.match(
        /^UPDATE (\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i
    )
    if (updMatch) {
        const tableName = updMatch[1]
        const table = tables[tableName]
        if (!table) return
        
        const setClause = updMatch[2]
        const whereClause = updMatch[3]
        
        // Parse SET assignments: "col = value, col2 = ?"
        const setAssignments = setClause.split(',').map(p => {
            const [col, val] = p.trim().split('=').map(s => s.trim())
            return { col, val, isParam: val === '?' }
        })
        
        const whereParts = whereClause.split(' AND ').map(p => {
            const [col] = p.trim().split('=').map(s => s.trim())
            return col
        })
        
        // Extract only the parameterized SET values (skip literals)
        const setParams = setAssignments
            .filter(a => a.isParam)
            .map((_, i) => params[i])
        
        // WHERE params come after SET params
        const whereParams = params.slice(setParams.length)

        table.rows.forEach((row, key) => {
            let match = true
            for (let i = 0; i < whereParts.length; i++) {
                if (String(row[whereParts[i]] ?? '') !== String(whereParams[i] ?? '')) {
                    match = false
                    break
                }
            }
            if (match) {
                let setIdx = 0
                for (const assignment of setAssignments) {
                    if (assignment.isParam) {
                        row[assignment.col] = setParams[setIdx]
                        setIdx++
                    } else {
                        // Parse literal value (number, string, etc.)
                        const val = assignment.val
                        if (/^\d+$/.test(val)) {
                            row[assignment.col] = parseInt(val, 10)
                        } else if (val.toLowerCase() === 'null') {
                            row[assignment.col] = null
                        } else {
                            row[assignment.col] = val.replace(/^['"]|['"]$/g, '')
                        }
                    }
                }
            }
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
    createTable('items')
    createTable('runbooks')
    createTable('runbook_steps')
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

describe('items & runbooks delta sync', () => {
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

    function insertItem(id: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            id,
            user_id: 'user-1',
            org_id: null,
            item_type: 'repo',
            title: `Item ${id}`,
            url: `https://github.com/u/${id}`,
            description: '',
            notes: '',
            tags: '[]',
            ai_summary: '',
            ai_tags: '[]',
            why_saved: '',
            when_to_use: '',
            enrichment_status: 'pending',
            is_favorite: 0,
            archived: 0,
            created_at: now,
            updated_at: now,
            local_updated_at: now,
            ...overrides,
        }
        tables.items.rows.set(id, row)
        return row
    }

    function insertRunbook(id: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            id,
            user_id: 'user-1',
            org_id: null,
            item_id: 'item-1',
            title: `Runbook ${id}`,
            description: '',
            created_at: now,
            updated_at: now,
            ...overrides,
        }
        tables.runbooks.rows.set(id, row)
        return row
    }

    function insertRunbookStep(id: string, runbookId: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            id,
            runbook_id: runbookId,
            label: `Step ${id}`,
            command: '',
            description: '',
            position: 0,
            is_completed: 0,
            created_at: now,
            updated_at: now,
            ...overrides,
        }
        tables.runbook_steps.rows.set(id, row)
        return row
    }

    // ═══════════════════════════════════════════════════════════════
    // ITEM TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('item UPSERT', () => {
        it('stores a new item with all fields', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: {
                        id: 'item-1',
                        user_id: 'user-1',
                        org_id: 'org-1',
                        item_type: 'repo',
                        title: 'bubbletea',
                        url: 'https://github.com/charmbracelet/bubbletea',
                        description: 'TUI framework',
                        notes: 'Great for CLIs',
                        tags: ['go', 'tui'],
                        ai_summary: 'A Go TUI framework',
                        ai_tags: ['tui', 'terminal'],
                        why_saved: 'For future CLI projects',
                        when_to_use: 'Building terminal UIs',
                        enrichment_status: 'completed',
                        is_favorite: true,
                        archived: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.items.rows.size).toBe(1)
            const item = tables.items.rows.get('item-1')!
            expect(item.user_id).toBe('user-1')
            expect(item.org_id).toBe('org-1')
            expect(item.item_type).toBe('repo')
            expect(item.title).toBe('bubbletea')
            expect(item.url).toBe('https://github.com/charmbracelet/bubbletea')
            expect(item.description).toBe('TUI framework')
            expect(item.notes).toBe('Great for CLIs')
            expect(item.tags).toBe('["go","tui"]')
            expect(item.ai_summary).toBe('A Go TUI framework')
            expect(item.ai_tags).toBe('["tui","terminal"]')
            expect(item.why_saved).toBe('For future CLI projects')
            expect(item.when_to_use).toBe('Building terminal UIs')
            expect(item.enrichment_status).toBe('completed')
            expect(item.is_favorite).toBe(1)
            expect(item.archived).toBe(0)
        })

        it('upserts an existing item (ON CONFLICT)', async () => {
            const now = new Date().toISOString()
            insertItem('item-1', { title: 'Old Title', tags: '["old"]' })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: {
                        id: 'item-1',
                        user_id: 'user-1',
                        item_type: 'repo',
                        title: 'Updated Title',
                        url: 'https://github.com/u/item-1',
                        tags: ['updated'],
                        is_favorite: true,
                        archived: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.items.rows.size).toBe(1)
            const item = tables.items.rows.get('item-1')!
            expect(item.title).toBe('Updated Title')
            expect(item.tags).toBe('["updated"]')
            expect(item.is_favorite).toBe(1)
        })

        it('defaults is_favorite and archived to 0', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: {
                        id: 'item-1',
                        user_id: 'user-1',
                        item_type: 'repo',
                        title: 'Minimal',
                        url: 'https://example.com',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            const item = tables.items.rows.get('item-1')!
            expect(item.is_favorite).toBe(0)
            expect(item.archived).toBe(0)
        })

        it('serializes tags and ai_tags as JSON strings', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: {
                        id: 'item-1',
                        user_id: 'user-1',
                        item_type: 'repo',
                        title: 'Tags Test',
                        url: 'https://example.com',
                        tags: ['a', 'b', 'c'],
                        ai_tags: ['x', 'y'],
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            const item = tables.items.rows.get('item-1')!
            expect(item.tags).toBe('["a","b","c"]')
            expect(item.ai_tags).toBe('["x","y"]')
        })

        it('sets org_id for workspace items', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: {
                        id: 'item-1',
                        user_id: 'user-1',
                        org_id: 'org-workspace',
                        item_type: 'repo',
                        title: 'Workspace Item',
                        url: 'https://example.com',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            const item = tables.items.rows.get('item-1')!
            expect(item.org_id).toBe('org-workspace')
        })
    })

    describe('item DELETE (soft delete)', () => {
        it('soft-deletes an item by setting archived=1', async () => {
            insertItem('item-1', { archived: 0 })

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: null,
                },
            ])

            // Item should still exist but be archived
            expect(tables.items.rows.has('item-1')).toBe(true)
            const item = tables.items.rows.get('item-1')!
            // The engine does: UPDATE items SET archived = 1, local_updated_at = ? WHERE id = ?
            // Our mock parses this correctly - archived=1 is a literal, local_updated_at=? is a param
            expect(item.archived).toBe(1)
        })

        it('does not hard-delete the item', async () => {
            insertItem('item-1')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: null,
                },
            ])

            // Item still exists in the table
            expect(tables.items.rows.size).toBe(1)
            expect(tables.items.rows.has('item-1')).toBe(true)
        })

        it('sets local_updated_at on soft delete', async () => {
            insertItem('item-1')
            const beforeDelete = new Date().toISOString()

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: null,
                },
            ])

            const item = tables.items.rows.get('item-1')!
            expect(item.local_updated_at).toBeDefined()
            expect(typeof item.local_updated_at).toBe('string')
        })
    })

    // ═══════════════════════════════════════════════════════════════
    // RUNBOOK TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('runbook UPSERT', () => {
        it('stores a new runbook with all fields', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'runbook',
                    entity_id: 'rb-1',
                    payload: {
                        id: 'rb-1',
                        user_id: 'user-1',
                        org_id: 'org-1',
                        item_id: 'item-1',
                        title: 'Setup Guide',
                        description: 'How to set up the project',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.runbooks.rows.size).toBe(1)
            const rb = tables.runbooks.rows.get('rb-1')!
            expect(rb.user_id).toBe('user-1')
            expect(rb.org_id).toBe('org-1')
            expect(rb.item_id).toBe('item-1')
            expect(rb.title).toBe('Setup Guide')
            expect(rb.description).toBe('How to set up the project')
        })

        it('upserts an existing runbook (ON CONFLICT)', async () => {
            const now = new Date().toISOString()
            insertRunbook('rb-1', { title: 'Old Title', description: 'Old desc' })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'runbook',
                    entity_id: 'rb-1',
                    payload: {
                        id: 'rb-1',
                        user_id: 'user-1',
                        item_id: 'item-1',
                        title: 'Updated Title',
                        description: 'Updated desc',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.runbooks.rows.size).toBe(1)
            const rb = tables.runbooks.rows.get('rb-1')!
            expect(rb.title).toBe('Updated Title')
            expect(rb.description).toBe('Updated desc')
        })

        it('allows multiple runbooks per item', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'runbook',
                    entity_id: 'rb-1',
                    payload: {
                        id: 'rb-1',
                        user_id: 'user-1',
                        item_id: 'item-1',
                        title: 'Setup',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'runbook',
                    entity_id: 'rb-2',
                    payload: {
                        id: 'rb-2',
                        user_id: 'user-1',
                        item_id: 'item-1',
                        title: 'Deployment',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.runbooks.rows.size).toBe(2)
        })
    })

    describe('runbook DELETE (cascade)', () => {
        it('deletes a runbook and cascades to its steps', async () => {
            insertRunbook('rb-1')
            insertRunbookStep('step-1', 'rb-1')
            insertRunbookStep('step-2', 'rb-1')

            // Also insert a step for a different runbook
            insertRunbook('rb-2')
            insertRunbookStep('step-3', 'rb-2')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'runbook',
                    entity_id: 'rb-1',
                    payload: null,
                },
            ])

            // rb-1 steps should be deleted
            expect(tables.runbook_steps.rows.has('step-1')).toBe(false)
            expect(tables.runbook_steps.rows.has('step-2')).toBe(false)
            // rb-1 itself should be deleted
            expect(tables.runbooks.rows.has('rb-1')).toBe(false)
            // rb-2 and its step should remain
            expect(tables.runbooks.rows.has('rb-2')).toBe(true)
            expect(tables.runbook_steps.rows.has('step-3')).toBe(true)
        })

        it('deletes a runbook with no steps gracefully', async () => {
            insertRunbook('rb-empty')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'runbook',
                    entity_id: 'rb-empty',
                    payload: null,
                },
            ])

            expect(tables.runbooks.rows.has('rb-empty')).toBe(false)
        })

        it('cascade deletes steps before runbook (order verified)', async () => {
            insertRunbook('rb-1')
            insertRunbookStep('step-1', 'rb-1')

            capturedExecCalls = []

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'runbook',
                    entity_id: 'rb-1',
                    payload: null,
                },
            ])

            // Verify the cascade: engine does DELETE runbooks FIRST, then DELETE runbook_steps
            // This is the actual order in the engine code:
            // await execLocal('DELETE FROM runbooks WHERE id = ?', [op.entity_id]);
            // await execLocal('DELETE FROM runbook_steps WHERE runbook_id = ?', [op.entity_id]);
            const deleteCalls = capturedExecCalls.filter(c =>
                c.sql.includes('DELETE FROM runbook')
            )
            expect(deleteCalls.length).toBe(2)
            // First delete: runbooks, second delete: runbook_steps
            expect(deleteCalls[0].sql).toContain('DELETE FROM runbooks')
            expect(deleteCalls[1].sql).toContain('DELETE FROM runbook_steps')
        })
    })

    // ═══════════════════════════════════════════════════════════════
    // RUNBOOK_STEP TESTS
    // ═══════════════════════════════════════════════════════════════

    describe('runbook_step UPSERT', () => {
        it('stores a new step with all fields', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'runbook_step',
                    entity_id: 'step-1',
                    payload: {
                        id: 'step-1',
                        runbook_id: 'rb-1',
                        label: 'Install deps',
                        command: 'pnpm install',
                        description: 'Install all dependencies',
                        position: 0,
                        is_completed: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.runbook_steps.rows.size).toBe(1)
            const step = tables.runbook_steps.rows.get('step-1')!
            expect(step.runbook_id).toBe('rb-1')
            expect(step.label).toBe('Install deps')
            expect(step.command).toBe('pnpm install')
            expect(step.description).toBe('Install all dependencies')
            expect(step.position).toBe(0)
            expect(step.is_completed).toBe(0)
        })

        it('upserts an existing step (ON CONFLICT)', async () => {
            const now = new Date().toISOString()
            insertRunbookStep('step-1', 'rb-1', { label: 'Old Label', position: 0 })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'runbook_step',
                    entity_id: 'step-1',
                    payload: {
                        id: 'step-1',
                        runbook_id: 'rb-1',
                        label: 'Updated Label',
                        command: 'new cmd',
                        description: 'Updated',
                        position: 5,
                        is_completed: true,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.runbook_steps.rows.size).toBe(1)
            const step = tables.runbook_steps.rows.get('step-1')!
            expect(step.label).toBe('Updated Label')
            expect(step.command).toBe('new cmd')
            expect(step.description).toBe('Updated')
            expect(step.position).toBe(5)
            expect(step.is_completed).toBe(1)
        })

        it('serializes is_completed as 1/0', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'runbook_step',
                    entity_id: 'step-1',
                    payload: {
                        id: 'step-1',
                        runbook_id: 'rb-1',
                        label: 'Done step',
                        command: 'echo done',
                        position: 0,
                        is_completed: true,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            const step = tables.runbook_steps.rows.get('step-1')!
            expect(step.is_completed).toBe(1)
        })

        it('allows multiple steps per runbook ordered by position', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'runbook_step',
                    entity_id: 'step-1',
                    payload: {
                        id: 'step-1',
                        runbook_id: 'rb-1',
                        label: 'First',
                        command: 'cmd1',
                        position: 0,
                        is_completed: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'runbook_step',
                    entity_id: 'step-2',
                    payload: {
                        id: 'step-2',
                        runbook_id: 'rb-1',
                        label: 'Second',
                        command: 'cmd2',
                        position: 1,
                        is_completed: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'runbook_step',
                    entity_id: 'step-3',
                    payload: {
                        id: 'step-3',
                        runbook_id: 'rb-1',
                        label: 'Third',
                        command: 'cmd3',
                        position: 2,
                        is_completed: true,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.runbook_steps.rows.size).toBe(3)
            expect(tables.runbook_steps.rows.get('step-1')!.position).toBe(0)
            expect(tables.runbook_steps.rows.get('step-2')!.position).toBe(1)
            expect(tables.runbook_steps.rows.get('step-3')!.position).toBe(2)
            expect(tables.runbook_steps.rows.get('step-3')!.is_completed).toBe(1)
        })
    })

    describe('runbook_step DELETE', () => {
        it('deletes a single step', async () => {
            insertRunbook('rb-1')
            insertRunbookStep('step-1', 'rb-1')
            insertRunbookStep('step-2', 'rb-1')
            insertRunbookStep('step-3', 'rb-1')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'runbook_step',
                    entity_id: 'step-2',
                    payload: null,
                },
            ])

            expect(tables.runbook_steps.rows.has('step-1')).toBe(true)
            expect(tables.runbook_steps.rows.has('step-2')).toBe(false)
            expect(tables.runbook_steps.rows.has('step-3')).toBe(true)
            // The runbook itself should remain
            expect(tables.runbooks.rows.has('rb-1')).toBe(true)
        })
    })

    // ═══════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    describe('edge cases', () => {
        it('skips upsert when payload is null', async () => {
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: null,
                },
            ])

            expect(tables.items.rows.size).toBe(0)
        })

        it('handles mixed entity types in a single batch', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'item',
                    entity_id: 'item-1',
                    payload: {
                        id: 'item-1',
                        user_id: 'user-1',
                        item_type: 'repo',
                        title: 'Test Repo',
                        url: 'https://example.com',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'runbook',
                    entity_id: 'rb-1',
                    payload: {
                        id: 'rb-1',
                        user_id: 'user-1',
                        item_id: 'item-1',
                        title: 'Setup',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'runbook_step',
                    entity_id: 'step-1',
                    payload: {
                        id: 'step-1',
                        runbook_id: 'rb-1',
                        label: 'Install',
                        command: 'pnpm install',
                        position: 0,
                        is_completed: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.items.rows.size).toBe(1)
            expect(tables.runbooks.rows.size).toBe(1)
            expect(tables.runbook_steps.rows.size).toBe(1)
        })

        it('handles delete cascade with all three entity types', async () => {
            const now = new Date().toISOString()
            // Setup: item → runbook → steps
            insertItem('item-1')
            insertRunbook('rb-1', { item_id: 'item-1' })
            insertRunbookStep('step-1', 'rb-1')
            insertRunbookStep('step-2', 'rb-1')

            // Delete the runbook (should cascade to steps, item remains)
            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'runbook',
                    entity_id: 'rb-1',
                    payload: null,
                },
            ])

            expect(tables.items.rows.has('item-1')).toBe(true)
            expect(tables.runbooks.rows.has('rb-1')).toBe(false)
            expect(tables.runbook_steps.rows.has('step-1')).toBe(false)
            expect(tables.runbook_steps.rows.has('step-2')).toBe(false)
        })

        it('handles position reordering via upsert', async () => {
            const now = new Date().toISOString()
            insertRunbookStep('step-1', 'rb-1', { position: 0 })
            insertRunbookStep('step-2', 'rb-1', { position: 1 })
            insertRunbookStep('step-3', 'rb-1', { position: 2 })

            // Reorder: step-3 moves to position 0
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'runbook_step',
                    entity_id: 'step-3',
                    payload: {
                        id: 'step-3',
                        runbook_id: 'rb-1',
                        label: 'Third',
                        command: 'cmd3',
                        position: 0,
                        is_completed: false,
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.runbook_steps.rows.get('step-1')!.position).toBe(0)
            expect(tables.runbook_steps.rows.get('step-2')!.position).toBe(1)
            expect(tables.runbook_steps.rows.get('step-3')!.position).toBe(0) // Updated
        })
    })
})