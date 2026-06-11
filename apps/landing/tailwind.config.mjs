import preset from '../../packages/ui/tailwind-preset.cjs';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
