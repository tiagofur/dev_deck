import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isLoggedIn,
  parseTokensFromFragment,
  parseTokensFromQuery,
} from './auth'
import { setTokenStorage } from './storage/types'
import { localStorageAdapter } from './storage/localStorage'

describe('auth (browser fallback)', () => {
  beforeAll(() => {
    setTokenStorage(localStorageAdapter)
  })

  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('returns null when no tokens are stored', () => {
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(isLoggedIn()).toBe(false)
  })

  it('round-trips tokens through localStorage', () => {
    setTokens('access-1', 'refresh-1')
    expect(getAccessToken()).toBe('access-1')
    expect(getRefreshToken()).toBe('refresh-1')
    expect(isLoggedIn()).toBe(true)
  })

  it('clearTokens removes both keys', () => {
    setTokens('a', 'b')
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('parseTokensFromFragment extracts and stores tokens', () => {
    window.location.hash = '#access_token=ACC&refresh_token=REF&expires_in=3600'
    const result = parseTokensFromFragment()
    expect(result).toEqual({ access: 'ACC', refresh: 'REF' })
    expect(getAccessToken()).toBe('ACC')
    expect(getRefreshToken()).toBe('REF')
    // Hash is cleared after parsing.
    expect(window.location.hash).toBe('')
  })

  it('parseTokensFromFragment returns null for empty fragment', () => {
    expect(parseTokensFromFragment()).toBeNull()
  })

  it('parseTokensFromFragment stores access-only callbacks (cookie mode)', () => {
    window.location.hash = '#access_token=only-access'
    const result = parseTokensFromFragment()
    expect(result).toEqual({ access: 'only-access', refresh: null })
    expect(getAccessToken()).toBe('only-access')
    expect(getRefreshToken()).toBeNull()
  })

  it('parseTokensFromQuery stores tokens and strips them from the URL', () => {
    window.history.replaceState(null, '', '/auth/callback?token=ACC&refresh_token=REF')
    const result = parseTokensFromQuery()
    expect(result).toEqual({ access: 'ACC', refresh: 'REF' })
    expect(getAccessToken()).toBe('ACC')
    expect(getRefreshToken()).toBe('REF')
    // The query string must not survive in history, Referer or logs.
    expect(window.location.search).toBe('')
  })

  it('parseTokensFromQuery accepts access-only callbacks (cookie mode) and cleans the URL', () => {
    window.history.replaceState(null, '', '/auth/callback?token=COOKIE-ACC')
    const result = parseTokensFromQuery()
    expect(result).toEqual({ access: 'COOKIE-ACC', refresh: null })
    expect(getAccessToken()).toBe('COOKIE-ACC')
    expect(getRefreshToken()).toBeNull()
    expect(window.location.search).toBe('')
  })

  it('parseTokensFromQuery returns null without a token', () => {
    window.history.replaceState(null, '', '/auth/callback?error=denied')
    expect(parseTokensFromQuery()).toBeNull()
  })
})
