import { defineConfig, devices } from '@playwright/test'

// Playwright config for the renderer running in a real browser.
//
// We test against the renderer-only Vite dev server. Tests assume the backend
// is reachable at http://localhost:8080 with
// VITE_AUTH_MODE=token + VITE_API_TOKEN=test-api-token. The CI job spins up
// the Go API in a sidecar before running these.
//
// To run locally:
//   pnpm -F @devdeck/desktop test:e2e:install   # one-time browser install
//   pnpm -F @devdeck/desktop test:e2e
//
// The five flows tracked here mirror the criteria in ROADMAP.md §16.6:
//   1. Login (token-mode bypass)
//   2. Add repo
//   3. Detail page + notes
//   4. Search
//   5. Discovery mode
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        command: 'pnpm exec electron-vite --rendererOnly',
        port: 5174,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:8080',
          VITE_API_TOKEN: process.env.VITE_API_TOKEN || 'test-api-token',
          VITE_AUTH_MODE: 'token',
        },
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
