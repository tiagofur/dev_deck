import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // Used to build absolute canonical / Open Graph URLs.
  site: 'https://devdeck.ai',
  integrations: [
    tailwind({
      applyBaseStyles: false, // Use our own shared globals.css
    }),
  ],
});
