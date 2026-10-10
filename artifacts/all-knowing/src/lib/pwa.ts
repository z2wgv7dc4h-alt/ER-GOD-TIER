/**
 * Shared PWA / service-worker configuration (Task 28).
 *
 * This lives in `src/` rather than inline in `vite.config.ts` so the caching
 * strategy is a normal, unit-testable module. `vite.config.ts` imports it verbatim.
 *
 * Strategy:
 * - App shell (JS/CSS/HTML/icons/art) is precached by Workbox's output glob,
 *   minus everything under `/sourced/**`.
 * - The small, always-useful `sourced/` JSON (regulation, guide catalog, open
 *   coords/names, armory) is precached via `includeAssets` so the app is useful
 *   offline after the very first load, before Codex/Atlas have been opened.
 *   Task 191 §17 — the 1.4 MB alias plane is NOT in that list: it is fetched by
 *   the app's first alias lookup, and the runtime rule below then caches it.
 * - The rest of `/sourced/` (guide regions, larger open dumps, wiki pages,
 *   search chunks, map plates, icon packs) is cache-first into one dedicated
 *   bucket (`SOURCED_OFFLINE_CACHE`). It fills lazily at runtime and can be
 *   warmed whole by Settings → Data & offline, so the wiki/search/Gideon work
 *   with no connection without forcing the full data plane onto first load.
 * - The EldenRingMap engine's static files (`/engine/**`) ship in the production
 *   build (Task 159) and are cache-first into the same offline bucket, so the
 *   tiled map works offline on the phone. Only the live SSE endpoint
 *   (`/engine/api/events`) is NetworkOnly: the PC save reader / player dot must
 *   keep seeing real failures, and it is never cached.
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

/**
 * The live SSE stream (PC save reader / player dot) must never be cached, so a
 * real failure stays visible. Covers the shipped route and the external engine.
 */
export const ENGINE_EVENTS_PATTERN =
  /(\/(engine|er-map)\/api\/events)|(127\.0\.0\.1:8099\/api\/events)/

/**
 * The engine's static files — HTML/JS/CSS, icons, tiles and the generated
 * `/api/{markers,saves,place-names,state}` shims. Shipped in `dist/engine`
 * (Task 159) and cached first so the live map works offline.
 */
export const ENGINE_STATIC_PATTERN = /(\/engine\/)|(\/er-map\/)|(127\.0\.0\.1:8099)/

/**
 * Small JSON precached on install so first-load-offline still shows real data.
 * Task 191 §17: `sourced/aliases.json` (1.4 MB / 7,226 rows) was removed — it is
 * no longer "small", and the `/sourced/` runtime rule below caches it on first
 * use, so install no longer forces that download on every device.
 */
export const PRECACHE_DATA = [
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
    // `sourced/` and the shipped engine tree are either precached explicitly
    // (small JSON above) or runtime cached lazily. Never sweep the whole data
    // plane — least of all the engine's ~7,000 tiles — into the install precache.
    globIgnores: ['**/sourced/**', '**/engine/**'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/engine\//, /^\/er-map\//, /^\/sourced\//, /^\/api\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // The SSE stream is the only engine request that must reach the network.
        urlPattern: ENGINE_EVENTS_PATTERN,
        handler: 'NetworkOnly',
      },
      {
        // The shipped engine files (Task 159): HTML/JS/CSS, icons, tiles and the
        // static `/api/*` shims. Cache-first with a background revalidate so an
        // offline phone still draws the live map and picks up rebuilds next load.
        urlPattern: ENGINE_STATIC_PATTERN,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: SOURCED_OFFLINE_CACHE,
          cacheableResponse: { statuses: [0, 200] },
          // ~7,000 tiles + ~3,000 named markers on top of the sourced tree.
          expiration: { maxEntries: 20000, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
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
          // The whole sourced tree is ~5,400 files / ~100 MB; keep ample room
          // and a long lifetime.
          expiration: { maxEntries: 20000, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
  devOptions: { enabled: false },
}
