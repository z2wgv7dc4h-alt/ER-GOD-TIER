# Source pack (no game install)

The PC in this house does not have Elden Ring. Extract-from-install is therefore not v1’s path for art. These two Drive folders from the Awesome list are the stand-in.

Do **not** commit the dumps. They are FromSoftware art. The app reads them from `public/sourced/` after you copy a download here.

## What each folder actually is

### Ashelian — Assets
https://drive.google.com/drive/folders/15ymEOfn0_0L3x4ZQo-9Q5ZooZuC1U53c

| Inside | Use for us |
|---|---|
| Ingame Sprites | Menu / HUD / some map glyphs if present |
| Concept Art, Artbooks, Adventure Guide, Interviews | Codex flavour only — not atlas tiles |
| Map concept .jfif | Not the playable map |

This is **not** a tile pyramid. You will not get Limgrave at zoom 6 from this folder.

### RubyRed — Icons
https://drive.google.com/drive/folders/1QlFDRjtwJvJXBED7JsLN7jnkxB6ySr3p

| Folder | Use |
|---|---|
| Armor, Melee Armaments, Shields, Ranged Weapons/Catalysts | Build lab + thread thumbs |
| Sorceries, Incantations, Spell Sigils | Codex + Gideon “where is X” |
| Talismans, Spirit Ashes, Ashes of War, Key Items, Tools | Same |
| Bolstering / Crafting Materials | Farming lists |
| Shadow of the Erdtree DLC | SotE overlay |
| Unused Content | Mark `cut: true`, do not show as obtainable |
| Loading Screens, Tattoos, Gestures, Info | Skip for v1 |

This **is** item thumbnails, including cut icons. File names are usually the in-game English string or an internal id. That is the alias plane’s third column (`iconFile`).

## What is still missing after both dumps

| Need | Not in these folders | Get from |
|---|---|---|
| Overworld / underground / ashen / shadow **tiles** | No | EldenRingMap extract on a machine that *has* the game, or Nexus “Ultimate Elden Ring Map Resource Pack” (assembled PNGs), or a community tile set you host locally |
| Grace **map pin** glyphs (the in-game Site of Grace symbol atlas) | Maybe under Ashelian sprites / RubyRed Misc — verify after download | Same map resource pack (`location-*`, `marker-*`) |
| Coordinates + marker ids | No images | EldenRingMap `markers.json` after extract, or our seed until then |
| Tarnished Pack new icons | RubyRed last pass Aug 2024 — pack may be absent | Extract on a pack install, or a later dump |

## How to drop them in

```
public/sourced/
  icons/          ← RubyRed folders, untouched
  sprites/        ← Ashelian / Ingame Sprites
  maps/           ← later: tile folders or assembled jpgs
  manifest.json   ← optional override { "Night Comet": "icons/Sorceries/...." }
```

`public/sourced/` is gitignored except `.gitkeep`.

On first run the app scans `icons/` and builds `iconIndex` (normalised name → url). Gideon / Codex / Build ask that index before showing our gold seal.

## Easy links (no game install)

| What | Link | Drop |
|---|---|---|
| Item icons + cut + SotE | https://drive.google.com/drive/folders/1QlFDRjtwJvJXBED7JsLN7jnkxB6ySr3p | `public/sourced/icons/` |
| Sprites / artbooks | https://drive.google.com/drive/folders/15ymEOfn0_0L3x4ZQo-9Q5ZooZuC1U53c | `public/sourced/sprites/` |
| Map glyphs 64px | https://eldenring.wiki.gg/wiki/Category:Images_-_Interactive_Map_Icons | Direct file: `/wiki/Special:FilePath/ER_Interactive_Map_Icon_Site_of_Grace.png` |
| Location icons | https://eldenring.wiki.gg/wiki/Category:Images_-_Map_icons | Church, Erdtree, Catacomb |
| Assembled maps + map-icon pack | https://www.nexusmods.com/eldenring/mods/960 | Nexus login. **Icons Only** is 4.8 MB. JPG maps next. No SotE. |
| Item stats JSON | https://github.com/EldenRingDatabase/erdb | No pictures |
| Official names | https://ihascats.github.io/Elden-Text/ | Text |

No public one-click zip exists for SotE + Tarnished Pack tiles. EldenRingMap will not ship them.

## Legal

List is CC0. Files are not. Local-only, personal companion, remove on request. We do not ship tiles or item art in the repo. The generated seals in `/art/` stay as chrome for the empty state.
