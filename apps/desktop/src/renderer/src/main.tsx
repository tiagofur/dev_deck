import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  configureApiClient,
  electronSafeStorageAdapter,
  localStorageAdapter,
  setTokenStorage,
} from '@devdeck/api-client'
import { App } from './App'
import '@devdeck/ui/styles/globals.css'

// Configure the shared api-client + auth storage BEFORE the first fetch.
// Desktop: use Electron safeStorage when available, fall back to localStorage
// for tests or dev-in-browser. API URL defaults to localhost:8080.
const isElectron =
  typeof window !== 'undefined' && !!(window as unknown as { electronAPI?: unknown }).electronAPI

setTokenStorage(isElectron ? electronSafeStorageAdapter : localStorageAdapter)

configureApiClient({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  authMode: (import.meta.env.VITE_AUTH_MODE as 'jwt' | 'token') || 'token',
  staticToken: import.meta.env.VITE_API_TOKEN || undefined,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
