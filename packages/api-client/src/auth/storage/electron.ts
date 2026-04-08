// Electron safeStorage adapter. Delegates to the contextBridge exposed
// by the desktop preload script (`window.electronAPI.store.*`), which
// reads/writes encrypted tokens via the OS keychain.

import type { TokenStorage } from './types'

interface ElectronAPI {
  store: {
    getToken(): string | null
    getRefreshToken(): string | null
    setTokens(access: string, refresh: string): void
    clearTokens(): void
  }
}

function api(): ElectronAPI | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { electronAPI?: ElectronAPI }).electronAPI ?? null
}

export const electronSafeStorageAdapter: TokenStorage = {
  getAccess() {
    return api()?.store.getToken() ?? null
  },
  getRefresh() {
    return api()?.store.getRefreshToken() ?? null
  },
  setTokens(access, refresh) {
    api()?.store.setTokens(access, refresh)
  },
  clear() {
    api()?.store.clearTokens()
  },
}
