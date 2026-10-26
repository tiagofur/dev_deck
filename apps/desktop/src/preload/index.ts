import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronPreloadAPI } from '@heapdeck/api-client'

// Expose a safe, typed API to the renderer process.
// The renderer NEVER gets direct access to Node/Electron APIs.
//
// The shape is checked against `ElectronPreloadAPI` (type-only import, erased
// at build time) so this script and the `createElectronBridge` adapter that
// consumes `window.electronAPI` cannot drift apart.
const electronAPI = {
  store: {
    getToken: () => ipcRenderer.sendSync('store:get-token'),
    getRefreshToken: () => ipcRenderer.sendSync('store:get-refresh-token'),
    setTokens: (access, refresh) => ipcRenderer.send('store:set-tokens', access, refresh),
    clearTokens: () => ipcRenderer.send('store:clear-tokens'),
  },

  // Register a listener for OS-level global shortcuts fired by main.
  // Returns an unsubscribe function.
  onShortcut: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, name: string) => callback(name)
    ipcRenderer.on('global-shortcut', handler)
    return () => ipcRenderer.removeListener('global-shortcut', handler)
  },

  shortcuts: {
    getStatus: () => ipcRenderer.invoke('shortcuts:get-status'),
    getConfig: () => ipcRenderer.invoke('shortcuts:get-config'),
    setConfig: (config) => ipcRenderer.invoke('shortcuts:set-config', config),
    onStatus: (callback) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        status: Record<string, { accelerator: string; registered: boolean }>,
      ) => callback(status)
      ipcRenderer.on('global-shortcut-status', handler)
      return () => ipcRenderer.removeListener('global-shortcut-status', handler)
    },
  },

  auth: {
    openExternal: (url) => ipcRenderer.send('auth:open-external', url),
    getPendingCallbackURL: () => ipcRenderer.sendSync('auth:get-pending-url'),
    onCallbackURL: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, url: string) => callback(url)
      ipcRenderer.on('auth-callback-url', handler)
      return () => ipcRenderer.removeListener('auth-callback-url', handler)
    },
  },

  shell: {
    runCommand: (cmd) => ipcRenderer.invoke('shell:run', cmd),
  },

  project: {
    detectCurrent: () => ipcRenderer.invoke('project:detect-current'),
  },

  apiTester: {
    send: (request) => ipcRenderer.invoke('api-tester:send', request),
  },
} satisfies ElectronPreloadAPI

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
