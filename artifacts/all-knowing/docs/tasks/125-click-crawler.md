# Task 125 — Click-everything crawler (`npm run crawl:ui`)

Build `scripts/ui-crawl.mjs` (playwright-core + installed Edge/Chrome, same launch as `ui-audit.mjs`; dev server
already on :5173 — never start/stop it). Phone 375×812 and desktop 1440×900, fresh storage, tour skipped, a
seeded demo character (stats set, a few bosses/graces logged so progress-dependent UI shows).

For every section/sub-view (`#/me/overview`, `me/gear`, `me/setup`, `me/profiles`, `journey/now`, `journey/area`,
`journey/map`, `journey/quests`, `library/search` (+ one category + one open entity), `library/builds`,
`library/pvp`, `library/guides`, `gideon`) plus the header `⋯` menu, the quick-log sheet, the area picker and an
entity page:
1. Enumerate every visible interactive element (button, a, [role=button|tab|link], input, select, summary).
   Record label (text/aria-label), selector, size, position.
2. Click each one (inputs: focus + type a sample value; selects: pick the 2nd option), then record the outcome:
   hash change (from → to), overlay/sheet opened, DOM changed (count of nodes changed, new text snippet),
   external navigation attempted, console errors, **nothing happened**. Screenshot only when something opened.
   Restore state (go back / close overlay / reload the view) before the next click.
3. Output `.scratch/ui-crawl/<ts>/crawl.json` + `crawl.md`: per screen, a table of controls with outcome; then
   summaries: **dead controls** (nothing happened), **error controls**, **duplicates** (same label → same outcome
   appearing on 2+ screens or 2+ times on one screen), **controls per screen** count, **words on screen** count,
   and the 20 longest text blocks per screen (prose that could be cut).

Do not change app code in this task — only add the script + npm script. Do NOT commit (another agent is
committing in this tree); leave the files for review. Run it once and report the summaries.
