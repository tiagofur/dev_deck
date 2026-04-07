/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
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
          orange: '#FF8A3D',
          lavender: '#B388FF',
        },
        danger: '#FF3B30',
        success: '#00C853',
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
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
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}
