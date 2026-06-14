import React from 'react'
import ReactDOM from 'react-dom/client'
import { configureApiClient, setTokenStorage, startSyncEngine } from '@devdeck/api-client'
import { Popup } from './Popup'
import { chromeStorageAdapter } from '../lib/storage'
import { getBaseUrl } from '../lib/config'
import '../../src/index.css'

setTokenStorage(chromeStorageAdapter)

async function bootstrap() {
  configureApiClient({ baseUrl: await getBaseUrl(), authMode: 'jwt' })
  startSyncEngine().catch((err) => console.error('sync engine failed:', err))

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>,
  )
}

void bootstrap()
