// Ola 5 Fase 17 — hooks for the generic /api/items endpoints.
// Lives alongside features/repos/api.ts which still drives the
// legacy HomePage grid. New views should import from here.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
import { queryLocal, execLocal } from '../../local-db/client'
import { enqueueSync } from '../../sync/queue'
import type { Item, ItemType } from '../capture/types'
export type { Item, ItemType }

export const ITEMS_KEY = ['items'] as const

export interface ListItemsParams {
  type?: ItemType
  tag?: string
  stack?: string    // Filter by tech stack (single or comma-separated)
  favorites?: boolean  // Filter to favorites only
  q?: string
  archived?: boolean
  sort?: 'added_desc' | 'added_asc' | 'updated_desc' | 'title_asc'
  limit?: number
  offset?: number
}

export interface ListItemsResult {
  total: number
  items: Item[]
}

export interface UpdateItemInput {
  title?: string
  notes?: string
  tags?: string[]
  why_saved?: string
  when_to_use?: string
  archived?: boolean
  is_favorite?: boolean
  item_type?: ItemType
}

export interface ReviewAITagsInput {
	ai_tags: string[]
	apply?: boolean
}

function buildQuery(p: ListItemsParams): string {
  const qs = new URLSearchParams()
  if (p.type) qs.set('type', p.type)
  if (p.tag) qs.set('tag', p.tag)
  if (p.stack) qs.set('stack', p.stack)
  if (p.favorites) qs.set('favorites', 'true')
  if (p.q) qs.set('q', p.q)
  if (p.sort) qs.set('sort', p.sort)
  if (p.archived !== undefined) qs.set('archived', String(p.archived))
  if (p.limit !== undefined) qs.set('limit', String(p.limit))
  if (p.offset !== undefined) qs.set('offset', String(p.offset))
  const s = qs.toString()
  return s ? `?${s}` : ''
}

async function upsertLocalItem(item: Item) {
	await execLocal(
		`INSERT INTO items (
			id, item_type, title, url, description, notes, tags, 
			ai_summary, ai_tags, why_saved, when_to_use, 
			enrichment_status, is_favorite, archived, created_at, updated_at, local_updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			item_type=excluded.item_type, title=excluded.title, url=excluded.url,
			description=excluded.description, notes=excluded.notes, tags=excluded.tags,
			ai_summary=excluded.ai_summary, ai_tags=excluded.ai_tags, why_saved=excluded.why_saved,
			when_to_use=excluded.when_to_use, enrichment_status=excluded.enrichment_status,
			is_favorite=excluded.is_favorite, archived=excluded.archived,
			updated_at=excluded.updated_at, local_updated_at=excluded.local_updated_at`,
		[
			item.id, item.item_type, item.title, item.url, item.description, item.notes,
			JSON.stringify(item.tags), item.ai_summary, JSON.stringify(item.ai_tags),
			item.why_saved, item.when_to_use, item.enrichment_status,
			item.is_favorite ? 1 : 0, item.archived ? 1 : 0,
			item.created_at, item.updated_at, new Date().toISOString()
		]
	)
}

/** GET /api/items — paginated list with filters. */
export function useItems(params: ListItemsParams = {}) {
  return useQuery({
    queryKey: [...ITEMS_KEY, 'list', params],
    queryFn: async () => {
			try {
				const res = await api.get<ListItemsResult>(`/api/items${buildQuery(params)}`)
				// Populate local DB
				res.items.forEach(it => upsertLocalItem(it).catch(console.error))
				return res
			} catch (err) {
				// Offline fallback
				const rows = await queryLocal<any>('SELECT * FROM items WHERE archived = 0 ORDER BY created_at DESC')
				return {
					total: rows.length,
					items: rows.map(r => ({
						...r,
						tags: JSON.parse(r.tags),
						ai_tags: JSON.parse(r.ai_tags),
						is_favorite: !!r.is_favorite,
						archived: !!r.archived,
					})) as Item[]
				}
			}
		},
  })
}

/** GET /api/items/:id */
export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: [...ITEMS_KEY, 'detail', id],
    queryFn: () => api.get<Item>(`/api/items/${id}`),
    enabled: !!id,
  })
}

/** PATCH /api/items/:id — partial update, returns the fresh row. */
export function useUpdateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateItemInput }) => {
			// 1. Update local DB (optimistic)
			// For Phase 21, we fetch the current item to merge the update
			const [current] = await queryLocal<any>('SELECT * FROM items WHERE id = ?', [id])
			if (current) {
				const updated = {
					...current,
					...input,
					tags: input.tags ? JSON.stringify(input.tags) : current.tags,
					is_favorite: input.is_favorite !== undefined ? (input.is_favorite ? 1 : 0) : current.is_favorite,
					archived: input.archived !== undefined ? (input.archived ? 1 : 0) : current.archived,
					local_updated_at: new Date().toISOString()
				}
				await execLocal(
					`UPDATE items SET 
						title=?, description=?, notes=?, tags=?, why_saved=?, 
						when_to_use=?, is_favorite=?, archived=?, local_updated_at=?
					WHERE id=?`,
					[
						updated.title, updated.description, updated.notes, updated.tags, updated.why_saved,
						updated.when_to_use, updated.is_favorite, updated.archived, updated.local_updated_at, id
					]
				)
			}

			// 2. Enqueue for sync
			await enqueueSync('item', id, 'update', input)

			// 3. Try to hit the API, but ignore failure (sync engine will retry)
			try {
				return await api.patch<Item>(`/api/items/${id}`, input)
			} catch (err) {
				// Return local representation if offline
				return { id, ...input } as unknown as Item
			}
		},
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ITEMS_KEY })
      qc.setQueryData([...ITEMS_KEY, 'detail', item.id], item)
    },
  })
}

/** DELETE /api/items/:id */
export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/api/items/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
  })
}

/** POST /api/items/:id/seen — discovery-mode rotation helper. */
export function useMarkItemSeen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/api/items/${id}/seen`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
	})
}

/** POST /api/items/:id/ai-enrich — trigger async AI refresh. */
export function useAIEnrichItem() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => api.post<Item>(`/api/items/${id}/ai-enrich`),
		onSuccess: (item) => {
			qc.invalidateQueries({ queryKey: ITEMS_KEY })
			qc.setQueryData([...ITEMS_KEY, 'detail', item.id], item)
		},
	})
}

/** PATCH /api/items/:id/ai-tags — review/edit AI suggestions. */
export function useReviewItemAITags() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: ReviewAITagsInput }) =>
			api.patch<Item>(`/api/items/${id}/ai-tags`, input),
		onSuccess: (item) => {
			qc.invalidateQueries({ queryKey: ITEMS_KEY })
			qc.setQueryData([...ITEMS_KEY, 'detail', item.id], item)
		},
	})
}

/** GET /api/items/tags — all unique tags for the authenticated user. */
export function useUserTags() {
	return useQuery({
		queryKey: [...ITEMS_KEY, 'tags'],
		queryFn: () => api.get<string[]>(`/api/items/tags`),
	})
}

export interface RelatedItemsResult {
	item_id: string
	related: {
		id: string
		type: ItemType
		title: string
		why_saved?: string
		url?: string
		similarity: number
	}[]
}

/** GET /api/items/:id/related — fetch similar items. */
export function useRelatedItems(id: string | undefined, limit = 5) {
	return useQuery({
		queryKey: [...ITEMS_KEY, 'related', id, limit],
		queryFn: () => api.get<RelatedItemsResult>(`/api/items/${id}/related?limit=${limit}`),
		enabled: !!id,
	})
}
