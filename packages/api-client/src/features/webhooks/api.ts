import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface Webhook {
  id: string
  user_id?: string
  org_id?: string
  name: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  created_at: string
}

const WEBHOOKS_KEY = ['webhooks'] as const

/** GET /api/me/webhooks — list user's/org's webhooks. */
export function useWebhooks() {
  return useQuery({
    queryKey: [...WEBHOOKS_KEY, 'list'],
    queryFn: () => api.get<{ webhooks: Webhook[] }>('/api/me/webhooks'),
  })
}

/** POST /api/me/webhooks — create a new webhook. */
export function useCreateWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; url: string; events: string[] }) =>
      api.post<Webhook>('/api/me/webhooks', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...WEBHOOKS_KEY, 'list'] })
    },
  })
}

/** DELETE /api/me/webhooks/:id */
export function useDeleteWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/me/webhooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...WEBHOOKS_KEY, 'list'] })
    },
  })
}
