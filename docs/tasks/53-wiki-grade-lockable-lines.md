# Task 53 — Wiki-grade steps for the eight lockable lines

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `src/knowledge/storylines.ts`,
`src/knowledge/endings.ts`, `src/knowledge/gates.ts` (if Task 52 landed), `src/lib/gideon.ts`,
`docs/ALIAS-PLANE.md`.

Task 12 gave `PlanStep` real `requires` / `grants` / `lockouts` arrays. Task 25 added companion
lines. Most lines are still 3–4 summary beats. That is why Gideon cannot replace an external chat
for "what now" on Ranni / Millicent / Fia / Leda.

Run **after** Task 52. Do not run in parallel with 52, 50, or 54 — they all touch
`storylines.ts` / `endings.ts` / catalog ids.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Expand these eight lines to wiki-grade `PlanStep`s. Do not invent a ninth line in this task.

1. **ranni** — ending route + servant steps; include Iji / Blaidd states that gate Fingerslayer
   and the fork
2. **millicent** — Gowry needle → Church of the Plague → Altus Hill → Dominula → Godskin Apostle
   → Armorer's Shack → Elphael gold/red
3. **fia** — join at Fia after Rogier's knifeprint, Deeproot, Fortissax, ending vs D's brother
4. **dung-eater** — seedbeds, potion fork with Seluvis, blessing / curse
5. **tanith / volcano manor** — Rya recruit, drawings, dying vs killing Rykard, Rya aftermath
6. **leda** — Gravesite talk order, Keep invitations, Hornsent / Ansbach / Freyja / Thiollier
   forks, Sealing Tree, Enir-Ilim
7. **sellen** — Jerren, Lusat, Azur, Witchbane, puppet / redemption
8. **ymir** — finger ruins bells, Jolan, Metyr, Iris choices

## Requirements

Each step MUST have:

- `id`, `do`, `detail`
- `factId` that exists or that you add to `catalog.ts`
- `requires[]`, `grants[]`, `lockouts[]` as real fact ids (Task 12 contract)
- `module` + optional `minLevel`
- lockout prose only as extra; the edge is the arrays

- Keep `planRoute()` the consumer. Do not write a second planner.
- Where Task 12 already has a 3-step stub, replace it in place. Do not leave the stub and add a
  parallel line.
- Ranni must exist as a traversable line, not only an ending name. If `endings.ts` already owns
  Age of Stars, share steps or re-export — no duplicated lockouts that disagree.
- Leda invitations: one step per invitation window, not one step for the whole DLC.
- Millicent aid vs betray must be two terminal steps with mutual lockouts (Rotten Winged Sword
  Insignia vs Millicent's Prosthesis).
- Do not paste copyrighted walkthrough prose. Short original detail sentences only.
- Facts and one-line citations may be fetched/scraped from anywhere (MapGenie, Fextra, patch
  notes). Still write original short detail sentences, and do not invent lat/lng, flags, or
  lockouts.
- Add catalog facts for key items these steps grant (Fingerslayer, secret medallion halves,
  seedbed curse, drawing rooms, iris, etc.) if missing.

### Golden fixture (tests)

Same mid-run as Task 52: Radahn dead, Ranni's Rise sat, "I serve you" asked, Knifeprint already
given to Rogier, Fingerslayer **not** handed in, Study Hall not inverted.

- `planRoute(ranni)` next beat MUST be Fingerslayer / Nokron aftermath, NOT "meet Ranni".
- `planRoute(millicent)` next beat MUST be Gowry / Unalloyed needle, not Haligtree.
- Gideon "what next" with goal `ranni` on that fixture names the Fingerslayer hand-in and offers
  Show it.

Add `src/knowledge/storylines.test.ts` if missing; extend `endings.test.ts`.

## Explicit exclusions

- No OCR, no `.sl2`, no vendor map, no AR.
- No new rooms.
- No Nightreign.
- Do not "finish" Patches / Gostoc / Diallos in this task.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
- Each of the eight lines has >= 6 steps OR a written comment in the test file explaining why a
  shorter line is actually complete in-game (Yura can be shorter; Leda cannot).
- 0 mid-line beats with empty `requires` / `grants`.
