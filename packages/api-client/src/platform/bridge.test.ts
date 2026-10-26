import { describe, it, expect, afterEach } from 'vitest'
import { getDesktopBridge, isDesktopApp, setDesktopBridge, type DesktopBridge } from './bridge'

function fakeBridge(kind: DesktopBridge['kind'] = 'electron'): DesktopBridge {
  return {
    kind,
    auth: {
      openExternal: () => {},
      getPendingCallbackURL: () => null,
      onCallbackURL: () => () => {},
    },
    onShortcut: () => () => {},
    shortcuts: {
      getStatus: async () => ({}),
      getConfig: async () => ({ enabled: true, search: '', add: '' }),
      setConfig: async (config) => config,
      onStatus: () => () => {},
    },
    shell: { runCommand: async () => '' },
    project: {
      detectCurrent: async () => ({ name: '', path: '', gitRemote: '', gitSlug: '' }),
    },
    apiTester: {
      send: async () => ({ status: 200, statusText: 'OK', durationMs: 0, headers: {}, body: '' }),
    },
  }
}

describe('DesktopBridge registry', () => {
  afterEach(() => {
    setDesktopBridge(null)
  })

  it('has no bridge by default (web)', () => {
    expect(getDesktopBridge()).toBeNull()
    expect(isDesktopApp()).toBe(false)
  })

  it('returns the registered bridge and reports desktop', () => {
    const bridge = fakeBridge('tauri')
    setDesktopBridge(bridge)
    expect(getDesktopBridge()).toBe(bridge)
    expect(getDesktopBridge()?.kind).toBe('tauri')
    expect(isDesktopApp()).toBe(true)
  })

  it('can be reset to null', () => {
    setDesktopBridge(fakeBridge())
    setDesktopBridge(null)
    expect(getDesktopBridge()).toBeNull()
    expect(isDesktopApp()).toBe(false)
  })
})
