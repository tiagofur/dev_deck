import { useQuery } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface SystemConfig {
  ai_provider: string
  sync_enabled: boolean
}

/** GET /api/system/config — get system environment settings. */
export function useSystemConfig() {
  return useQuery({
    queryKey: ['system', 'config'],
    queryFn: () => api.get<SystemConfig>('/api/system/config'),
    staleTime: Infinity, // System config doesn't change during session
  })
}
