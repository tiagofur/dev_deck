import { isTauri } from '@tauri-apps/api/core'
import { createElectronBridge, type DesktopBridge } from '@heapdeck/api-client'

export type RendererShell = 'electron' | 'tauri' | 'browser'

/**
 * Which host is running the renderer, and the DesktopBridge it provides.
 *
 * - `electron`: the preload exposed `window.electronAPI`.
 * - `tauri`: running inside the Tauri webview. The Tauri bridge (keychain
 *   tokens, deep link, shortcuts, shell, api tester) lands in ADR 0006
 *   phases 2–3; until then Tauri runs the app without native features.
 * - `browser`: plain Vite dev server or Playwright (renderer-only e2e).
 */
export function detectShell(): { shell: RendererShell; bridge: DesktopBridge | null } {
  const electron = createElectronBridge()
  if (electron) return { shell: 'electron', bridge: electron }
  if (isTauri()) return { shell: 'tauri', bridge: null }
  return { shell: 'browser', bridge: null }
}
