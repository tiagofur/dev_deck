import type { TokenStorage } from '@devdeck/api-client'

const ACCESS = 'devdeck.access_token'
const REFRESH = 'devdeck.refresh_token'

// Shared token storage for the popup and options pages. Tokens are kept in
// localStorage (the sync TokenStorage API the api-client expects) and mirrored
// into chrome.storage.local under `access`/`refresh` so the background service
// worker — which has no localStorage — can read the access token.
export const chromeStorageAdapter: TokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS, access)
    localStorage.setItem(REFRESH, refresh)
    void chrome.storage.local.set({ access, refresh })
  },
  clear: () => {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
    void chrome.storage.local.remove(['access', 'refresh'])
  },
}
