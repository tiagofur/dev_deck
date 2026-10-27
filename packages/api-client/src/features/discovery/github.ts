import { useQuery } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface GitHubDiscoveryResult {
  full_name: string
  url: string
  description: string
  language: string
  stars: number
  topics: string[]
  pushed_at: string
  avatar_url: string
  score: number
  match_reason: string
}

export interface GitHubDiscoveryResponse {
  query: string
  github_query: string
  results: GitHubDiscoveryResult[]
  cached: boolean
}

export interface GitHubDiscoveryParams {
  need: string
  language?: string
  limit?: number
}

/**
 * GET /api/discovery/github — rank GitHub repos for a natural-language need.
 * Pro-only; Free users get a 402 the UI should turn into an upsell.
 * Save hits with the regular capture flow (POST /api/items/capture).
 */
export function useGitHubDiscovery({ need, language = '', limit = 10 }: GitHubDiscoveryParams) {
  const trimmed = need.trim()
  return useQuery({
    queryKey: ['discovery', 'github', { need: trimmed, language, limit }],
    queryFn: () => {
      const params = new URLSearchParams({ q: trimmed, limit: String(limit) })
      if (language.trim()) params.set('language', language.trim())
      return api.get<GitHubDiscoveryResponse>(`/api/discovery/github?${params}`)
    },
    enabled: trimmed.length >= 3,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
