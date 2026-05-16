import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  configureApiClient,
  setTokenStorage,
} from '@devdeck/api-client'
import { Options } from './Options'
import '../../src/index.css'

const chromeStorageAdapter = {
  getAccess: () => localStorage.getItem('devdeck.access_token'),
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
  baseUrl: 'http://localhost:8080',
  authMode: 'jwt',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
)
