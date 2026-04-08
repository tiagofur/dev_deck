import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  configureApiClient,
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

configureApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  authMode: import.meta.env.VITE_AUTH_MODE ?? 'jwt',
  staticToken: import.meta.env.VITE_API_TOKEN,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
