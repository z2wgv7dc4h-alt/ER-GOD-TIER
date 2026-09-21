# Review — 2026-09-21

What was wrong, what was just researched, what was tightened.

## Findings (fixed this pass)

1. **Three id languages.** Seed markers used `elleh`, Reckoning used `grace:elleh`, the map engine uses `grace:{paramRow}`. Atlas “missing only” could not see Reckoning ticks. Seed + demo + quest steps now speak `kind:slug`. Engine ids stay `grace:{row}` until a generated alias table exists.
2. **Engine SSE wiped Reckoning.** A live `:8099` snapshot replaced the whole `Character`, deleting screenshots and answers. Snapshots now `mergeCharacter` with a ref so flags union and shots survive.
3. **No memory.** Refresh lost a PS5 interview. Character (minus blob URLs) persists in `localStorage`.
4. **ARCHITECTURE.md was stale.** It still described a Leaflet v2 and an SVG-first atlas after EldenRingMap was adopted.
5. **Awesome list was incomplete vs the rest of the plan.** Fan API, Clark 1.17 calculator, Compass parser, er-guide are now first-class sources.

## Findings (still open)

| Gap | Why it matters | Next |
|---|---|---|
| Engine marker ids ≠ catalog slugs | PC live map and PS5 interview still two namespaces | Generated `aliases.json`: param row → slug, FMG name → slug |
| No OCR | PS5 shots are stored, not read | Tesseract on warp-list / pickup-banner crops; match Elden Refs |
| No icon templates in-repo | Screenshot “deduce from item picture” needs pixels | `extract_icons` → `public/icons`; RubyRed only for cut IDs |
| AR is a sketch | Build lab numbers are fake | Port `ThomasJClark/elden-ring-weapon-calculator` + `regulation-vanilla-v1.17.js` |
| Slot walk has no inventory | Save snapshot is flags + stats | Extend EldenRingMap walk *or* vendor Compass parser |
| Quest DAG is thin | Five lines, not forty | Re-author from er-quest-tracker + EanNewton tracker columns |
| Catalog ≠ 3,500 markers | Interview can only name what we listed | Generate facts from `markers.json` after Setup.bat |
| Fan API HP/region strings | Crowd JSON drifts and predates Tarnished Pack | Overlay only; ERDB wins |
| Nightreign | Different game | Out of v1 |

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

1. Alias table (engine id ↔ catalog slug ↔ FMG name).
2. Clark AR behind the lab, using live/Reckoned stats.
3. Warp-list OCR against Refs strings.
4. Generate facts from a real `markers.json`.
5. Compass parser behind `lib/save.ts`.
