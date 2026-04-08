// Shared Tailwind preset — neo-brutalist design tokens.
// Consumed by apps/desktop/tailwind.config.ts and apps/web/tailwind.config.ts.
//
// Apps are responsible for their own `content` globs (which must include
// the workspace packages that use Tailwind classes).

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#FFFBF0',
          card: '#FFFFFF',
          elevated: '#F4F0E0',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          soft: '#4A4A4A',
        },
        accent: {
          pink: '#FF5C8A',
          yellow: '#FFD23F',
          cyan: '#4DD0E1',
          lime: '#7CFF6B',
          lavender: '#B388FF',
          orange: '#FF8A3D',
        },
        danger: '#FF3B30',
        success: '#00C853',
      },
      boxShadow: {
        'hard-sm': '2px 2px 0 0 #0A0A0A',
        'hard':    '4px 4px 0 0 #0A0A0A',
        'hard-lg': '6px 6px 0 0 #0A0A0A',
        'hard-xl': '8px 8px 0 0 #0A0A0A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
      },
    },
  },
  plugins: [],
}
