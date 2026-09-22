# Task 47 — Shareable build codes / loadouts

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` §7 first — "Build codes /
shareable loadouts" is a listed, valid, not-yet-built idea. Read `src/Build.tsx` (the stat editor
and `opBuilds`/`pvpBuilds` "OP kits" chips — clicking one sets `character.stats`/`level`/
`loadout`), `src/lib/packet.ts` (Task 32's real export/import/diff machinery — this is your
closest existing pattern for "serialize a chunk of character data to a shareable string"), and
`src/knowledge/builds.ts`/`src/knowledge/pvp.ts` (the `OpBuild`/`PvpBuild` shapes).

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Let a player export their current Build lab stat spread + loadout as a compact, shareable code
(a short string, not a whole packet file) and import someone else's code to load it as a build —
distinct from the full character packet (Task 32), which carries the whole run's progress; this
is just the build (stats + gear), meant to be pasted into a chat/Discord message.

## Requirements

- Design a compact encoding (base64/base62 of a small JSON, or similar) — a full packet-style
  export is the wrong shape here (too large/verbose for a shareable code); look at what data a
  build actually needs (stats, level, loadout slots) and encode only that.
- Real UI: an "Export build" action in `Build.tsx` that produces the code (copy-to-clipboard), and
  an "Import build code" action that parses a pasted code and applies it via the same path
  `opBuilds`/`pvpBuilds` chips already use (`setCharacter({ ...character, stats, level, loadout })`
  — reuse, don't duplicate).
- Validate imported codes defensively — a malformed/garbage string must fail cleanly with a real
  error message, not throw an unhandled exception or silently corrupt the character.
- Consider (and document your decision either way) whether an imported build code should also
  carry a human-readable name/label, since "paste this code" is more useful with a name attached.

## Explicit exclusions

- Don't touch OCR, save parser, Gideon, or the map engine.
- Don't build a public sharing service/backend — this is a local encode/decode + clipboard
  feature, consistent with the app's local-first architecture. No network calls.
- Don't duplicate Task 32's packet import/diff machinery — a build code is a different, smaller
  concern; if you find genuine overlap worth sharing code for, say so, but don't force a merge.

## Acceptance criteria

- `npx tsc -b`, `npm run lint`, `npm test` all pass.
- Real tests: export → import round-trip produces the identical stats/level/loadout; malformed
  input is rejected cleanly with a real error, not a crash.
- `npm run dev`: demonstrate exporting a build, copying the code, and importing it back.
