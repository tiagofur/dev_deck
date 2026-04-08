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
    }
  }
}
