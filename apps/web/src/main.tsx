import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  clearTokens,
  configureApiClient,
  getAccessToken,
  getRefreshToken,
  localStorageAdapter,
  setTokenStorage,
} from '@devdeck/api-client'
import { App } from './App'
import '@devdeck/ui/styles/globals.css'

// Configure the shared api-client + auth storage BEFORE the first fetch.
// Web: always localStorage, and requests go through the Vite proxy
// (baseUrl='') to the backend at http://localhost:8080 in dev, or same-origin
// in production.
setTokenStorage(localStorageAdapter)

const authMode = import.meta.env.VITE_AUTH_MODE ?? 'jwt'

// Token mode used to persist the same static token in both access/refresh slots.
// If we later switch the web app back to JWT mode, that legacy pair would still
// look "logged in" and bypass /login until the user manually cleared storage.
if (authMode === 'jwt') {
  const access = getAccessToken()
  const refresh = getRefreshToken()
  if (access && refresh && access === refresh) {
    clearTokens()
  }
}

configureApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  authMode,
  staticToken: import.meta.env.VITE_API_TOKEN,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
