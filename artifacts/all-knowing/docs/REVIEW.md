# Review — 2026-09-21

What was wrong, what was just researched, what was tightened.

## Findings (fixed this pass)

1. **Three id languages.** Seed markers used `elleh`, Reckoning used `grace:elleh`, the map engine uses `grace:{paramRow}`. Atlas “missing only” could not see Reckoning ticks. Seed + demo + quest steps now speak `kind:slug`. Engine ids stay `grace:{row}` until a generated alias table exists.
2. **Engine SSE wiped Reckoning.** A live `:8099` snapshot replaced the whole `Character`, deleting screenshots and answers. Snapshots now `mergeCharacter` with a ref so flags union and shots survive.
3. **No memory.** Refresh lost a PS5 interview. Character (minus blob URLs) persists in `localStorage`.
4. **ARCHITECTURE.md was stale.** It still described a Leaflet v2 and an SVG-first atlas after EldenRingMap was adopted.
5. **Awesome list was incomplete vs the rest of the plan.** Fan API, Clark 1.17 calculator, Compass parser, er-guide are now first-class sources.

## Findings (still open)

**Status pass 2026-09-22** — see `HANDOFF-CLAUDE.md` §6 for the detailed per-item breakdown of
everything below; this table is kept as a quick summary.

| Gap | Why it matters | Next | Status |
|---|---|---|---|
| Engine marker ids ≠ catalog slugs | PC live map and PS5 interview still two namespaces | Generated `aliases.json`: param row → slug, FMG name → slug | ✅ graces+bosses (Task 06); full generated `aliases.json` from a real extract still Task 09/17's territory |
| No OCR | PS5 shots are stored, not read | Tesseract on warp-list / pickup-banner crops; match Elden Refs | ⬜ still deliberately deferred |
| No icon templates in-repo | Screenshot “deduce from item picture” needs pixels | `extract_icons` → `public/icons`; RubyRed only for cut IDs | 🔄 `extract_icons.py` is part of Task 09's direct-tool-call plan, in progress |
| AR is a sketch | Build lab numbers are fake | Port `ThomasJClark/elden-ring-weapon-calculator` + `regulation-vanilla-v1.17.js` | ✅ done (Task 10), verified to the decimal against Clark's own upstream code |
| Slot walk has no inventory | Save snapshot is flags + stats | Extend EldenRingMap walk *or* vendor Compass parser | ✅ done differently (Task 11) — Compass has no license at all, so an original parser was written from its public format docs instead of vendoring its code |
| Quest DAG is thin | Five lines, not forty | Re-author from er-quest-tracker + EanNewton tracker columns | ✅ done (Task 12) — er-quest-tracker turned out too incomplete to port from (9/35 NPCs, no edge fields); hand-authored instead, 24 lines / 223 edges |
| Catalog ≠ 3,500 markers | Interview can only name what we listed | Generate facts from `markers.json` after Setup.bat | 🔄 catalog grew 89→226 via a tracker-diff gap-fill (Task 18); real `markers.json` generation from a local extract is Task 09/17, in progress. A local game install now exists on this machine, which this note did not have when written |
| Fan API HP/region strings | Crowd JSON drifts and predates Tarnished Pack | Overlay only; ERDB wins | ⬜ still the right guidance, unchanged |
| Nightreign | Different game | Out of v1 | unchanged |

## Source order (do not invert)

```
1. Local game extract (EldenRingMap + ERDB)
2. Official FMG / Carian Archive / Elden Refs   (names, descriptions)
3. Clark regulation-vanilla-v1.17               (AR)
4. EanNewton awesome dumps                      (holes, cut icons, NPC sheet)
5. Fan API / Fextralife                         (copy, never flags)
```

## Research notes

- Clark calculator already ships **vanilla 1.17** regulation JS. That is the Tarnished Pack patch line. Highest-leverage Build lab drop-in.
- Fan API (`deliton/eldenring-api`) is convenient MIT JSON (weapons, bosses, items, images) but pre-SotE-complete and not param-accurate. Bootstrap Codex only.
- Compass `save-parser-ts` is the portable PC path when someone will not run the Python extract. EldenRingMap remains the map + flag authority on a gaming PC.
- RubyRed icon Drive cannot be a runtime dependency (size, ToS, availability). Extract first.
- Zullie NPC stats sheet is player-model NPCs, not `NpcParam` absorb. Label it that way in the lab or it will lie about Malenia.

## Product order from here

1. ✅ Alias table (engine id ↔ catalog slug ↔ FMG name). — Task 06 (graces+bosses).
2. ✅ Clark AR behind the lab, using live/Reckoned stats. — Task 10.
3. ⬜ Warp-list OCR against Refs strings. — still deliberately deferred, not v1.
4. 🔄 Generate facts from a real `markers.json`. — Task 09/17, in progress (local game install
   now available, this item is no longer blocked the way it was when written).
5. ✅ Compass parser behind `lib/save.ts`. — Task 11, but as an original implementation (Compass
   has no license at all — nothing was vendored, the save-format understanding was ported, not
   the code).
