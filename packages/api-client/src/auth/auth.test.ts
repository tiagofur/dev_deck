import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isLoggedIn,
  parseTokensFromFragment,
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

  it('parseTokensFromFragment returns null for incomplete fragment', () => {
    window.location.hash = '#access_token=only-access'
    expect(parseTokensFromFragment()).toBeNull()
  })
})
