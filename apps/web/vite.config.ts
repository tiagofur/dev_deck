import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
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
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        share_target: {
          action: '/capture-share',
          method: 'GET',
          enctype: 'application/x-www-form-urlencoded',
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
      '@devdeck/i18n': resolve(
        __dirname,
        '../../packages/i18n/src/index.ts',
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
  build: {
    // Split heavy third-party libraries out of the main app chunk so the
    // browser can cache them independently and download them in parallel.
    // The biggest offender is the markdown/syntax-highlight stack.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (
            /react-markdown|rehype|remark|lowlight|highlight\.js|hast|mdast|micromark|unist|property-information|character-entities|space-separated-tokens|comma-separated-tokens|trim-lines|vfile|bail|trough|decode-named-character|ccount|markdown-table|html-url-attributes|web-namespaces|zwitch|longest-streak|estree|devlop|is-plain-obj/.test(
              id,
            )
          ) {
            return 'markdown'
          }
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('@tanstack')) return 'query'
          if (id.includes('@dnd-kit')) return 'dnd'
          if (id.includes('react-router')) return 'router'
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'react'
          }
          return 'vendor'
        },
      },
    },
  },
})
