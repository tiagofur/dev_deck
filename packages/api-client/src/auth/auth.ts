// Auth helpers — thin wrapper over the injected TokenStorage.
//
// Apps register an adapter (localStorage or Electron safeStorage) via
// `setTokenStorage()` in their entrypoint. All helpers below delegate to
// `getTokenStorage()` at call time, so swapping adapters in tests works.

import { getTokenStorage } from './storage/types'

export function getAccessToken(): string | null {
  return getTokenStorage().getAccess()
}

export function getRefreshToken(): string | null {
  return getTokenStorage().getRefresh()
}

export function setTokens(access: string, refresh: string): void {
  getTokenStorage().setTokens(access, refresh)
}

export function clearTokens(): void {
  getTokenStorage().clear()
}

export function isLoggedIn(): boolean {
  return !!getAccessToken()
}

// Parse tokens from URL fragment (after OAuth callback).
// Fragment format: #access_token=xxx&refresh_token=xxx&expires_in=3600
export function parseTokensFromFragment(): { access: string; refresh: string } | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.substring(1)
  if (!hash) return null
  const params = new URLSearchParams(hash)
  const access = params.get('access_token')
  const refresh = params.get('refresh_token')
  if (!access || !refresh) return null
  setTokens(access, refresh)
  window.location.hash = ''
  return { access, refresh }
}

// Parse tokens from URL query string (web OAuth callback).
// Query format: ?token=xxx&refresh_token=xxx
export function parseTokensFromQuery(): { access: string; refresh: string } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const access = params.get('token') ?? params.get('access_token')
  const refresh = params.get('refresh_token')
  if (!access || !refresh) return null
  setTokens(access, refresh)
  return { access, refresh }
}
