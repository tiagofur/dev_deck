import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  action_url?: string
  read_at?: string
  created_at: string
}

const NOTIFICATIONS_KEY = ['notifications'] as const

/** GET /api/me/notifications */
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', { unreadOnly }],
    queryFn: () => api.get<{ notifications: Notification[] }>(`/api/me/notifications?unread=${unreadOnly}`),
    refetchInterval: 30000, // Poll every 30s
  })
}

/** GET /api/me/notifications/count */
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: () => api.get<{ unread_count: number }>('/api/me/notifications/count'),
    refetchInterval: 30000,
  })
}

/** PATCH /api/me/notifications/:id/read */
export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/me/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
  })
}

/** POST /api/me/notifications/read-all */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/me/notifications/read-all', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    },
  })
}
