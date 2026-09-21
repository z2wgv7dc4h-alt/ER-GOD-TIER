/**
 * Shared PWA / service-worker configuration (Task 28).
 *
 * This lives in `src/` rather than inline in `vite.config.ts` so the caching
 * strategy is a normal, unit-testable module. `vite.config.ts` imports it verbatim.
 *
 * Strategy:
 * - App shell (JS/CSS/HTML/icons/art) is precached by Workbox's output glob,
 *   minus everything under `/sourced/**`.
 * - The small, always-useful `sourced/` JSON (aliases, regulation, guide catalog,
 *   open coords/names, armory) is precached via `includeAssets` so the app is
 *   useful offline after the very first load, before Codex/Atlas have been opened.
 * - The rest of `/sourced/` (guide regions, larger open dumps, map plates, icon
 *   packs) is cached lazily at runtime: JSON stale-while-revalidate, media
 *   cache-first. This avoids forcing the full ~32 MB data plane (and the ~63 MB
 *   map tile pyramid the engine serves) onto a phone on first load.
 * - The EldenRingMap engine (`/er-map/*` in dev, `127.0.0.1:8099` in prod) is
 *   deliberately NetworkOnly. Live save sync needs the engine, and Task 06's
 *   offline detection must keep seeing real failures instead of a cached response.
 * - Google Fonts are runtime-cached so the display serif survives offline.
 */

import type { VitePWAOptions } from 'vite-plugin-pwa'

export const SOURCED_DATA_CACHE = 'ak-sourced-data'
export const SOURCED_MEDIA_CACHE = 'ak-sourced-media'
export const FONTS_STYLES_CACHE = 'ak-fonts-styles'
export const FONTS_WEBFONTS_CACHE = 'ak-fonts-webfonts'

/** The map engine must never be served from a cache. Matches dev proxy + prod base. */
export const ENGINE_URL_PATTERN = /(\/er-map\/)|(127\.0\.0\.1:8099)/

/** Small JSON precached on install so first-load-offline still shows real data. */
export const PRECACHE_DATA = [
  'sourced/aliases.json',
  'sourced/npc-combat.json',
  'sourced/armory-weapons.json',
  'sourced/armory-bosses.json',
  'sourced/regulation-vanilla-v1.17.json',
  'sourced/guide/catalog.json',
  'sourced/guide/legs.json',
  'sourced/open/coords.json',
  'sourced/open/boss-pins.json',
  'sourced/open/names.json',
] as const

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  // The manifest is authored by hand at `public/manifest.webmanifest` and linked
  // from `index.html`; the plugin must not generate a second one.
  manifest: false,
  includeAssets: [...PRECACHE_DATA],
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2,ttf,webmanifest}'],
    // `sourced/` is either precached explicitly (small JSON above) or runtime
    // cached lazily. Never sweep the whole data plane into the precache manifest.
    globIgnores: ['**/sourced/**'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/er-map\//, /^\/sourced\//, /^\/api\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ENGINE_URL_PATTERN,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\/sourced\/.*\.json(\?.*)?$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: SOURCED_DATA_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      {
        urlPattern: /\/sourced\//,
        handler: 'CacheFirst',
        options: {
          cacheName: SOURCED_MEDIA_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: FONTS_STYLES_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 10 },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
        handler: 'CacheFirst',
        options: {
          cacheName: FONTS_WEBFONTS_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
  devOptions: { enabled: false },
}
