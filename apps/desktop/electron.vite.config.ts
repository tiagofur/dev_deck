import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

if (process.env.HEAPDECK_E2E === 'true') {
  process.env.VITE_API_URL = ''
  process.env.VITE_AUTH_MODE = 'token'
  process.env.VITE_API_TOKEN = process.env.VITE_API_TOKEN || 'test-api-token'
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    envDir: process.env.VITE_AUTH_MODE === 'token' ? resolve(__dirname, 'non-existent') : undefined,
    plugins: [react()],
    worker: {
      format: 'es',
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@heapdeck/ui/styles/globals.css': resolve(
          __dirname,
          '../../packages/ui/styles/globals.css',
        ),
        '@heapdeck/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
        '@heapdeck/api-client': resolve(
          __dirname,
          '../../packages/api-client/src/index.ts',
        ),
        '@heapdeck/features': resolve(
          __dirname,
          '../../packages/features/src/index.ts',
        ),
        '@heapdeck/i18n': resolve(
          __dirname,
          '../../packages/i18n/src/index.ts',
        ),
      },
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
  },
})
