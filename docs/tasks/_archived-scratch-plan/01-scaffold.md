# Task 01 — Scaffold the project

## Context

You're building "ER Master Tool," a local-first Elden Ring companion PWA. Read
`PROJECT_BRIEF.md` at the repo root in full before doing anything — it has the locked
architecture decisions, licensing policy, and feature scope. This task only sets up the
skeleton; do not implement features yet.

The repo currently contains: `PROJECT_BRIEF.md`, `docs/tasks/`, `public/` (already has real
region illustration images at `public/atlas/*.jpg`, a favicon, and an OG image — keep these),
`screenshots/` (old, ignorable), and `_reference/tarnished-ledger-legacy/` (a prior attempt —
read it for UX/data ideas per the brief, but do NOT copy its `vite.config.ts`, its
TanStack Start setup, or any of its auth/db/multiplayer code; none of that is wanted).

## Objective

Stand up a clean Vite + React + TypeScript SPA, ready for PWA packaging, with no backend.

## Requirements

1. `npm create vite@latest` equivalent scaffold at the repo root (not a subfolder) — React +
   TypeScript template.
2. Add and configure:
   - `@tanstack/react-router` + `@tanstack/router-plugin` in **library mode** (file-based
     routing via the Vite plugin), NOT `@tanstack/react-start`. No SSR, no server functions.
   - Tailwind CSS (v4, `@tailwindcss/vite` plugin style, matching what's used in
     `_reference/tarnished-ledger-legacy/src/styles.css` — you may reuse that theme's color
     tokens/fonts as a starting palette, it's our own prior work, not third-party).
   - `vite-plugin-pwa` — configure for `registerType: "autoUpdate"`, a web app manifest (name
     "ER Master Tool" or similar working title, theme color from the palette, icons — generate
     a placeholder icon set from `public/favicon.svg` if no proper icon assets exist yet), and
     offline caching of the app shell + static assets.
   - `zustand` with the `persist` middleware for local state (no backend, IndexedDB or
     localStorage only).
3. `tsconfig.json` with `@/*` → `./src/*` path alias (matches the legacy reference's convention).
4. Basic folder structure: `src/routes/`, `src/components/`, `src/data/`, `src/store/`,
   `src/lib/`.
5. A root route + minimal shell (nav placeholder, empty `<Outlet />`) so `npm run dev` shows a
   working page at `http://localhost:5173` (or whatever port — just confirm it runs).
6. `package.json` scripts: `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `lint`
   (eslint), `format` (prettier). Copy ESLint/Prettier config from
   `_reference/tarnished-ledger-legacy/eslint.config.mjs` and `.prettierrc` as a starting point,
   adjusted for the new (non-Start) dependency set.
7. Create `THIRD_PARTY_NOTICES.md` at the repo root (empty template with headers: Source repo /
   License / What was taken / What was changed) — later tasks will populate it per
   `PROJECT_BRIEF.md`'s licensing policy.
8. `git init` if not already a repo, and an initial commit.

## Explicit exclusions

- No auth, no accounts, no server, no database, no SSR.
- No Capacitor setup yet (that's a later task, once there's an app worth wrapping).
- Don't delete `_reference/` or `public/atlas/`.

## Acceptance criteria

- `npm install && npm run dev` starts a working dev server with no console errors.
- `npm run typecheck` and `npm run lint` both pass.
- `npm run build` produces a `dist/` with a valid manifest and service worker (check
  `dist/manifest.webmanifest` and `dist/sw.js` or equivalent exist).
- No dependency in `package.json` related to auth, postgres, better-auth, kysely, pglite, or
  nitro/vercel — this must be a plain static-buildable SPA.
