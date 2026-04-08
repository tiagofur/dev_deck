// Ola 5 Fase 17 — hooks for the generic /api/items endpoints.
// Lives alongside features/repos/api.ts which still drives the
// legacy HomePage grid. New views should import from here.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api-client'
import type { Item, ItemType } from '../capture/types'

export const ITEMS_KEY = ['items'] as const

export interface ListItemsParams {
  type?: ItemType
  tag?: string
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
  item_type?: ItemType
}

function buildQuery(p: ListItemsParams): string {
  const qs = new URLSearchParams()
  if (p.type) qs.set('type', p.type)
  if (p.tag) qs.set('tag', p.tag)
  if (p.q) qs.set('q', p.q)
  if (p.sort) qs.set('sort', p.sort)
  if (p.archived !== undefined) qs.set('archived', String(p.archived))
  if (p.limit !== undefined) qs.set('limit', String(p.limit))
  if (p.offset !== undefined) qs.set('offset', String(p.offset))
  const s = qs.toString()
  return s ? `?${s}` : ''
}

/** GET /api/items — paginated list with filters. */
export function useItems(params: ListItemsParams = {}) {
  return useQuery({
    queryKey: [...ITEMS_KEY, 'list', params],
    queryFn: () => api.get<ListItemsResult>(`/api/items${buildQuery(params)}`),
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
    mutationFn: ({ id, input }: { id: string; input: UpdateItemInput }) =>
      api.patch<Item>(`/api/items/${id}`, input),
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
