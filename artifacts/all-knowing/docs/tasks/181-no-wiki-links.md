# Task 181 — Replace outbound wiki links with the content we already have (180 Batch D)

Follow AGENTS.md (completion contract). Owner rule: no links to a wiki when the data is on disk — show it.
You own `src/library/BossFacts.tsx`, `src/PackData.tsx`, `src/library/WikiTab.tsx`, `src/Build.tsx`
(link sections only) and their tests. Others own entityIndexBuild/fanImage (182) and
npcPlacements/EntityPanel/chestFacts/Atlas/ar/weaponStats (183).
See `docs/tasks/180-report.md` §4a rows 1–6.
1. Boss "Full fight guide" → render the stored Fextralife sections (`open/bosses-fextralife.json`) in
   the boss page's strategy area (collapsible), no outbound link.
2. Guides "Open full guide" + GuidesFor chips → open the stored guide text in-app
   (`open/guides-fextralife.json`).
3. Wiki chip → remove the external chip; the tab already renders the sections.
4. Meta-build link → render stored headings/body (`open/builds-fextralife.json`).
5. The 4 hard-coded PvP/mechanics links → in-app content from stored guides/builds; if a topic is not on
   disk, drop the link and say so in the report.
Keep: community resources list (#7) and Gideon citations (#8). A source credit line (plain text) is OK.
Test: no `href` to fextralife/fandom/wiki domains is rendered by these components.
