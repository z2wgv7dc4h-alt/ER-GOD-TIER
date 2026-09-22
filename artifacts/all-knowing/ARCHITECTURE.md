# All-Knowing architecture

## Kernel

One `Character` in `src/state.tsx`. Modules project it. Gideon mutates it only through `setCharacter` / `applyFacts`.

```
PS5  interview + shots ─┐
PC   .sl2 / map SSE    ─┼──► Character ── rooms + Gideon
Vault / packet         ─┘
```

Fact language: `kind:slug`. State: `true | false | unknown`.

Evidence → facts runs through `applyFacts` / `denyFacts` / `closeWorld` (`src/lib/infer.ts`).
`closeWorld` walks `catalog.implies` **and** the authored `inferChains` table, so a named read
(OCR hit, warp paste, typed item) can imply downstream facts. Derived facts are always
`source: 'inference'`; Task 24 conflict rules keep a save flag or an explicit deny winning.
Engine ids (`grace:{row}`, `bossflag:{n}`) canonicalise to authored slugs via the generated
alias plane (`scripts/gen-aliases.mjs` → `aliases.json`; see `docs/ALIAS-PLANE.md`). Every
`BonfireWarpParam` warp resolves through it: an authored slug where one exists, otherwise a
name-derived `grace:{slug}` stub with no catalog fact, no pin and no implications (Task 73).

## Shell

Desktop: `280px Now strip | stage` — Gideon on the left, the current room on the right, no identity
rail on the first screen. Phone (<700px): exactly three tabs **Map / Now / Kit** (Now is Gideon as
the full stage). At every width the identity rail is the off-canvas **Tarnished sheet** (opened from
the name button): profiles, packet, save drop, recents, the full character card, and the five room
links. Reckon / Quests / Codex are links in that sheet, not tabs (Task 83). The Codex opens only from
the sheet link or a `/` search hit (Task 86).

Hotkeys in `QoL.tsx` (`/` search, `1–5` rooms, `⌘Z` undo, `⌘S` packet). The command palette navigates
with ↑/↓ (wrapping), Enter selects, Esc clears (`src/lib/palette.ts`). The sheet's "Recently viewed"
panel (`src/lib/recent.ts`) jumps back to the last 12 facts.

## AI

Deterministic router `src/lib/gideon.ts` → `GideonAct`.
UI `src/Gideon.tsx` executes the act.

Intents already wired: ending/line plan, blitz, still-available, wear build, loot, warp, hunt, stuck, 100% spine, affirm (“show it”).

Replace the router later; do not replace the act.

Optional model: **Meta Muse Spark 1.3 Contributor** via `src/lib/muse.ts` (`VITE_GIDEON_API_KEY`,
defaults `https://api.meta.ai/v1` + `muse-spark-1.3-contributor`), router-first and
grounding-validated in `src/lib/gideonLlm.ts`; dev proxies `/gideon-llm` → `api.meta.ai` to dodge
CORS. Build hunts: `src/lib/buildHunt.ts` turns a kit into `{ have, missing, pins, unresolved }`
and reuses the Task 33 leftover pin layer.

Idle proactive chips (`src/lib/suggestions.ts` → `idleSuggestions`) reuse `stillAvailable` /
`nextMoves` / `leftovers` / `approachingGates` and run through the same `run()` path; the command
palette debounces `searchSync`. Before any step is ticked (Quests.tsx or Gideon markDone / “I'm
done”), `src/lib/lockWarnings.ts` confirms via `LockoutPrompt` when `planRoute` would foreclose a
line the character started — no second DAG walker.

`QuestWorkspace` renders `allLines()` — the same graph as Gideon and `planRoute` — and ticks a beat
by writing its `factId` (`applyFacts` / `clearFact`). There is no second quest list.

Under 700px the Atlas renders its own `.atlas-jobs` chip bar — Missing only / leftovers / locks
always visible, the seven pin kinds behind one `layers` overflow (`#atlas-layers`). The topbar
toggles are the desktop surface; the engine iframe's own `?embed=1` controls are untouched, and no
third pin system is introduced (Task 69).

`estimateDefense()` in `Build.tsx` reports no poise or equip load: the in-repo regulation extract
only powers the Clark attack rating, so the Build preview is a labelled estimate, never a second
formula (Task 71).

A pure `gideonHeader(character)` (`src/lib/gideonHeader.ts`) feeds the Now strip / sticky goal · beat ·
gate bar, reusing `planRoute` / `idleSuggestions` / `approachingGates` — the router and the act are
unchanged (Task 72). The Now strip itself is the compact Task 84 panel: current beat, one gate,
**Show** only when `src/lib/beatPins.ts` resolves an existing pin, **Done** through the lockout
confirm, and an "N open · M locked" line into the Quests archive.

`knowledge/storylines.ts` carries the seeded lines plus the Task 74 companion pass; Quests, Gideon and
`planRoute` share the one graph. `src/lib/regionLeftovers.ts` answers "what did I miss here" (Task 75)
from leftovers / stillAvailable / approachingGates only. Gideon's `WEAR_KIT` branch applies a named
kit through the same `buildId` the chips use (Task 76). `src/knowledge/npcLocations.ts` locates eight
companions at existing graces (Task 79). Co-op (`answers.coop`, `src/lib/coop.ts`) drops Mimic /
Torrent advice (Task 81). `src/knowledge/dungeons.ts` is the Stormveil checklist (`Dungeon.tsx`,
Task 80). The Kit room's first paint is stats + one AR + the active hunt; the library (OP/PvP chips,
AR detail, matchup, `akb1.` codes, compare) sits behind one closed `Kits…` disclosure (Task 85).

## Persistence

`all-knowing.vault.v1` — profiles + UI (room, missingOnly, selected pin).
Packet `*.all-knowing.json` — character only, no shots. PacketBar shares it by clipboard/download
and a scannable QR: the full JSON when ≤ 2953 bytes, else a filename + SHA-256 handoff card
(`src/lib/packetQr.ts`, `uqr`).
Build codes (`src/lib/buildCode.ts`, `akb1.…`) are a separate, smaller concern — stats + level +
loadout only, for pasting into chat. They are not the packet and carry no run progress.

## Hosted data

See `src/lib/hosted.ts`. Cached under `public/sourced/checklists/`.
Maps under `public/sourced/maps/`. Refresh with raw GitHub / fanapi, or scrape any other source you like. Full sources policy in `HANDOFF-CLAUDE.md` §4.

Reference data under `public/sourced/open/fanapi/` (Task 67/68): structured FanAPI fields — armor
poise/negation, talisman effects, spell cost/requirements, Ash of War skill, boss HP/drops, item
effects, class stats — refreshed by `node scripts/ingest-fanapi.mjs`, loaded by
`src/lib/fanapiData.ts` and surfaced in the Codex. Structured fields only; AR numbers stay on the
in-repo regulation source.

Fonts (Cinzel + Source Sans 3, both OFL) are self-hosted under `public/fonts/` and declared with
`@font-face` in `src/index.css`; the service-worker precache includes them, so the interface works
offline with no cross-origin font request. Dev startup is `npm start` (map engine + Vite together).

## Refused

Uploads, save edits, bundling FromSoftware archives, inventing AR, Nightreign in v1.
