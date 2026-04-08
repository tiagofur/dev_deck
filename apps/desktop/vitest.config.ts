import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vitest config for the renderer source. We do not load electron-vite here
// because Vitest runs in plain Node + jsdom, and electron-vite tries to wire
// up main/preload entry points that aren't relevant in unit tests.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@devdeck/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@devdeck/api-client': resolve(
        __dirname,
        '../../packages/api-client/src/index.ts',
      ),
      '@devdeck/features': resolve(
        __dirname,
        '../../packages/features/src/index.ts',
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/renderer/src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
})
