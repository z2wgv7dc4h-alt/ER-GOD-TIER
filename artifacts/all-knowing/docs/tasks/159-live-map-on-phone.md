# Task 159 — Live map on the phone (installed PWA, away from the PC)

Follow AGENTS.md. Branch `task-159`. Another agent (157) is doing a read-only audit; don't wait for it.

The user plays on PS5 and uses the app on their phone. `src/Atlas.tsx` shows the live map
(`<EngineEmbed>` iframe `/engine/?embed=1` → `vendor/elden-ring-map/web/`) only when
`w.engineStatus` is live (line ~150); otherwise a static plate fallback. `/engine` is served by a Vite
dev middleware (`vite.config.ts` ~line 100) and the engine status/markers may come from a PC-side
process that reads the save file (`ER0000.sl2`) — PC-only.

1. Find out exactly what the phone gets in each setup and write it in the report:
   a) dev server on the PC, phone on the LAN; b) production build (`npm run build`, `dist/`) served
   statically / installed PWA, phone away from the PC (offline or on mobile data).
   Check: is `vendor/elden-ring-map/web/` copied into `dist/`? What sets `engineStatus` (grep the
   state/engine client code)? Does the live map need the PC process, or only for live player
   position/save data?
2. If the phone gets the static plate in (b): make the live map engine part of the production build
   and offline cache (copy the engine's static files + its marker data into `dist/` and the
   offline manifest / service worker), and show the live map whenever its files load — the PC
   save-reader only adds the live player position and save-derived state (keep that optional;
   PS5 has no save access). Keep the static plate only as the fallback when the engine files fail
   to load.
3. Show on map (Tasks 155/158, `src/map/focusTarget.ts`, `src/map/itemSources.ts`) must work in both.
4. Check the size added to the offline cache and report it. Don't break `npm run test:bundle`
   (engine files are separate static assets, not app JS).
Tests for the status logic (engine files OK + no PC process → live map). While working: touched
tests + `npx tsc -b`. At the end ONCE: full `npx vitest run`, `npm run lint`, `npm run build`,
`npm run test:bundle`, `npm run data:offline`. Commit. Report `docs/tasks/159-report.md` (print it):
findings for a) and b), what changed, MB added, ASSUMPTIONS.
