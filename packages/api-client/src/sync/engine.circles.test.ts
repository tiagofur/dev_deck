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
    createTable('circles')
    createTable('circle_members', ['circle_id', 'user_id'])
    createTable('circle_items', ['circle_id', 'item_id'])
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

describe('circles delta sync', () => {
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

    // Helper to run a full sync cycle with given deltas
    async function runSyncWithDeltas(deltas: unknown[]) {
        vi.mocked(api.get).mockResolvedValue({
            operations: deltas,
            now: new Date().toISOString(),
        })
        vi.mocked(api.post).mockResolvedValue({ operations: [] })

        await syncNow()
    }

    // Helper to insert a circle directly into the mock store
    function insertCircle(id: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            id,
            name: `Circle ${id}`,
            description: '',
            invite_code: null,
            created_by: 'user-1',
            created_at: now,
            updated_at: now,
            local_updated_at: now,
            ...overrides,
        }
        tables.circles.rows.set(id, row)
        return row
    }

    // Helper to insert a circle member directly into the mock store
    function insertCircleMember(circleId: string, userId: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            circle_id: circleId,
            user_id: userId,
            role: 'member',
            created_at: now,
            local_updated_at: now,
            ...overrides,
        }
        const key = `${circleId}||${userId}`
        tables.circle_members.rows.set(key, row)
        return row
    }

    // Helper to insert a circle item directly into the mock store
    function insertCircleItem(circleId: string, itemId: string, overrides: Record<string, unknown> = {}) {
        const now = new Date().toISOString()
        const row: Record<string, unknown> = {
            circle_id: circleId,
            item_id: itemId,
            shared_by: 'user-1',
            share_context: '',
            shared_at: now,
            local_updated_at: now,
            ...overrides,
        }
        const key = `${circleId}||${itemId}`
        tables.circle_items.rows.set(key, row)
        return row
    }

    // ── Circle UPSERT tests ─────────────────────────────────────
    describe('circle UPSERT', () => {
        it('stores a new circle with all fields', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: {
                        id: 'circle-1',
                        name: 'DevOps Team',
                        description: 'Shared DevOps knowledge',
                        invite_code: 'abc123',
                        created_by: 'user-1',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.circles.rows.size).toBe(1)
            const circle = tables.circles.rows.get('circle-1')!
            expect(circle.name).toBe('DevOps Team')
            expect(circle.description).toBe('Shared DevOps knowledge')
            expect(circle.invite_code).toBe('abc123')
            expect(circle.created_by).toBe('user-1')
        })

        it('upserts an existing circle (ON CONFLICT)', async () => {
            const now = new Date().toISOString()
            insertCircle('circle-1', { name: 'Old Name', description: 'Old desc' })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: {
                        id: 'circle-1',
                        name: 'Updated Name',
                        description: 'Updated description',
                        invite_code: 'new123',
                        created_by: 'user-1',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            expect(tables.circles.rows.size).toBe(1)
            const circle = tables.circles.rows.get('circle-1')!
            expect(circle.name).toBe('Updated Name')
            expect(circle.description).toBe('Updated description')
            expect(circle.invite_code).toBe('new123')
        })

        it('defaults description to empty string when omitted', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: {
                        id: 'circle-1',
                        name: 'Minimal Circle',
                        created_by: 'user-1',
                        created_at: now,
                        updated_at: now,
                    },
                },
            ])

            const circle = tables.circles.rows.get('circle-1')!
            expect(circle.description).toBe('')
            expect(circle.invite_code).toBeNull()
        })
    })

    // ── Circle Member UPSERT tests ──────────────────────────────
    describe('circle_member UPSERT', () => {
        it('stores a new member with composite key (circle_id, user_id)', async () => {
            insertCircle('circle-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-1',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-2',
                        role: 'admin',
                        created_at: new Date().toISOString(),
                    },
                },
            ])

            expect(tables.circle_members.rows.size).toBe(1)
            const key = 'circle-1||user-2'
            const member = tables.circle_members.rows.get(key)!
            expect(member.circle_id).toBe('circle-1')
            expect(member.user_id).toBe('user-2')
            expect(member.role).toBe('admin')
        })

        it('defaults role to "member" when omitted', async () => {
            insertCircle('circle-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-1',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-2',
                        created_at: new Date().toISOString(),
                    },
                },
            ])

            const key = 'circle-1||user-2'
            const member = tables.circle_members.rows.get(key)!
            expect(member.role).toBe('member')
        })

        it('upserts an existing member (ON CONFLICT)', async () => {
            insertCircle('circle-1')
            insertCircleMember('circle-1', 'user-2', { role: 'member' })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-1',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-2',
                        role: 'admin',
                        created_at: new Date().toISOString(),
                    },
                },
            ])

            expect(tables.circle_members.rows.size).toBe(1)
            const key = 'circle-1||user-2'
            const member = tables.circle_members.rows.get(key)!
            expect(member.role).toBe('admin')
        })

        it('allows multiple members in the same circle', async () => {
            insertCircle('circle-1')
            const now = new Date().toISOString()

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-1',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-2',
                        role: 'admin',
                        created_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-2',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-3',
                        role: 'member',
                        created_at: now,
                    },
                },
            ])

            expect(tables.circle_members.rows.size).toBe(2)
        })

        it('allows the same user in different circles', async () => {
            insertCircle('circle-1')
            insertCircle('circle-2')
            const now = new Date().toISOString()

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-1',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-2',
                        role: 'member',
                        created_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-2',
                    payload: {
                        circle_id: 'circle-2',
                        user_id: 'user-2',
                        role: 'admin',
                        created_at: now,
                    },
                },
            ])

            expect(tables.circle_members.rows.size).toBe(2)
            expect(tables.circle_members.rows.get('circle-1||user-2')!.role).toBe('member')
            expect(tables.circle_members.rows.get('circle-2||user-2')!.role).toBe('admin')
        })
    })

    // ── Circle Item UPSERT tests ────────────────────────────────
    describe('circle_item UPSERT', () => {
        it('stores a new item with composite key (circle_id, item_id)', async () => {
            insertCircle('circle-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-1',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-1',
                        shared_by: 'user-2',
                        share_context: 'Check out this repo!',
                        shared_at: new Date().toISOString(),
                    },
                },
            ])

            expect(tables.circle_items.rows.size).toBe(1)
            const key = 'circle-1||item-1'
            const item = tables.circle_items.rows.get(key)!
            expect(item.circle_id).toBe('circle-1')
            expect(item.item_id).toBe('item-1')
            expect(item.shared_by).toBe('user-2')
            expect(item.share_context).toBe('Check out this repo!')
        })

        it('defaults share_context to empty string when omitted', async () => {
            insertCircle('circle-1')

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-1',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-1',
                        shared_by: 'user-2',
                        shared_at: new Date().toISOString(),
                    },
                },
            ])

            const key = 'circle-1||item-1'
            const item = tables.circle_items.rows.get(key)!
            expect(item.share_context).toBe('')
        })

        it('upserts an existing item (ON CONFLICT)', async () => {
            insertCircle('circle-1')
            insertCircleItem('circle-1', 'item-1', { share_context: 'Old context' })

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-1',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-1',
                        shared_by: 'user-2',
                        share_context: 'Updated context',
                        shared_at: new Date().toISOString(),
                    },
                },
            ])

            expect(tables.circle_items.rows.size).toBe(1)
            const key = 'circle-1||item-1'
            const item = tables.circle_items.rows.get(key)!
            expect(item.share_context).toBe('Updated context')
        })

        it('allows multiple items in the same circle', async () => {
            insertCircle('circle-1')
            const now = new Date().toISOString()

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-1',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-1',
                        shared_by: 'user-2',
                        shared_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-2',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-2',
                        shared_by: 'user-3',
                        shared_at: now,
                    },
                },
            ])

            expect(tables.circle_items.rows.size).toBe(2)
        })

        it('allows the same item in different circles', async () => {
            insertCircle('circle-1')
            insertCircle('circle-2')
            const now = new Date().toISOString()

            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-1',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-1',
                        shared_by: 'user-2',
                        shared_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-2',
                    payload: {
                        circle_id: 'circle-2',
                        item_id: 'item-1',
                        shared_by: 'user-3',
                        share_context: 'Also in circle 2',
                        shared_at: now,
                    },
                },
            ])

            expect(tables.circle_items.rows.size).toBe(2)
        })
    })

    // ── Circle DELETE (cascade) tests ───────────────────────────
    describe('circle DELETE (cascade)', () => {
        it('deletes a circle and cascades to its members and items', async () => {
            insertCircle('circle-1')
            insertCircleMember('circle-1', 'user-1')
            insertCircleMember('circle-1', 'user-2')
            insertCircleItem('circle-1', 'item-1')
            insertCircleItem('circle-1', 'item-2')

            // Also insert data for a different circle to ensure it's not affected
            insertCircle('circle-2')
            insertCircleMember('circle-2', 'user-3')
            insertCircleItem('circle-2', 'item-3')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: null,
                },
            ])

            // circle-1 members should be deleted
            expect(tables.circle_members.rows.has('circle-1||user-1')).toBe(false)
            expect(tables.circle_members.rows.has('circle-1||user-2')).toBe(false)
            // circle-1 items should be deleted
            expect(tables.circle_items.rows.has('circle-1||item-1')).toBe(false)
            expect(tables.circle_items.rows.has('circle-1||item-2')).toBe(false)
            // circle-1 itself should be deleted
            expect(tables.circles.rows.has('circle-1')).toBe(false)
            // circle-2 and its data should remain
            expect(tables.circles.rows.has('circle-2')).toBe(true)
            expect(tables.circle_members.rows.has('circle-2||user-3')).toBe(true)
            expect(tables.circle_items.rows.has('circle-2||item-3')).toBe(true)
        })

        it('deletes a circle with no members or items gracefully', async () => {
            insertCircle('circle-empty')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'circle',
                    entity_id: 'circle-empty',
                    payload: null,
                },
            ])

            expect(tables.circles.rows.has('circle-empty')).toBe(false)
            expect(tables.circle_members.rows.size).toBe(0)
            expect(tables.circle_items.rows.size).toBe(0)
        })

        it('cascade delete removes members before items (order matters)', async () => {
            insertCircle('circle-1')
            insertCircleMember('circle-1', 'user-1')
            insertCircleItem('circle-1', 'item-1')

            // Verify the execLocal calls are in the correct order
            capturedExecCalls = []

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: null,
                },
            ])

            // Check that members were deleted before items
            const deleteCalls = capturedExecCalls.filter(c =>
                c.sql.includes('DELETE FROM circle_') || c.sql.includes('DELETE FROM circles')
            )
            expect(deleteCalls.length).toBe(3)
            expect(deleteCalls[0].sql).toContain('DELETE FROM circle_members')
            expect(deleteCalls[1].sql).toContain('DELETE FROM circle_items')
            expect(deleteCalls[2].sql).toContain('DELETE FROM circles')
        })
    })

    // ── Circle Member DELETE tests ──────────────────────────────
    describe('circle_member DELETE', () => {
        it('deletes a single member using composite key from payload', async () => {
            insertCircle('circle-1')
            insertCircleMember('circle-1', 'user-1')
            insertCircleMember('circle-1', 'user-2')
            insertCircleMember('circle-1', 'user-3')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'circle_member',
                    entity_id: 'user-2',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-2',
                    },
                },
            ])

            expect(tables.circle_members.rows.has('circle-1||user-1')).toBe(true)
            expect(tables.circle_members.rows.has('circle-1||user-2')).toBe(false)
            expect(tables.circle_members.rows.has('circle-1||user-3')).toBe(true)
            // The circle itself should remain
            expect(tables.circles.rows.has('circle-1')).toBe(true)
        })

        it('skips delete when payload is null', async () => {
            insertCircle('circle-1')
            insertCircleMember('circle-1', 'user-1')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'circle_member',
                    entity_id: 'user-1',
                    payload: null,
                },
            ])

            expect(tables.circle_members.rows.has('circle-1||user-1')).toBe(true)
        })
    })

    // ── Circle Item DELETE tests ────────────────────────────────
    describe('circle_item DELETE', () => {
        it('deletes a single item using composite key from payload', async () => {
            insertCircle('circle-1')
            insertCircleItem('circle-1', 'item-1')
            insertCircleItem('circle-1', 'item-2')
            insertCircleItem('circle-1', 'item-3')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'circle_item',
                    entity_id: 'item-2',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-2',
                    },
                },
            ])

            expect(tables.circle_items.rows.has('circle-1||item-1')).toBe(true)
            expect(tables.circle_items.rows.has('circle-1||item-2')).toBe(false)
            expect(tables.circle_items.rows.has('circle-1||item-3')).toBe(true)
            // The circle itself should remain
            expect(tables.circles.rows.has('circle-1')).toBe(true)
        })

        it('skips delete when payload is null', async () => {
            insertCircle('circle-1')
            insertCircleItem('circle-1', 'item-1')

            await runSyncWithDeltas([
                {
                    operation: 'delete',
                    entity_type: 'circle_item',
                    entity_id: 'item-1',
                    payload: null,
                },
            ])

            expect(tables.circle_items.rows.has('circle-1||item-1')).toBe(true)
        })
    })

    // ── Edge cases ──────────────────────────────────────────────
    describe('edge cases', () => {
        it('skips upsert when payload is null', async () => {
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: null,
                },
            ])

            expect(tables.circles.rows.size).toBe(0)
        })

        it('skips upsert when payload is undefined', async () => {
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-1',
                    // payload omitted
                },
            ])

            expect(tables.circle_members.rows.size).toBe(0)
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

            expect(tables.circles.rows.size).toBe(0)
            expect(tables.circle_members.rows.size).toBe(0)
            expect(tables.circle_items.rows.size).toBe(0)
        })

        it('handles multiple operations in a single batch', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: {
                        id: 'circle-1',
                        name: 'Circle 1',
                        created_by: 'user-1',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle',
                    entity_id: 'circle-2',
                    payload: {
                        id: 'circle-2',
                        name: 'Circle 2',
                        created_by: 'user-1',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-1',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-2',
                        role: 'admin',
                        created_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-1',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-1',
                        shared_by: 'user-2',
                        shared_at: now,
                    },
                },
            ])

            expect(tables.circles.rows.size).toBe(2)
            expect(tables.circle_members.rows.size).toBe(1)
            expect(tables.circle_items.rows.size).toBe(1)
            expect(tables.circle_members.rows.get('circle-1||user-2')!.role).toBe('admin')
        })

        it('handles mixed entity types in a batch with cascade', async () => {
            const now = new Date().toISOString()
            await runSyncWithDeltas([
                {
                    operation: 'upsert',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: {
                        id: 'circle-1',
                        name: 'Circle 1',
                        created_by: 'user-1',
                        created_at: now,
                        updated_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle_member',
                    entity_id: 'member-1',
                    payload: {
                        circle_id: 'circle-1',
                        user_id: 'user-2',
                        created_at: now,
                    },
                },
                {
                    operation: 'upsert',
                    entity_type: 'circle_item',
                    entity_id: 'item-1',
                    payload: {
                        circle_id: 'circle-1',
                        item_id: 'item-1',
                        shared_by: 'user-2',
                        shared_at: now,
                    },
                },
                {
                    operation: 'delete',
                    entity_type: 'circle',
                    entity_id: 'circle-1',
                    payload: null,
                },
            ])

            // circle-1 should be deleted (cascade removes member and item too)
            expect(tables.circles.rows.has('circle-1')).toBe(false)
            expect(tables.circle_members.rows.has('circle-1||user-2')).toBe(false)
            expect(tables.circle_items.rows.has('circle-1||item-1')).toBe(false)
        })
    })
})
