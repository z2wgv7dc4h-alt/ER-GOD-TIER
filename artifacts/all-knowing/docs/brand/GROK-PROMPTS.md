# Image prompts for Grok — All-Knowing brand + UI art

Save results to `artifacts/all-knowing/public/brand/` with the file names given. Claude wires them in.

## Shared style (paste at the top of every prompt)

> Style guide for a dark-fantasy companion app called "All-Knowing". Original artwork only — do NOT copy or
> imitate any existing game's logo, characters, creatures or trademarked symbols, and include no text or
> lettering unless asked. Palette: near-black charcoal background (#121212 to #1c1a17), warm antique gold
> (#c9a44c, highlights #e8cf8a), muted bone/ivory (#d8d0bf) as a secondary accent, faint ember orange used
> sparingly. Look: engraved gold line-art with subtle metallic sheen, thin elegant strokes, slight
> hand-engraved texture, soft golden glow, lots of negative space, high contrast, crisp edges, readable at
> small sizes. Flat-ish illustration, no photorealism, no 3D render look, no gradients that muddy at small
> size, no drop shadows outside the shape, no watermark, no signature, no border unless asked.

---

## 1. App icon (most important)
**Files:** `icon-1024.png` (1024×1024), plus a version with transparent background `icon-1024-transparent.png`.

> [style guide] Create a square app icon, 1024×1024. Centered emblem: an open, all-seeing eye formed from
> fine gold engraved lines, set inside a thin golden ring, with a small radiant arc of light above it like a
> rising sun / halo — evoking ancient knowledge and guidance. Simple, bold silhouette that is still
> recognisable at 48×48 px. Emblem fills about 70% of the canvas with even padding (safe zone for rounded
> masks). Solid near-black background. No text.

Also generate: `icon-maskable-1024.png` — same emblem shrunk to ~55% of the canvas (extra padding for
Android maskable icons), same background.

## 2. Splash / wordmark
**File:** `splash-1290x2796.png` (portrait phone), `wordmark.png` (2000×500, transparent).

> [style guide] Portrait phone splash screen 1290×2796: the same eye-and-halo emblem from the app icon,
> centered slightly above middle, with very faint golden dust particles and a subtle vignette. Below it,
> leave empty space for a title (do not draw text).

> [style guide] Wide wordmark 2000×500, transparent background: the words "ALL-KNOWING" in an elegant,
> engraved serif display face with tall capitals and gentle flared serifs, antique gold with a soft sheen,
> letter-spaced, perfectly legible. Small eye-and-halo emblem to the left of the text.

## 3. Category icons (one consistent set — generate as one sheet AND as separate files)
**Files:** `cat-<name>.png`, each 256×256, transparent background. Names below.

> [style guide] A matching set of 12 icons, each 256×256 on transparent background, same stroke weight,
> same gold engraved line style, same visual weight, centered with equal padding, each a single clear
> symbol readable at 32×32. Icons:
> 1. `cat-mechanic` — interlocking gears with a small rune
> 2. `cat-gate` — an arched stone doorway with a closed portcullis
> 3. `cat-build` — a crossed sword and staff over a small shield
> 4. `cat-pvp` — two crossed blades with a spark between them
> 5. `cat-quest` — a rolled parchment scroll with a ribbon
> 6. `cat-ending` — a crown resting on a closed book
> 7. `cat-guide` — an open book with a feather quill
> 8. `cat-region` — a folded map with a compass star
> 9. `cat-grace` — a small flame with a soft golden glow above a stone
> 10. `cat-merchant` — a pouch of coins beside a lantern
> 11. `cat-npc` — a hooded figure in silhouette (no face details)
> 12. `cat-enemy` — a cracked horned helmet in silhouette
> Also output all 12 together on one 1536×1024 sheet, 4 columns × 3 rows, labeled with nothing.

## 4. Gideon avatar
**File:** `gideon-512.png` (512×512, works in a circle crop).

> [style guide] Portrait avatar 512×512 of an original character: a wise, scholarly old sage in deep hooded
> robes, face mostly in shadow with only a grey beard and calm eyes catching golden light, holding a small
> glowing tome. Bust framing, centered, fits a circular crop with nothing important at the corners. Painterly
> but clean, dark background with a soft gold rim light. Must NOT resemble any existing video-game character.

## 5. Empty-state illustrations
**Files:** `empty-<name>.png`, 800×500, transparent or near-black background, muted (gold at ~60%).

> [style guide] Three small, calm, minimal illustrations for empty screens, same style, muted gold on dark,
> lots of empty space, no text:
> 1. `empty-progress` — an unlit stone shrine with a small cold ember, waiting to be kindled
> 2. `empty-map` — a blank parchment map with only a compass rose and faint grid lines
> 3. `empty-journal` — an open journal with empty pages and a quill resting on it

## 6. Photo-capture guide (helps the PS5 photo feature)
**File:** `photo-guide.png`, 1080×1350.

> [style guide] Simple instructional illustration 1080×1350: a smartphone held in front of a TV screen,
> phone screen showing the TV framed edge-to-edge; small icons around it indicating "keep it straight"
> (level line), "avoid glare" (lamp with a cross), "fill the frame" (corner brackets). Clean line art, no
> real brand logos, no text.

---

### Checklist for you
- [ ] icon-1024.png · icon-1024-transparent.png · icon-maskable-1024.png
- [ ] splash-1290x2796.png · wordmark.png
- [ ] 12 × cat-*.png (+ the sheet)
- [ ] gideon-512.png
- [ ] empty-progress.png · empty-map.png · empty-journal.png
- [ ] photo-guide.png
