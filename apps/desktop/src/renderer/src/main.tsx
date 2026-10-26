import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  clearTokens,
  configureApiClient,
  createElectronBridge,
  electronSafeStorageAdapter,
  getAccessToken,
  getRefreshToken,
  isDesktopApp,
  localStorageAdapter,
  setDesktopBridge,
  setTokenStorage,
  startSyncEngine,
} from '@heapdeck/api-client'
import { App } from './App'
import '@heapdeck/ui/styles/globals.css'

// Register the desktop bridge and configure the shared api-client + auth
// storage BEFORE the first fetch. Inside Electron the preload exposes the
// native bridge and tokens live in OS-encrypted safeStorage; outside it
// (vitest, browser dev, e2e) there is no bridge and we fall back to
// localStorage. API URL defaults to localhost:8080.
setDesktopBridge(createElectronBridge())
const isDesktop = isDesktopApp()

setTokenStorage(isDesktop ? electronSafeStorageAdapter : localStorageAdapter)

// In E2E tests/browser-dev (no bridge), force 'token' authMode and empty
// baseUrl to use Vite's local /api proxy.
const authMode = !isDesktop
  ? 'token'
  : ((import.meta.env.VITE_AUTH_MODE as 'jwt' | 'token' | undefined) ?? 'jwt')

if (authMode === 'jwt') {
  const access = getAccessToken()
  const refresh = getRefreshToken()
  if (access && refresh && access === refresh) {
    clearTokens()
  }
}

configureApiClient({
  baseUrl: !isDesktop ? '' : (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080'),
  authMode,
  staticToken: !isDesktop
    ? (import.meta.env.VITE_API_TOKEN || 'test-api-token')
    : (import.meta.env.VITE_API_TOKEN || undefined),
})

startSyncEngine().catch((err) => console.error('Failed to start sync engine:', err))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
