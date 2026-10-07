# Task 163 — Collect how real players ask Elden Ring questions

Follow AGENTS.md. Branch `task-163`. Web access IS allowed for this task. Personal project.

Goal: a corpus of real player questions (wording, slang, nicknames, typos, topics) to drive Gideon's
question understanding and evaluation. Store the QUESTION text (title + first ~300 chars of body) and
topic metadata only — no usernames, no profile links, no personal data.

Sources (polite: identify with a descriptive User-Agent, ≤1 request per 2 s, back off on 429, stop
after a source errors repeatedly; respect robots.txt; no logins, no paid APIs):
- Reddit public JSON (`https://www.reddit.com/r/<sub>/search.json?q=...&restrict_sr=1&sort=top&t=all&limit=100`
  and `/top.json?t=all`): r/Eldenring, r/EldenRingHelp, r/eldenringdiscussion, r/Shadowoftheerdtree,
  r/EldenRingPVP, r/EldenRingBuilds, r/eldenringlore. Query with topic words (boss, where, how, build,
  quest, drop, level, weapon, pvp, invade, lore, upgrade, talisman, spell, ending, npc, map, dlc…)
  and keep posts whose title is a question or a help request.
- Stack Exchange API (gaming.stackexchange.com, tag `elden-ring`, `https://api.stackexchange.com/2.3/questions?tagged=elden-ring&site=gaming&pagesize=100`).
- If reachable without login: Steam Community discussions for Elden Ring, GameFAQs board topic titles,
  Fextralife forum topic titles. Skip any that block or need JS; say so in the report.
Target 5,000–15,000 unique questions; dedupe near-identical titles.

Processing (script `scripts/collect-player-questions.py`, stdlib only; raw responses cached in
`.scratch/163/raw/` so re-runs don't re-fetch):
1. Clean: strip markdown/links, normalise whitespace; drop non-English and non-questions.
2. Tag each question: `type` (same ~25 types as `docs/tasks/162-gideon-eval.md`: where-is, how-to-get,
   how-to-beat, drops, level, what-next, npc-quest, build-advice, compare, lore, mechanics, navigation,
   pvp, multi-part, other), and `entities` = ids resolved through the app's alias plane
   (`public/sourced/aliases.json` + entity-index names, same normalisation as `src/lib/canonicalNames.ts`).
   Record unresolved name-like spans (capitalised words / quoted) separately.
3. Output `public/sourced/open/player-questions.json` (`{source, collected, rows:[{q, type, entities,
   unresolved, src}]}`), and `docs/PLAYER-QUESTIONS.md`: counts per source and type, the 100 most
   common entities asked about, the 200 most common UNRESOLVED terms (nicknames/slang/misspellings the
   app doesn't know — e.g. "Rennala's pupils", "Malenia waterfowl") with counts, and phrasing patterns
   per type (top openings like "where do i find", "how tf do i beat").
4. Add the unresolved nicknames that clearly map to ONE entity as aliases via `scripts/gen-aliases.mjs`
   in a new source file `src/data/player-nicknames.json` (`{ "<nickname>": "<entity id>" }`) — only
   when unambiguous; list ambiguous ones in the report instead.
Run only `npx tsc -b` + `npx vitest run src/lib/aliases*.test.ts`. Commit. Report
`docs/tasks/163-report.md` (print it): per-source counts (and blocked sources), type mix, top unresolved
terms, nicknames added, ASSUMPTIONS.

## STATUS (from Claude): Part A is done and committed. REMAINING: all of Part B (player knowledge), and
add every unresolved nickname from docs/PLAYER-QUESTIONS.md that resolves to exactly one entity (only 18
were added). Then append to the report and finish with ALL ITEMS DONE.
