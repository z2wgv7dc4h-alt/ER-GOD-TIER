# Task 95 — Library revamp: an interactive database, not a blog

Today Library › Search (`src/Codex.tsx`, `src/CodexData.tsx`) reads like a long article. Replace it
with a database browser like an in-game menu / wiki app. All the data already exists (see `src/lib/search.ts`,
`src/knowledge/catalog.ts`, `public/sourced/**`, `src/lib/guides.ts`, `recipes.ts`, `secrets.ts`,
`ar.ts`, `weaponStats.ts`, boss/enemy combat JSON).

## Layout (`src/library/`, styles in a NEW `src/library/library.css` — do not grow `index.css`)

- **Category rail** (desktop left column; phone: horizontally scrollable chip row) with icon + count:
  Weapons · Shields · Armor · Talismans · Sorceries · Incantations · Ashes of War · Spirit Ashes ·
  Items · Bosses · NPCs · Locations · Recipes · Secrets · Guides · Dialogue.
- **Toolbar**: search-as-you-type within the category; filter chips appropriate to the category
  (weapons: type, damage type, scaling letter ≥, "I meet requirements", "Owned", "Not owned", DLC /
  base); sort (name, AR at my stats, weight, requirement, region).
- **Results**: dense grid of cards (icon from `image-index.json` if present, name, 2–3 key stats,
  owned ✓ badge, requirement met/unmet dot). Weapons/armor also offer a **table view** toggle with
  sortable columns. Virtualise or paginate (≥50 per page) — lists run to hundreds.
- **Detail panel** (desktop: right-side panel; phone: bottom sheet, swipe/Close): header with icon +
  name + type; tabbed body **Stats · Where · Lore · Related**:
  - Stats: requirements with ✓/✗ against the character, scaling letters, base damage, **AR at my
    stats** (and at max upgrade), weight; bosses: weak to / resists / status resist / poise.
  - Where: acquisition text + **Show on map** + region + prerequisites/lockouts.
  - Lore: description + wiki prose (this is the ONLY place long prose appears).
  - Related: existing `Related` links.
  - Actions row: **Mark owned / not owned · Compare · Equip (opens Gear) · Ask Gideon**.
- **Compare tray**: pin up to 4 items; sticky tray at bottom; opens side-by-side table (reuse
  `weaponCompare.ts`).
- Empty state: category tiles, not paragraphs.
- Deep links: `#/library/search?cat=weapons&id=<factId>` opens the detail panel; the global command
  palette routes entity hits here.

Keep Library › Builds and Library › Kit working; they are revamped separately.

Acceptance: tests for filtering (requirements met, owned), sorting by AR, deep-link parsing, compare
tray cap of 4; `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
