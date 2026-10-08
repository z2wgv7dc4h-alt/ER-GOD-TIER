# Task 167 — Score and tune the PS5 photo reader on the owner's real photos

Follow AGENTS.md. Branch `task-167`. Other agents work on UI/inference — touch only the photo-reading
code (`src/lib/ps5Capture*.ts`, OCR worker, vision/icon matching, `src/lib/__fixtures__/ps5/`) and tests.

The owner's real phone photos of the TV are in `src/lib/__fixtures__/ps5/` (13 photos: status,
equipment, talisman list, inventory pages — ashes of war, bolstering, key items, sorceries, spirit
ashes, tools — crafting, 3 maps) with `ground-truth.json`. Check ground truth against the photos is
complete (every photo, every readable field: level, stats, equipped items, highlighted item name,
visible item grid cells, map area). If an entry is missing or incomplete, add it ONLY if you can verify
it from the image itself; otherwise list it in the report as "needs owner check".

1. Scoring harness `npm run eval:photos` (`scripts/photo-eval.mjs`, runs offline OCR — the same path
   the app uses, `npm run test:ocr` shows how — no API calls): per photo and per field: correct /
   wrong / missed; overall field accuracy, per screen type, and time per photo. Write
   `docs/PHOTO-EVAL.md`.
2. Tune: find the main failure causes (perspective/angle, glare, moire, crop detection, font, number
   parsing, item-name matching vs the alias plane, grid-cell identification) and fix the biggest ones.
   Use the game's own data for matching (names from `public/sourced/open/text/*Name.json`, icons in
   `public/sourced/images/game-icons/` from Task 154 for icon matching of inventory cells when names
   aren't printed — only the highlighted item's name is ever shown).
   No overfitting: rules must be general (no per-photo hacks, no hard-coded expected values).
3. Re-score; report before/after. Remember: these are angled phone photos with glare — the reader must
   work on those, not clean screenshots.
While working: `npm run test:ocr`, touched tests, `npx tsc -b`. At the end ONCE: full `npx vitest run`,
`npm run lint`, `npm run build`, `npm run test:bundle`. Commit per fix. Report `docs/tasks/167-report.md`
(print it): before/after per screen type, causes fixed, remaining failures, ground-truth gaps, ASSUMPTIONS.

## Also: map photos (from the old Task 141, branch `task-141` — read its brief
`docs/tasks/141-map-reader-recall.md` via `git show task-141:artifacts/all-knowing/docs/tasks/141-map-reader-recall.md`,
and reuse any good code from that branch). The map reader (`src/lib/ps5Map*`) registers photos to 2–3 px
but snaps only ~20% of detected gold grace icons to named graces (map-overworld-01: 55→11; north: 91→22;
underground: 24→4), and treats Mt. Gelmir's dark terrain as unrevealed. Raise grace recall (target ≥ 70%
of detected icons snapped correctly, no false graces) and fix the dark-terrain misread. Include map
photos in the before/after scores.

## Also: real-world photos from the internet (robustness set)
Web access allowed for this part. Players post phone photos of their TV screens (Reddit r/Eldenring,
r/EldenRingHelp, r/Shadowoftheerdtree etc.: i.redd.it / imgur images whose post title/flair suggests a
status, inventory, equipment, map or item screen; also image search results that are clearly photos of a
TV/monitor, not screenshots). Polite fetching (≤1 req/2 s, descriptive User-Agent, no logins). Collect
~150 photos into `.scratch/167/web-photos/` (NOT committed — keep them out of git), with a
`.scratch/167/web-photos/index.json` (url, post permalink, guessed screen type). These have no ground
truth, so score them with SELF-CONSISTENCY checks in `npm run eval:photos -- --web`:
screen type detected; status screen: level = sum of the 8 stats − 79, stats in 1–99, runes/level plausible;
every read item/grace name resolves to a real game name (alias plane); equipment slots consistent with
item kinds; map: registration succeeded. Report the pass rate per check and per screen type, before and
after your fixes, and list the commonest failure patterns (glare, angle, moire, crop, UI scale, language).
Never tune to a single web photo; use them to find general failure modes.
