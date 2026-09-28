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
 * - The rest of `/sourced/` (guide regions, larger open dumps, wiki pages,
 *   search chunks, map plates, icon packs) is cache-first into one dedicated
 *   bucket (`SOURCED_OFFLINE_CACHE`). It fills lazily at runtime and can be
 *   warmed whole by Settings → Data & offline, so the wiki/search/Gideon work
 *   with no connection without forcing the full data plane onto first load.
 * - The EldenRingMap engine (`/engine/*` in dev, `127.0.0.1:8099` in prod) is
 *   deliberately NetworkOnly. Live save sync needs the engine, and Task 06's
 *   offline detection must keep seeing real failures instead of a cached response.
 * - Fonts are self-hosted under `/fonts/*.woff2` (Task 58) and precached by the
 *   output glob, so there is no cross-origin font request to cache at runtime.
 */

import type { VitePWAOptions } from 'vite-plugin-pwa'

/**
 * Task 137 §2 — one dedicated bucket for the whole `sourced/**` data plane.
 * The "Download everything for offline" action warms it, and the runtime caching
 * rule below serves every sourced request cache-first from it, so the wiki,
 * full-text search and Gideon's grounded answers work with no connection.
 */
export const SOURCED_OFFLINE_CACHE = 'ak-sourced-offline'

/** The map engine must never be served from a cache. Matches dev proxy + prod base. */
export const ENGINE_URL_PATTERN = /(\/engine\/)|(\/er-map\/)|(127\.0\.0\.1:8099)/

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
    navigateFallbackDenylist: [/^\/engine\//, /^\/er-map\//, /^\/sourced\//, /^\/api\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ENGINE_URL_PATTERN,
        handler: 'NetworkOnly',
      },
      {
        // Every sourced file — JSON dumps, wiki pages, search chunks, map
        // plates, images and icon packs — is cache-first from the dedicated
        // offline bucket, so an offline device gets the wiki, search and
        // Gideon's wiki answers straight from Cache Storage.
        urlPattern: /\/sourced\//,
        handler: 'CacheFirst',
        options: {
          cacheName: SOURCED_OFFLINE_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          // The text corpus alone is 36 tables, and the whole sourced tree is
          // ~2,700 files / ~83 MB; keep ample room and a long lifetime.
          expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
  devOptions: { enabled: false },
}
