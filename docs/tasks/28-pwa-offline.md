# Task 28 — Make this an actual installable, offline-capable PWA

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `ARCHITECTURE.md` first.

The very first product decision made for this app (see the project's early scoping) was "Web PWA
(local-first)" — a PS5 player uses this on their phone in the living room, potentially with a weak
or no connection, and it's meant to work like an installed app, not a website they have to
re-navigate to every time. `HANDOFF-CLAUDE.md` §6 P3 item 32 has stood open the entire project:
"PWA service worker / offline cache of `sourced/` — not done." Right now there is no service
worker, no manifest-driven install prompt beyond whatever Vite's default `index.html` provides,
and no offline caching — closing the browser tab loses nothing in terms of *data* (that's all
`localStorage`-backed already, see `vault.ts`), but the app itself won't load at all without a
live connection to the dev/prod server.

If you need to write any scratch file, save it to `./.scratch/` inside this repo (already
gitignored), never `/tmp`/`%TEMP%`. This is a personal, non-commercial project — do not gate this
work on license verification for data or code.

## Objective

Add a real service worker + web app manifest so the built app is installable on a phone home
screen and works offline after the first successful load, with the large `public/sourced/*` data
files (catalog JSON, aliases, regulation data, map tiles/icons) cached for offline use.

## Requirements

- Use `vite-plugin-pwa` (well-maintained, MIT-licensed, purpose-built for exactly this) or a
  hand-rolled service worker if you have a good reason to prefer that — your call, but don't
  reinvent Workbox-equivalent caching logic from scratch without reason.
- App shell (JS/CSS/HTML) should be precached so the app loads offline after first visit.
- `public/sourced/*` JSON data (catalog, aliases, regulation, npc-combat, etc.) should be
  runtime-cached (cache-first or stale-while-revalidate — pick sensibly given this data changes
  rarely) so a PS5 player who already opened the app once can use it with no connection at all.
- The map engine's own assets (`vendor/elden-ring-map/web/tiles/`, `web/icons/`) are proxied
  through `/er-map/*` in dev and need their own consideration — the **live** map (SSE, real-time
  save sync) inherently requires the map engine server to be running and reachable, so it cannot
  work fully offline. That's fine and expected — check `ARCHITECTURE.md` / `MAP-ENGINE.md` for how
  the app already handles "engine offline" (Task 06 built honest empty states for this) and make
  sure the new service worker doesn't fight with or break that existing offline-detection UX.
- A real web app manifest (`manifest.json` or `manifest.webmanifest`): name, icons (check
  `public/` for existing icon assets to reuse before generating new ones), theme colors matching
  the existing dark/gold palette (`src/index.css`'s `:root` custom properties), `display:
  standalone`.
- Don't cache anything derived from the user's own game install indiscriminately if it's large
  (map tile pyramid is ~63MB per `vendor/elden-ring-map/.gitignore`'s own comment) without a
  sensible caching strategy — that's a lot to force onto a phone's storage on first load. Consider
  whether map tiles should be cached lazily (as visited) rather than precached wholesale.

## Explicit exclusions

- Don't touch OCR, the save parser, Gideon, the mobile layout, or the map engine server itself.
- Don't add push notifications or background sync — offline app-shell + data caching only.
- Don't change how `vault.ts`/localStorage persistence works — that's already correct and
  untouched by this task.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- `npm run build` produces a real service worker and manifest in `dist/`.
- Manually verify: build the app, serve the `dist/` output (not the dev server — service workers
  need a production-like build), load it once online, then simulate offline (devtools/browser
  network throttling) and confirm the app still loads and shows cached catalog data. Describe
  exactly what you tested and what worked/didn't.
- Report what's cached, what isn't (and why), and the manifest's install-prompt behavior.
