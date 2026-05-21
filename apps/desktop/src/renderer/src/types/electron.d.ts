// TypeScript declarations for the API exposed by the preload script via contextBridge.

export {}

declare global {
  interface Window {
    electronAPI?: {
      store: {
        getToken: () => string | null
        getRefreshToken: () => string | null
        setTokens: (access: string, refresh: string) => void
        clearTokens: () => void
      }
      /** Register a listener for OS-level global shortcuts. Returns an unsubscribe fn. */
      onShortcut: (callback: (name: string) => void) => () => void
      shortcuts: {
        getStatus: () => Promise<Record<string, { accelerator: string; registered: boolean }>>
        onStatus: (
          callback: (status: Record<string, { accelerator: string; registered: boolean }>) => void,
        ) => () => void
      }
      auth: {
        openExternal: (url: string) => void
        getPendingCallbackURL: () => string | null
        onCallbackURL: (callback: (url: string) => void) => () => void
      }
      shell: {
        runCommand: (cmd: string) => Promise<string>
      }
      project: {
        detectCurrent: () => Promise<{
          name: string
          path: string
          gitRemote: string
          gitSlug: string
        }>
      }
      apiTester: {
        send: (request: {
          method: string
          url: string
          headers: Record<string, string>
          body?: string
        }) => Promise<{
          status: number
          statusText: string
          durationMs: number
          headers: Record<string, string>
          body: string
        }>
      }
    }
  }
}
