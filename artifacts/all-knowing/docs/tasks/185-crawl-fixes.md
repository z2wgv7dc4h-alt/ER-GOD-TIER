# Task 185 — Fix what the UI crawl found

Follow AGENTS.md (completion contract). Branch `task-185`. Crawl reports (headless click-everything run
of `scripts/ui-crawl.mjs` against the production build, phone + desktop) are in `.scratch/crawl/*.md`.
Other running tasks own `src/lib/entityIndexBuild.ts`, `src/lib/fanImage.ts` (182) and
`src/library/EntityPanel.tsx` placement section, `src/Atlas.tsx` pin layer, `src/lib/chestFacts.ts`,
`src/lib/npcPlacements.ts`, `src/lib/ar.ts`, `src/lib/weaponStats.ts` (183) — don't touch those; if a fix
needs them, list it in the report instead.
1. **Search is slow enough to hang the crawler**: `library-search-category` and `library-search-entity`
   never finish on phone or desktop. Measure (time to render a category list, time to open an entity
   from search), find the cause (e.g. rendering thousands of rows unvirtualised, recomputing on every
   keystroke, loading the alias plane synchronously), fix it. Target: < 300 ms per interaction on a
   desktop CPU. Add a perf test or a guard.
2. **Dead controls** (~30 across reports, "nothing happened"): for each, decide: real bug → fix; or false
   positive (clicking the already-active tab, toggles whose effect the crawler can't see, file pickers) →
   improve `scripts/ui-crawl.mjs` detection (aria-pressed/checked change, class change, file chooser
   event). Check especially: Setup "Step 1: Status" and "Open screenshots", Map "Not there" and "Open
   alias", Profiles "All".
3. **Duplicates** (10–12 groups, e.g. Tarnished › Overview codex sections): remove genuinely duplicated
   controls; keep intentional repeats and teach the crawler to ignore those (documented allow-list).
4. Re-run the crawl yourself on a production preview (`npm run build`, `npx vite preview --port 4174`,
   `CRAWL_URL=http://localhost:4174 node scripts/ui-crawl.mjs`, headless; stop the preview after) and
   report before/after numbers: dead, errors, duplicates, and whether search completes.

## CHANGE (from Claude): do NOT start any server or background process yourself
Starting `vite preview` opened a visible window on the owner's PC. Skip item 4's re-crawl entirely —
Claude runs the crawl after merging. Never use Start-Process, `start`, or detached/background commands.
