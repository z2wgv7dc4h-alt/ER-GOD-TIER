# Task 103 — Fix everything the UI audit and playtest found

Source: `npm run audit:ui` (Task 102) at 375×812 and 1440×900 plus a manual review. Fix every item,
then re-run the audit and iterate until the acceptance numbers hold.

## Phone header (highest visibility)
1. The phone header wraps onto two rows (brand, Find, "📍 Set area", "Tarnished · Lv.1", `+`, `?`).
   It must be **one row, 52px**: brand mark (icon only) · section title · then icon buttons only:
   search (magnifier), area (pin icon; show short area name truncated with ellipsis, max 110px),
   character (avatar/initial + "Lv N", tap → me/overview). Move `?` help into a small overflow `⋯`
   menu (with Glance mode and Help). The Quick-log `+` is the floating thumb button above the tab bar
   on phone only, not in the header.

## Loading
2. Library › Search renders nothing for several seconds on first open. Render the rail, toolbar and a
   skeleton grid immediately; load datasets progressively (categories show counts as they arrive).
   Replace every `<Suspense fallback={null}>` in `App.tsx` with a light skeleton for the section.

## Entity page correctness
3. Boss entity (e.g. Margit) says "No structured stats in the data for this entry" although
   `boss-combat.json` / `npc-combat.json` / armory bosses have HP, negations, status resists and poise.
   Wire them: **Weak to / Resists** chips, status resist table, poise, HP, recommended level (region
   band), strategy excerpt (boss strategy section), drops, and "Your best weapon vs this boss" (advisor/AR
   engine against its negations).
4. Actions must be kind-specific: boss → **Mark defeated**, Show arena on map, Set as goal, Ask Gideon;
   item/weapon/armor/talisman/spell → Mark owned, Equip (only if equippable), Compare (only for
   comparable kinds), Show where; NPC → Show where they are now, questline, Ask Gideon; grace → I'm here
   (sets currentArea + marks discovered), Show on map.
5. Status wording: "LOCKED — Needs Castleward Tunnel first" for Margit is wrong. Use **Ahead of you —
   reach Castleward Tunnel** for not-yet-reached prerequisites; reserve **Locked** for gate-foreclosed
   (point of no return) and **Missed** for permanently lost.

## Console / correctness
6. React "Encountered two children with the same key" warnings in Journey › Quests (34), Now, Map and
   search results. Find and fix every duplicate key (use stable unique ids, dedupe the data where the
   duplicate is real). Add a test that renders Quests and fails on console.error.
7. `/engine/api/events` requests show as aborted when leaving the map — close the EventSource on
   unmount explicitly so no errors are logged.

## Touch targets and text (phone)
8. Every interactive element ≥ 40×40 CSS px on phone (sub-tabs are 29px tall; Quests step chips,
   `.entity-link` inside headings at 25px). Use padding / min-height, not font growth. Inline text links
   inside prose may stay smaller but get ≥ 8px vertical hit padding via a pseudo-element.
9. No visible text under 12px on phone or 11px on desktop (chips, kickers, related groups at 10px now).

## Desktop Gideon dock
10. In the dock, the suggestion chips and quick chips overlap the log and Related chips are covered.
    Make the dock a flex column: header (fixed) · suggestions (collapsible) · log (the only scroller) ·
    input (fixed at bottom). Nothing absolutely positioned over the log.

## Audit harness improvements (`scripts/ui-audit.mjs`)
11. Before each screenshot wait until the section has real content (no skeleton, `.app` present, main
    region innerText length > 50) with a 10s cap; record "blank" as an issue if it never appears.
12. "Screens" must measure the section's actual scroll container (the element with overflow auto/scroll
    and the largest scrollHeight), not the document.
13. Add steps: Journey › Area, open the Quick-log sheet and log "Margit", open the area picker, Tarnished ›
    Setup (step 1), Tarnished › Gear.

## Acceptance
Re-run `npm run audit:ui` (dev server already running on :5173; do not start/stop it). Phone run:
**0 overlap, 0 covered, 0 blank, 0 console errors, 0 horizontal scroll**, tap<40 only for inline prose
links, tiny text 0. Desktop: 0 overlap, 0 covered, 0 console errors. Include the final summary tables in
your report. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
