import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { api } from '../../api-client'
import { enqueueSync } from '../../sync/queue'
import type {
  Cheatsheet,
  CheatsheetDetail,
  CreateCheatsheetInput,
  CreateEntryInput,
  Entry,
  SearchResult,
  UpdateCheatsheetInput,
  UpdateEntryInput,
} from './types'

const cheatsKey = (category?: string) =>
  ['cheatsheets', category ?? 'all'] as const
const cheatDetailKey = (id: string) => ['cheatsheet', id] as const

// ─── Cheatsheets ───

export function useCheatsheets(category?: string) {
  return useQuery({
    queryKey: cheatsKey(category),
    queryFn: () => {
      const params = category ? `?category=${category}` : ''
      return api.get<Cheatsheet[]>(`/api/cheatsheets${params}`)
    },
  })
}

export function useCheatsheet(id: string | undefined) {
  return useQuery({
    queryKey: id ? cheatDetailKey(id) : ['cheatsheet', 'noop'],
    queryFn: () => api.get<CheatsheetDetail>(`/api/cheatsheets/${id}`),
    enabled: !!id,
  })
}

export function useExploreCheatsheets(category?: string) {
  return useQuery({
    queryKey: ['cheatsheets', 'explore', category ?? 'all'],
    queryFn: () => {
      const params = category ? `?category=${category}` : ''
      return api.get<Cheatsheet[]>(`/api/cheatsheets/explore${params}`)
    },
  })
}

export function useCreateCheatsheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCheatsheetInput) => {
      const id = uuidv4()
      await enqueueSync('cheatsheet', id, 'create', input)
      try {
        return await api.post<Cheatsheet>('/api/cheatsheets', input)
      } catch {
        // Offline: return local representation, sync engine will retry
        return { id, ...input, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as unknown as Cheatsheet
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cheatsheets'] }),
  })
}

export function useUpdateCheatsheet(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateCheatsheetInput) => {
      await enqueueSync('cheatsheet', id, 'update', input)
      try {
        return await api.patch<Cheatsheet>(`/api/cheatsheets/${id}`, input)
      } catch {
        return { id, ...input } as unknown as Cheatsheet
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheatsheets'] })
      qc.invalidateQueries({ queryKey: cheatDetailKey(id) })
    },
  })
}

export function useDeleteCheatsheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await enqueueSync('cheatsheet', id, 'delete', {})
      try {
        return await api.del<void>(`/api/cheatsheets/${id}`)
      } catch {
        // Offline: sync engine will retry
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cheatsheets'] }),
  })
}

// ─── Entries ───

export function useCreateEntry(cheatsheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateEntryInput) => {
      const id = uuidv4()
      await enqueueSync('cheatsheet_entry', id, 'create', { ...input, cheatsheet_id: cheatsheetId })
      try {
        return await api.post<Entry>(`/api/cheatsheets/${cheatsheetId}/entries`, input)
      } catch {
        return { id, cheatsheet_id: cheatsheetId, ...input } as unknown as Entry
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cheatDetailKey(cheatsheetId) }),
  })
}

export function useUpdateEntry(cheatsheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ entryId, input }: { entryId: string; input: UpdateEntryInput }) => {
      await enqueueSync('cheatsheet_entry', entryId, 'update', input)
      try {
        return await api.patch<Entry>(`/api/cheatsheets/${cheatsheetId}/entries/${entryId}`, input)
      } catch {
        return { id: entryId, cheatsheet_id: cheatsheetId, ...input } as unknown as Entry
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cheatDetailKey(cheatsheetId) }),
  })
}

export function useDeleteEntry(cheatsheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entryId: string) => {
      await enqueueSync('cheatsheet_entry', entryId, 'delete', {})
      try {
        return await api.del<void>(`/api/cheatsheets/${cheatsheetId}/entries/${entryId}`)
      } catch {
        // Offline: sync engine will retry
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cheatDetailKey(cheatsheetId) }),
  })
}

// ─── Repo ↔ Cheatsheet links ───

const repoCheatsKey = (repoId: string) => ['repo-cheatsheets', repoId] as const

export function useRepoCheatsheets(repoId: string | undefined) {
  return useQuery({
    queryKey: repoId ? repoCheatsKey(repoId) : ['repo-cheatsheets', 'noop'],
    queryFn: () => api.get<Cheatsheet[]>(`/api/repos/${repoId}/cheatsheets`),
    enabled: !!repoId,
  })
}

export function useLinkCheatsheet(repoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cheatsheetId: string) =>
      api.post<void>(`/api/repos/${repoId}/cheatsheets/${cheatsheetId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: repoCheatsKey(repoId) }),
  })
}

export function useUnlinkCheatsheet(repoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cheatsheetId: string) =>
      api.del<void>(`/api/repos/${repoId}/cheatsheets/${cheatsheetId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: repoCheatsKey(repoId) }),
  })
}

// ─── Global search ───

export function useGlobalSearch(query: string, mode: 'text' | 'semantic' | 'hybrid' = 'text') {
  return useQuery({
    queryKey: ['search', query, mode],
    queryFn: async () => {
      const res = await api.get<{ query: string; results: SearchResult[] }>(
        `/api/search?q=${encodeURIComponent(query)}&limit=20&mode=${mode}`,
      )
      return res.results
    },
    enabled: query.length >= 2,
    staleTime: 0,
  })
}
