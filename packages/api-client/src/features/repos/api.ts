import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
import type {
  CreateRepoInput,
  ListReposParams,
  ListResult,
  Repo,
  UpdateRepoInput,
} from './types'

const REPOS_KEY = ['repos'] as const

function buildQuery(params: ListReposParams): string {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.lang) qs.set('lang', params.lang)
  if (params.tag) qs.set('tag', params.tag)
  if (params.sort) qs.set('sort', params.sort)
  if (params.archived !== undefined) qs.set('archived', String(params.archived))
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export function useRepos(params: ListReposParams = {}) {
  return useQuery({
    queryKey: [...REPOS_KEY, 'list', params],
    queryFn: () => api.get<ListResult>(`/api/repos${buildQuery(params)}`),
  })
}

export function useRepo(id: string | undefined) {
  return useQuery({
    queryKey: [...REPOS_KEY, 'detail', id],
    queryFn: () => api.get<Repo>(`/api/repos/${id}`),
    enabled: !!id,
  })
}

interface ReadmeResponse {
  format: 'markdown'
  content: string
}

export function useReadme(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...REPOS_KEY, 'readme', id],
    queryFn: () => api.get<ReadmeResponse>(`/api/repos/${id}/readme`),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useAddRepo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRepoInput) => api.post<Repo>('/api/repos', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPOS_KEY }),
  })
}

export function useUpdateRepo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRepoInput }) =>
      api.patch<Repo>(`/api/repos/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPOS_KEY }),
  })
}

export function useDeleteRepo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/api/repos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPOS_KEY }),
  })
}

export function useRefreshRepo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Repo>(`/api/repos/${id}/refresh`),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPOS_KEY }),
  })
}

/**
 * GET /api/discovery/next — returns the next repo for swipe mode,
 * or undefined if the backend returned 204 (nothing left).
 */
export function useDiscoveryNext() {
  return useQuery({
    queryKey: ['discovery', 'next'],
    // We use a sentinel `null` for the 204 case so React Query keeps it cached.
    queryFn: async (): Promise<Repo | null> => {
      const r = await api.get<Repo | undefined>('/api/discovery/next')
      return r ?? null
    },
    staleTime: 0,
    gcTime: 0,
  })
}

export function useMarkSeen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<void>(`/api/repos/${id}/seen`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: REPOS_KEY })
      qc.invalidateQueries({ queryKey: ['discovery'] })
    },
  })
}
