import '@testing-library/jest-dom/vitest'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import {
  configureApiClient,
  localStorageAdapter,
  setTokenStorage,
} from '@devdeck/api-client'

// Configure the shared api-client BEFORE any test runs. Desktop tests use
// the static-token code path with a fake base URL. Individual tests can
// override via vi.stubGlobal('fetch', ...) as usual.
beforeAll(() => {
  setTokenStorage(localStorageAdapter)
  configureApiClient({
    baseUrl: 'http://localhost:8080',
    authMode: 'token',
    staticToken: 'test-api-token',
  })
})

// React Testing Library renders into document.body — clean up after each test
// so leftover nodes don't pollute the next one's queries.
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  // Reset localStorage between tests so auth/preferences helpers stay clean.
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
})
