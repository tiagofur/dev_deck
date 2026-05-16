import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  clearTokens,
  configureApiClient,
  electronSafeStorageAdapter,
  getAccessToken,
  getRefreshToken,
  localStorageAdapter,
  setTokenStorage,
  startSyncEngine,
} from '@devdeck/api-client'
import { App } from './App'
import '@devdeck/ui/styles/globals.css'

// Configure the shared api-client + auth storage BEFORE the first fetch.
// Desktop: use Electron safeStorage when available, fall back to localStorage
// for tests or dev-in-browser. API URL defaults to localhost:8080.
const isElectron =
  typeof window !== 'undefined' && !!(window as unknown as { electronAPI?: unknown }).electronAPI

setTokenStorage(isElectron ? electronSafeStorageAdapter : localStorageAdapter)

const authMode = (import.meta.env.VITE_AUTH_MODE as 'jwt' | 'token' | undefined) ?? 'jwt'

if (authMode === 'jwt') {
  const access = getAccessToken()
  const refresh = getRefreshToken()
  if (access && refresh && access === refresh) {
    clearTokens()
  }
}

configureApiClient({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  authMode,
  staticToken: import.meta.env.VITE_API_TOKEN || undefined,
})

startSyncEngine().catch((err) => console.error('Failed to start sync engine:', err))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
