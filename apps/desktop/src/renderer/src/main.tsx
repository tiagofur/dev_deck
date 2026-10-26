import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  clearTokens,
  configureApiClient,
  electronSafeStorageAdapter,
  getAccessToken,
  getRefreshToken,
  localStorageAdapter,
  setDesktopBridge,
  setTokenStorage,
  startSyncEngine,
} from '@heapdeck/api-client'
import { App } from './App'
import { detectShell } from './platform/shell'
import { installTauriShell } from './platform/tauri'
import '@heapdeck/ui/styles/globals.css'

// Register the desktop bridge and configure the shared api-client + auth
// storage BEFORE the first fetch. The renderer runs under one of three
// shells (see platform/shell.ts); only the browser shell (vitest, Vite dev in
// a tab, Playwright) falls back to token mode through Vite's /api proxy.
const { shell, bridge } = detectShell()
setDesktopBridge(bridge)
if (shell === 'tauri') installTauriShell()

// Electron keeps tokens in OS-encrypted safeStorage. Tauri uses localStorage
// until the keychain adapter lands (ADR 0006, phase 2). API URL defaults to
// localhost:8080.
setTokenStorage(shell === 'electron' ? electronSafeStorageAdapter : localStorageAdapter)

const isDesktopShell = shell !== 'browser'
const authMode = !isDesktopShell
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
  baseUrl: !isDesktopShell ? '' : (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8080'),
  authMode,
  staticToken: !isDesktopShell
    ? (import.meta.env.VITE_API_TOKEN || 'test-api-token')
    : (import.meta.env.VITE_API_TOKEN || undefined),
})

startSyncEngine().catch((err) => console.error('Failed to start sync engine:', err))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
