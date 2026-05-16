import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';

export interface Device {
    id: string;
    client_id: string;
    name: string;
    device_type: string;
    last_sync_at?: string;
    last_seen_at: string;
    created_at: string;
    is_active: boolean;
}

export const SYNC_KEY = ['sync'] as const;

/** GET /api/me/devices */
export function useDevices() {
    return useQuery({
        queryKey: [...SYNC_KEY, 'devices'],
        queryFn: async () => {
            const res = await api.get<{ devices: Device[] }>('/api/me/devices');
            return res.devices;
        },
    });
}

/** DELETE /api/me/devices/:clientId */
export function useDeleteDevice() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (clientId: string) => api.del(`/api/me/devices/${clientId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...SYNC_KEY, 'devices'] }),
    });
}
