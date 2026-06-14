import { app, BrowserWindow, shell, ipcMain, globalShortcut, safeStorage } from 'electron'
import { basename, join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { exec } from 'child_process'

// ---------------------------------------------------------------------------
// Token storage — encrypted via OS keychain (safeStorage)
// Persisted as base64 JSON in: <userData>/tokens.enc
// ---------------------------------------------------------------------------

const TOKEN_FILE = () => join(app.getPath('userData'), 'tokens.enc')
const SHORTCUTS_FILE = () => join(app.getPath('userData'), 'shortcuts.json')

interface TokenData {
  access: string | null
  refresh: string | null
}

interface ProjectContext {
  name: string
  path: string
  gitRemote: string
  gitSlug: string
}

interface ApiTesterRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
}

interface ApiTesterResponse {
  status: number
  statusText: string
  durationMs: number
  headers: Record<string, string>
  body: string
}

// Only ever hand http(s) URLs to the OS browser. Blocks file://, and other
// schemes that could be abused if a malicious URL reaches the open handler.
function isSafeExternalURL(rawURL: string): boolean {
  try {
    const { protocol } = new URL(rawURL)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

let mainWindow: BrowserWindow | null = null
let pendingAuthCallbackURL: string | null = null
let shortcutStatus: Record<string, { accelerator: string; registered: boolean }> = {}

interface ShortcutConfig {
  enabled: boolean
  search: string
  add: string
}

const DEFAULT_SHORTCUT_CONFIG: ShortcutConfig = {
  enabled: true,
  search: 'CommandOrControl+K',
  add: 'CommandOrControl+N',
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

function readShortcutConfig(): ShortcutConfig {
  try {
    const file = SHORTCUTS_FILE()
    if (!existsSync(file)) return DEFAULT_SHORTCUT_CONFIG
    return { ...DEFAULT_SHORTCUT_CONFIG, ...JSON.parse(readFileSync(file, 'utf-8')) }
  } catch {
    return DEFAULT_SHORTCUT_CONFIG
  }
}

function writeShortcutConfig(config: ShortcutConfig): ShortcutConfig {
  const next = {
    enabled: config.enabled,
    search: config.search.trim() || DEFAULT_SHORTCUT_CONFIG.search,
    add: config.add.trim() || DEFAULT_SHORTCUT_CONFIG.add,
  }
  writeFileSync(SHORTCUTS_FILE(), JSON.stringify(next, null, 2), 'utf-8')
  return next
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

  ipcMain.on('auth:open-external', (_event, url: string) => {
    if (isSafeExternalURL(url)) void shell.openExternal(url)
  })

  ipcMain.on('auth:get-pending-url', (event) => {
    event.returnValue = pendingAuthCallbackURL
    pendingAuthCallbackURL = null
  })

  ipcMain.handle('shell:run', async (_event, cmd: string) => {
    return new Promise((resolve, reject) => {
      // Execute the command in the user's shell
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(error.message)
          return
        }
        if (stderr) {
          // Some commands use stderr for non-error output, but usually it's better to show it.
          resolve(stderr)
          return
        }
        resolve(stdout)
      })
    })
  })

  ipcMain.handle('project:detect-current', async () => {
    const projectPath = process.cwd()
    const gitRemote = await readGitRemote(projectPath)
    const gitSlug = gitRemoteToSlug(gitRemote)
    return {
      name: gitSlug ? basename(gitSlug) : basename(projectPath),
      path: projectPath,
      gitRemote,
      gitSlug,
    } satisfies ProjectContext
  })

  ipcMain.handle('shortcuts:get-status', async () => shortcutStatus)
  ipcMain.handle('shortcuts:get-config', async () => readShortcutConfig())
  ipcMain.handle('shortcuts:set-config', async (_event, config: ShortcutConfig) => {
    const next = writeShortcutConfig(config)
    if (mainWindow && !mainWindow.isDestroyed()) {
      registerGlobalShortcuts(mainWindow)
    }
    return next
  })

  ipcMain.handle('api-tester:send', async (_event, request: ApiTesterRequest) => {
    return sendApiTesterRequest(request)
  })
}

async function sendApiTesterRequest(request: ApiTesterRequest): Promise<ApiTesterResponse> {
  const method = request.method.toUpperCase()
  const target = new URL(request.url)
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed.')
  }

  const started = Date.now()
  const response = await fetch(target, {
    method,
    headers: request.headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : request.body || undefined,
  })
  const body = await response.text()
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  return {
    status: response.status,
    statusText: response.statusText,
    durationMs: Date.now() - started,
    headers,
    body,
  }
}

function readGitRemote(projectPath: string): Promise<string> {
  return new Promise((resolve) => {
    exec('git config --get remote.origin.url', { cwd: projectPath }, (_error, stdout) => {
      resolve(stdout.trim())
    })
  })
}

function gitRemoteToSlug(remote: string): string {
  const trimmed = remote.trim().replace(/\.git$/, '')
  if (!trimmed) return ''
  if (trimmed.startsWith('git@')) {
    const [, slug = ''] = trimmed.split(':')
    return slug.replace(/^\/+/, '')
  }
  try {
    const parsed = new URL(trimmed)
    return parsed.pathname.replace(/^\/+/, '')
  } catch {
    return basename(trimmed)
  }
}

// ---------------------------------------------------------------------------
// Global shortcuts — OS-level, fire even when app is in background
// ---------------------------------------------------------------------------

function registerGlobalShortcuts(win: BrowserWindow): void {
  globalShortcut.unregisterAll()
  const config = readShortcutConfig()
  const shortcuts: Record<string, string> = {
    [config.search]: 'search',
    [config.add]: 'add',
  }

  shortcutStatus = {}
  if (!config.enabled) {
    for (const [accelerator, name] of Object.entries(shortcuts)) {
      shortcutStatus[name] = { accelerator, registered: false }
    }
    win.webContents.send('global-shortcut-status', shortcutStatus)
    return
  }

  for (const [accelerator, name] of Object.entries(shortcuts)) {
    const registered = globalShortcut.register(accelerator, () => {
      if (!win.isDestroyed()) {
        win.show()
        win.focus()
        win.webContents.send('global-shortcut', name)
      }
    })
    shortcutStatus[name] = { accelerator, registered }
    if (!registered) {
      console.warn(`[main] global shortcut registration failed: ${accelerator} (${name})`)
    }
  }

  win.webContents.send('global-shortcut-status', shortcutStatus)
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
  mainWindow = win

  win.once('ready-to-show', () => {
    win.show()
    registerGlobalShortcuts(win)
  })

  win.webContents.on('did-finish-load', () => {
    if (pendingAuthCallbackURL) {
      win.webContents.send('auth-callback-url', pendingAuthCallbackURL)
      pendingAuthCallbackURL = null
    }
  })

  // External links → system browser, never inside the app. Validate the
  // scheme so only http(s) is handed to the OS.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalURL(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Block the renderer from navigating the top frame away from the app
  // (defense-in-depth against any injected content). In-app routing uses a
  // HashRouter, so legitimate navigation never triggers this.
  win.webContents.on('will-navigate', (event, url) => {
    const devURL = process.env.ELECTRON_RENDERER_URL
    const isAppURL = url.startsWith('file://') || (devURL ? url.startsWith(devURL) : false)
    if (!isAppURL) {
      event.preventDefault()
      if (isSafeExternalURL(url)) void shell.openExternal(url)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function dispatchAuthCallback(url: string): void {
  if (!url.startsWith('devdeck://')) return
  pendingAuthCallbackURL = url
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('auth-callback-url', url)
    pendingAuthCallbackURL = null
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

const singleInstance = app.requestSingleInstanceLock()

if (!singleInstance) {
  app.quit()
}

app.on('second-instance', (_event, argv) => {
  const authURL = argv.find((arg) => arg.startsWith('devdeck://'))
  if (authURL) {
    dispatchAuthCallback(authURL)
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  dispatchAuthCallback(url)
})

app.whenReady().then(() => {
  app.setAsDefaultProtocolClient('devdeck')
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
