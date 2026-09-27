# Task 92 — Coverage pass: every feature has an obvious home in the four-section shell

Runs after Task 91. Task 91 re-homed the shell chrome; this pass makes sure the deeper features are
**findable** from the right section, not only via search or Gideon. Nothing new is built — this is
surfacing, linking and labelling.

| Feature (module) | Home | How it must be reachable |
|---|---|---|
| Medusa 100% route, 9 acts / 367 steps (`medusaRoute.ts`) | Journey › Quests | A "100% route" block/toggle with the current act + next steps; also a card on Journey › Now |
| Missables / "before I go" / points of no return (`missables.ts`, `gates.ts`, `lockWarnings.ts`) | Journey › Now | "Before you leave this area" card, level-aware |
| Leftovers / nearby unfinished (`leftoverPins.ts`) | Journey › Now + Map layer | Card with count + "show on map" |
| Field hunts / completion % (`completions.ts`, `hunts.json`) | Tarnished › Overview | Progress bars per category (graces, bosses, items, fragments, field hunts) |
| Respec advisor, upgrade advice, build hunt (`respecAdvice.ts`, `upgradeAdvice.ts`, `buildHunt.ts`) | Library › Builds | Visible panels, not buried under a toggle |
| Weapon compare (`weaponCompare.ts`), OP kits (`knowledge/builds.ts`), PvP (`knowledge/pvp.ts`), tech/cheese (`knowledge/tech.ts`) | Library › Kit | Four clearly labelled groups |
| Recipes, secrets, guides, community builds, dialogue, wiki prose, boss strategy | Library › Search | Browse chips on the empty state for each corpus |
| Boss weaknesses / enemy combat (`boss-combat.json`, `enemy-combat.json`) | Library › Search entity page + Build matchup | "Weak to / resists" on every boss result |
| Equipment-screen vision, inventory OCR, rear camera (`museVision.ts`, `equipmentOcr.ts`) | Tarnished › Update | Screenshot card lists what each shot type reads |
| Goods paste, packets/QR, build codes | Tarnished › Update | Own cards |
| Profiles, co-op, spoiler toggle, engine status, LLM on/off status | Tarnished › Profiles | Show whether Gideon's LLM key is configured |
| Gideon quick chips (still available, stuck, 100% spine, before I go, missed here, secrets, upgrade advice) | Gideon | Visible when the input is empty |

## Cross-linking rule

Any entity (item, boss, grace, NPC, quest beat) rendered anywhere is a link that opens its entity
view with four actions: **Show on map · Mark done · Ask Gideon · Open in Library**. Reuse `Related`
/ `Thread` / `links.ts`; do not build a second link system.

## Acceptance

- A test walks the table above: for each row, render the home section and assert the entry point exists
  (by role/label).
- `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
