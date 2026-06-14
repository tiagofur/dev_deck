import React from 'react'
import ReactDOM from 'react-dom/client'
import { configureApiClient, setTokenStorage } from '@devdeck/api-client'
import { Options } from './Options'
import { chromeStorageAdapter } from '../lib/storage'
import { getBaseUrl } from '../lib/config'
import '../../src/index.css'

setTokenStorage(chromeStorageAdapter)

async function bootstrap() {
  configureApiClient({ baseUrl: await getBaseUrl(), authMode: 'jwt' })

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Options />
    </React.StrictMode>,
  )
}

void bootstrap()
