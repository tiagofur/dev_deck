import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Plain Vite config for the renderer, used by the Tauri shell (`tauri dev` /
// `tauri build` run it via beforeDevCommand / beforeBuildCommand). The
// Electron shell keeps using electron.vite.config.ts; both share the same
// renderer sources, aliases and dev port.

if (process.env.HEAPDECK_E2E === 'true') {
  process.env.VITE_API_URL = ''
  process.env.VITE_AUTH_MODE = 'token'
  process.env.VITE_API_TOKEN = process.env.VITE_API_TOKEN || 'test-api-token'
}

const tauriDebug = !!process.env.TAURI_ENV_DEBUG

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  // .env lives next to package.json, not under src/renderer.
  envDir: process.env.VITE_AUTH_MODE === 'token' ? resolve(__dirname, 'non-existent') : __dirname,
  // Expose TAURI_ENV_* to the renderer alongside VITE_*.
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  // Keep the Tauri CLI's Rust compiler output visible.
  clearScreen: false,
  plugins: [react()],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@heapdeck/ui/styles/globals.css': resolve(__dirname, '../../packages/ui/styles/globals.css'),
      '@heapdeck/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@heapdeck/api-client': resolve(__dirname, '../../packages/api-client/src/index.ts'),
      '@heapdeck/features': resolve(__dirname, '../../packages/features/src/index.ts'),
      '@heapdeck/i18n': resolve(__dirname, '../../packages/i18n/src/index.ts'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    // Tauri ships WebView2 on Windows and WebKit on macOS/Linux.
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: tauriDebug ? false : 'esbuild',
    sourcemap: tauriDebug,
    rollupOptions: {
      input: { index: resolve(__dirname, 'src/renderer/index.html') },
    },
  },
  server: {
    port: 5174,
    // Tauri waits on this exact URL; never silently move to another port.
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
