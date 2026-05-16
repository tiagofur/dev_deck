import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
import type { Deck } from '../decks/api'
import type { Item } from '../items/api'

export interface User {
  id: string
  login: string
  username?: string
  bio?: string
  avatar_url: string
  display_name: string
  role: string
  plan: string
  created_at: string
}

export interface PublicProfile {
  id: string
  username: string
  bio?: string
  avatar_url?: string
  created_at: string
  public_decks_count: number
  followers_count: number
  following_count: number
  reputation_points: number
  is_following?: boolean
}

export interface FeedEvent {
  item: Item
  curator_name: string
  curator_avatar_url: string
}

export interface UpdateUserInput {
  bio?: string
  username?: string
}

const USERS_KEY = ['users'] as const

/** GET /api/auth/me — get current user profile. */
export function useMe() {
  return useQuery({
    queryKey: [...USERS_KEY, 'me'],
    queryFn: () => api.get<User>('/api/auth/me'),
  })
}

/** PATCH /api/auth/me — update current user profile. */
export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserInput) => api.patch<User>('/api/auth/me', input),
    onSuccess: (user) => {
      qc.setQueryData([...USERS_KEY, 'me'], user)
    },
  })
}

/** GET /api/users/:username/public — get a public profile. */
export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: [...USERS_KEY, 'public', username],
    queryFn: () => api.get<{ profile: PublicProfile }>(`/api/users/${username}/public`),
    enabled: !!username,
  })
}

/** GET /api/users/:username/public/decks — get public decks for a user. */
export function useUserPublicDecks(username: string) {
  return useQuery({
    queryKey: [...USERS_KEY, 'public', username, 'decks'],
    queryFn: () => api.get<{ decks: Deck[] }>(`/api/users/${username}/public/decks`),
    enabled: !!username,
  })
}

/** POST /api/users/:username/follow */
export function useFollowUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => api.post(`/api/users/${username}/follow`, {}),
    onSuccess: (_, username) => {
      qc.invalidateQueries({ queryKey: [...USERS_KEY, 'public', username] })
    },
  })
}

/** DELETE /api/users/:username/follow */
export function useUnfollowUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (username: string) => api.del(`/api/users/${username}/follow`),
    onSuccess: (_, username) => {
      qc.invalidateQueries({ queryKey: [...USERS_KEY, 'public', username] })
    },
  })
}

/** GET /api/feed/following — get activity from followed users. */
export function useFollowingFeed(limit = 50) {
  return useQuery({
    queryKey: [...USERS_KEY, 'feed', 'following', { limit }],
    queryFn: () => api.get<{ events: FeedEvent[] }>(`/api/feed/following?limit=${limit}`),
  })
}

/** GET /api/admin/users — list all users (admin only). */
export function useAdminUsers() {
  return useQuery({
    queryKey: [...USERS_KEY, 'admin', 'list'],
    queryFn: () => api.get<{ users: any[] }>('/api/admin/users'),
  })
}

/** POST /api/waitlist — public endpoint to join. */
export function useJoinWaitlist() {
	return useMutation({
		mutationFn: (email: string) => api.post<{ message: string }>('/api/waitlist', { email }),
	})
}

/** GET /api/admin/waitlist — admin list. */
export function useAdminWaitlist() {
	return useQuery({
		queryKey: [...USERS_KEY, 'admin', 'waitlist'],
		queryFn: () => api.get<{ entries: any[] }>('/api/admin/waitlist'),
	})
}

/** GET /api/admin/invites — admin list. */
export function useAdminInvites() {
	return useQuery({
		queryKey: [...USERS_KEY, 'admin', 'invites'],
		queryFn: () => api.get<{ invites: any[] }>('/api/admin/invites'),
	})
}

/** POST /api/admin/invites — generate new code. */
export function useCreateInvite() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (input: { code?: string; email?: string }) => api.post<any>('/api/admin/invites', input),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: [...USERS_KEY, 'admin', 'invites'] })
		},
	})
}
