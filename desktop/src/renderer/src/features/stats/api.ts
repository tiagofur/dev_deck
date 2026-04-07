import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api-client'
import type { Stats } from './types'

/**
 * Polls /api/stats. Refetches every 2 minutes so the mascot mood
 * stays in sync with what the user is doing.
 *
 * Side effect on the backend: this call also bumps last_open_at and
 * the streak counter.
 */
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<Stats>('/api/stats'),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  })
}
