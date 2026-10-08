# Task 182 — Fill kind gaps from data on disk (180 Batch B)

Follow AGENTS.md (completion contract). You own `src/lib/entityIndexBuild.ts` (grep; never read whole),
`src/lib/fanImage.ts`, `src/data/image-index.json` generation and their tests. See
`docs/tasks/180-report.md` §3 and §5 items 4–6.
1. Pictures: use `boss-images.json`, `images/bosses`, `images/creatures`, `images/npcs`,
   `images/locations` for boss/enemy/npc/region records by exact/alias name; never a wrong picture.
2. Enemy coords: derive from `enemy-combat` placements / `open/msb-enemies.json` (map pins per spawn).
3. Boss runes: from `.scratch/er-mcp.db` `bosses.runes` where missing (copy the db into `.scratch/` of
   this worktree from the main checkout if absent).
Report coverage before/after per kind. Test for each.
