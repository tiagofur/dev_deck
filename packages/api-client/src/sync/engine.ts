import { api } from '../api-client';
import { getPreferences, setPreferences } from '../preferences';
import { getPendingOps, markSynced } from './queue';
import { execLocal } from '../local-db/client';

let syncInProgress = false;
let syncTimeout: any = null;
let backoffMs = 1000;
const MAX_BACKOFF = 30000;
const BASE_INTERVAL = 10000;

/**
 * Sync engine loop.
 * Drains the local sync queue and pushes batches to the backend.
 */
export async function startSyncEngine() {
    if (syncTimeout) return;
    
    // 0. Register device if online
    if (navigator.onLine) {
        registerCurrentDevice().catch(err => console.error('Device registration failed:', err));
    }
    
    // 1. Initial sync
    scheduleNextSync(100);
    
    // Also sync when coming back online
    window.addEventListener('online', handleOnline);
}

export async function stopSyncEngine() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
    }
    window.removeEventListener('online', handleOnline);
}

function handleOnline() {
    backoffMs = 1000;
    syncNow();
}

function scheduleNextSync(ms: number) {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(syncNow, ms);
}

/**
 * Trigger an immediate sync run (Push + Pull).
 */
export async function syncNow() {
    if (syncInProgress) return;
    if (!navigator.onLine) {
        scheduleNextSync(BASE_INTERVAL);
        return;
    }
    
    syncInProgress = true;
    try {
        const { clientId, lastSyncAt } = getPreferences();

        // 1. PUSH local changes
        const ops = await getPendingOps();
        let moreLocal = false;
        if (ops.length > 0) {
            const batch = ops.slice(0, 50);
            moreLocal = ops.length > 50;

            const payload = {
                client_id: clientId,
                operations: batch.map(op => ({
                    operation_id: op.id,
                    operation: op.op,
                    entity_type: op.entity_type,
                    entity_id: op.entity_id,
                    payload: op.payload,
                    client_updated_at: op.created_at,
                })),
            };
            
            const res = await api.post<{ operations: { operation_id: string; status: string }[] }>(
                '/api/sync/batch', 
                payload
            );
            
            const syncedIds = res.operations
                .filter(o => o.status === 'success' || o.status === 'already_synced')
                .map(o => o.operation_id);
                
            await markSynced(syncedIds);
        }

        // 2. PULL remote changes (Delta)
        const sinceParam = lastSyncAt ? `&since=${encodeURIComponent(lastSyncAt)}` : '';
        const deltaRes = await api.get<{ operations: any[], now: string }>(
            `/api/sync/delta?client_id=${clientId}${sinceParam}`
        );

        if (deltaRes.operations.length > 0) {
            await applyRemoteDeltas(deltaRes.operations);
        }

        // 3. Update lastSyncAt
        setPreferences({ lastSyncAt: deltaRes.now });

        // Success: reset backoff
        backoffMs = 1000;

        // If there were more local ops, or we got max deltas (500), trigger again soon
        if (moreLocal || deltaRes.operations.length >= 500) {
            scheduleNextSync(100);
        } else {
            scheduleNextSync(BASE_INTERVAL);
        }
    } catch (err) {
        console.error('Sync failed, backing off:', err);
        // Exponential backoff on error
        scheduleNextSync(backoffMs);
        backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);
    } finally {
        syncInProgress = false;
    }
}

async function applyRemoteDeltas(ops: any[]) {
    for (const op of ops) {
        try {
            if (op.entity_type === 'item') {
                if (op.operation === 'delete') {
                    await execLocal('UPDATE items SET archived = 1, local_updated_at = ? WHERE id = ?', [new Date().toISOString(), op.entity_id]);
                } else {
                    const it = op.payload;
                    if (!it) continue;
                    
                    await execLocal(
                        `INSERT INTO items (
                            id, user_id, org_id, item_type, title, url, description, notes, tags, 
                            ai_summary, ai_tags, why_saved, when_to_use, 
                            enrichment_status, is_favorite, archived, created_at, updated_at, local_updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            item_type=excluded.item_type, title=excluded.title, url=excluded.url,
                            description=excluded.description, notes=excluded.notes, tags=excluded.tags,
                            ai_summary=excluded.ai_summary, ai_tags=excluded.ai_tags, why_saved=excluded.why_saved,
                            when_to_use=excluded.when_to_use, enrichment_status=excluded.enrichment_status,
                            is_favorite=excluded.is_favorite, archived=excluded.archived,
                            updated_at=excluded.updated_at, local_updated_at=excluded.local_updated_at`,
                        [
                            it.id, it.user_id, it.org_id, it.item_type, it.title, it.url, it.description, it.notes,
                            JSON.stringify(it.tags || []), it.ai_summary, JSON.stringify(it.ai_tags || []),
                            it.why_saved, it.when_to_use, it.enrichment_status,
                            it.is_favorite ? 1 : 0, it.archived ? 1 : 0,
                            it.created_at, it.updated_at, new Date().toISOString()
                        ]
                    );
                }
            } else if (op.entity_type === 'runbook') {
                if (op.operation === 'delete') {
                    await execLocal('DELETE FROM runbooks WHERE id = ?', [op.entity_id]);
                    await execLocal('DELETE FROM runbook_steps WHERE runbook_id = ?', [op.entity_id]);
                } else {
                    const rb = op.payload;
                    await execLocal(
                        `INSERT INTO runbooks (id, user_id, org_id, item_id, title, description, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, updated_at=excluded.updated_at`,
                        [rb.id, rb.user_id, rb.org_id, rb.item_id, rb.title, rb.description, rb.created_at, rb.updated_at]
                    );
                }
            } else if (op.entity_type === 'runbook_step') {
                if (op.operation === 'delete') {
                    await execLocal('DELETE FROM runbook_steps WHERE id = ?', [op.entity_id]);
                } else {
                    const st = op.payload;
                    await execLocal(
                        `INSERT INTO runbook_steps (id, runbook_id, label, command, description, position, is_completed, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT(id) DO UPDATE SET 
                            label=excluded.label, command=excluded.command, description=excluded.description,
                            position=excluded.position, is_completed=excluded.is_completed, updated_at=excluded.updated_at`,
                        [st.id, st.runbook_id, st.label, st.command, st.description, st.position, st.is_completed ? 1 : 0, st.created_at, st.updated_at]
                    );
                }
            }
        } catch (err) {
            console.error(`Failed to apply delta ${op.operation_id}:`, err);
        }
    }
}

/**
 * Register this client as a device in the backend.
 */
export async function registerCurrentDevice() {
    const { clientId } = getPreferences();
    const isElectron = typeof (window as any).electronAPI !== 'undefined';
    
    try {
        await api.post('/api/me/devices/register', {
            client_id: clientId,
            name: isElectron ? 'Desktop App' : 'Web Browser',
            device_type: isElectron ? 'desktop' : 'web',
        });
    } catch (err) {
        // Silently fail, it's a best-effort background task
        console.warn('Silent device registration failure:', err);
    }
}
