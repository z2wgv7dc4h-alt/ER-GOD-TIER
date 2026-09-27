# Task 96 — Advisor: recommend upgrades, build changes and what to do next

A pure recommendation engine plus UI, built on data that already exists: `Character` (stats,
`loadout`, `collectedItems`, bosses, graces, quest steps), `ar.ts`, `weaponStats.ts`,
`upgradeAdvice.ts`, `respecAdvice.ts`, `buildHunt.ts`, `knowledge/builds.ts`, `knowledge/pvp.ts`,
`loot.ts`, `acquisition.json`, `gates.ts`, `missables.ts`, `storylines.ts`, `completions.ts`,
`region-levels.json`. Consolidate, do not duplicate: where an existing module already computes
something, call it.

## Engine — `src/lib/advisor.ts` (pure, fully tested)

`advise(character, opts) → { build, upgrades, gear, todo, warnings }`

1. **Build detection**: infer the archetype from stats + equipped weapons (STR / DEX / quality / INT /
   FTH / ARC / bleed / hybrid) with a confidence and one-line reason.
2. **Stronger weapons for my build**: rank every weapon by AR at the character's current stats
   (and at +N reachable with their current upgrade materials/level band), filtered to the detected
   archetype's scaling, versus the currently equipped weapon. Each entry: AR gain %, requirements
   met or "needs +X STR", **obtainable now?** (region reached / not behind a closed gate / not
   already owned), where to get it, Show-on-map target.
3. **Gear**: talismans and armor that suit the archetype (tag table in data, e.g. bleed → Lord of
   Blood's Exultation, Rotten Winged Sword Insignia; int → Graven-Mass, Godfrey Icon…), same
   obtainable-now + where fields.
4. **Change build**: `planRespec(character, targetBuildId)` → target stats, levels/Larval Tears
   needed, whether Rennala (respec) is available, which kit pieces are owned vs missing (reuse
   `buildHunt.ts`) with map targets.
5. **To do / not done yet**: ranked list mixing (a) missables before the next point of no return,
   (b) bosses/items in regions already reached but not done, (c) questline beats available now,
   (d) region level-band fit ("you're over-levelled for Limgrave, Caelid suits you"). Each item has
   a reason and an action.
6. **Warnings**: equip load > 70%, stat below a weapon's requirement, soft caps passed with wasted
   points (reuse soft-cap data).

## UI

- **Journey › Now**: a "Recommended for you" block (top 3 to-dos + top 2 upgrades) with "See all".
- **Library › Builds** becomes the build planner: "Your build" card (detected archetype, stat bars
  with soft-cap markers), **Stronger for your build** list, **Gear picks**, and a **Change build**
  flow: pick a target (OP kits + community builds + "custom stats") → shows the respec plan and a
  shopping list with Show-on-map for each missing piece.
- Gideon: "what should I upgrade", "recommend a weapon", "help me switch to a bleed build" route to
  the advisor (add router intents in `gideon.ts` that call `advise`).

Acceptance: unit tests for archetype detection, AR-ranked upgrades honouring obtainable-now and
owned, respec plan, to-do ranking order, warnings; `npx tsc -b`, `npm test`, `npm run lint`,
`npm run build` pass.
