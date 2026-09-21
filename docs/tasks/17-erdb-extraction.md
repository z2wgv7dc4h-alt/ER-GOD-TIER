# Task 17 — Full catalog regeneration from erdb, now that a local install exists

**Scope updated 2026-09-22**: originally scoped narrowly to just `NpcParam`. The project owner
has since made clear the broader catalog is known to be thin in many places (this project's own
`HANDOFF-CLAUDE.md` calls it a "seed catalog, not full param/MSB," and Task 13's diff against the
EanNewton tracker already surfaced concrete gaps: ~30 missing Great-Enemy bosses, 31 NPC invaders
with no coverage at all, 15 Remembrances untracked, 5 missing Legend-tier bosses) and wants real
extraction pursued now that it's possible, not narrowly scoped to one category. `NpcParam` is
still the anchor requirement below since it has a concrete, previously-identified consumer (the
Build lab), but **don't artificially hold back if erdb's output can also fill in weapons, armor,
talismans, spells, or enemy/boss coverage more completely than what's currently ingested** — the
earlier "separate scope decision" caveat is lifted. Use judgment on how deep to go in one pass;
report clearly on what you covered vs. what's left for a follow-up, rather than silently stopping
early or silently trying to do literally everything in one task.

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `docs/SCOPE.md`'s item 8
("Enemy absorb table"), and `docs/REVIEW.md`'s line: *"Zullie player-model sheet is not this
table."* Already confirmed by hand: `public/sourced/open/paramdex/NpcParam.txt` (6,864 rows) is
**names-only** — `id name` pairs like `1000000 BuddyStone`, no absorb/poise/stance/resistance
fields at all. This is the same pattern Task 10 already found for weapon params: the
`soulsmods/Paramdex` "Names" dumps this project has ingested are literally just row names, never
field values. The actual combat-stat data can only come from extracting the game's own
`regulation.bin`.

**A local Elden Ring install now exists on this machine**:
`C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game\` — confirmed `eldenring.exe` and
`regulation.bin` both present. This was not true when most of this project's earlier docs
(`SOURCE-PACK.md` etc.) were written; treat their "no game install" caveats as outdated for this
task specifically.

`HANDOFF-CLAUDE.md`'s live-sources table lists **ERDB** (`https://github.com/EldenRingDatabase/erdb`,
MIT, already verified in `PROJECT_BRIEF.md`'s research) as: *"generate from install / public API
if up."* It's purpose-built for exactly this — a Python tool that extracts and decodes param
data straight from a local install, no hand-rolled Oodle/WitchyBND work needed.

## Objective

Run erdb's own generator against the local install to get real `NpcParam` combat data (absorb,
poise, stance, resistances, status), and wire the useful subset into the Build lab's "what should
I hit this with" question. If erdb's output also meaningfully improves other already-ingested
categories (weapons, armor) while you're at it, note that as a bonus finding, but **NpcParam is
the primary deliverable** — don't let scope balloon into re-deriving everything erdb can produce.

## Requirements

- Clone erdb into `./.scratch/erdb` inside this repo (already gitignored) — **never `/tmp`,
  `%TEMP%`, or any path outside the project**, per the standing rule in `docs/tasks/00-README.md`.
- Follow erdb's own instructions for a local-install generation run, pointed at
  `C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING\Game\`. This may need Python deps
  (check erdb's own requirements) and could take real time/disk space for a full extract — that's
  expected and fine, this is a one-time local operation, not something that needs to be fast.
- Read-only against the game install. Don't write anything into the game directory itself.
- Once you have erdb's `NpcParam` output, design a sensible subset for the Build lab: at minimum,
  per-damage-type absorb/negation for the bosses already in `src/knowledge/catalog.ts` (24 boss
  facts) — that's the concrete "what should I hit this with" use case `SCOPE.md` names. Full
  8,000+ row coverage is not required; prioritize named/story bosses over generic enemy variants.
- Store the extracted subset as project data (follow the existing convention — check how
  `public/sourced/armory-bosses.json` or similar existing boss data files are shaped before
  inventing a new format) and wire it into wherever the Build lab currently answers "what should
  I hit this with" (check `src/lib/ar.ts` and the Build lab UI in `App.tsx` for the current state
  of that feature — Task 10 built AR calculation but may not have built enemy-matchup logic).
- **Label this data correctly as combat stats**, distinct from Task 15's `npc-display.ts`
  (cosmetic/player-model data) — these are two different NPC data categories serving two
  different purposes; don't let them collide or get confused with each other.
- Document the erdb source, license (MIT, already confirmed), and extraction method in
  `THIRD_PARTY_NOTICES.md` and `DATA.md`.

## Explicit exclusions

- Don't attempt to also regenerate the full item/weapon/armor catalog from erdb in this same
  task unless it's genuinely trivial once the extraction is running — that's a separate, larger
  scope decision the project owner should weigh in on, not something to expand into
  unilaterally.
- Don't touch `src/knowledge/npc-display.ts` (Task 15's cosmetic data) — different file, different
  purpose, leave it alone.
- Don't modify anything inside the actual game installation directory.

## Acceptance criteria

- erdb successfully extracts real `NpcParam` data from the local install — demonstrate with a few
  concrete examples (e.g. Malenia's actual physical/magic/fire/lightning/holy negation values,
  not placeholder numbers).
- At least the named story bosses in `catalog.ts` have real absorb data wired into the Build lab.
- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Final report: what erdb's full output looked like (rough scale — row counts, categories
  available beyond NpcParam), what subset was actually wired in, and whether a follow-up task
  regenerating the broader catalog from erdb would be worthwhile (your assessment, not a
  decision — the project owner decides whether to pursue that next).
