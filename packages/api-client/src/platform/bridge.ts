// DesktopBridge — the native-capabilities surface a desktop shell exposes to
// the shared React code. Apps inject an implementation at startup, exactly
// like `setTokenStorage` and `setDatabaseAdapter`; shared packages only ever
// talk to `getDesktopBridge()` and never to a shell-specific global such as
// `window.electronAPI`, so the shell (Electron today, Tauri next) can change
// without touching features code.
//
// Web never registers a bridge: `getDesktopBridge()` returns null and
// `isDesktopApp()` is false, which is how components decide whether to show
// desktop-only affordances (run command, detect project, global shortcuts).

export type DesktopShell = 'electron' | 'tauri'

export interface GlobalShortcutStatus {
  accelerator: string
  registered: boolean
}

export interface GlobalShortcutConfig {
  enabled: boolean
  search: string
  add: string
}

export interface DesktopProjectContext {
  name: string
  path: string
  gitRemote: string
  gitSlug: string
}

export interface ApiTesterRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

export interface ApiTesterResponse {
  status: number
  statusText: string
  durationMs: number
  headers: Record<string, string>
  body: string
}

export interface DesktopBridge {
  readonly kind: DesktopShell

  auth: {
    /** Hand an http(s) URL to the OS default browser (OAuth, SAML, external links). */
    openExternal(url: string): void
    /** Deep-link URL received before the renderer was listening, consumed on read. */
    getPendingCallbackURL(): string | null
    /** Subscribe to deep-link callbacks (`heapdeck://auth/callback?...`). Returns unsubscribe. */
    onCallbackURL(callback: (url: string) => void): () => void
  }

  /** OS-level global shortcut fired (`'search'` | `'add'`). Returns unsubscribe. */
  onShortcut(callback: (name: string) => void): () => void

  shortcuts: {
    getStatus(): Promise<Record<string, GlobalShortcutStatus>>
    getConfig(): Promise<GlobalShortcutConfig>
    setConfig(config: GlobalShortcutConfig): Promise<GlobalShortcutConfig>
    onStatus(callback: (status: Record<string, GlobalShortcutStatus>) => void): () => void
  }

  shell: {
    /** Run a command in the user's shell; resolves stdout (or stderr), rejects on error. */
    runCommand(cmd: string): Promise<string>
  }

  project: {
    detectCurrent(): Promise<DesktopProjectContext>
  }

  apiTester: {
    /** CORS-free HTTP request executed by the native side. */
    send(request: ApiTesterRequest): Promise<ApiTesterResponse>
  }
}

let current: DesktopBridge | null = null

export function setDesktopBridge(bridge: DesktopBridge | null): void {
  current = bridge
}

export function getDesktopBridge(): DesktopBridge | null {
  return current
}

export function isDesktopApp(): boolean {
  return current !== null
}
