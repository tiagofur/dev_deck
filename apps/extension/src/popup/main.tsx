import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  configureApiClient,
  setTokenStorage,
  startSyncEngine,
} from '@devdeck/api-client'
import { Popup } from './Popup'
import '../../src/index.css' // We'll need a tailwind entry

/**
 * Storage adapter for Chrome Extension storage.
 */
const chromeStorageAdapter = {
  getAccess: () => {
    // Note: async storage needs to be handled carefully with the current sync api-client
    // For now, we'll try to use a cached version or refactor api-client to support async storage.
    return localStorage.getItem('devdeck.access_token')
  },
  getRefresh: () => localStorage.getItem('devdeck.refresh_token'),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem('devdeck.access_token', access)
    localStorage.setItem('devdeck.refresh_token', refresh)
    chrome.storage.local.set({ access, refresh })
  },
  clear: () => {
    localStorage.clear()
    chrome.storage.local.remove(['access', 'refresh'])
  },
}

setTokenStorage(chromeStorageAdapter)

configureApiClient({
  baseUrl: 'http://localhost:8080', // Default for dev
  authMode: 'jwt',
})

startSyncEngine().catch(console.error)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)
