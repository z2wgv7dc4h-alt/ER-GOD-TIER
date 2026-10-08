# Task 179 — Triage the Reddit/forum data: what's worth having, and where it fits (READ-ONLY)

Follow AGENTS.md (completion contract). READ-ONLY: scripts in `.scratch/179/`, commit only
`docs/tasks/179-report.md`. No app changes. Owner wants current-patch, genuinely useful content only.

Data: `public/sourced/open/player-knowledge.json` (5,718 posts/comments, topic + patch + possiblyOutdated
+ entities) and `public/sourced/open/player-questions.json` (6,581 questions). Look at the app's existing
content for each entity (entity index, boss strategy, guides) so you can tell what is NEW.

1. Classify every knowledge row: **useful advice** (actionable tip, cheese, farm route, build combo,
   synergy, hidden mechanic, missable/quest warning, bug/exploit warning, PvP tactic) vs **noise**
   (questions, jokes, complaints, screenshots without text, off-topic, Nightreign, outdated/patched).
   Use simple, explainable rules (score, length, imperative/advice phrasing, entity present, topic) and
   hand-check 100 random rows to measure precision; report it.
2. For the useful rows: which are NEW vs already covered by our data (same fact already on the page).
3. **Where it fits** — propose concrete placements with counts and 5 real examples each, e.g. boss page
   "Player tips", item page "How players use it", PvP build "Counters/tech", quest page "Missable
   warning", Journey "Before you go" warnings, Gideon answers. Say which placements are worth it and
   which aren't (too few/low quality).
4. Also mine `player-questions.json` for the most-asked questions our app CAN'T answer yet (top 30, with
   counts) — gaps worth filling.
5. Report: noise vs useful %, precision from the hand check, per-placement counts + examples, recommended
   placements (ranked), unanswerable top questions, checklist, ALL ITEMS DONE.
