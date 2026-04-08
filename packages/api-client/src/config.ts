// Runtime configuration for the api-client package.
//
// Each app (desktop, web) calls `configureApiClient()` in its entrypoint
// BEFORE the first fetch happens. This avoids reading `import.meta.env` inside
// the shared package, which would couple it to the bundler's env injection.

export interface ApiClientConfig {
  /**
   * Base URL prefixed to all request paths. Use `''` in web (vite proxy
   * handles `/api/...`), or `http://localhost:8080` in desktop dev.
   */
  baseUrl: string
  /**
   * `'jwt'` uses access/refresh tokens from the injected TokenStorage and
   * auto-refreshes on 401. `'token'` sends a static API token and never
   * refreshes.
   */
  authMode: 'jwt' | 'token'
  /** Only used when `authMode === 'token'`. */
  staticToken?: string
}

let cfg: ApiClientConfig = {
  baseUrl: '',
  authMode: 'jwt',
  staticToken: undefined,
}

export function configureApiClient(partial: Partial<ApiClientConfig>): void {
  cfg = { ...cfg, ...partial }
}

export function getConfig(): ApiClientConfig {
  return cfg
}
