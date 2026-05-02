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
  const refresh = getRefreshToken()
  if (authMode === 'jwt' && refresh) {
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    }).catch(() => undefined)
  }
  clearTokens()
}

export async function registerUser(email: string, password: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/auth/register', { email, password })
}

export async function loginLocal(email: string, password: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const pair = await api.post<{ access_token: string; refresh_token: string; expires_in: number }>('/api/auth/login', { email, password })
  setTokens(pair.access_token, pair.refresh_token)
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
