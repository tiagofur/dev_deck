import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface APIKey {
  id: string
  user_id: string
  name: string
  last_used_at?: string
  created_at: string
}

export interface CreateKeyResponse {
  token: string
  key: APIKey
}

export interface CustomEnricher {
  id: string
  org_id?: string
  user_id?: string
  name: string
  url_pattern: string
  endpoint_url: string
  auth_header?: string
  created_at: string
  updated_at: string
}

export interface PluginTemplate {
  id: string
  type: 'enricher' | 'webhook'
  name: string
  description: string
  author: string
  icon_url: string
  // For Enrichers
  url_pattern?: string
  endpoint_url?: string
  // For Webhooks
  events?: string[]
}

const ECOSYSTEM_KEY = ['ecosystem'] as const

/** GET /api/me/keys — list user's PATs. */
export function useAPIKeys() {
  return useQuery({
    queryKey: [...ECOSYSTEM_KEY, 'keys'],
    queryFn: () => api.get<{ keys: APIKey[] }>('/api/me/keys'),
  })
}

/** POST /api/me/keys — create a new PAT. */
export function useCreateAPIKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post<CreateKeyResponse>('/api/me/keys', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ECOSYSTEM_KEY, 'keys'] })
    },
  })
}

/** DELETE /api/me/keys/:id */
export function useDeleteAPIKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/me/keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ECOSYSTEM_KEY, 'keys'] })
    },
  })
}

/** GET /api/me/enrichers — list custom enrichers. */
export function useCustomEnrichers() {
  return useQuery({
    queryKey: [...ECOSYSTEM_KEY, 'enrichers'],
    queryFn: () => api.get<{ enrichers: CustomEnricher[] }>('/api/me/enrichers'),
  })
}

/** POST /api/me/enrichers — register a custom enricher. */
export function useCreateCustomEnricher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; url_pattern: string; endpoint_url: string; auth_header?: string }) =>
      api.post<CustomEnricher>('/api/me/enrichers', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ECOSYSTEM_KEY, 'enrichers'] })
    },
  })
}

/** DELETE /api/me/enrichers/:id */
export function useDeleteCustomEnricher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/me/enrichers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ECOSYSTEM_KEY, 'enrichers'] })
    },
  })
}

/** GET /api/plugins/featured — list featured plugin templates. */
export function useFeaturedPlugins() {
  return useQuery({
    queryKey: [...ECOSYSTEM_KEY, 'featured-templates'],
    queryFn: () => api.get<{ plugins: PluginTemplate[] }>('/api/plugins/featured'),
  })
}
