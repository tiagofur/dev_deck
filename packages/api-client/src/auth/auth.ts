// Auth helpers — thin wrapper over the injected TokenStorage.
//
// Apps register an adapter (localStorage or Electron safeStorage) via
// `setTokenStorage()` in their entrypoint. All helpers below delegate to
// `getTokenStorage()` at call time, so swapping adapters in tests works.

import { getTokenStorage } from './storage/types'
import { getConfig } from '../config'
import { api } from '../api-client'

export function getAccessToken(): string | null {
  return getTokenStorage().getAccess()
}

export function getRefreshToken(): string | null {
  return getTokenStorage().getRefresh()
}

export function setTokens(access: string, refresh?: string | null): void {
  getTokenStorage().setTokens(access, refresh ?? '')
}

export function clearTokens(): void {
  getTokenStorage().clear()
}

export function isLoggedIn(): boolean {
  return !!getAccessToken()
}

// Parse tokens from URL fragment (after OAuth callback).
// Fragment format: #access_token=xxx&refresh_token=xxx
// Cookie mode (ADR 0004) may omit the refresh token: it lives in an
// HttpOnly cookie instead of the URL.
export function parseTokensFromFragment(): { access: string; refresh: string | null } | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.substring(1)
  if (!hash) return null
  const params = new URLSearchParams(hash)
  const access = params.get('access_token')
  if (!access) return null
  const refresh = params.get('refresh_token')
  setTokens(access, refresh)
  window.location.hash = ''
  return { access, refresh }
}

// Parse tokens from URL query string (web OAuth callback).
// Query format: ?token=xxx&refresh_token=xxx — cookie mode omits the refresh
// token (HttpOnly cookie) but the access token must still leave the URL:
// query strings outlive the callback in history, Referer and proxy logs.
export function parseTokensFromQuery(): { access: string; refresh: string | null } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const access = params.get('token') ?? params.get('access_token')
  if (!access) return null
  const refresh = params.get('refresh_token')
  setTokens(access, refresh)
  window.history.replaceState(window.history.state, '', window.location.pathname)
  return { access, refresh }
}

export function parseAuthErrorFromQuery(): { code: string; message: string } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const code = params.get('error')
  if (!code) return null
  return {
    code,
    message: params.get('error_description') ?? code,
  }
}

export interface AuthProviderInfo {
  provider: 'github' | 'google' | 'apple'
  label: string
}

export async function fetchAuthProviders(): Promise<AuthProviderInfo[]> {
  const { baseUrl } = getConfig()
  const res = await fetch(`${baseUrl}/api/auth/providers`)
  if (!res.ok) {
    throw new Error(`Failed to load auth providers (${res.status})`)
  }
  const body = (await res.json()) as { providers?: AuthProviderInfo[] }
  return body.providers ?? []
}

export async function logoutCurrentSession(): Promise<void> {
  const { baseUrl, authMode } = getConfig()
  if (authMode === 'jwt') {
    const refresh = getRefreshToken()
    // Cookie mode (ADR 0004): credentials carry the HttpOnly refresh cookie;
    // the backend resolves the session from the cookie and clears it.
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refresh ? { refresh_token: refresh } : {}),
    }).catch(() => undefined)
  }
  clearTokens()
}

export async function registerUser(email: string, password: string, inviteCode?: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/auth/register', { email, password, invite_code: inviteCode })
}

export interface LoginStep1Response {
  type: 'password' | 'saml'
  login_url?: string
}

export async function loginStep1(email: string): Promise<LoginStep1Response> {
  return api.post<LoginStep1Response>('/api/auth/login-step1', { email })
}

export interface LocalLoginResult {
  access_token: string
  expires_in: number
  // Cookie mode still returns the pair additively (desktop/extension need
  // it); web callers may receive no refresh token when the server withholds
  // it in favor of the HttpOnly cookie.
  refresh_token?: string
}

export async function loginLocal(email: string, password: string): Promise<LocalLoginResult> {
  const pair = await api.post<LocalLoginResult>('/api/auth/login', { email, password })
  setTokens(pair.access_token, pair.refresh_token ?? null)
  return pair
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/auth/forgot-password', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/auth/reset-password', { token, new_password: newPassword })
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/auth/change-password', { current_password: currentPassword, new_password: newPassword })
}
