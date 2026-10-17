import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
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
      '@heapdeck/i18n': resolve(__dirname, '../../packages/i18n/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
