import { describe, it, expect, afterEach, vi } from 'vitest'
import { createElectronBridge, type ElectronPreloadAPI } from './electron'

type WindowWithPreload = Window & { electronAPI?: Partial<ElectronPreloadAPI> }

function installPreload(api: Partial<ElectronPreloadAPI> | undefined) {
  ;(window as unknown as WindowWithPreload).electronAPI = api
}

function fakePreload(): ElectronPreloadAPI {
  return {
    store: {
      getToken: vi.fn(() => 'acc'),
      getRefreshToken: vi.fn(() => 'ref'),
      setTokens: vi.fn(),
      clearTokens: vi.fn(),
    },
    onShortcut: vi.fn(() => () => {}),
    shortcuts: {
      getStatus: vi.fn(async () => ({ search: { accelerator: 'CommandOrControl+K', registered: true } })),
      getConfig: vi.fn(async () => ({ enabled: true, search: 'CommandOrControl+K', add: 'CommandOrControl+N' })),
      setConfig: vi.fn(async (config) => config),
      onStatus: vi.fn(() => () => {}),
    },
    auth: {
      openExternal: vi.fn(),
      getPendingCallbackURL: vi.fn(() => 'heapdeck://auth/callback?token=t'),
      onCallbackURL: vi.fn(() => () => {}),
    },
    shell: { runCommand: vi.fn(async () => 'out') },
    project: {
      detectCurrent: vi.fn(async () => ({ name: 'hd', path: '/p', gitRemote: 'r', gitSlug: 's' })),
    },
    apiTester: {
      send: vi.fn(async () => ({ status: 201, statusText: 'Created', durationMs: 5, headers: {}, body: '{}' })),
    },
  }
}

describe('createElectronBridge', () => {
  afterEach(() => {
    installPreload(undefined)
  })

  it('returns null when window.electronAPI is absent', () => {
    installPreload(undefined)
    expect(createElectronBridge()).toBeNull()
  })

  it('returns null when the preload exposes an incomplete bridge', () => {
    const { apiTester: _omitted, ...incomplete } = fakePreload()
    installPreload(incomplete)
    expect(createElectronBridge()).toBeNull()
  })

  it('reports the electron shell kind', () => {
    installPreload(fakePreload())
    expect(createElectronBridge()?.kind).toBe('electron')
  })

  it('delegates every call to the preload with the same arguments and results', async () => {
    const preload = fakePreload()
    installPreload(preload)
    const bridge = createElectronBridge()!

    bridge.auth.openExternal('https://example.com')
    expect(preload.auth.openExternal).toHaveBeenCalledWith('https://example.com')
    expect(bridge.auth.getPendingCallbackURL()).toBe('heapdeck://auth/callback?token=t')

    await expect(bridge.shell.runCommand('ls')).resolves.toBe('out')
    expect(preload.shell.runCommand).toHaveBeenCalledWith('ls')

    await expect(bridge.project.detectCurrent()).resolves.toEqual({
      name: 'hd',
      path: '/p',
      gitRemote: 'r',
      gitSlug: 's',
    })

    const request = { method: 'POST', url: 'https://api', headers: { a: 'b' }, body: '{}' }
    await expect(bridge.apiTester.send(request)).resolves.toMatchObject({ status: 201 })
    expect(preload.apiTester.send).toHaveBeenCalledWith(request)

    await expect(bridge.shortcuts.getStatus()).resolves.toEqual({
      search: { accelerator: 'CommandOrControl+K', registered: true },
    })
    const config = { enabled: false, search: 'Alt+K', add: 'Alt+N' }
    await expect(bridge.shortcuts.setConfig(config)).resolves.toEqual(config)
    expect(preload.shortcuts.setConfig).toHaveBeenCalledWith(config)
  })

  it('passes listeners through and returns the preload unsubscribe', () => {
    const preload = fakePreload()
    const unsubscribe = vi.fn()
    vi.mocked(preload.onShortcut).mockReturnValue(unsubscribe)
    vi.mocked(preload.auth.onCallbackURL).mockReturnValue(unsubscribe)
    vi.mocked(preload.shortcuts.onStatus).mockReturnValue(unsubscribe)
    installPreload(preload)
    const bridge = createElectronBridge()!

    const onShortcut = vi.fn()
    expect(bridge.onShortcut(onShortcut)).toBe(unsubscribe)
    expect(preload.onShortcut).toHaveBeenCalledWith(onShortcut)

    const onCallback = vi.fn()
    expect(bridge.auth.onCallbackURL(onCallback)).toBe(unsubscribe)
    expect(preload.auth.onCallbackURL).toHaveBeenCalledWith(onCallback)

    const onStatus = vi.fn()
    expect(bridge.shortcuts.onStatus(onStatus)).toBe(unsubscribe)
    expect(preload.shortcuts.onStatus).toHaveBeenCalledWith(onStatus)
  })
})
