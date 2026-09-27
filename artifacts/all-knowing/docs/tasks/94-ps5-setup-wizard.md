# Task 94 — "Set up my Tarnished": guided PS5 character setup + Gear sheet

Goal: a PS5 player (no save file access) gets their character fully up to date in ~5 minutes, with
the app inferring everything it can. Today the pieces exist (screenshot OCR/vision in `Reckon.tsx`,
`museVision.ts`, `equipmentOcr.ts`, `ocr.ts`; StatEdit; GoodsPaste; inference in `infer.ts`,
`inference.ts`, `conflict.ts`) but they are separate tools. Make one guided flow.

## Tarnished section sub-views (update `src/lib/sections.ts`)

`me`: **Overview · Gear · Setup · Profiles** (rename `update` → `setup`; keep `#/me/update` as an alias
that resolves to `setup`).

## Setup wizard (`src/shell/MeSetup.tsx`, logic in `src/lib/setupWizard.ts`)

A stepper with progress dots; every step can be skipped, revisited, and shows "what we learned".
Resume where you left off (persist step in the vault).

1. **Status screen** — photo (camera `capture="environment"` or file) or type. Reads level, 8 stats,
   runes, starting class. Pre-fill the stat grid from the read; user confirms.
2. **Equipment screen** — photo(s). Reads weapons (with +N / affinity if legible), armor, talismans,
   spells, quick items → `loadout` + `collectedItems`.
3. **Inventory** — accept **multiple photos in one go** (Key Items, Great Runes, Bell Bearings,
   Crystal Tears, Cookbooks, Spirit Ashes, Weapons, Armor, Talismans pages). Also a paste box (goods list).
   Each read line shows matched item + confidence; low-confidence lines need a tap to accept.
4. **Map / graces** — photos of the map or warp list (existing grace OCR) → `discoveredGraces`.
5. **Bosses & progress** — a tappable checklist, grouped by region, remembrance/shardbearer bosses
   first as large tiles; then major NPC questline beats as yes / no / not sure.
6. **Review** — "What we inferred": list every fact added by inference with its reason chain
   (e.g. "Godrick's Great Rune → Godrick defeated → Stormveil gate passed"), each removable. Show a
   completeness meter per category (stats, gear, inventory, graces, bosses, quests).

Inference must run after each step (reuse `inference.ts` chains; add rules where missing:
Great Rune → shardbearer dead; remembrance → boss dead; bell bearing → boss/NPC state; grace
discovered → region reached; key item (e.g. Dectus medallion halves, Academy key, Haligtree medallion)
→ access). Rules live in data tables, not scattered ifs; each rule has a test.

## Gear sheet (`src/shell/MeGear.tsx`)

A proper character sheet: equipped weapons (L/R ×3) with AR at current stats (use `ar.ts`),
armor ×4 with weight/poise totals and equip-load %, talismans ×4, spells, then **Owned** inventory
grouped by category with counts, searchable. Each item opens the shared entity panel (Task 92).
Tap an empty slot → picker from owned items (fallback: all items) → updates `loadout`.

## Entry points

- First run (empty character): Tarnished › Overview shows a big "Set up your Tarnished" call to action.
- Overview completeness meter links to the weakest step.

Acceptance: tests for the setup step persistence, each new inference rule, `me/update → me/setup`
alias; `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
