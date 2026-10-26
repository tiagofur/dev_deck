import { openUrl } from '@tauri-apps/plugin-opener'

const HTTP_URL = /^https?:\/\//i

/**
 * Tauri-specific renderer bootstrap.
 *
 * The Tauri webview has no second tab to open: `window.open` is a no-op in
 * WKWebView/WebView2 under Tauri. Shared features call
 * `window.open(url, '_blank')` for external links, so hand http(s) URLs to the
 * OS browser — the same policy the Rust navigation guard applies to top-frame
 * navigations. Anything else (relative paths, other schemes) is dropped.
 */
export function installTauriShell(): void {
  window.open = (url?: string | URL): null => {
    const href = url?.toString() ?? ''
    if (HTTP_URL.test(href)) {
      openUrl(href).catch((err: unknown) => console.error('[tauri] openUrl failed:', err))
    }
    return null
  }
}
