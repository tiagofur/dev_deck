import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface AIActionUsage {
  action: string
  events: number
  cents: number
}

export interface AIUsage {
  plan: string
  used_cents: number
  cap_cents: number
  resets_at: string
  by_action: AIActionUsage[]
}

/** GET /api/me/ai-usage — monthly AI spend vs cap for the current user. */
export function useAIUsage() {
  return useQuery({
    queryKey: ['me', 'ai-usage'],
    queryFn: () => api.get<AIUsage>('/api/me/ai-usage'),
    staleTime: 60_000,
  })
}

/** POST /api/billing/checkout — create a Pro subscription checkout session. */
export function useCheckout() {
  return useMutation({
    mutationFn: () => api.post<{ checkout_url: string }>('/api/billing/checkout', {}),
  })
}

/** POST /api/billing/portal — open the Stripe customer portal. */
export function usePortal() {
  return useMutation({
    mutationFn: () => api.post<{ portal_url: string }>('/api/billing/portal', {}),
  })
}
