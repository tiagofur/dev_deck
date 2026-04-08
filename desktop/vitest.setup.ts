import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

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

// import.meta.env stubs — Vite injects these at build time. Tests need them
// for any module that reads VITE_API_URL etc. at import time.
const env = (import.meta as unknown as { env: Record<string, string> }).env
env.VITE_API_URL = env.VITE_API_URL ?? 'http://localhost:8080'
env.VITE_API_TOKEN = env.VITE_API_TOKEN ?? 'test-token'
env.VITE_AUTH_MODE = env.VITE_AUTH_MODE ?? 'token'
