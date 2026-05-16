import { SQLocal } from 'sqlocal';
import { LOCAL_SCHEMA } from './schema';

/**
 * Universal interface for local database access.
 * Allows switching between OPFS (Web), IPC (Electron), or Native (Mobile).
 */
export interface DatabaseAdapter {
    exec(sql: string, params?: any[]): Promise<void>;
    query<T extends Record<string, any>>(sql: string, params?: any[]): Promise<T[]>;
}

/**
 * OPFS implementation using sqlocal.
 * Standard for Web and current Desktop implementation.
 */
class OPFSAdapter implements DatabaseAdapter {
    private client: SQLocal;
    private initialized = false;

    constructor(dbName: string) {
        this.client = new SQLocal(dbName);
    }

    async init() {
        if (this.initialized) return;
        try {
            await this.client.exec(LOCAL_SCHEMA, []);
            this.initialized = true;
        } catch (err) {
            console.error('Failed to initialize local DB schema:', err);
            throw err;
        }
    }

    async exec(sql: string, params: any[] = []): Promise<void> {
        await this.init();
        await this.client.exec(sql, params);
    }

    async query<T extends Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
        await this.init();
        return this.client.sql<T>(sql, ...params);
    }
}

// Global instance of the active adapter
let adapter: DatabaseAdapter | null = null;

/**
 * Set the database adapter. Useful for mobile bridge.
 */
export function setDatabaseAdapter(customAdapter: DatabaseAdapter) {
    adapter = customAdapter;
}

/**
 * Get or initialize the default adapter.
 */
export function getAdapter(): DatabaseAdapter {
    if (!adapter) {
        adapter = new OPFSAdapter('devdeck.db');
    }
    return adapter;
}

/**
 * High-level helper for query operations.
 */
export async function queryLocal<T extends Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
    return getAdapter().query<T>(sql, params);
}

/**
 * High-level helper for write operations.
 */
export async function execLocal(sql: string, params: any[] = []): Promise<void> {
    return getAdapter().exec(sql, params);
}

/**
 * Legacy export for backward compatibility where direct access is needed.
 * @deprecated Use queryLocal or execLocal instead.
 */
export async function getLocalDB(): Promise<any> {
    const a = getAdapter();
    if (a instanceof OPFSAdapter) {
        return (a as any).client;
    }
    throw new Error('LocalDB direct access only available in OPFS mode');
}
