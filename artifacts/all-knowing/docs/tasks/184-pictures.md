# Task 184 — Pictures for enemies, NPCs, graces, regions, merchants, quests

Follow AGENTS.md (completion contract). Web access allowed for item 1 only. FIRST:
`git merge --no-edit master` (Task 182 added on-disk pictures; build on it). You own picture code:
`src/lib/fanImage.ts`, image-index generation, the picture part of `src/lib/entityIndexBuild.ts`
(grep; never read whole), new scripts, and tests. Never use a wrong picture — empty beats wrong.

Coverage now (record.image or image-index match): enemy 28%, npc 32%, grace 34%, region 38%,
merchant 16%, quest 6%.
1. **Enemies + NPCs**: the wiki dump `.scratch/er-mcp.db` (copy from the main checkout's `.scratch/` if
   missing) has each page's infobox `image =` file name. Download via
   `https://eldenring.fandom.com/wiki/Special:FilePath/<file>` (≤1 request/s, descriptive User-Agent,
   cache in `.scratch/184/`), resize to 256px WebP into `public/sourced/images/creatures/` /
   `images/npcs/`, map by exact page title / alias. Enemy variants share their base enemy's picture.
2. **Graces + regions**: generate a map-crop thumbnail (256px WebP) centred on the record's coords from
   the map tiles the app already ships (find them via `docs/MAP-ENGINE.md`; right layer: surface /
   underground / DLC). Into `public/sourced/images/places/`. Records without coords stay empty.
3. **Merchants + quests**: use the owning NPC's picture.
4. Keep the offline manifest and `npm run test:bundle` happy (images are static assets, not JS).
Test: per-kind coverage floors (set them to what you achieve), every referenced file exists, no enemy
picture shared across different base enemies. Report before/after per kind, MB added.

## CHANGE (from Claude): start now, in parallel with Task 182
Skip the "FIRST: git merge master" step. Task 182 is still editing `src/lib/entityIndexBuild.ts` and
`src/lib/fanImage.ts` — do NOT edit those two files. Instead: download/generate the pictures (items 1–3)
into the folders named, and write the name/id → picture mapping to a NEW file
`src/data/image-index-extra.json`; wire it in with the smallest possible change in ONE new module
`src/lib/extraImages.ts` that the UI's picture lookup can call (find the call sites of `fanImage(` and
add a fallback there, not inside fanImage.ts). Coverage test reads both indexes.
