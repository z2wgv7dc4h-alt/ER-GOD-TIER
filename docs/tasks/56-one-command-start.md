# Task 56 — One-command PC start + honest engine banner

## Context

Repo root is `artifacts/all-knowing/`. Read `README.md`, `package.json`, `src/App.tsx`,
`src/lib/mapEngine.ts`, `docs/MAP-ENGINE.md`.

The real atlas needs two processes. People forget `npm run map`. The UI does not make the
fallback plates feel intentional.

Independent of Tasks 52–55. Do **not** run in parallel with Task 57 if both will edit `App.tsx`.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

1. `package.json` script `"start"`: runs the map engine and Vite together. Cross-platform enough
   for Windows (this machine) and POSIX. If a tiny node supervisor is cleaner than adding
   `concurrently`, write `scripts/dev-stack.mjs` — do not add a heavy process manager.
2. `"start:live"` wraps `map:live` + Vite and prints the existing EAC warning to the terminal
   **before** boot.
3. In-app engine banner in Atlas (and a compact chip in the rail):
   - connected (SSE ok)
   - offline — using static plates (not an error scream)
   - live-memory on (only if the API exposes it; do not guess)
4. Keep Task 06 empty states honest. Offline is expected on a phone.

## Explicit exclusions

- Do not change `extract_tiles` / `Setup.bat`.
- Do not enable live memory by default.
- Do not add a tray app or installer.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- README "What you run" section starts with `npm start`.
- Banner copy does not say "error" when the engine is simply not running.
