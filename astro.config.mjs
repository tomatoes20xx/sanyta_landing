// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sanyta.ge',
  // 'file' emits about.html / privacy.html, so the URLs the old site (and
  // App Store Connect's privacy-policy link) already use keep working.
  // inlineStylesheets: the CSS (~13 KB) goes into each page instead of two
  // render-blocking requests; PageSpeed (2026-10-06, mobile) put that wait at
  // ~0.9 s of a 2.6 s LCP.
  build: { format: 'file', inlineStylesheets: 'always' },
  trailingSlash: 'never',
  // Use PORT when a launcher assigns one; otherwise Astro's usual 4321.
  server: { port: Number(process.env.PORT) || 4321 },
  integrations: [
    sitemap({
      filter: (page) => !/\/404(\.html)?$/.test(page),
      // match the .html URLs the pages link to (every page but the home)
      serialize: (item) => ({ ...item, url: item.url.replace(/(\/[^/.]+)$/, '$1.html') }),
    }),
  ],
  devToolbar: { enabled: false },
});
