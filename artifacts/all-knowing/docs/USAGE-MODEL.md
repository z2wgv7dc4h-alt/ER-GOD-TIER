# Usage model — how the app is used while playing Elden Ring

Every screen and task should be judged against this document. The app is a **second screen next to a
game**: the player glances at it between fights, often one-handed on a phone, usually with one
specific question. The cost of answering must be one search or two taps.

## Before you start

Read `docs/DATA-CATALOG.md` (regenerate with `npm run data:catalog`) before
touching data or answering "we don't have X". It lists **every** source in the
tree — `public/sourced/**`, `src/data/**`, `src/knowledge/*.ts`, the
`vendor/elden-ring-map/data` inputs, and every table in the `data/raw/er-mcp.db`
wiki dump — with record counts, entity kinds, consumers and a **UNUSED** flag.

- **Never report data as missing** without checking every catalog source. The
  47 MB wiki DB holds 4,939 pages, 21,885 sections, 2,730 redirects and typed
  weapon/armor/spell/talisman/boss/acquisition/quest tables that the app does
  not yet fully use.
- When you add or correct data, **cite which sources you checked** (file paths,
  table names) in the commit/PR notes, and update the catalog if you add a source.
- The `Gaps` section is the ordered list of entity kinds where the app tracks
  fewer records than a source already in the repo.

## 1. The moments (what the player is doing → what they need → where the app answers)

| # | Moment in the game | The question | App answer |
|---|---|---|---|
| 1 | Booting up a session | "Where was I, what was I doing?" | **Resume card** on open: last region, last grace, current goal + next step, what changed since last time |
| 2 | Just rested at a new grace / entered an area | "What's here? What can't I miss? Am I the right level?" | **Area hub** (region page): bosses, items, NPCs, graces, dungeons, secrets, missables, level band vs mine, my % done here |
| 3 | Just killed a boss / picked something up / met an NPC | "Log it. What did that unlock?" | **Quick log** (`+` button everywhere, or type "killed Margit"): fuzzy match → mark → inference → "this unlocked / next" toast |
| 4 | Stuck on a boss | "How do I beat this?" | **Boss page**: weak to / resists, my build's damage vs it, recommended level, spirit ash + summon options, strategy, cheese |
| 5 | Found an item | "Is this good for me?" | **Item page**: verdict vs my equipped (AR at my stats, requirements), what it's good for, upgrade path |
| 6 | Met an NPC | "Who is this? Will I break their quest?" | **NPC page**: quest state, next beat, lockout warnings, where they move, what they sell, dialogue |
| 7 | Lost / aimless | "What should I do now?" | **Journey › Now**: goal, next steps, recommended, nearby unfinished |
| 8 | About to do something irreversible | "What do I lose if I do this?" | **Point-of-no-return check**: auto-warned when logging/approaching a gate; checklist of what locks |
| 9 | Build tangent | "Best bleed build? Can I use X? Switch build?" | **Library › Builds**: detection, stronger-for-my-build, change-build plan |
| 10 | Mechanics tangent | "How does poise / soft cap / flask upgrades / ashes work?" | **Library › Guides & mechanics** + Gideon |
| 11 | Lore tangent | "Who is Marika?" | Entity **Lore** tab + Gideon (long prose lives only here) |
| 12 | Farming | "Where do I farm runes / smithing stones / X material?" | Material & rune-farm pages with map pins (gathering nodes, enemy drops) |
| 13 | Trading / merchants | "What should I trade this remembrance for? Who sells X?" | Remembrance page (Enia options ranked for my build); "Sold by" section on every item |
| 14 | Co-op / PvP | "Can I summon here? Counter for X?" | Kit › PvP; boss page summon info |
| 15 | Mid-fight glance | Needs the map / one number, huge and fast | **Glance mode**: big type, map follows current area, no chrome |
| 16 | Endgame / NG+ / 100% | "What am I missing?" | Completion by category with map pins; NG+ carry-over notes |

## 2. The interconnection model

**Everything is an entity** with a stable fact id: weapon, armor, talisman, spell, ash, spirit,
item, material, boss, enemy, NPC, grace, region/area, dungeon, quest line, quest beat, gate
(point of no return), ending, build, merchant, mechanic.

**Edges** (all traversable in both directions): drops · sold by · found in (region/dungeon) ·
requires · unlocks · locks (gate) · part of quest · next beat · weak to / resists · good for build ·
crafted from · traded for (remembrance) · upgrade material · related lore.

**One entity page template** everywhere (Library detail, map pin, Gideon answer, search hit, quick
log result). It has:
- **My status strip** at the top: owned / defeated / found / available now / locked (why) /
  missed; distance-in-progress ("next region over", "behind Leyndell gate").
- Type-specific tabs (Stats · Where · Lore · Related) built from the edges above.
- **Universal actions**: Show on map · Mark (done/owned/not) · Ask Gideon · Compare · Equip ·
  Set as goal.

**Context** is global and shapes every list: *character* (stats, gear, owned, progress), *current
area* (last grace / last logged thing / picked on map), *current goal*. Every list can be scoped
"near me", "for my build", "not done".

**One omnibox** (header search, `/`): the text is classified —
- an entity name → open its page;
- a log statement ("killed", "got", "found", "rested at", "gave X to Y") → quick log;
- a question ("where", "how", "what now", "should I", "best") → Gideon, answered inline with the
  same entity links;
- a command ("map", "build", "setup") → navigate.

## 3. Rules for all future tasks

1. No dead text: every name of a thing is a link to its entity page.
2. No feature only reachable via Gideon or search; everything also has a tap path.
3. Every "logged" fact runs inference and says what it unlocked/locked.
4. Irreversible actions always warn first (gates, NPC-killing choices).
5. Long prose only in Lore tabs and guides; lists and cards everywhere else.
6. Phone first: ≥44px targets, one-hand reachable primary actions, no page-level zoom/scroll traps.
