# Task 40 — OP builds, real tips/tricks, PvP knowledge, known exploits/strong tech

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md`/`ARCHITECTURE.md` and
`src/knowledge/builds.ts` (`opBuilds`, already consumed by `gideon.ts`'s build-advice branch)
first. The user asked explicitly for: "OP BUILDS, tips and tricks, PVP tips, super broken shit,
etc etc research if you need." This is a personal, non-commercial project with explicit standing
latitude to use internet sources freely for data (see repo's own licensing-policy notes) — you are
authorized to research real, current, well-known community knowledge (top-tier PvE/PvP builds,
known strong tech, patch-relevant meta) and encode it, same as prior tasks pulled from
Awesome-list-adjacent sources. Scratch work → `./.scratch/` (gitignored), never `/tmp`/`%TEMP%`.

## Objective

Substantially expand `opBuilds` (currently a handful of PvE-oriented builds — bleed, Azur/comet,
blasphemous, night comet, Leontiel, heavy-bonk per `gideon.ts`'s existing branch selection) with
real depth: more builds, PvP-specific builds and matchup advice, and genuine tips/tricks/strong
tech that a player wouldn't otherwise know.

## Requirements

- **More OP/meta builds**: research and add real, currently-relevant strong builds beyond the
  existing six — cover a wider stat-investment spread (pure strength colossal weapons, dex/bleed
  variants beyond Rivers of Blood, faith incant builds beyond blasphemous, hybrid builds) with the
  same shape as existing `opBuilds` entries (real `why`, real stat requirements) — no fabricated
  numbers.
- **PvP-specific content**: a genuinely separate concern from PvE builds — PvP has different
  priorities (poise, stagger, invade-vs-host asymmetry, meta weapons in the current patch). Add
  real PvP build/matchup guidance, wired into Gideon's router with real PvP-aware questions
  ("what's good for PvP", "how do I beat a bleed build in PvP") getting real answers, not the PvE
  defaults.
- **Tips/tricks/strong tech**: real, well-known community knowledge — things like effective jump
  attacks, specific weapon-art tech, known strong item combos, effective use of specific spirit
  ashes, well-known damage-stacking combos. Encode as real, structured data (not prose dumps) with
  a real UI consumer (Codex or Build lab, your call — match existing patterns).
- Cite where research came from in code comments/docs the way this repo's other tasks have (e.g.
  Task 10's Clark AR attribution) — not for licensing gating, just so the source is traceable if
  something needs updating after a game patch.
- Be honest about patch-currency: Elden Ring's meta shifts with balance patches. Note the game
  version/patch context you're building for if you can determine it, and flag if something you add
  is patch-sensitive and may need revisiting.

## Explicit exclusions

- Don't touch OCR, save parser, the map engine, or the mobile layout.
- Don't fabricate specific numeric values (damage numbers, frame data) you can't verify — describe
  qualitatively where you can't get exact real numbers, and say so.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` pass.
- Real tests: Gideon router questions for PvP builds and general tips return real, non-generic
  answers.
- Report: how many builds added (before/after count), what PvP-specific content was added, what
  tips/tricks were encoded, and your sourcing/patch-currency notes.
- `npm run dev`: demonstrate at least 2 new build recommendations and 1 PvP-specific answer coming
  from the live app.
