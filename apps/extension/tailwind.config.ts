import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/features/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--color-bg-primary)',
          card: 'var(--color-bg-card)',
          elevated: 'var(--color-bg-elevated)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          soft: 'var(--color-ink-soft)',
        },
        accent: {
          yellow: 'var(--color-accent-yellow)',
          pink: 'var(--color-accent-pink)',
          lime: 'var(--color-accent-lime)',
          cyan: 'var(--color-accent-cyan)',
          lavender: 'var(--color-accent-lavender)',
          orange: 'var(--color-accent-orange)',
        },
      },
      boxShadow: {
        hard: '4px 4px 0px 0px #000000',
        'hard-sm': '2px 2px 0px 0px #000000',
        'hard-lg': '8px 8px 0px 0px #000000',
      },
      fontFamily: {
        display: ['system-ui', 'sans-serif'],
        mono: ['monospace'],
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
      },
    },
  },
  plugins: [],
} satisfies Config
