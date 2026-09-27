# Task 91 — Shell redesign: four sections, one way to get anywhere

The current shell is convoluted: an off-canvas "Tarnished" rail with nav + character + inputs, five
workspaces, a right Gideon column, a 3-tab phone bar that hides two rooms, and 5+ ways to navigate.
Replace it with four top-level sections and a flat, predictable layout. **No feature is deleted —
everything is re-homed.**

## Sections

| Section id | Label | Question it answers | Sub-views (segmented control) |
|---|---|---|---|
| `me` | Tarnished | "Where am I at?" | **Overview** · **Update** · **Profiles** |
| `journey` | Journey | "What now / where / working towards?" | **Now** · **Map** · **Quests** |
| `library` | Library | "What do I know / what should I build?" | **Search** · **Builds** · **Kit** |
| `gideon` | Gideon | "Ask me anything" | (none — full chat) |

Contents:

- **me/overview** — CharacterCard (name, level, stats, tally), StatEdit, progress bars (graces / bosses /
  items found), Recents list (the only place recents render besides the command palette), WorldRibbon.
- **me/update** — one "Update your Tarnished" page with four clearly labelled sources as cards:
  Save file (SaveDrop), Screenshot (the Reckon workspace), Paste item list (GoodsPaste),
  Share / import (PacketBar + QR). Ctrl+V paste still routes here.
- **me/profiles** — ProfileSwitcher, CoopChip, spoiler toggle, EngineChip status.
- **journey/now** — the "working towards" dashboard: Gideon header (goal, current beat, approaching gate,
  Show / Done / Blitz), next moves, still-available / locked counts, lockout warnings, WorldRibbon
  "still in region" buttons. Every item links to Map or Quests.
- **journey/map** — AtlasWorkspace, filling all available height.
- **journey/quests** — QuestWorkspace.
- **library/search** — CodexWorkspace.
- **library/builds** — BuildWorkspace.
- **library/kit** — the Kit content (OP builds / PvP / compare / broken tricks). If Kit currently lives
  inside Build or a drawer, surface it here as its own sub-view.
- **gideon** — Gideon chat full-screen with suggestions.

## Routing

- New state: `section` + `sub`. URL hash routing `#/journey/map` so the back button and reloads work;
  persist last location in the vault as today.
- **Compat shim:** keep `w.setModule(oldId)` working and map it:
  `reckon→me/update`, `map→journey/map`, `quests→journey/quests`, `build→library/builds`,
  `codex→library/search`. Do not rewrite every caller (Thread, Related, command palette, recents).
  Add `w.go(section, sub?)` for new code.

## Layout

**Desktop (>700px)**
- Header (56px): app mark · four section tabs · global search (the existing command palette input) ·
  compact character chip (name + level, click → me/overview) · help `?` · Gideon dock toggle.
- Under it, the section's segmented sub-tabs (hidden for `gideon`).
- Content fills the rest, full width. **Remove the left off-canvas Tarnished rail and its backdrop**;
  its contents moved to `me`.
- Gideon **dock**: right column (~340px), toggleable, default open at ≥1200px, closed below; state
  persisted. Hidden when the `gideon` section is active (no double mount).

**Phone (≤700px)**
- Compact header: section title · search icon (opens the command palette full-width) · character chip.
- Sub-tabs as a horizontally scrollable segmented control under the header.
- Bottom tab bar with exactly **four** tabs (icons + labels), ≥44px targets, safe-area padding.
- No off-canvas rail. No Gideon dock (Gideon is a tab).
- Journey/Map: map takes all remaining height; page itself must not scroll or pinch-zoom.

## Quality bar

- Delete dead CSS for the removed rail / old tabbar / `.now-open`; don't leave duplicate rules.
- Update `Help.tsx` (keyboard: `1`–`4` switch sections, `/` search, `?` help, `g` toggles Gideon dock)
  and the HANDOFF/README shell descriptions.
- `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` all pass. Update tests that assert the old
  shell (e.g. tab labels) rather than deleting them; add a test that every old ModuleId maps to a
  section/sub and that all four sections render.
