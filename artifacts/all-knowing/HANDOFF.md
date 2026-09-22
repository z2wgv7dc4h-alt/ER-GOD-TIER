# Handoff — All-Knowing

Read this before writing code. Do not invent a second kernel.

## What it is

Local-first PWA. One `Character` is the world. Atlas, Build, Quests, Codex, Reckoning, Gideon are views.

```
Desktop  280px Now (Gideon) │ Stage 1fr
Phone    tabs: Map / Now / Kit
```

The identity rail is an off-canvas **Tarnished sheet** behind the name button (profiles, packet,
save drop, recents, the full character card, the five room links). Reckon / Quests / Codex are links
in that sheet, not tabs; the Codex also opens from a `/` search hit. The old lean-back toggle was removed (Task 83).

## Do not break

- Fact ids: authored `kind:slug` (`boss:godrick`, `grace:elleh`). Open dumps keep their ids (`bossflag:530110`, `shop:100056`, `lot:10007850`). `applyFacts` buckets by prefix (`prefixKind` in `src/lib/infer.ts`).
- Three states via `factState()` — the four lists + `deniedFacts`. Evidence alone is not “true”.
- Vault: `localStorage` key `all-knowing.vault.v1`. Packet has no screenshots.
- Merge never replace: `src/lib/merge.ts`.
- Gideon: `askGideon` → `GideonAct`. The shell always switches `act.module`.
- Sync search: `searchSync` (`src/lib/search.ts`). Command bar, Gideon type-to-log, Reckon extra hits, Gideon fallback. Heavy JSON stays in Codex hooks.

## Two map frames (do not mix)

1. er-guide lat/lng → `public/sourced/open/coords.json`
2. Goblins XYZ + `m60`/`m61` tiles × 256 → `boss-pins.json`

Do not average them. Pickup XYZ lives in `world-lots.json` (10,011 rows) and is not on the JPG except the 109 boss pins.
One projection per view (Task 09 Part C): the engine iframe and the static plate never render at
once, and the detail panel resolves its target in the active view only (`src/lib/atlasSelection.ts`) —
so Found/Unknown/Not-there and Thread act on the entity shown, engine or plate, never a hidden pin.

Full game text: `open/text/` (36 FMG tables, 34,053 strings) incl. verbatim `TalkMsg` dialogue,
dumped by `scripts/extract-game-text.py`; `src/lib/gameText.ts` loads lazily, Codex dialogue search in
`src/Dialogue.tsx`. Speaker attribution: `open/dialogue-owners.json` joins ESD `TalkID` -> MSB PARTS
`TalkID` -> `NPCParamID` -> name, naming 95 speakers / 1,952 lines. Ceiling is inherent — ESDs reference
only 2,129 of the 9,818 TalkMsg lines; the rest are menu/cutscene/UI, not attributed. No speaker invented.

Weapon numeric params: already in `regulation-vanilla-v1.17.json` (3,296 rows: requirements, attack,
scaling) and decoded by `src/lib/ar.ts` for AR; `src/lib/weaponStats.ts` + `src/WeaponStats.tsx`
surface requirements/scaling/base attack in the Codex (previously only FanAPI weight/category).

## Gideon

`src/lib/gideon.ts` + `src/Gideon.tsx`.

Intents: endings/lines/blitz, still-available, builds, shops, missables, fragments, warps, loot,
hunts, stuck, 100% spine, boss pins, and (Tasks 74–86) region "what did I miss here", wear a named
kit through the same `buildId` the chips set, "where is <companion>" from `npcLocations.ts`, and
co-op filtering (`answers.coop`). Both the Now strip and Quests read the one `allLines()` graph;
`buildHunt` turns a kit into `{ have, missing, pins, unresolved }`; `beatPin` resolves a plan beat to
an existing pin for **Show**. `searchSync` remains the last resort.

Optional LLM: Meta Muse Spark 1.3 Contributor (`src/lib/muse.ts`, `VITE_GIDEON_API_KEY`), same Act
JSON, router-first. Ground with `planRoute`, `stillAvailable`, `searchSync`. No invented ids;
sentences naming an ungrounded id are stripped.

## Paths

- PS5: Reckoning interview + paste; `src/lib/ocr.ts` runs real on-device Tesseract.
- PC: `npm run map` SSE, or drop `ER0000.sl2` — `src/lib/save.ts` is a real read-only in-browser parser.
- `canonicalFactId` still only fires when names match.

## Refresh data

```
bash scripts/ingest-open.sh
python3 scripts/slim-lots.py
node scripts/ingest-fanapi.mjs
```

er-guide, FanAPI, Paramdex Names, Goblins `data/`.

Inventory: `DATA.md`.

## Next (in order)

Live list is `HANDOFF-CLAUDE.md` §6–§8. As of Task 86 the open threads are:

1. One projection for lots on the plate (Task 09 Part C), or keep them off.
2. Dungeon interiors (bosses are XYZ-only today).
3. `canonicalFactId` audit across every fact category (bosses improved, the rest not).
4. Real 100% spine checklist + detours from real `NpcParam` data.

## Refuse

Uploads, save edits, FromSoftware tile archives, invented AR, Nightreign v1.

## Sources

External research is allowed without restriction. Facts, locations-in-prose, build ideas, one-line citations, and source data may be fetched, scraped, or downloaded from anywhere on the internet — in-repo dumps, the user's run, Fextralife, wiki.gg, MapGenie, YouTube, Discord, patch notes. Each row should still carry its source (a title or URL is enough). Accuracy rules still apply: param numbers, item names-as-ids, and pin coordinates come only from in-repo regulation / names.json / coords / loot / catalog, and do not invent lat/lng, event flags, or lockouts. Full policy: `HANDOFF-CLAUDE.md` §4.

## Run

```
cd artifacts/all-knowing
npm run dev
npm run map
```
