// Auth helpers — storage layer.
//
// In Electron: delegates to main process via contextBridge (safeStorage / OS keychain).
// In browser (fallback / dev): plain localStorage.

const ACCESS_KEY = 'devdeck_access_token'
const REFRESH_KEY = 'devdeck_refresh_token'

const isElectron =
  typeof window !== 'undefined' && !!(window as any).electronAPI

export function getAccessToken(): string | null {
  if (isElectron) return (window as any).electronAPI.store.getToken()
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (isElectron) return (window as any).electronAPI.store.getRefreshToken()
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access: string, refresh: string) {
  if (isElectron) {
    ;(window as any).electronAPI.store.setTokens(access, refresh)
    return
  }
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  if (isElectron) {
    ;(window as any).electronAPI.store.clearTokens()
    return
  }
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function isLoggedIn(): boolean {
  return !!getAccessToken()
}

// Parse tokens from URL fragment (after OAuth callback).
// Fragment format: #access_token=xxx&refresh_token=xxx&expires_in=3600
export function parseTokensFromFragment(): { access: string; refresh: string } | null {
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
