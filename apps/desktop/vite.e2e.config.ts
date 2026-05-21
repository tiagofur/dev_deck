import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@devdeck/ui/styles/globals.css': resolve(
        __dirname,
        '../../packages/ui/styles/globals.css',
      ),
      '@devdeck/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@devdeck/api-client': resolve(
        __dirname,
        '../../packages/api-client/src/index.ts',
      ),
      '@devdeck/features': resolve(
        __dirname,
        '../../packages/features/src/index.ts',
      ),
      '@devdeck/i18n': resolve(
        __dirname,
        '../../packages/i18n/src/index.ts',
      ),
    },
  },
  server: {
    port: 5174,
  },
})
