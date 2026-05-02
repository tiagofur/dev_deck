import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe, typed API to the renderer process.
// The renderer NEVER gets direct access to Node/Electron APIs.
contextBridge.exposeInMainWorld('electronAPI', {
  store: {
    getToken: (): string | null => ipcRenderer.sendSync('store:get-token'),
    getRefreshToken: (): string | null => ipcRenderer.sendSync('store:get-refresh-token'),
    setTokens: (access: string, refresh: string): void =>
      ipcRenderer.send('store:set-tokens', access, refresh),
    clearTokens: (): void => ipcRenderer.send('store:clear-tokens'),
  },

  // Register a listener for OS-level global shortcuts fired by main.
  // Returns an unsubscribe function.
  onShortcut: (callback: (name: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, name: string) => callback(name)
    ipcRenderer.on('global-shortcut', handler)
    return () => ipcRenderer.removeListener('global-shortcut', handler)
  },

  auth: {
    openExternal: (url: string): void => ipcRenderer.send('auth:open-external', url),
    getPendingCallbackURL: (): string | null => ipcRenderer.sendSync('auth:get-pending-url'),
    onCallbackURL: (callback: (url: string) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, url: string) => callback(url)
      ipcRenderer.on('auth-callback-url', handler)
      return () => ipcRenderer.removeListener('auth-callback-url', handler)
    },
  },
})
