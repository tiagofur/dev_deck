import { useQuery } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface SystemFeatures {
  explore: boolean
  reputation: boolean
  team_review: boolean
  realtime: boolean
}

export interface SystemConfig {
  ai_provider: string
  sync_enabled: boolean
  features?: Partial<SystemFeatures>
}

export const DEFAULT_FEATURES: SystemFeatures = {
  explore: false,
  reputation: false,
  team_review: false,
  realtime: false,
}

/** GET /api/system/config — get system environment settings. */
export function useSystemConfig() {
  return useQuery({
    queryKey: ['system', 'config'],
    queryFn: () => api.get<SystemConfig>('/api/system/config'),
    staleTime: Infinity, // System config doesn't change during session
  })
}

/** Server-controlled feature flags. Anything unknown or unloaded is off. */
export function useFeatureFlags(): SystemFeatures {
  const { data } = useSystemConfig()
  return { ...DEFAULT_FEATURES, ...(data?.features ?? {}) }
}
