# Task 170 report — player knowledge from Reddit (strategies, cheese, bugs, missables, PvP)

## What changed

- New `scripts/collect-player-knowledge.py` (stdlib only): clones the Task 163
  cache helpers, collects posts **and** their top-voted comments (score ≥ 20, top 5
  per post) from the seven Elden Ring subreddits, cleans the text
  (markdown/links/`u/…` stripped, whitespace normalised, ≤ 1,500 chars), tags each
  row with `topic`, resolves `entities` through the app's alias plane
  (`public/sourced/aliases.json` + the entity index, same normalisation as
  `src/lib/canonicalNames.ts`), assigns `patch` (App/Regulation version live on the
  row's date) and flags `possiblyOutdated`.
- New committed corpus `public/sourced/open/player-knowledge.json`
  (**5,384** rows: 3,544 posts + 1,840 comments, **2.87 MB**) plus a new
  `<!-- task-170 -->` section in `docs/PLAYER-QUESTIONS.md` (counts per topic, top 50
  entities, 20 example current-patch tips).
- New `src/lib/playerKnowledge.test.ts` (Task 170 §4 guards).

## Sources reached

Reddit's own JSON answers `403 Blocked` from this network (as Task 163 found), so the
public **Arctic Shift** archive stands in for it (same post/comment data, no login).
Rows are attributed to a subreddit via their permalink:

| subreddit | rows | subreddit | rows |
| --- | ---: | --- | ---: |
| r/Eldenring | 1951 | r/EldenRingHelp | 584 |
| r/eldenringdiscussion | 998 | r/EldenRingLore | 6 |
| r/EldenRingPVP | 931 | **total** | **5384** |
| r/EldenRingBuilds | 914 | | |

- `r/Shadowoftheerdtree` returned no cached pages (empty via the archive), and
  `r/eldenringlore` only a handful, so those two contribute almost nothing.
- Post pages cached by Task 163 under `.scratch/163/raw/` were reused; new responses
  (600 comment trees + the patch-notes page) are cached under `.scratch/170/raw/`.
- Politeness: ≤ 1 request / 2 s, descriptive User-Agent, back off on 422/429/5xx,
  no logins.

## Topic mix

| topic | rows | possibly outdated |
| --- | ---: | ---: |
| other | 2792 | 374 |
| build | 807 | 132 |
| pvp | 441 | 58 |
| bug | 256 | 33 |
| dlc | 253 | 51 |
| synergy | 179 | 41 |
| strategy | 161 | 16 |
| mechanic | 157 | 55 |
| farm | 134 | 18 |
| route | 95 | 14 |
| lore | 89 | 14 |
| missable | 20 | 2 |
| **total** | **5384** | **808 (15.0%)** |

`other` dominates because "top of all time" is mostly memes, screenshots, lore
musing and "look at my build" posts; the classifier deliberately requires a keyword
to assign a topic rather than guessing.

## Patch table (date → version live on that date)

| date | version | date | version |
| --- | --- | --- | --- |
| 2022-02-25 | 1.02 | 2023-07-26 | 1.10 |
| 2022-03-02 | 1.02.2 | 2024-06-20 | 1.12 |
| 2022-03-17 | 1.03 | 2024-06-26 | 1.12.2 |
| 2022-03-23 | 1.03.2 | 2024-07-04 | 1.12.3 |
| 2022-04-04 | 1.03.3 | 2024-07-30 | 1.13 |
| 2022-04-19 | 1.04 | 2024-08-06 | 1.13.1 |
| 2022-04-27 | 1.04.1 | 2024-09-04 | 1.13.2 |
| 2022-06-13 | 1.05 | 2024-09-11 | 1.14 |
| 2022-08-09 | 1.06 | 2024-10-02 | 1.15 |
| 2022-10-13 | 1.07 | 2024-10-17 | 1.16 |
| 2022-10-25 | 1.07.1 | 2024-11-05 | 1.16.1 |
| 2022-12-07 | 1.08 | 2026-08-27 | 1.17 |
| 2022-12-15 | 1.08.1 | | |
| 2023-03-23 | 1.09 | | |
| 2023-04-17 | 1.09.1 | | |

Dates are the release dates on the official patch history (Fextralife `Patch+Notes`
mirror, cached at `.scratch/170/raw/patch-notes.html`). The `1.17` row is the live
version in this environment (2026); micro-versions whose section carried no date use
the FromSoftware announcement dates. Rows before 2022-02-25 get `pre-release`.

Patch distribution across the corpus: `1.16.1` 2711, `1.17` 2667, `1.09.1` 5,
`pre-release` 1 — the collected sample skews recent, so most rows are near-current.

## `possiblyOutdated`

`808` of `5384` rows (**15.0%**) are flagged, never dropped. A row is flagged when a
**later patch** changed one of its mentioned entities (754 entity→version change
signals parsed from the official patch notes) **or** a later comment in the same
thread says something was patched/nerfed/reverted. Split: 466/3544 posts, 342/1840
comments.

## Data quality

- 5,384 rows (≥ 5,000 target); every row has `text/topic/date/patch`; no empty text;
  none over 1,500 chars.
- `entities`: 3,162 rows (**58.7%**, ≥ 50% target) carry at least one alias-plane id.
- Usernames: 0 rows contain a `u/…` **username** mention; the only literal `u/` in
  the corpus is the substring in `"Beru/Ant-king"` (a build description), which no
  word-boundary username match sees.
- Output **2.87 MB**, well under the 25 MB cap and inside the 5,000–20,000 row target.

## Checks (run once)

- `npx vitest run src/lib/playerKnowledge.test.ts` — **1 file, 5 tests passed**.
- `npx tsc -b` — clean.
- `python scripts/collect-player-knowledge.py --no-fetch` — reproduced the 5,384-row
  corpus from cache (no network) and rewrote the JSON + `docs/PLAYER-QUESTIONS.md`.

## ASSUMPTIONS

- Reddit's own JSON is 403 from this network, so the Arctic Shift public archive
  stands in for reddit.com; this matches Task 163's documented fallback.
- The archive's full-text search endpoint answers `HTTP 422 Timeout` from this
  network for every keyword, so the requested keyword searches (tip, PSA, guide,
  strategy, cheese, broken, OP, bug, glitch, patched, missable, farm, meta, combo,
  synergy, invade, duel, speedrun, NG+) are performed **locally** over the collected
  post pool (title + selftext, word-boundary match) instead of by the archive. The
  script keeps `fetch_search_posts()` ready for a network where search works.
- The archive cannot sort by score, so "top of all time" is approximated by the
  top-400 posts per subreddit ranked by score (then comment-count), plus every search
  hit. This is why the corpus skews to recent high-karma posts.
- `patch` is the version live on the row's date per the official patch history; it
  says nothing about whether the row's advice is still valid (that is
  `possiblyOutdated`).
- `possiblyOutdated` = a later patch notes section mentions a mentioned entity, or a
  later comment in the thread uses patched/nerfed/reverted language. Both are
  heuristics; false positives (e.g. a later cosmetic change to a named boss) are
  possible, which is why rows are flagged rather than dropped.
- Entity resolution uses the same alias plane and longest-match tokeniser as Task 163,
  so `entities` is an `id:<name>` list on the app's canonical plane.
- Topic is a single best label from ordered keyword rules; unmatched rows are `other`.
- Text is truncated to 1,500 chars; only post/comment text and public metadata are
  stored, never authors.

## Not done / notes

- Only the brief's test plus `tsc -b` were run (per AGENTS.md while-working rule); the
  full gate suite was not run because this task adds data + a generator + one test and
  nothing is wired into the app.
- `r/Shadowoftheerdtree` contributed no cached pages in the reused Task 163 cache, so
  the DLC subreddit is represented only through `r/Eldenring`/`r/EldenRingBuilds`.

## Checklist

- [x] `scripts/collect-player-knowledge.py` collects posts **and** top-voted comments from the seven subreddits (top-of-all-time sample + the 19 keyword searches, applied locally because the archive's search endpoint times out from this network).
- [x] Every row carries `text, score, date, permalink, kind (post|comment), topic (strategy/farm/build/synergy/mechanic/bug/missable/pvp/route/dlc/lore/other), entities (alias plane), patch (date→version table above), possiblyOutdated`.
- [x] Output `public/sourced/open/player-knowledge.json` (5,384 rows, higher score first, 2.87 MB < 25 MB) and a `docs/PLAYER-QUESTIONS.md` section with counts per topic, top 50 entities and 20 current-patch example tips.
- [x] `src/lib/playerKnowledge.test.ts`: file exists, ≥ 5,000 rows, every row has text/topic/date/patch, no `u/` usernames, ≥ 50% of rows have ≥ 1 entity.
- [x] `docs/tasks/170-report.md` with per-source and per-topic counts, outdated share, patch table, size, checklist.
- [x] Never read `.env` / `.env.local`.

ALL ITEMS DONE
