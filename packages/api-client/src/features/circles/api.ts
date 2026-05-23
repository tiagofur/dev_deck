import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
import type { Item } from '../capture/types'

export interface Circle {
  id: string
  name: string
  description: string
  invite_code: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CircleMemberDetail {
  user_id: string
  username: string
  display_name: string
  avatar_url: string
  role: string // owner, member
}

export interface CreateCircleInput {
  name: string
  description: string
}

export interface JoinCircleInput {
  invite_code: string
}

export interface ShareToCircleInput {
  circleId: string
  itemId: string
  shareContext?: string
}

const CIRCLES_KEY = ['circles']

export function useCircles() {
  return useQuery({
    queryKey: CIRCLES_KEY,
    queryFn: async () => {
      return api.get<Circle[]>('/api/circles')
    },
  })
}

export function useCircleDetail(id: string) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'detail', id],
    queryFn: async () => {
      return api.get<Circle>(`/api/circles/${id}`)
    },
    enabled: !!id,
  })
}

export function useCircleItems(circleId: string) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'items', circleId],
    queryFn: async () => {
      return api.get<Item[]>(`/api/circles/${circleId}/items`)
    },
    enabled: !!circleId,
  })
}

export function useCircleMembers(circleId: string) {
  return useQuery({
    queryKey: [...CIRCLES_KEY, 'members', circleId],
    queryFn: async () => {
      return api.get<CircleMemberDetail[]>(`/api/circles/${circleId}/members`)
    },
    enabled: !!circleId,
  })
}

export function useCreateCircle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCircleInput) => {
      return api.post<Circle>('/api/circles', input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CIRCLES_KEY })
    },
  })
}

export function useJoinCircle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: JoinCircleInput) => {
      return api.post<Circle>('/api/circles/join', input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CIRCLES_KEY })
    },
  })
}

export function useShareToCircle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ circleId, itemId, shareContext }: ShareToCircleInput) => {
      return api.post<void>(`/api/circles/${circleId}/share`, {
        item_id: itemId,
        share_context: shareContext ?? '',
      })
    },
    onSuccess: (_, { circleId }) => {
      queryClient.invalidateQueries({ queryKey: [...CIRCLES_KEY, 'items', circleId] })
    },
  })
}

export function useLeaveCircle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (circleId: string) => {
      return api.del<void>(`/api/circles/${circleId}/members`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CIRCLES_KEY })
    },
  })
}
