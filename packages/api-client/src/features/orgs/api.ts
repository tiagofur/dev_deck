import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
  updated_at: string
}

export interface SAMLConfig {
  org_id: string
  idp_entity_id: string
  idp_sso_url: string
  idp_x509_cert: string
  domain: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrgInsights {
  total_items: number
  top_languages: Array<{
    language: string
    count: number
    share: number
  }>
  top_curators: Array<{
    display_name: string
    avatar_url: string
    item_count: number
  }>
  recent_activity: number
}

export interface HotTopic {
  tag: string
  count: number
}

export interface Recommendation {
  url_normalized: string
  title: string
  save_count: number
  item_type: string
}

export interface ActivityEntry {
	id: string
	org_id: string
	user_id: string
	action: string
	entity_type: string
	entity_id: string
	metadata?: Record<string, unknown>
	created_at: string
	user_display_name?: string
	user_avatar_url?: string
}

const ORGS_KEY = ['orgs'] as const

/** GET /api/orgs — list user's organizations. */
export function useUserOrgs() {
  return useQuery({
    queryKey: [...ORGS_KEY, 'list'],
    queryFn: () => api.get<{ orgs: Organization[] }>('/api/orgs'),
  })
}

/** POST /api/orgs — create a new organization. */
export function useCreateOrg() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post<Organization>('/api/orgs', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ORGS_KEY })
    },
  })
}

/** POST /api/orgs/:id/members — add a member to the org. */
export function useAddOrgMember() {
  return useMutation({
    mutationFn: ({ orgId, userId, role }: { orgId: string; userId: string; role: string }) =>
      api.post(`/api/orgs/${orgId}/members`, { user_id: userId, role }),
  })
}

/** GET /api/orgs/:id/feed — get organization activity. */
export function useOrgFeed(orgId: string | null | undefined, limit = 50) {
	return useQuery({
		queryKey: [...ORGS_KEY, 'feed', orgId, { limit }],
		queryFn: () => api.get<{ events: ActivityEntry[] }>(`/api/orgs/${orgId}/feed?limit=${limit}`),
		enabled: !!orgId,
	})
}

/** GET /api/orgs/:id/saml — get SAML SSO config. */
export function useOrgSAML(orgId: string | undefined) {
  return useQuery({
    queryKey: [...ORGS_KEY, 'saml', orgId],
    queryFn: () => api.get<SAMLConfig>(`/api/orgs/${orgId}/saml`),
    enabled: !!orgId,
  })
}

/** POST /api/orgs/:id/saml — update SAML SSO config. */
export function useUpdateOrgSAML() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orgId, input }: { orgId: string; input: Partial<SAMLConfig> }) =>
      api.post<SAMLConfig>(`/api/orgs/${orgId}/saml`, input),
    onSuccess: (_, { orgId }) => {
      qc.invalidateQueries({ queryKey: [...ORGS_KEY, 'saml', orgId] })
    },
  })
}

/** POST /api/orgs/:id/scim/token — generate a new SCIM token. */
export function useGenerateSCIMToken() {
  return useMutation({
    mutationFn: (orgId: string) => api.post<{ token: string }>(`/api/orgs/${orgId}/scim/token`, {}),
  })
}

/** GET /api/orgs/:id/insights — get organization analytics. */
export function useOrgInsights(orgId: string | undefined) {
  return useQuery({
    queryKey: [...ORGS_KEY, 'insights', orgId],
    queryFn: () => api.get<OrgInsights>(`/api/orgs/${orgId}/insights`),
    enabled: !!orgId,
  })
}

/** GET /api/orgs/:id/discovery/trending — get trending tags in org. */
export function useOrgTrendingTags(orgId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: [...ORGS_KEY, 'discovery', 'trending', orgId, { limit }],
    queryFn: () => api.get<{ tags: HotTopic[] }>(`/api/orgs/${orgId}/discovery/trending?limit=${limit}`),
    enabled: !!orgId,
  })
}

/** GET /api/orgs/:id/discovery/recommendations — get tool recs in org. */
export function useOrgRecommendations(orgId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: [...ORGS_KEY, 'discovery', 'recommendations', orgId, { limit }],
    queryFn: () => api.get<{ recommendations: Recommendation[] }>(`/api/orgs/${orgId}/discovery/recommendations?limit=${limit}`),
    enabled: !!orgId,
  })
}
