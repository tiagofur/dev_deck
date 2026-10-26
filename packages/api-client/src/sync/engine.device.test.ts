import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../local-db/client', () => ({
    execLocal: vi.fn(async () => {}),
    queryLocal: vi.fn(async () => []),
}))

vi.mock('../auth/auth', () => ({
    isLoggedIn: vi.fn(() => true),
}))

vi.mock('../preferences', () => ({
    getPreferences: vi.fn(() => ({ clientId: 'test-client', lastSyncAt: null })),
    setPreferences: vi.fn(),
}))

vi.mock('../api-client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(async () => ({})),
    },
}))

vi.mock('./queue', () => ({
    getPendingOps: vi.fn(async () => []),
    markSynced: vi.fn(),
}))

// ── Import after mocks ─────────────────────────────────────────────
import { api } from '../api-client'
import { isLoggedIn } from '../auth/auth'
import { setDesktopBridge, type DesktopBridge } from '../platform/bridge'
import { registerCurrentDevice } from './engine'

const bridge = { kind: 'electron' } as DesktopBridge

describe('registerCurrentDevice', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockClear()
        vi.mocked(isLoggedIn).mockReturnValue(true)
    })

    afterEach(() => {
        setDesktopBridge(null)
    })

    it('registers as a web browser when no desktop bridge is set', async () => {
        await registerCurrentDevice()
        expect(api.post).toHaveBeenCalledWith('/api/me/devices/register', {
            client_id: 'test-client',
            name: 'Web Browser',
            device_type: 'web',
        })
    })

    it('registers as a desktop app when a desktop bridge is set', async () => {
        setDesktopBridge(bridge)
        await registerCurrentDevice()
        expect(api.post).toHaveBeenCalledWith('/api/me/devices/register', {
            client_id: 'test-client',
            name: 'Desktop App',
            device_type: 'desktop',
        })
    })

    it('does nothing when logged out', async () => {
        vi.mocked(isLoggedIn).mockReturnValue(false)
        await registerCurrentDevice()
        expect(api.post).not.toHaveBeenCalled()
    })
})
