import { app, BrowserWindow, shell, ipcMain, globalShortcut, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

// ---------------------------------------------------------------------------
// Token storage — encrypted via OS keychain (safeStorage)
// Persisted as base64 JSON in: <userData>/tokens.enc
// ---------------------------------------------------------------------------

const TOKEN_FILE = () => join(app.getPath('userData'), 'tokens.enc')

interface TokenData {
  access: string | null
  refresh: string | null
}

function readTokens(): TokenData {
  try {
    const file = TOKEN_FILE()
    if (!existsSync(file)) return { access: null, refresh: null }
    const buf = Buffer.from(readFileSync(file, 'utf-8'), 'base64')
    const decrypted = safeStorage.decryptString(buf)
    return JSON.parse(decrypted) as TokenData
  } catch {
    return { access: null, refresh: null }
  }
}

function writeTokens(data: TokenData): void {
  try {
    const encrypted = safeStorage.encryptString(JSON.stringify(data))
    writeFileSync(TOKEN_FILE(), encrypted.toString('base64'), 'utf-8')
  } catch (e) {
    console.error('[main] writeTokens failed:', e)
  }
}

// ---------------------------------------------------------------------------
// IPC handlers — called from preload via ipcRenderer.sendSync / .send
// ---------------------------------------------------------------------------

function registerIpcHandlers(): void {
  ipcMain.on('store:get-token', (event) => {
    event.returnValue = readTokens().access
  })

  ipcMain.on('store:get-refresh-token', (event) => {
    event.returnValue = readTokens().refresh
  })

  ipcMain.on('store:set-tokens', (_event, access: string, refresh: string) => {
    writeTokens({ access, refresh })
  })

  ipcMain.on('store:clear-tokens', () => {
    writeTokens({ access: null, refresh: null })
  })
}

// ---------------------------------------------------------------------------
// Global shortcuts — OS-level, fire even when app is in background
// ---------------------------------------------------------------------------

function registerGlobalShortcuts(win: BrowserWindow): void {
  const shortcuts: Record<string, string> = {
    'CommandOrControl+K': 'search',
    'CommandOrControl+N': 'add',
  }

  for (const [accelerator, name] of Object.entries(shortcuts)) {
    globalShortcut.register(accelerator, () => {
      if (!win.isDestroyed()) {
        win.show()
        win.focus()
        win.webContents.send('global-shortcut', name)
      }
    })
  }
}

// ---------------------------------------------------------------------------
// BrowserWindow
// ---------------------------------------------------------------------------

function createWindow(): void {
  const preloadPath = join(__dirname, '../preload/index.js')

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#FFFBF0',
    show: false,
    autoHideMenuBar: true,
    title: 'DevDeck',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: preloadPath,
    },
  })

  win.once('ready-to-show', () => {
    win.show()
    registerGlobalShortcuts(win)
  })

  // External links → system browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
