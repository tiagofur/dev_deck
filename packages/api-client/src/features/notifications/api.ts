import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api-client'
import { execLocal, queryLocal } from '../../local-db/client'

// ── Types ───────────────────────────────────────────────────────────

export type Notification = {
    id: string
    user_id: string
    type: string // 'system', 'enrichment_done', 'weekly_digest'
    title: string
    body: string
    action_url?: string | null
    read_at?: string | null
    created_at: string
    [key: string]: unknown
}

// ── Local DB helpers ────────────────────────────────────────────────

export async function getLocalNotifications(unreadOnly = false): Promise<Notification[]> {
    const where = unreadOnly ? 'WHERE read_at IS NULL' : ''
    const rows = await queryLocal<Notification>(
        `SELECT id, user_id, type, title, body, action_url, read_at, created_at 
         FROM notifications ${where}
         ORDER BY created_at DESC 
         LIMIT 50`,
        []
    )
    return rows
}

export async function getLocalUnreadCount(): Promise<number> {
    const rows = await queryLocal<{ count: number }>(
        'SELECT COUNT(*) as count FROM notifications WHERE read_at IS NULL',
        []
    )
    return rows[0]?.count ?? 0
}

export async function upsertNotification(n: Notification): Promise<void> {
    await execLocal(
        `INSERT INTO notifications (id, user_id, type, title, body, action_url, read_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            type=excluded.type, title=excluded.title, body=excluded.body,
            action_url=excluded.action_url, read_at=excluded.read_at`,
        [n.id, n.user_id, n.type, n.title, n.body, n.action_url || null, n.read_at || null, n.created_at]
    )
}

export async function markNotificationReadLocal(id: string): Promise<void> {
    await execLocal(
        'UPDATE notifications SET read_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
    )
}

export async function markAllNotificationsReadLocal(): Promise<void> {
    await execLocal(
        'UPDATE notifications SET read_at = ? WHERE read_at IS NULL',
        [new Date().toISOString()]
    )
}

// ── React Query hooks ───────────────────────────────────────────────

export function useNotifications(unreadOnly = false) {
    return useQuery({
        queryKey: ['notifications', { unreadOnly }],
        queryFn: async () => {
            // Try to fetch from backend, store locally
            try {
                const res = await api.get<{ notifications: Notification[] }>(
                    `/api/me/notifications${unreadOnly ? '?unread=true' : ''}`
                )
                // Upsert all notifications into local DB
                for (const n of res.notifications || []) {
                    await upsertNotification(n)
                }
                return { notifications: res.notifications || [] }
            } catch {
                // Offline: fall back to local DB
                return { notifications: await getLocalNotifications(unreadOnly) }
            }
        },
        staleTime: 30_000, // 30 seconds
        refetchOnWindowFocus: true,
    })
}

export function useUnreadNotificationsCount() {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            try {
                const res = await api.get<{ unread_count: number }>('/api/me/notifications/count')
                return { unread_count: res.unread_count || 0 }
            } catch {
                return { unread_count: await getLocalUnreadCount() }
            }
        },
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    })
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            // Update locally first
            await markNotificationReadLocal(id)
            // Try to sync to backend
            try {
                await api.patch(`/api/me/notifications/${id}/read`, {})
            } catch {
                // Offline: local update is enough, will sync later
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
    })
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            // Update locally first
            await markAllNotificationsReadLocal()
            // Try to sync to backend
            try {
                await api.post('/api/me/notifications/read-all', {})
            } catch {
                // Offline: local update is enough
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
    })
}
