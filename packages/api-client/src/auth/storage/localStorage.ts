// Browser localStorage adapter. Used in web and in Electron dev-mode
// when running outside the Electron harness (e.g. vitest).
//
// Cookie mode (ADR 0004): the web may hold an access token with no refresh
// token (the refresh lives in an HttpOnly cookie), so an empty refresh is
// stored as "absent" rather than as an empty string.

import type { TokenStorage } from './types'

const ACCESS_KEY = 'heapdeck_access_token'
const REFRESH_KEY = 'heapdeck_refresh_token'

export const localStorageAdapter: TokenStorage = {
  getAccess() {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(ACCESS_KEY)
  },
  getRefresh() {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(REFRESH_KEY)
  },
  setTokens(access, refresh) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh)
    } else {
      localStorage.removeItem(REFRESH_KEY)
    }
  },
  clear() {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
