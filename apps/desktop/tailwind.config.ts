import type { Config } from 'tailwindcss'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — CJS preset, consumed at build time
import preset from '@devdeck/ui/tailwind-preset'

export default {
  presets: [preset],
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/features/src/**/*.{ts,tsx}',
  ],
  plugins: [],
} satisfies Config
