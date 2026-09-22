> **2026-09-22 — partially superseded.** The user had a real, further-along implementation of
> this exact product already built elsewhere: **All-Knowing**, now at `artifacts/all-knowing/`.
> Its own `HANDOFF-CLAUDE.md` / `HANDOFF.md` / `ARCHITECTURE.md` / `DATA.md` are the live source
> of truth for the app itself — read those first. The from-scratch MVP task sequence below is
> archived at `docs/tasks/_archived-scratch-plan/` and no longer active. What's still live here:
> the **licensing policy**, the **repo research** (erdb, save editor, etc. — cross-check against
> what All-Knowing already ingests per its `DATA.md` before treating any of it as a new addition),
> and the **Phase 2/3 AI voice/chat companion spec** below, which All-Knowing's docs don't yet
> cover. Current task briefs live at `docs/tasks/06-p0-hardening.md` onward, cut from
> All-Knowing's own prioritized gap list.

# ER Master Tool — Project Brief

Living spec. Claude (project lead / researcher / reviewer) maintains this file and the task
briefs in `docs/tasks/`. DeepSeek Flash 4.1 (CLI coding agent) executes tasks one at a time,
each started fresh with no memory of prior runs — every task file must be self-contained.

## Product thesis

The Elden Ring tool space is crowded (maps, calculators, save editors, checklists) but nothing
combines them into one coherent, offline-capable workspace. This project does: one local-first
app that layers a character ledger, an interactive atlas, an item/build codex, a build
calculator, and (differentiator) real save-file import — all in the browser, no server, no
account.

## Locked decisions

- **First shippable slice**: Unified workspace MVP — Reckoning (the front door: interview +
  screenshot triage, since PS5 has no save file to hand over) + character Ledger + Atlas + Codex
  + Forge (build calculator), all wired to one local `Character` state object with per-fact
  provenance. Everything else designs in around this. See "Reckoning — the front door" below.
- **World coverage v1**: Base game + Shadow of the Erdtree (official DLC). "Tarnished Pack" is
  treated as a togglable content-scope flag (matches the pattern already proven in the legacy
  reference app — see below), not a third-party mod.
- **Platform**: Web PWA, local-first (IndexedDB/localStorage only, no backend, no auth, no
  accounts). Offline-capable via service worker.
- **Stack**: React + Vite + TypeScript. Tailwind for styling. Plain `@tanstack/react-router`
  (NOT `@tanstack/react-start` — no SSR, no server functions, this is a pure client SPA).
  `vite-plugin-pwa` for manifest + offline caching.
- **Mobile path**: Ship the PWA first; wrap with **Capacitor** later for iOS/Android app-store
  builds from the same codebase. Do not adopt React Native/Expo — that would fork the codebase.
- **Role split**: Claude researches, architects, writes task specs, and reviews DeepSeek's
  output. DeepSeek does the intensive implementation work, one task file at a time.

## Legacy reference (do not build on top of this — mine it, don't extend it)

`_reference/tarnished-ledger-legacy/` contains a prior AI-generated attempt at this same product
("The Tarnished Ledger"), built on TanStack Start with unused auth/multiplayer/Postgres scaffolding.
It is **not the foundation** for the new build — it's a mining source:

- `src/data/catalog/*.json` — weapon/armor/talisman/spell/spirit/ashes data, already compiled from
  real sources (see `scripts/gen-catalog.py` header for provenance: ThomasJClark's calculator regulation
  data, Gobluebro's checklist, deliton's API, eldenring.wiki.gg factual stats). Useful as a
  cross-check, but Task 2 supersedes it with erdb as the canonical source.
- `src/routes/*.tsx`, `src/components/shell.tsx`, `src/store/ledger.ts` — working UX patterns
  (nav shell, progress rings, character switcher, local persisted store) worth referencing for
  interaction design, not copying wholesale (it's built on the framework we're dropping).
- `public/atlas/*.jpg` — AI-generated region illustration images already in the top-level
  `public/` folder (already promoted out of the legacy folder). Usable as placeholder art for
  the Atlas until/unless replaced with real map data.

## Real open-source repos to combine (researched 2026-09-21)

Verified via GitHub (license + activity confirmed by fetching the repo):

| Purpose | Repo | License | Notes |
|---|---|---|---|
| Canonical item/boss/NPC/location data | [EldenRingDatabase/erdb](https://github.com/EldenRingDatabase/erdb) | MIT | Auto-generated from game files, supports every patch version, hosted REST API at `api.erdb.wiki/v1/`, also pip package + Docker. **Primary data source.** |
| Build/AR calculator reference | [ThomasJClark/elden-ring-weapon-calculator](https://github.com/ThomasJClark/elden-ring-weapon-calculator) | MIT | React+TS+Vite (same stack). No packaged library — port the AR/scaling formulas, credit in NOTICES. |
| Save file import (differentiator feature) | [yo-repo87/ER-Save-Editor](https://github.com/yo-repo87/ER-Save-Editor) | MIT/Apache-2.0 dual | Rust→WASM, runs fully client-side, **nothing uploaded**. Lets a user import their real save to auto-populate the Ledger instead of manual checkbox tracking. |
| Quest lockout / fork tracking | [yosoyelfede/elden-ring-questline-map](https://github.com/yosoyelfede/elden-ring-questline-map) | MIT | Interactive questline dependency map — matches the "Weave" feature concept. |

Found but **not yet license/activity-verified** — DeepSeek should re-check before integrating:

- `googleben/ERMapViewer` — 3D in-game map viewer (Phase 2 candidate, heavier lift)
- `F3T1W/EldenTracker`, `CreateDD` interactive map (itch.io) — alternate self-hosted map candidates
- `shishir0x/EldenRing_Map` — turned up in search as a self-hosted MapGenie alternative but **404'd on fetch** (may be renamed/deleted/private) — do not rely on it without re-confirming it exists
- `CyberGiant7/Elden-Ring-Automatic-Checklist` — checklist auto-driven by save data, relevant precedent for the save-import + checklist integration
- `jtross6/EldenRingBuildRandomizer` — build randomizer, Phase 2 feature candidate
- `EldenForge/EldenForge_API` — broad REST API covering nearly every data category, redundant with erdb but worth a coverage diff if erdb is missing something

## Licensing policy (relaxed 2026-09-22 — personal, educational project)

The user has confirmed this is a **personal, educational, non-commercial, non-distributed**
project and is fine with using data available on the internet generally — don't gate ingestion on
finding an explicit permissive license first, and don't treat "no LICENSE file found" as a reason
to stop and ask. This replaces the earlier stricter policy that blocked/flagged sources like the
Nexus 960 resource pack over unstated licenses.

Baseline sense still applies, independent of licensing formality:
- Don't reproduce another author's specific creative prose (wiki descriptions, a fan walkthrough's
  narrative text) verbatim as if original — paraphrase or omit it. This is about not passing off
  someone else's writing as the project's own, not a license-compliance exercise.
- Respect this project's own stated non-goals regardless of source licensing: don't bulk-ship
  FromSoftware's actual map/tile archives, don't invent attack-rating numbers, etc. — see
  `HANDOFF-CLAUDE.md`'s "Refuse" list in the All-Knowing repo.
- Still worth a brief note in `THIRD_PARTY_NOTICES.md` for anything substantial that was ported
  or vendored, as a simple provenance record — not a compliance gate, just good practice.
- If this project's scope ever changes toward public release or commercial use, revisit this.

## MVP feature scope (Tasks 01–07)

1. **Scaffold** (Task 01) — clean Vite/React/TS PWA, no backend.
2. **Data layer** (Task 02) — broad item/boss/location catalog from erdb.
3. **Knowledge fact graph** (Task 03) — narrow hand-seeded fact graph + `Character` state with
   per-fact provenance (`"answer" | "screenshot" | "inference" | "save"`).
4. **Reckoning** (Task 04) — the front door: four-question interview + screenshot triage +
   name-matching + inference, with a receipts view. Default pane on app open. Rail entry point
   (stub) for PC save-drop.
5. **Core workspace** (Task 05) — Ledger view over the `Character` state, Atlas (region POIs),
   Codex (searchable item database).
6. **Forge** (Task 06, not yet task-briefed) — build calculator: attack rating by stats/upgrade
   level, weapon comparison, ported from ThomasJClark's formulas.
7. **PWA polish** (Task 07, not yet task-briefed) — manifest/icons, offline caching strategy,
   Capacitor-readiness for the later mobile wrap.

Progress tracking lives inside the `Character` fact model from Task 03/04 (provenance-tracked),
not a separate ad hoc checklist bolted on later — this was folded in once Reckoning's provenance
requirement made a bare boolean checklist insufficient.

Phase 2/3 (not in MVP, design the data model to not preclude them): real `.sl2` PC save parsing
(the rail stub from Task 04 becomes functional), quest lockout "Weave," the AI voice/chat
companion (see below), build randomizer, PvP/co-op planning, Capacitor mobile wrapper, boss
strategy notes.

## Reckoning — the front door (added 2026-09-21)

PS5 cannot hand this app a save file (`ER0000.sl2` is PC-only). Reckoning is how a console
player still gets current — by interview, screenshot triage, and inference — while PC players
keep the save-drop path. **Both write into the same `Character` state object** that the Atlas,
Forge, and quest graph already consume. Reckoning is the **default pane on app open**; PC save
drop stays reachable from the rail (sidebar), not the other way around.

**Interview** (four questions that collapse most world state): Platform; Starting class
(including Heavy Knight / Idus Knight); how far the map has opened (Limgrave → Shadow); which
shardbearers are dead.

**Screenshot triage** — the specific screens worth capturing, in priority order: Warp list
(best single capture — every named grace the player can sit at), Map (gold pins vs. fog),
Great Runes / key items, Pickup banner, Remembrance / "legend felled" screen. The player types
the names they can actually read off a screenshot; matching runs against the fact catalog, and
implication fills in the rest.

**Inference examples** (facts imply other facts — this is the core mechanic, not a nice-to-have):
- Godrick's Great Rune → Godrick is dead → Margit is dead → Stormveil gate graces exist.
- Fingerslayer Blade → Radahn festival happened → Ranni's Nokron step is done.
- Scadutree Fragment (presence of) → player is in the Realm of Shadow.

**Fact catalog** (`src/knowledge/catalog.ts`) is a hand-seeded closed fact graph, distinct from
the broad item/boss/location catalog in `src/data/catalog/` (from erdb, Task 02): Sites of
Grace, shardbearers, story bosses, SotE bosses, "Tarnished Pack" invaders, and key items that
prove a story beat (Great Runes, medallions, Fingerslayer Blade, Dark Moon Ring, Mending Rune
needles, etc.). Each fact entry lists what else must already be true for it to hold — that's the
implication graph. Growing this to full coverage (every grace, every item) is mechanical once a
PC game-file extract is running on any one machine — the seed catalog is enough to start.

**Provenance ("receipts") is mandatory**: every tick/fact in the Character state must record its
source — `answer` (interview), `screenshot` (user-confirmed screen type + typed names),
`inference` (derived from another fact), or `save` (parsed from a PC `.sl2` file). Never invent
a fact with no source.

**What's NOT built yet — don't fake it**: on-device OCR of a raw screenshot is a later wiring
pass (Tesseract, cropped to the pickup-banner region and the warp-list column). The MVP loop is
manual and still real: screenshot stored in-tab → player confirms which screen type it is →
player types the names they can read → matcher → inference receipts shown. Do not stub in fake
OCR results or silently skip the confirm/type step.

## Phase 2/3 — AI voice/chat companion (added 2026-09-21, NOT part of the MVP task sequence yet)

Longer-term differentiator on top of the local-first workspace: a conversational companion that
answers questions and drives the Atlas via tool calls, not free-form prose. Captured here in
full so the design survives until it's actually task-briefed — do not start building this before
Tasks 01–0N (MVP + Reckoning) are done and reviewed.

**Three separate systems, not "an AI"**: Knowledge (items/bosses/quests/locations/spoiler
rules — this is `src/data/catalog/` + `src/knowledge/catalog.ts`, already covered), Map UI (pan/
zoom/highlight/layers — the Atlas, already covered), Voice loop (listen → understand → act on
map → speak back — new).

**Architecture**: player voice/text → speech-to-text → backend (retrieves facts via structured
lookup + RAG over chunked wiki text, sends to an LLM with chat history) → LLM returns a spoken
answer plus tool calls → app applies the tool calls to the map → text-to-speech reads the
answer. The model never invents coordinates in prose — it calls functions, and the app owns map
state:

- `focus_location("Raya Lucaria Academy")`
- `show_markers(["golden_seed", "sacred_tear"])`
- `highlight_item("Moonveil")`
- `set_spoiler_level("limgrave_only")`
- `mark_found("Margit the Fell Omen")`

**Model choice**: start with a hosted LLM API (OpenAI/Anthropic/Gemini/Grok-class), not a
self-hosted or fine-tuned model. Self-hosting only becomes worth it for offline play, strict
privacy, or very high volume — none of which apply at MVP. Swapping providers later shouldn't
require an app rewrite if the tool-call contract stays stable.

**Grounding (mandatory — a generic chatbot will hallucinate item locations)**:
- Structured facts (locations, coords, item/boss IDs, region names) come from
  `src/data/catalog/` (erdb) — the model looks these up, never guesses them.
- Unstructured lore/walkthrough text goes through RAG: chunk wiki-style text into a vector
  store (Pinecone/pgvector/Chroma), embed the question, retrieve top chunks, and instruct the
  model to answer only from that context (say "unsure" otherwise).
- Spoiler control is mandatory: store player progress (region unlocked, bosses dead — this is
  exactly the `Character` state Reckoning and save-import populate) and inject it into the
  system prompt so ungained markers/answers stay hidden.

**Map data sourcing**: tiles/marker dumps may be scraped from Fextralife/MapGenie or anywhere else. Prefer game-extracted sources (erdb, MIT) plus our own marker JSON:
`{ id, name, type, x, y, region, spoiler_flag }`, and note the source on scraped rows.

**Voice specifics**: on-device speech recognition first (free, fast), falling back to
Whisper/Deepgram for messy game terms ("Radahn," "Nokron"). Start with a cheap TTS API; a
flavored voice (ElevenLabs) is a later polish pass. Stream partial transcripts so the map can
start moving before the player finishes speaking.

**Backend footprint required for this feature** (the one deviation from "local-first, no
backend" — flag to the user before starting this phase, don't silently introduce it): auth/save
of player progress if not already local, vector search over wiki chunks, item/location lookup,
the LLM call with tool definitions, optionally server-side `.sl2` parsing as a fallback to the
in-browser WASM path. A small server suffices (Cloudflare Workers / Fly.io / Railway / Vercel /
a small VPS) — the heavy model stays at the API provider, no GPU hosting needed at this stage.

**Build order** (the user's own sequencing — follow it, don't reorder): (1) web map + search box
+ marker highlight — this is the MVP Atlas/Codex; (2) text chat that can call `focus_location` /
`show_markers`; (3) ground answers with item JSON + a few wiki pages (RAG); (4) add voice in/out;
(5) add progress/spoilers/save-file import wiring into the chat context; (6) only then consider
self-hosting a model. If step 2 feels good, the rest is product work, not ML research.

## Resolved — PC extract engine identity (2026-09-22)

`vendor/elden-ring-map` in the All-Knowing codebase is confirmed to be
[egormagurin/EldenRingMap](https://github.com/egormagurin/EldenRingMap): a Node.js server
(`server/index.js`, matches the `npm run map` / `map:live --live-memory` scripts already in
`artifacts/all-knowing/package.json`) plus Python extraction tools (`extract_tiles.py`,
`build_markers.py`, `extract_items.py`, `live_memory.py` for live position tracking). License
posture matches this project's existing policy exactly: "the code is free to copy and modify,"
but map tiles and marker data are FromSoftware IP and must be generated from **the user's own
local game install**, never redistributed — this is already how `HANDOFF-CLAUDE.md` describes
it ("tiles/markers from a local game install, not shipped"), so no policy change needed.

**Resolved 2026-09-22**: a local Elden Ring install now exists on this machine —
`C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game\` (confirmed: `eldenring.exe` and
`regulation.bin` both present). This unblocks the entire "local game extract" pathway that
`SOURCE-PACK.md` previously said was completely unavailable — `vendor/elden-ring-map`'s
`npm run map:setup`, erdb's own extraction, and potentially the 9974 mod's `regulation.bin`
(moot now — this is a clean unmodified one). `artifacts/all-knowing/vendor/elden-ring-map/` still
needs to be cloned in (excluded from the original handoff zip), but Setup.bat/`npm run map:setup`
can now genuinely run and be verified, not just wired and left untested.

**Separately**: the four Nexus Mods zips the user provided (960 resource pack, 9974 boss-
completion mod, Medusa walkthrough, EldenRingMapV1.2) are under background analysis — in
particular whether the Nexus "EldenRingMapV1.2" pack is this same egormagurin tool repackaged,
or an unrelated standalone community tool that merely shares the name. Structural signs so far
(a compiled Python app with `icons/app.ico` and `core/data.dat`, vs. the GitHub repo's plain
Node+Python source tree) suggest it's a **different** tool — likely still valuable as an
additional structured data source (graces/dungeons/golden seeds/scadutree/sacred tears JSON),
just not a drop-in replacement for the vendor engine. Full analysis pending.

## Review protocol

After each DeepSeek task completes, Claude reviews the diff against that task's acceptance
criteria before the next task starts — do not chain tasks blind.
