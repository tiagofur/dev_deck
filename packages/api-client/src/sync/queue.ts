import { v4 as uuidv4 } from 'uuid';
import { execLocal, queryLocal } from '../local-db/client';

export interface SyncOperation {
    id: string;
    entity_type: string;
    entity_id: string;
    op: 'create' | 'update' | 'delete';
    payload: any;
    created_at: string;
}

/**
 * Enqueue an operation for background synchronization.
 */
export async function enqueueSync(
    entity_type: string,
    entity_id: string,
    op: 'create' | 'update' | 'delete',
    payload: any
): Promise<string> {
    const id = uuidv4();
    const created_at = new Date().toISOString();
    
    await execLocal(
        'INSERT INTO sync_operations (id, entity_type, entity_id, op, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, entity_type, entity_id, op, JSON.stringify(payload), created_at]
    );
    
    return id;
}

/**
 * Get all pending operations that haven't been synced yet.
 */
export async function getPendingOps(): Promise<SyncOperation[]> {
    const rows = await queryLocal<any>(
        'SELECT id, entity_type, entity_id, op, payload, created_at FROM sync_operations WHERE synced_at IS NULL ORDER BY created_at ASC'
    );
    
    return rows.map((r: any) => ({
        ...r,
        payload: JSON.parse(r.payload)
    }));
}

/**
 * Mark operations as successfully synced.
 */
export async function markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const synced_at = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    
    await execLocal(
        `UPDATE sync_operations SET synced_at = ? WHERE id IN (${placeholders})`,
        [synced_at, ...ids]
    );
}

/**
 * Get count of pending sync operations.
 */
export async function getPendingCount(): Promise<number> {
    const rows = await queryLocal<any>('SELECT COUNT(*) as count FROM sync_operations WHERE synced_at IS NULL');
    return rows[0]?.count || 0;
}
