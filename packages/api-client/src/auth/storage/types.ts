// TokenStorage interface — apps inject an implementation at startup.
//
// Desktop injects `electronSafeStorageAdapter` (OS keychain via contextBridge).
// Web (and dev) inject `localStorageAdapter`.
//
// The singleton `current` is read every time auth.ts is called, so callers
// always hit whatever adapter the app registered.

export interface TokenStorage {
  getAccess(): string | null
  getRefresh(): string | null
  setTokens(access: string, refresh: string): void
  clear(): void
}

const noopThrow: TokenStorage = {
  getAccess() {
    throw new Error(
      '[@devdeck/api-client] TokenStorage not configured. Call setTokenStorage() in your app entrypoint before using auth helpers.',
    )
  },
  getRefresh() {
    throw new Error('[@devdeck/api-client] TokenStorage not configured.')
  },
  setTokens() {
    throw new Error('[@devdeck/api-client] TokenStorage not configured.')
  },
  clear() {
    throw new Error('[@devdeck/api-client] TokenStorage not configured.')
  },
}

let current: TokenStorage = noopThrow

export function setTokenStorage(storage: TokenStorage): void {
  current = storage
}

export function getTokenStorage(): TokenStorage {
  return current
}
