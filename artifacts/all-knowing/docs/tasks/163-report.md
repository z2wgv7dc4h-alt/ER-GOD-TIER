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
- New `src/data/player-nicknames.json` (18 hand-verified terms) consumed by a new
  pass in `scripts/gen-aliases.mjs`; regenerated `src/data/aliases.json` /
  `public/sourced/aliases.json` (**7,120 -> 7,121** rows).

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
`boss:malenia` (163), `boss:mohg` (139), `boss:radagon` (131), `boss:radahn` (107).

## Top unresolved terms (nicknames / slang / typos the plane did not know)

| # | term | n | # | term | n |
| ---: | --- | ---: | ---: | --- | ---: |
| 1 | ng+7 | 37 | 11 | stormveil | 11 |
| 2 | Radhan | 27 | 12 | WANNA KILL PCR | 11 |
| 3 | ranni | 23 | 13 | STR FTH | 10 |
| 4 | Darkmoon | 14 | 14 | Yura | 9 |
| 5 | dark souls | 14 | 15 | AoWs | 8 |
| 6 | Shadow | 13 | 16 | carian | 8 |
| 7 | mesmer | 13 | 17 | sellen | 8 |
| 8 | melania | 13 | 18 | str dex | 7 |
| 9 | erdtree | 13 | 19 | RL 150 | 7 |
| 10 | Greatshield | 11 | 20 | Nagakibas | 6 | 

The full 200 are in `docs/PLAYER-QUESTIONS.md`.

## Nicknames added (`src/data/player-nicknames.json`)

| nickname | entity id |
| --- | --- |
| calid | region:caelid |
| godric | boss:godrick |
| goldfrey | boss:godfrey |
| granssax | item:bolt-of-gransax |
| liurna | region:liurnia |
| lyndell | region:leyndell |
| melania, waterfowl | boss:malenia |
| mesmer | boss:messmer |
| nagakibas, nagikiba | item:nagakiba |
| pcr | boss:consort |
| physic | item:flask-of-wondrous-physick |
| radhan | boss:radahn |
| renala, renalla, rennalla | boss:rennala |
| stormveil | dungeon:stormveil |

16 attach to a canonical row that already existed; 2 needed a row minted
(`dungeon:stormveil`, `item:flask-of-wondrous-physick`), so only `dungeon:stormveil`
is a net-new alias row. Minted rows take the entity index's canonical name as
`fmgName` (`Stormveil Castle`, `Flask of Wondrous Physick`) — the nickname stays an
alias, never the display label the omnibox shows.

Ambiguous terms were **not** added and are listed in `docs/PLAYER-QUESTIONS.md`
(e.g. `ranni` -> 22 records, `Shadow` -> 25, `erdtree` -> 36, `Greatshield`,
`carian`, `sellen`, `godric` -> boss vs grace, `Loretta`, `stormveil` -> dungeon vs
graces). Other automatic candidates left out: `Darkmoon`, `Leontiels`, `Margott`,
`Physic` (already covered), `Soldier`, `assassins`, `rings`, `scepter`, `tunnel`.

## Checks (run once)

- `npx tsc -b` — clean.
- `npx vitest run src/lib/aliases` — **2 files, 23 tests passed** (`aliases.test.ts`
  + `aliases.gen.test.ts`, including the bundled-vs-public aliases equality test).
- `node scripts/gen-aliases.mjs` — deterministic: `7,121` rows, `1,335,475` bytes,
  both `src/data/aliases.json` and `public/sourced/aliases.json` byte-identical.

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
  entity id; anything ambiguous is reported instead.
- `generatedAt` is fixed in the committed JSON (Task 163 follow-up made corpus
  generation deterministic); a `--no-fetch` re-run reproduces the same rows.

## Not done / notes

- Only the brief's gates were run (`tsc -b` + aliases tests). The full gate suite
  (`npm run index:entities`, full `vitest`, lint, build, audits) was not run because
  this task changes data + a generator only and the brief restricts the test run.
- `reddit:eldenringlore` returned a single question (archive paging); r/Shadowoftheerdtree
  was empty via the archive.
