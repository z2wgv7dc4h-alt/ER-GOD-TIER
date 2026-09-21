# Task 09 — Wire the vendor map engine; upgrade the static fallback plates

## Context

Repo root is `artifacts/all-knowing/` (`cd` there first). Read, in order: `HANDOFF-CLAUDE.md`,
`ARCHITECTURE.md`, and **`docs/MAP-ENGINE.md` — read this one especially carefully**, it is
explicit: *"This is the atlas. All-Knowing does not grow a second map."* Do not build a second
tiling/pan/zoom system. The real tiled, zoomable map is a feature of the vendored
`egormagurin/EldenRingMap` engine, extracted from **the user's own local game install** — never
shipped, never committed. `src/Atlas.tsx` already branches on `engineLive` and renders that
engine via `<iframe src={MAP_ENGINE_BASE}/?embed=1}>` when it's running; when it's not (PS5
always, PC without local setup), it falls back to a flat, static per-world plate image with an
SVG pin overlay (`atlas-plate` / `worldMeta.plate`). This task has two independent halves — do
both, but keep them as separate commits since they touch unrelated code paths.

## Part A — wire up the vendor engine

`package.json` already has `map` / `map:live` / `map:setup` scripts pointing at
`vendor/elden-ring-map/server/index.js` and `vendor/elden-ring-map/tools/*.py`, but that
`vendor/` folder does not exist in this checkout (excluded from the handoff, almost certainly
gitignored upstream as an external dependency). Per `docs/MAP-ENGINE.md`'s "Pulling upstream"
section:

```
git clone https://github.com/egormagurin/EldenRingMap.git /tmp/ERMap
# copy over vendor/elden-ring-map
# re-apply: CORS + OPTIONS + ?embed=1  (search for "All-Knowing")
```

**Clone into `./.scratch/` inside this repo first (gitignored), never `%TEMP%` or any path
outside the project** — a headless run cloning into system temp will silently auto-reject (the
permission allowlist only matches Windows-style backslash paths, not the forward-slash paths a
git-bash shell produces for the same location). Clone to `.scratch/ERMap` and copy from there
into `vendor/elden-ring-map/` once you're ready.

Clone it in, and **search the upstream repo's server code for existing "All-Knowing" markers/
comments** — the doc implies a previous pass already made specific patches (CORS headers, OPTIONS
handling, the `?embed=1` embed mode) to *this* upstream repo, not a generic one, meaning either
those patches need to be re-applied by hand (if the upstream repo doesn't have them) or they may
already be upstream if the original author contributed them back — check both before assuming
you need to write the patches from scratch. Do not commit the vendored repo's own generated
output (`web/tiles`, extracted game data) — `docs/MAP-ENGINE.md` explicitly says not to, and
`.gitignore` should reflect that (check it covers `vendor/elden-ring-map`'s generated
directories; add entries if missing).

**A real local Elden Ring install now exists on this machine**:
`C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game\` (confirmed: `eldenring.exe` and
`regulation.bin` both present). This part is genuinely verifiable now — but with one critical
change to how you run it.

**Do not run `Setup.bat` / `npm run map:setup` directly.** A prior attempt did exactly that and
hung indefinitely: `Setup.bat` is a human-oriented interactive wrapper. Its final step (line
~121, `set /p ans=  Fetch them? [y/N]`) blocks on a real keyboard read with no timeout, and a
headless agent has no stdin to answer it with — the process sat idle for 30+ minutes waiting.
(Also plausible as a contributing factor: `pip install` inside the script writes to Python's
global site-packages, which is outside this repo's working tree and may itself hit the same
external-directory permission wall documented in `docs/tasks/00-README.md`'s standing rule — one
more reason to avoid the monolithic script.)

**Instead, call the underlying Python tools directly** — read `Setup.bat` first to see exactly
what it does step by step (it's short and clear), then replicate steps 1–6 as direct,
non-interactive commands, skipping step 8 (the optional Fextralife tip-fetch) entirely — that
step is explicitly optional and outside this task's scope, don't attempt it:

1. Install Python deps: `pip install --quiet --disable-pip-version-check zstandard pycryptodome pillow texture2ddecoder numpy`
2. `python tools/extract_tiles.py --game-dir "C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game"`
3. `python tools/build_markers.py "C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game"`
4. `python tools/enumerate_maps.py`
5. `python tools/extract_items.py --game-dir "C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game"`
6. `python tools/extract_icons.py --game-dir "C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game"`

None of these six commands are interactive — none of them contain a `pause` or `set /p` (that's
only in `Setup.bat` itself and in the separate, skipped `fetch_tips.py`). Quote the game path
exactly as shown (it has spaces and parentheses — a real source of bugs if unquoted or
double-escaped). Run each step to completion and check its exit code before moving to the next;
if any step fails, stop and report the actual error rather than proceeding on a partial extract.
This can legitimately take a while (the real tile/marker/item extraction is genuinely
CPU-and-I/O-heavy against a multi-GB game) — that's expected, not a sign of a problem, as long as
each step's own tool process is what's consuming the time, not a blocked prompt.

After extraction succeeds, confirm `npm run map` starts the Node server without crashing, and
report what it actually shows connected to a live game/save if you can verify that too.

## Part B — upgrade the static fallback plates

This is unrelated to Part A — it improves what non-engine users (PS5, or PC before running
setup) see. Source: `COMPLETE Resource Pack-960-1-0-1651278607.zip`
(`C:\Users\RIGGUSPIG\Downloads\COMPLETE Resource Pack-960-1-0-1651278607.zip`), already analyzed
in `docs/research/nexus-packs-analysis.md` (read it) — contains `maps/m0-overworld.png` (9728×9216,
172MB) and `maps/m1-underground.png` (32MB), both far higher quality than the current
`public/sourced/maps/m0-overworld.jpg` (~2MB "Elden Armory plate"). Redistribution permission for
this pack has been confirmed cleared by the project owner.

- **Do not ship either raw PNG.** Downscale/recompress to roughly the same size class as the
  existing plates (a few MB, JPG or WebP). `src/knowledge/graces.ts` lines 87–89 declare the
  `worlds` array with `plate` paths (`/sourced/maps/m0-overworld.jpg`,
  `/sourced/maps/m1-underground.jpg`) — its `overworld` entry's hint even says *"Drop
  m0-overworld.jpg into public/sourced/maps when you have the 176 MB plate compressed"*, i.e.
  this exact task was already anticipated in a code comment. Match the existing image's
  dimensions/aspect ratio so pins (percent-based `x`/`y`, see below) still land correctly.
- **Already resolved, don't redo**: the Shadow/Ashen plate gap this section originally described
  is fixed. `graces.ts`'s `worlds` array now has all four entries (`overworld`, `underground`,
  `ashen`, `shadow`) each with a real `plate` path — `ashen`/`shadow` use AI-generated stand-in
  art (`/sourced/maps/m-ashen.jpg`, `/sourced/maps/m-shadow.jpg`), visually confirmed working
  (Realm of Shadow renders its plate with grace pins overlaid). This task's remaining plate work
  is upgrading `overworld`/`underground` specifically to Pack 960's real assembled map art — the
  AI-generated Ashen/Shadow plates are acceptable as decorative stand-ins since no real assembled
  map source for those worlds has been found, but do not replace them with AI art if you're
  tempted to do the same for overworld/underground — those should be the real thing per the
  original guidance below.
- Confirm the replacement plates don't break the existing SVG pin overlay math in `Atlas.tsx` —
  it draws pins on a `viewBox="0 0 100 80"` percent-based coordinate space, independent of the
  underlying image's native pixel resolution, so this should just work as a drop-in image swap,
  but verify visually (screenshot both overworld and underground with pins showing) rather than
  assuming.

## Part C — coordinate-frame cleanup (small, do last)

Per `HANDOFF-CLAUDE.md` P1 items 10 and 12 — read `ARCHITECTURE.md`'s "Two map frames (do not
mix)" section again first:

- `public/sourced/open/world-lots.json` (10,011 rows, pickup XYZ) is currently **not** projected
  onto the static plate at all — only the 109 `boss-pins.json` entries are. Per the gap item,
  either (a) pick a single consistent projection and plot a sensible subset of lots (don't dump
  all 10k as pins, that was already flagged elsewhere as a performance/clutter concern), or (b)
  explicitly leave lots off the static plate and document that decision in code comments —
  either is acceptable, just don't do a half-implementation with two inconsistent projections
  visible at once.
- Confirm the engine-iframe and static-plate render paths never show both pin sets in the same
  view — read `Atlas.tsx`'s `engineLive` conditional; this looks like it's already correctly
  mutually exclusive (iframe vs. `atlas-plate` div), so this may just need a one-line confirmation
  in your report rather than a code change. If you find a case where both render simultaneously,
  fix it.

**Out of scope**: `HANDOFF-CLAUDE.md` P1 item 13, dungeon/interior maps (Stormveil etc. have XYZ
only, no plated interior) — bigger, separate problem, do not attempt it here.

## Acceptance criteria

- `vendor/elden-ring-map/` exists with the upstream engine cloned in and the CORS/OPTIONS/
  `?embed=1` patches confirmed present (either already upstream or re-applied); `npm run map`
  starts without crashing.
- New plate images in place for overworld and underground at a reasonable file size (report the
  before/after sizes), visually confirmed via screenshot to still align with existing pins.
- A clear, honest statement on Shadow/ashen plate coverage — added if a source exists, explicitly
  noted as still missing if not.
- `world-lots.json` handling decision (projected subset, or deliberately excluded) is consistent
  and documented, not half-done.
- `npx tsc -b` and `npm run lint` pass.
- Final report: what Part A setup still requires from a user with a real local game install (be
  specific/actionable), before/after plate file sizes, and screenshots of both render paths
  (static plate and, if you were able to test it, the live engine iframe).
