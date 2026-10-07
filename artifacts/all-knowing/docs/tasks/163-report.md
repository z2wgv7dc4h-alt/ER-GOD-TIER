# Task 163 report — how real players ask Elden Ring questions

## What changed

- New `scripts/collect-player-questions.py` (stdlib only, cached under
  `.scratch/163/raw/`): fetches question posts, cleans (markdown/links stripped,
  whitespace normalised), drops non-English and non-questions, dedupes near-identical
  titles, then tags `type`, resolves `entities` through the app's alias plane
  (`public/sourced/aliases.json` + the entity index, same normalisation as
  `src/lib/canonicalNames.ts`) and records unresolved name-like spans.
- New committed corpora: `public/sourced/open/player-questions.json`
  (**6,581** unique questions, 2.3 MB) and `docs/PLAYER-QUESTIONS.md` (counts,
  top entities, top unresolved terms, per-type phrasing, nickname decisions).
- New `src/data/player-nicknames.json` (**20** hand-verified terms) consumed by a
  new pass in `scripts/gen-aliases.mjs`; regenerated `src/data/aliases.json` /
  `public/sourced/aliases.json` (**7,120 -> 7,122** rows; this final run adds
  `margott` onto the existing `boss:morgott` row and mints `item:dark-moon-greatsword`).
- The corpus and `docs/PLAYER-QUESTIONS.md` were regenerated **after** the aliases
  changed, so the entity/unresolved tags reflect the new nicknames (e.g. `Radhan`,
  `Goldfrey`, `Margott`, `Darkmoon` are no longer "unresolved").

## Sources reached / blocked

| source | questions |
| --- | ---: |
| reddit:EldenRingHelp | 1837 |
| reddit:Eldenring | 1437 |
| reddit:EldenRingBuilds | 1428 |
| reddit:eldenringdiscussion | 894 |
| reddit:EldenRingPVP | 764 |
| steam | 152 |
| stackexchange | 68 |
| reddit:eldenringlore | 1 |
| **total** | **6581** |

- **reddit.com (403 Blocked)** from this network; the script falls back to the
  **Arctic Shift** public archive (same post data, no login) and records reddit.com
  as blocked. It was the only way to reach the subreddits.
- **GameFAQs** and **Fextralife** boards were attempted once each, both answer **403**
  and are recorded as blocked (best-effort, as the brief allows).
- **Steam Community** discussion topic titles reached without login.
- **Stack Exchange API** (`gaming.stackexchange.com`, tag `elden-ring`) reached.

## Type mix

| type | n | type | n |
| --- | ---: | --- | ---: |
| other | 2337 | how-to-get | 73 |
| build-advice | 1090 | mechanics | 64 |
| level | 671 | what-next | 52 |
| multi-part | 505 | compare | 44 |
| drops | 346 | class-build | 33 |
| co-op | 294 | recommend | 21 |
| pvp | 273 | where-is | 20 |
| bug-glitch | 191 | boss-location | 3 |
| lore | 146 | requirements | 3 |
| how-to-beat | 126 | how-to-use | 3 |
| navigation | 104 | item-location | 2 |
| ending | 100 | npc-location | 1 |
| npc-quest | 79 | | |

`other` dominates because many real posts are help requests ("can someone help me")
rather than a typed intent; the full opening lists are in `docs/PLAYER-QUESTIONS.md`.

Most-asked entities include `mechanic:status-bleed` (258), `item:strength` (212),
`boss:malenia` (182), `boss:mohg` (139), `boss:radahn` (137), `boss:radagon` (131),
`boss:rennala` (72), `boss:godfrey` (69), `boss:messmer` (68).

## Top unresolved terms (nicknames / slang / typos the plane did not know)

| # | term | n | # | term | n |
| ---: | --- | ---: | ---: | --- | ---: |
| 1 | ng+7 | 37 | 11 | Yura | 9 |
| 2 | ranni | 23 | 12 | AoWs | 8 |
| 3 | dark souls | 14 | 13 | str arc | 8 |
| 4 | Shadow | 13 | 14 | carian | 8 |
| 5 | erdtree | 13 | 15 | sellen | 8 |
| 6 | ng+2 | 12 | 16 | Dark | 7 |
| 7 | ng+3 | 11 | 17 | str faith | 7 |
| 8 | Greatshield | 11 | 18 | Str Fai | 7 |
| 9 | WANNA KILL PCR | 11 | 19 | Dark Souls 3 | 7 |
| 10 | STR FTH | 10 | 20 | str dex | 7 |

The full 200 are in `docs/PLAYER-QUESTIONS.md`.

## Nicknames added (`src/data/player-nicknames.json`)

| nickname | entity id |
| --- | --- |
| calid | region:caelid |
| darkmoon | item:dark-moon-greatsword |
| godric | boss:godrick |
| goldfrey | boss:godfrey |
| granssax | item:bolt-of-gransax |
| liurna | region:liurnia |
| lyndell | region:leyndell |
| margott | boss:morgott |
| melania, waterfowl | boss:malenia |
| mesmer | boss:messmer |
| nagakibas, nagikiba | item:nagakiba |
| pcr | boss:consort |
| physic | item:flask-of-wondrous-physick |
| radhan | boss:radahn |
| renala, renalla, rennalla | boss:rennala |
| stormveil | dungeon:stormveil |

20 nickname keys resolve to 17 distinct entities. `dungeon:stormveil` and
`item:dark-moon-greatsword` needed a row minted; the rest attach to existing rows.
Minted rows take the entity index's canonical name as `fmgName`
(`Stormveil Castle`, `Dark Moon Greatsword`) — the nickname stays an alias, never
the display label the omnibox shows.

This run added two more from the automatic candidate set: `margott -> boss:morgott`
(the miner had mis-mapped it to `enemy:demi-human-queen` via the "margot" alias) and
`darkmoon -> item:dark-moon-greatsword` (corpus rows overwhelmingly mean the
greatsword, not `npc:dark-moon`).

Ambiguous terms were **not** added and are listed in `docs/PLAYER-QUESTIONS.md`
(e.g. `ranni` -> 23 records, `Shadow` -> 25, `erdtree` -> 36, `Greatshield`,
`carian`, `sellen`, `Loretta`, `Rykkard` -> boss vs grace, `Leontiels` -> boss vs
its named gear). The six automatic candidates still left out are all generic words
or false substring matches — `Soldier` -> `item:soldier-s-crossbow`, `assassins` ->
`item:prayerbook-assassins`, `rings` -> `item:rings-of-spectral-light`, `scepter` ->
`item:scepter-of-the-all-knowing` (Carian Regal is at least as likely), `tunnel` ->
`enemy:miner`, `Leontiels` -> `boss:leontiel` — so the alias plane stays clean.

## Checks (run once)

- `npx tsc -b` — clean.
- `npx vitest run src/lib/aliases.test.ts src/lib/aliases.gen.test.ts` —
  **2 files, 23 tests passed** (including the bundled-vs-public aliases equality
  test).
- `node scripts/gen-aliases.mjs` — deterministic: `7,122` rows, `1,335,697` bytes,
  both `src/data/aliases.json` and `public/sourced/aliases.json` byte-identical.
- `python scripts/collect-player-questions.py --no-fetch` — reproduced **6,581**
  questions from `.scratch/163/raw/` (no network) and rewrote the corpus + docs.

## ASSUMPTIONS

- Reddit's own JSON is 403 from this network, so the Arctic Shift archive stands in
  for it (public post data, no login) and reddit.com is reported blocked.
- GameFAQs/Fextralife 403 -> skipped, not retried past the polite backoff.
- The brief cites `docs/tasks/162-gideon-eval.md` for the type list but that file is
  not in the repo; the classifier implements the named types plus ones the corpus
  actually contains (`co-op`, `bug-glitch`, `class-build`, `recommend`,
  `boss-location`, `requirements`, `how-to-use`, `item-location`, `npc-location`),
  with `other` as fallback.
- Only a title + the first ~300 chars of body are stored; usernames, profile links
  and personal data are stripped.
- A term is added as a nickname only when the alias plane resolves it to exactly one
  entity id **and** the mapping is clearly what a player means; uncorrected
  substring matches on ordinary words (`Soldier`, `rings`, `tunnel`, `assassins`)
  and genuinely ambiguous terms (`Leontiels`, `scepter`) are reported instead.
- `margott` is mapped to `boss:morgott` by hand: the automatic miner instead
  close-matched the `margot` alias of `enemy:demi-human-queen`, which the corpus
  ("help fighting Margott the Omen King") contradicts.
- `darkmoon` is mapped to `item:dark-moon-greatsword`: every sampled corpus row
  means the weapon; the miner's `npc:dark-moon` (the spell/entity) is not what
  players ask about.
- The corpus is tagged by looking up the alias plane, so `player-questions.json`
  and `PLAYER-QUESTIONS.md` are regenerated **after** `gen-aliases` whenever
  nicknames change; runs before that kept stale `unresolved` entries.
- `generatedAt` is set from the clock at generation time (the row contents are
  otherwise reproducible from the committed cache).

## Not done / notes

- Only the brief's gates were run (`tsc -b` + aliases tests). The full gate suite
  (`npm run index:entities`, full `vitest`, lint, build, audits) was not run because
  this task changes data + a generator only and the brief restricts the test run.
- `reddit:eldenringlore` returned a single question (archive paging); r/Shadowoftheerdtree
  was empty via the archive.

## Follow-up (final run) — remaining nickname triage

The previous run left the alias plane under-resolved: it added 18 hand-verified
nicknames but never re-ran the corpus, so `PLAYER-QUESTIONS.md` still listed terms
that had since been resolved. This run:

- Re-ran `scripts/collect-player-questions.py --no-fetch` (cache only, 6,581
  questions) so `player-questions.json` and `PLAYER-QUESTIONS.md` are tagged against
  the current alias plane. `Radhan` (27), `Goldfrey`, `mesmer`, `melania`,
  `stormveil`, `Nagakibas`, `Physic`, `lyndell`, `Liurna` etc. drop out of the
  unresolved list; `boss:malenia` rises 163 -> 182, `boss:radahn` 107 -> 137.
- Added the two remaining unresolved terms that clearly map to a single entity:
  `margott -> boss:morgott` and `darkmoon -> item:dark-moon-greatsword`
  (18 -> 20 nicknames). Regenerated `aliases.json` (`7,121 -> 7,122` rows).
- Left the six automatic candidates that are generic words or ambiguous
  (`Soldier`, `assassins`, `rings`, `scepter`, `tunnel`, `Leontiels`) in the report
  instead of polluting the alias plane, per the brief's "only when unambiguous".
- Fixed a case-sensitivity bug in the docs generator: the "candidates not added"
  table compared raw strings, so capitalised forms of already-added nicknames
  (`Goldfrey`, `Liurna`, …) were mis-listed. It now compares `normalize_name`.

## Checklist

- [x] Collect Reddit question posts (r/Eldenring, r/EldenRingHelp, r/eldenringdiscussion, r/Shadowoftheerdtree, r/EldenRingPVP, r/EldenRingBuilds, r/eldenringlore) — reddit.com 403 from this network, so the Arctic Shift public archive stands in; reddit.com recorded as blocked.
- [x] Collect Stack Exchange questions (gaming.stackexchange.com, tag `elden-ring`).
- [x] Best-effort Steam / GameFAQs / Fextralife — Steam reached; GameFAQs and Fextralife blocked (403) and reported.
- [x] Reach the 5,000–15,000 unique-question target and dedupe near-identical titles — 6,581 unique.
- [x] Script `scripts/collect-player-questions.py`, stdlib only, raw cached in `.scratch/163/raw/` so re-runs do not re-fetch.
- [x] Clean text (strip markdown/links, normalise whitespace) and drop non-English / non-question posts.
- [x] Tag each question with `type` and `entities` (alias plane + entity index); record unresolved name-like spans.
- [x] Output `public/sourced/open/player-questions.json` and `docs/PLAYER-QUESTIONS.md` (per-source and per-type counts, top-100 entities, top-200 unresolved terms, per-type phrasing).
- [x] Add the unresolved nicknames that clearly map to one entity as aliases via `scripts/gen-aliases.mjs` / `src/data/player-nicknames.json`; list ambiguous ones in the report (20 added; 6 distinct ambiguous/generic ones listed).
- [x] Run only `npx tsc -b` + `npx vitest run src/lib/aliases*.test.ts` (23 tests, both files pass) and commit.
- [x] Write and print `docs/tasks/163-report.md` with per-source counts (and blocked sources), type mix, top unresolved terms, nicknames added, and ASSUMPTIONS.

ALL ITEMS DONE
