# Task 52 — Missable gate overlay ("if I keep walking, what do I lock?")

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `ARCHITECTURE.md`,
`src/knowledge/endings.ts`, `src/knowledge/storylines.ts`, `src/knowledge/missables.ts`,
`src/lib/gideon.ts`, `src/Atlas.tsx`, `src/lib/leftovers.ts` before writing code.

Task 50 (queued, do **not** run in parallel with this) is a confirm-before-commit warning on a
single quest step. This task is different: world-state **gates** (Forge, Maliketh, Sealing Tree,
ending commits) that kill content if the player just keeps walking. Do not fold this into Task
50 and do not reimplement Task 50 here.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Add a first-class `Gate` model and surface it in Gideon + Atlas so "if I keep going, what do I
miss?" is answered from this character, unprompted when a gate is the next beat.

## Requirements

A Gate is a world-state tripwire, not a quest step. Minimum set (all must exist):

- `gate:forge` — burning the Erdtree / Forge of the Giants
- `gate:maliketh` — Maliketh dead → Ashen Capital, living Leyndell gone
- `gate:sealing-tree` — Shadow Keep / Sealing Tree (Leda invitations close)
- `gate:ranni-ending` — Age of Stars committed
- `gate:frenzy` — Three Fingers / frenzy ending committed
- `gate:dung-eater-curse` — Seedbed curse ending committed
- `gate:seluvis-potion` — potion used on Nepheli or Dung Eater
- `gate:volcano-host` — joining Tanith / killing Rykard too early vs Rya
- `gate:millicent-choice` — gold vs red sign at Elphael
- `gate:varre-ignore` — ignoring Rose Church / killing Varré (Mohgwyn medal)

Each Gate:

```ts
{
  id: string
  name: string
  aliases: string[]
  triggerFacts: string[]            // fact ids that fire it
  approachingWhen: string[]         // facts that mean "one beat away"
  locks: { factId: string; name: string; why: string }[]
  stillOk?: { factId: string; name: string }[]
}
```

- `locks[]` must use existing catalog / storyline / missable ids where they exist. Add new fact
  ids only when the locked thing is real and missing from the catalog.
- Do not scrape Fextralife. Author from in-repo `missables.ts`, `guide/missables.json`, storyline
  `lockouts`, and flag families already documented in `DATA.md`.
- If you are unsure a thing actually locks, omit it. Wrong lockouts are worse than a short list.
- `planRoute` / `stillAvailable` must consult gates. If the next authored beat is a
  `triggerFact`, Gideon says the lock list **before** the walk-forward instruction.
- Atlas: leftover/watchlist layer already exists (Task 33). Add a toggleable "locks if you
  continue" pin layer sourced from approaching gates. Reuse existing coords / boss pins. If a
  locked fact has no pin, list it in the Atlas side panel — do not invent lat/lng.
- New file: `src/knowledge/gates.ts` + `src/knowledge/gates.test.ts`.
- Wire into `askGideonRouter` for prompts matching: "if I keep going", "what do I miss", "am I
  locking", "before the forge", "before maliketh", "before shadow keep". Also inject into the
  existing "what next" / "what should I do now" answers when an approaching gate is true.

### Golden fixture (tests)

Mid-run, not NG+ 100%:

**true:** `boss:margit`, `boss:godrick`, `boss:rennala`, `boss:radahn`, Mimic Tear (catalog id
that exists), `item:black-whetblade` (or the catalog slug that exists),
`item:godrick-great-rune`, `grace:ranni-rise` (or aliased warp), Varré started at Rose Church,
Rogier has the knifeprint, Fia path advanced (D dead / Twinned available), Ensha dead, Thops
talked.

**unknown/false:** Fingerslayer not handed in, Study Hall not inverted, Deeproot coffin not
ridden, Leyndell / Morgott not done, Millicent / Gowry not started, Rya / Volcano not started,
Mohg not done, 4th talisman pouch unknown.

For this fixture, "what do I miss if I walk into Leyndell / Forge" must mention at least:
unfinished Ranni (Fingerslayer / Nokron aftermath), Millicent not started, Rya / Volcano not
started, Varré / Mohgwyn not finished. If a lock does **not** actually fire at Leyndell entry,
do not claim it does.

## Explicit exclusions

- Do not touch OCR, the `.sl2` parser, the map engine vendor, or AR math.
- Do not add Nightreign.
- Do not expand full questlines here (Task 53). You may add missing fact ids the gates require.
- Do not run in parallel with Task 50 or Task 53 (`storylines.ts` / `endings.ts` / Gideon).

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- Unit tests: fixture character + each gate's `approachingWhen` / `locks` membership. At least
  one negative test: walking to the Raya Lucaria library does not fire `gate:forge`.
- `npm run dev`: asking Gideon "if I keep going to Leyndell what do I miss" on the fixture
  returns named locks, not a generic warning.
