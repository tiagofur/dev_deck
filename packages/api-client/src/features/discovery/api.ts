import { useQuery } from '@tanstack/react-query'
import { api } from '../../api-client'
import type { Repo } from '../repos/types'

export interface TrendingItem {
  url_normalized: string
  title: string
  save_count: number
}

export interface CuratorRanking {
  id: string
  username: string
  display_name: string
  avatar_url: string
  reputation_points: number
  followers_count: number
}

const DISCOVERY_KEY = ['discovery'] as const

/** GET /api/discovery/next — next repo for swipe. */
export function useDiscoveryNext() {
  return useQuery({
    queryKey: [...DISCOVERY_KEY, 'next'],
    queryFn: async () => {
      try {
        const r = await api.get<Repo | undefined>('/api/discovery/next')
        return r
      } catch (err) {
        return undefined
      }
    },
    staleTime: 0,
    gcTime: 0,
  })
}

/** GET /api/discovery/trending — most saved tools. */
export function useTrendingTools(limit = 10) {
  return useQuery({
    queryKey: [...DISCOVERY_KEY, 'trending', { limit }],
    queryFn: () => api.get<{ items: TrendingItem[] }>(`/api/discovery/trending?limit=${limit}`),
  })
}

/** GET /api/discovery/leaderboard — top curators. */
export function useCuratorLeaderboard(limit = 10) {
  return useQuery({
    queryKey: [...DISCOVERY_KEY, 'leaderboard', { limit }],
    queryFn: () => api.get<{ rankings: CuratorRanking[] }>(`/api/discovery/leaderboard?limit=${limit}`),
  })
}
