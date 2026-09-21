# Task 10 — Real attack-rating math in the Build lab

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`, `ARCHITECTURE.md`, and
especially `docs/REVIEW.md` — it's the most recent status doc and explicitly names this as the
top priority after the alias table (Task 06): *"AR is a sketch. Build lab numbers are fake. Port
`ThomasJClark/elden-ring-weapon-calculator` + `regulation-vanilla-v1.17.js`... Clark calculator
already ships vanilla 1.17 regulation JS. That is the Tarnished Pack patch line. Highest-leverage
Build lab drop-in."*

**Clone into `./.scratch/` inside this repo (already gitignored), never `%TEMP%` or any path
outside the project.** A prior run of this task failed trying to clone into
`%TEMP%\opencode\...` — the permission system's external-directory allowlist only matches
Windows-style backslash paths, and a Unix-style (forward-slash, git-bash) path to that same real
location doesn't match, so the request silently auto-rejects in a non-interactive run. Staying
inside the repo avoids that permission check entirely: e.g.
`git clone --depth 1 https://github.com/ThomasJClark/elden-ring-weapon-calculator.git .scratch/clark-calc`.

`ThomasJClark/elden-ring-weapon-calculator` (MIT license, confirmed by earlier research — full
citation at the literal relative path `../../PROJECT_BRIEF.md` from your current working
directory, `artifacts/all-knowing`, if you want it; use that exact relative path, don't construct
an absolute one — an absolute-path guess landing outside your working tree gets treated as an
external-directory access and silently kills the whole run in headless mode) is a React+TS+Vite
app — same stack
family as this project — with its own attack-rating calculation logic and versioned regulation
data files (`regulation-vanilla-v1.17.js` is the one `REVIEW.md` calls out as the Tarnished Pack
patch line — confirm that's still the right version file in the upstream repo, patches may have
moved on since this was written).

## Objective

Replace whatever placeholder/sketch AR math currently exists in the Build lab (`BuildWorkspace`
— find it, it may already be split out per Task 07, or still inline in `App.tsx` if Task 07
hasn't run yet) with real, correct attack-rating calculation, ported from Clark's calculator and
its regulation data.

## Requirements

- Clone or fetch `ThomasJClark/elden-ring-weapon-calculator` to inspect its AR formula and
  regulation data shape — read its source, don't guess the formula from memory. Elden Ring's AR
  calculation involves per-weapon base damage, scaling grades (S/A/B/C/D/E) converted to
  multipliers via `CalcCorrectGraph` curves, two-handing strength bonus, and upgrade level —
  this project already has `public/sourced/open/paramdex/CalcCorrectGraph.txt` and
  `EquipParamWeapon.txt` on disk (per `DATA.md`) which may already contain the raw numbers Clark's
  calculator also derives from — cross-check whether porting Clark's *code* (the formula/logic)
  while sourcing numbers from this project's *own* already-ingested paramdex dumps is more
  correct/maintainable than vendoring Clark's regulation JSON wholesale. Use your judgment, but
  justify the choice in your report.
- Wire the result into the Build lab so it reflects the character's actual current stats/loadout
  from the `Character` state (`w.character.stats`, `w.character.build`/`loadout` — check the
  exact field names in `src/types.ts`), not hardcoded example numbers.
- Weapon comparison / "what should I upgrade" type UI, if it doesn't exist yet, is a nice-to-have
  — the core requirement is **correct numbers for the current build**, not new UI surface. Don't
  scope-creep into a full weapon browser (that's Codex's job).
- Attribute in `THIRD_PARTY_NOTICES.md` (create if it doesn't exist per the outer project's
  `PROJECT_BRIEF.md` licensing policy): source repo, license (MIT), what was ported (the AR
  formula/logic), what was changed.
- Per this project's stated rule (`HANDOFF.md`: "Do not invent attack rating") — if any part of
  the formula can't be confidently ported (e.g. a specific DLC weapon's scaling data is missing
  from both Clark's repo and the local paramdex dumps), show that weapon's AR as explicitly
  unknown/unavailable rather than guessing a number. An honest gap beats a wrong number.

## Explicit exclusions

- No OCR, no save parsing, no map work — unrelated to this task.
- Don't rebuild Codex's item browsing — this is about the calculation, not a new UI section.
- Don't vendor Clark's entire app, just the formula/data you need.

## Acceptance criteria

- Given a known real build (pick 2-3 well-documented weapon/stat combinations you can verify
  against Clark's own live calculator at https://eldenring.tclark.io/ or its repo's test fixtures
  if it has any), this project's Build lab produces the same AR number, or you've documented
  exactly why it differs (e.g. this project scoped to Tarnished Pack regulation vs. Clark's
  latest).
- `npx tsc -b` and `npm run lint` pass.
- `THIRD_PARTY_NOTICES.md` has a complete entry for this port.
- Final report: which weapons/scaling cases you verified against Clark's calculator, which (if
  any) had to be marked unknown rather than guessed, and whether you sourced numbers from
  Clark's regulation JSON or this project's own paramdex dumps (and why).
