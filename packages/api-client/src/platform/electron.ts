// Electron implementation of DesktopBridge. Wraps the contextBridge API the
// desktop preload script exposes as `window.electronAPI`. This is the only
// place outside the Electron app itself that knows that global exists.

import type {
  ApiTesterRequest,
  ApiTesterResponse,
  DesktopBridge,
  DesktopProjectContext,
  GlobalShortcutConfig,
  GlobalShortcutStatus,
} from './bridge'

/**
 * Full contract of `window.electronAPI`. The preload script `satisfies` this
 * type so the shape it exposes and the shape this adapter consumes cannot
 * drift apart. `store` is consumed by `electronSafeStorageAdapter`, the rest
 * by `createElectronBridge`.
 */
export interface ElectronPreloadAPI {
  store: {
    getToken(): string | null
    getRefreshToken(): string | null
    setTokens(access: string, refresh: string): void
    clearTokens(): void
  }
  onShortcut(callback: (name: string) => void): () => void
  shortcuts: {
    getStatus(): Promise<Record<string, GlobalShortcutStatus>>
    getConfig(): Promise<GlobalShortcutConfig>
    setConfig(config: GlobalShortcutConfig): Promise<GlobalShortcutConfig>
    onStatus(callback: (status: Record<string, GlobalShortcutStatus>) => void): () => void
  }
  auth: {
    openExternal(url: string): void
    getPendingCallbackURL(): string | null
    onCallbackURL(callback: (url: string) => void): () => void
  }
  shell: {
    runCommand(cmd: string): Promise<string>
  }
  project: {
    detectCurrent(): Promise<DesktopProjectContext>
  }
  apiTester: {
    send(request: ApiTesterRequest): Promise<ApiTesterResponse>
  }
}

function preloadAPI(): ElectronPreloadAPI | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as unknown as { electronAPI?: Partial<ElectronPreloadAPI> }).electronAPI
  if (
    !candidate ||
    typeof candidate.onShortcut !== 'function' ||
    !candidate.shortcuts ||
    !candidate.auth ||
    !candidate.shell ||
    !candidate.project ||
    !candidate.apiTester
  ) {
    return null
  }
  return candidate as ElectronPreloadAPI
}

/**
 * Builds the Electron bridge from `window.electronAPI`, or returns null when
 * the renderer is not running inside Electron (vitest, browser dev, e2e).
 */
export function createElectronBridge(): DesktopBridge | null {
  const api = preloadAPI()
  if (!api) return null

  return {
    kind: 'electron',
    auth: {
      openExternal: (url) => api.auth.openExternal(url),
      getPendingCallbackURL: () => api.auth.getPendingCallbackURL(),
      onCallbackURL: (callback) => api.auth.onCallbackURL(callback),
    },
    onShortcut: (callback) => api.onShortcut(callback),
    shortcuts: {
      getStatus: () => api.shortcuts.getStatus(),
      getConfig: () => api.shortcuts.getConfig(),
      setConfig: (config) => api.shortcuts.setConfig(config),
      onStatus: (callback) => api.shortcuts.onStatus(callback),
    },
    shell: {
      runCommand: (cmd) => api.shell.runCommand(cmd),
    },
    project: {
      detectCurrent: () => api.project.detectCurrent(),
    },
    apiTester: {
      send: (request) => api.apiTester.send(request),
    },
  }
}
