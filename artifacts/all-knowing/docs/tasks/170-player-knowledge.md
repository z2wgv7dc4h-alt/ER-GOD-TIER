# Task 170 — Player knowledge from Reddit/forums (strategies, cheese, bugs, missables, PvP)

Follow AGENTS.md (completion contract applies). Branch `task-170`. Web access allowed. Personal project.
Data only — do NOT wire anything into the app. Reuse `scripts/collect-player-questions.py` helpers and
the cached raw responses in `.scratch/163/raw/` (copied in); politeness: ≤1 request / 2 s, descriptive
User-Agent, back off on 429, no logins. Store no usernames.

1. New script `scripts/collect-player-knowledge.py`: from r/Eldenring, r/EldenRingHelp,
   r/eldenringdiscussion, r/Shadowoftheerdtree, r/EldenRingPVP, r/EldenRingBuilds, r/eldenringlore (top
   of all time + searches for: tip, PSA, guide, strategy, cheese, broken, OP, bug, glitch, patched,
   missable, farm, meta, combo, synergy, invade, duel, speedrun, NG+), collect posts AND their top-voted
   comments (score ≥ 20, top 5 per post). Text cleaned, ≤ 1,500 chars each.
2. Each row: `text, score, date, permalink, kind (post|comment), topic` (strategy / farm / build /
   synergy / mechanic / bug / missable / pvp / route / dlc / lore / other), `entities` (alias plane, as in
   Task 163), `patch` (game version live on that date — use the official patch history; put the
   date→version table in the report), `possiblyOutdated` (true if a later patch changed a mentioned
   entity, or a later comment says patched/nerfed). Never drop rows for being outdated — flag them.
3. Output `public/sourced/open/player-knowledge.json` (target 5,000–20,000 rows, higher score first;
   report size in MB; keep under 25 MB) and a section in `docs/PLAYER-QUESTIONS.md`: counts per topic,
   top 50 entities, 20 example tips (current-patch only).
4. Test `src/lib/playerKnowledge.test.ts`: file exists, ≥ 5,000 rows, every row has text/topic/date/
   patch, no row contains `u/` usernames, ≥ 50% of rows have ≥ 1 entity.
Report `docs/tasks/170-report.md`: counts per source/topic, outdated share, patch table, size,
checklist, ALL ITEMS DONE.
