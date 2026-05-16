import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
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

export function useCreateCheatsheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCheatsheetInput) =>
      api.post<Cheatsheet>('/api/cheatsheets', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cheatsheets'] }),
  })
}

export function useUpdateCheatsheet(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCheatsheetInput) =>
      api.patch<Cheatsheet>(`/api/cheatsheets/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheatsheets'] })
      qc.invalidateQueries({ queryKey: cheatDetailKey(id) })
    },
  })
}

export function useDeleteCheatsheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/api/cheatsheets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cheatsheets'] }),
  })
}

// ─── Entries ───

export function useCreateEntry(cheatsheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEntryInput) =>
      api.post<Entry>(`/api/cheatsheets/${cheatsheetId}/entries`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cheatDetailKey(cheatsheetId) }),
  })
}

export function useUpdateEntry(cheatsheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, input }: { entryId: string; input: UpdateEntryInput }) =>
      api.patch<Entry>(`/api/cheatsheets/${cheatsheetId}/entries/${entryId}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cheatDetailKey(cheatsheetId) }),
  })
}

export function useDeleteEntry(cheatsheetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entryId: string) =>
      api.del<void>(`/api/cheatsheets/${cheatsheetId}/entries/${entryId}`),
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
