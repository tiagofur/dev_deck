import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

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
      },
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
    server: {
      port: 5174,
    },
  },
})
