# Task 195 — Fold curated player tips into the existing guide/tip places (no new section)

Follow AGENTS.md (completion contract). FIRST `git merge --no-edit master`. Data:
`public/sourced/open/player-knowledge.json`; triage + placements: `docs/tasks/179-report.md` (≈239 useful
rows, classifier ≈53% precise — so you must re-check every row).
1. Build `src/data/player-tips.json` with a script `scripts/curate-player-tips.mjs`: keep only rows that are
   actionable advice, current patch (`possiblyOutdated` false), about a resolved entity, not already stated
   on that entity's page (compare against its description/strategy/notes), no usernames, no URLs rendered.
   Each tip: { id, entityId, kind (boss|item|pvp|mechanic|region|general), text (cleaned, ≤ 400 chars),
   patch, score }. Log every rejected row with a reason in the report summary (counts per reason).
2. Show them in the EXISTING places only, same styling as their neighbours, with a small "Player tip ·
   patch X" tag: boss page strategy section; item page usage notes + builds using the item; Library › PvP
   tech/matchups; Guides entry / mechanic page; Journey › Now "Before you go" for region warnings; leftover
   general tips as entries under the matching Guides topic. No new tab or section.
3. Gideon offline may cite them as a source for the matching entity (read-only use of the JSON).
4. Tests: tips file schema; no tip duplicates an existing page sentence; no URL/username in text; each
   placement renders the tag.
