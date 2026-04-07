// Tiny fetch wrapper. Handles base URL, bearer token, and the
// `{error: {code, message}}` envelope our Go backend returns.
// Also handles JWT auto-refresh on 401.

import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const API_TOKEN = import.meta.env.VITE_API_TOKEN || ''
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'token' // 'token' or 'jwt'

export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// Refresh lock to prevent concurrent refreshes.
let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const rt = getRefreshToken()
    if (!rt) return false
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      })
      if (!res.ok) {
        clearTokens()
        return false
      }
      const data = await res.json()
      setTokens(data.access_token, data.refresh_token)
      return true
    } catch {
      clearTokens()
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

function getBearerToken(): string {
  if (AUTH_MODE === 'jwt') {
    return getAccessToken() ?? ''
  }
  return API_TOKEN
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getBearerToken()}`,
      ...(init.headers || {}),
    },
  })

  // Auto-refresh on 401 for JWT mode.
  if (res.status === 401 && AUTH_MODE === 'jwt' && getRefreshToken()) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      // Retry the original request with new token.
      const retryRes = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getBearerToken()}`,
          ...(init.headers || {}),
        },
      })
      if (!retryRes.ok) {
        let code = 'UNKNOWN'
        let message = retryRes.statusText || `HTTP ${retryRes.status}`
        try {
          const body = (await retryRes.json()) as { error?: { code?: string; message?: string } }
          if (body?.error?.code) code = body.error.code
          if (body?.error?.message) message = body.error.message
        } catch { /* keep defaults */ }
        throw new APIError(retryRes.status, code, message)
      }
      if (retryRes.status === 204) return undefined as T
      return (await retryRes.json()) as T
    }
  }

  if (!res.ok) {
    let code = 'UNKNOWN'
    let message = res.statusText || `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } }
      if (body?.error?.code) code = body.error.code
      if (body?.error?.message) message = body.error.message
    } catch {
      /* body wasn't JSON — keep defaults */
    }
    throw new APIError(res.status, code, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
