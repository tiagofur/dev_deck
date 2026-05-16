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

export interface ActivityEntry {
	id: string
	org_id: string
	user_id: string
	action: string
	entity_type: string
	entity_id: string
	metadata?: Record<string, any>
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
