import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
import { queryLocal, execLocal } from '../../local-db/client'
import { enqueueSync } from '../../sync/queue'

export interface Runbook {
	id: string
	user_id: string
	item_id: string
	title: string
	description?: string
	steps: RunbookStep[]
	created_at: string
	updated_at: string
}

export interface RunbookStep {
	id: string
	runbook_id: string
	label: string
	command?: string
	description?: string
	position: number
	is_completed: boolean
	created_at: string
	updated_at: string
}

const RUNBOOKS_KEY = ['runbooks'] as const

/** GET /api/items/:id/runbooks */
export function useItemRunbooks(itemId: string | undefined) {
	return useQuery({
		queryKey: [...RUNBOOKS_KEY, 'list', itemId],
		queryFn: async () => {
			try {
				const res = await api.get<{ runbooks: Runbook[] }>(`/api/items/${itemId}/runbooks`)
				// TODO: Sync to local DB
				return res.runbooks
			} catch (err) {
				// Offline fallback
				const rows = await queryLocal<any>('SELECT * FROM runbooks WHERE item_id = ? ORDER BY created_at ASC', [itemId])
				const runbooks: Runbook[] = []
				for (const row of rows) {
					const steps = await queryLocal<any>('SELECT * FROM runbook_steps WHERE runbook_id = ? ORDER BY position ASC', [row.id])
					runbooks.push({
						...row,
						steps: steps.map(s => ({ ...s, is_completed: !!s.is_completed }))
					})
				}
				return runbooks
			}
		},
		enabled: !!itemId,
	})
}

/** POST /api/items/:id/runbooks */
export function useCreateRunbook() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ itemId, title, description }: { itemId: string; title: string; description?: string }) => {
			// Optimistic local write
			const id = crypto.randomUUID()
			await execLocal(
				'INSERT INTO runbooks (id, item_id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
				[id, itemId, title, description, new Date().toISOString(), new Date().toISOString()]
			)
			await enqueueSync('runbook', id, 'create', { itemId, title, description })

			try {
				return await api.post<Runbook>(`/api/items/${itemId}/runbooks`, { title, description })
			} catch (err) {
				return { id, item_id: itemId, title, description, steps: [] } as unknown as Runbook
			}
		},
		onSuccess: (_, { itemId }) => {
			qc.invalidateQueries({ queryKey: [...RUNBOOKS_KEY, 'list', itemId] })
		},
	})
}

/** POST /api/runbooks/:id/steps */
export function useAddRunbookStep() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ runbookId, label, command, description }: { runbookId: string; label: string; command?: string; description?: string }) => {
			const id = crypto.randomUUID()
			// Find max position
			const [maxRow] = await queryLocal<any>('SELECT MAX(position) as max_pos FROM runbook_steps WHERE runbook_id = ?', [runbookId])
			const nextPos = (maxRow?.max_pos ?? -1) + 1
			
			await execLocal(
				'INSERT INTO runbook_steps (id, runbook_id, label, command, description, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
				[id, runbookId, label, command, description, nextPos, new Date().toISOString(), new Date().toISOString()]
			)
			await enqueueSync('runbook_step', id, 'create', { runbookId, label, command, description })

			try {
				return await api.post<RunbookStep>(`/api/runbooks/${runbookId}/steps`, { label, command, description })
			} catch (err) {
				return { id, runbook_id: runbookId, label, command, description, position: nextPos, is_completed: false } as unknown as RunbookStep
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: RUNBOOKS_KEY })
		},
	})
}

/** PATCH /api/runbook-steps/:id */
export function useUpdateRunbookStep() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, input }: { id: string; input: Partial<RunbookStep> }) => {
			// Update local
			const sets: string[] = []
			const args: any[] = []
			Object.entries(input).forEach(([key, val]) => {
				sets.push(`${key} = ?`)
				args.push(key === 'is_completed' ? (val ? 1 : 0) : val)
			})
			args.push(new Date().toISOString(), id)
			
			await execLocal(`UPDATE runbook_steps SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, args)
			await enqueueSync('runbook_step', id, 'update', input)

			try {
				return await api.patch<RunbookStep>(`/api/runbook-steps/${id}`, input)
			} catch (err) {
				return { id, ...input } as unknown as RunbookStep
			}
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: RUNBOOKS_KEY })
		},
	})
}

/** DELETE /api/runbooks/:id */
export function useDeleteRunbook() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: async ({ id, itemId }: { id: string; itemId: string }) => {
			await execLocal('DELETE FROM runbooks WHERE id = ?', [id])
			await execLocal('DELETE FROM runbook_steps WHERE runbook_id = ?', [id])
			await enqueueSync('runbook', id, 'delete', {})

			try {
				await api.del(`/api/runbooks/${id}`)
			} catch (err) {
				// handled by sync engine
			}
		},
		onSuccess: (_, { itemId }) => {
			qc.invalidateQueries({ queryKey: [...RUNBOOKS_KEY, 'list', itemId] })
		},
	})
}
