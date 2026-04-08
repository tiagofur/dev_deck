// Browser localStorage adapter. Used in web and in Electron dev-mode
// when running outside the Electron harness (e.g. vitest).

import type { TokenStorage } from './types'

const ACCESS_KEY = 'devdeck_access_token'
const REFRESH_KEY = 'devdeck_refresh_token'

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
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
