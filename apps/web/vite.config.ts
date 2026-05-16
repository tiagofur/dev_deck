import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'DevDeck — Knowledge OS',
        short_name: 'DevDeck',
        description: 'Your developer knowledge vault, offline-first.',
        theme_color: '#000000',
        background_color: '#F9F9F9',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        share_target: {
          action: '/capture-share',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB for WASM
        runtimeCaching: [
          {
            urlPattern: /\/api\/sync\/batch/,
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'devdeck-sync-queue',
                options: {
                  maxRetentionTime: 24 * 60, // Retry for 24h
                },
              },
            },
            method: 'POST',
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
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
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
