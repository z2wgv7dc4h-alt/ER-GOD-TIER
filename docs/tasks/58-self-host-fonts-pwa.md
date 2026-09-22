# Task 58 — Self-host fonts + real-phone PWA offline

## Context

Repo root is `artifacts/all-knowing/`. Read `index.html`, `src/lib/pwa.ts`,
`src/lib/pwa.test.ts`, `vite.config.ts`, `public/manifest.webmanifest`.

Task 28 cached the app shell. `index.html` still preconnects to `fonts.googleapis.com`, so first
paint on a phone is not offline.

Independent of other 52+ briefs.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

1. Self-host Cinzel + Source Sans 3 (or whatever `index.css` currently uses) under
   `public/fonts`. Use OFL files only. Download into `./.scratch/` first, then copy the needed
   woff2.
2. Remove the Google Fonts `<link>` tags from `index.html`.
3. `@font-face` in `index.css`. `font-display: swap`.
4. Precache the woff2 in the service worker glob (already includes woff2).
5. Add a small "Install / available offline" note in `Help.tsx` only if Help already documents
   shortcuts — do not invent a new room.
6. Tests: `pwa.test.ts` still passes; add an assertion that `index.html` does not contain
   `fonts.googleapis.com`.

## Explicit exclusions

- Do not change visual design beyond font loading.
- Do not precache all of `public/sourced/`.
- Do not claim you tested a physical iPhone unless you did; say what you verified (headless /
  `vite preview`).

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- `grep -R fonts.googleapis.com index.html src` → no hits.
