# Task 193 — Wire in the brand art (`public/brand/`, source PNGs from Grok)

Follow AGENTS.md (completion contract). Branch `task-193`. Prompts/spec: `docs/brand/GROK-PROMPTS.md`.
Another task (187) edits `src/lib/entityIndexBuild.ts` — don't touch it.
1. **Optimise**: convert to WebP (keep PNG only where the platform requires PNG, e.g. PWA/apple icons).
   Resize: category icons 128px WebP (+64px), Gideon 256px, empty states ≤ 600px wide, splash/photo-guide
   ≤ 1080px wide, wordmark ≤ 800px wide. Check the category/transparent PNGs really have alpha — if a
   checkerboard or white matte is baked in, remove it (make the background transparent). Report MB before/after.
2. **PWA/app icon**: generate 192/512 PNG + maskable 512 from `icon-1024.png` / `icon-maskable-1024.png`,
   apple-touch-icon 180, favicon (32/16); update the manifest (`vite.config.ts` PWA section) and
   `index.html`. Splash: use `splash` as the iOS startup image / app loading background.
3. **Wordmark**: in the header brand slot (replace the current brand mark only; same size/position).
4. **Category fallbacks**: where an entity has no picture, show the matching `cat-<kind>` icon instead of
   nothing (mechanic, gate, build, pvp, quest/line, ending, guide, region, grace, merchant, npc, enemy).
   Real pictures always win. Do this in the picture lookup (`src/lib/extraImages.ts` / call sites).
5. **Gideon avatar** in Gideon's chat header/answer bubbles (`src/Gideon.tsx`, `GideonAnswer.tsx` — owner
   approved this visual-only change). **Empty states**: use `empty-progress` (nothing logged yet),
   `empty-map` (no pins/area), `empty-journal` (no quests/notes) in the existing empty-state spots.
   **Photo guide**: show `photo-guide` in the PS5 capture tips / Setup photo step.
6. Offline manifest + `npm run test:bundle` must pass (images are static assets). Tests for the fallback
   logic and that every referenced brand file exists.
