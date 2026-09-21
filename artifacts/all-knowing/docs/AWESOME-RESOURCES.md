# EanNewton/Awesome-Elden-Ring-Resources

Upstream: https://github.com/EanNewton/Awesome-Elden-Ring-Resources  
The *list* is CC0. The *dumps it points at* are still FromSoftware text/art or someone else’s sheets.

All-Knowing does not vendor Google Drive folders. It treats the list as a source map.

## Who owns which layer

| Need | First choice | Awesome-list fallback |
|---|---|---|
| Item / grace / boss **icons** | Local extract (`vendor/elden-ring-map` `extract_icons.py`, ERDB `icons`) | [RubyRed icon dump](https://drive.google.com/drive/folders/1QlFDRjtwJvJXBED7JsLN7jnkxB6ySr3p) for cut icons and missing IDs |
| Combat / NPC **stats** | ERDB / `NpcParam` extract | [NPC stats sheet](https://docs.google.com/spreadsheets/d/1jZokIy9PcX5UhUPcTe992aP21JiXL015sfP4sjYktu4/edit#gid=0) (player-model NPCs) |
| Display **names + descriptions** | FMG from the install, Carian Archive | [Elden Refs](https://ihascats.github.io/Elden-Text/), [Elden JP](https://raw.githubusercontent.com/AsteriskAmpersand/Carian-Archive/main/MasterJP.html) |
| Internal ids | Paramdex + CNT sheet | [Internal Elden Ring](https://docs.google.com/spreadsheets/d/1WbUQSgJiZZNl5PefmUsvlhtNJ0PLhTfv-W9zRD1_fzM/htmlview) |
| Checklist coverage | Our fact catalog | [EanNewton progress tracker](https://docs.google.com/spreadsheets/d/1_7sTNSle8kxB72eNgICAfdGoWMbe4tFycy2PNwJFTw8/edit?usp=sharing) |
| Map art / pins | EldenRingMap from the install | Fextralife map is reference only |
| Unpackers | Already in `vendor/elden-ring-map/tools/erlib` | BinderTool, ER.BDT.Tool, Noesis |

## Screenshot pipeline (PS5)

1. Crop pickup banner / warp list / inventory icon well.
2. OCR against **Elden Refs / Carian Archive** strings (EN + JP).
3. If an icon is visible, template-match against **extracted** menu icons. RubyRed dump is the gap list, not the runtime pack.
4. Hit → fact id → `infer.ts` implications.

## Ingest jobs still open

- Script: pull Elden Refs / Carian Archive strings → `src/knowledge/aliases.json`.
- Script: diff RubyRed filenames against `extract_icons` output → missing/cut report.
- Script: import the NPC stats sheet to `src/knowledge/npc-stats.json` for Build lab cards.
- Script: column-diff EanNewton tracker vs `catalog.ts` facts.

Until those run, Codex lists every resource with its job so nothing on the awesome list is a dead link.
