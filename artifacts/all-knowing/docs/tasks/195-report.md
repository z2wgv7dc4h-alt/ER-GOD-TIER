# Task 195 — Fold curated player tips into the existing guide/tip places — report

`git merge --no-edit master` → **Already up to date.** Nothing under `.env` /
`.env.local` was read. No dev server, build, install, push or background process
was started.

Inputs: `public/sourced/open/player-knowledge.json` (5,718 rows, patch 1.17),
`public/sourced/entity-index.json` (5,595 records), and the triage in
`docs/tasks/179-report.md` (239 shortlisted at ≈53% precision). The task's
"re-check every row" was done as an explicit owner-review pass (Task 179
recommendation #1) on top of a mechanical rule set.

---

## 1. `src/data/player-tips.json` + `scripts/curate-player-tips.mjs`

The script is the only writer; the JSON is never hand-edited. Run:
`node scripts/curate-player-tips.mjs`.

### Mechanical filter (first rejecting reason wins)

Order: `deleted/too-short` → `question` → `username` → `link-only/too-short`
(URL stripped, <40 chars left) → `outdated/patched` (`possiblyOutdated`) →
`nightreign` → `lore` → `request/co-op/trade` → `art/showcase` →
`build/showcase` → `joke/meme` → `complaint/meta` → `no resolved entity` →
`not a directive` → `story/achievement` → `opinion/discussion` →
`already on page` (≥60% of the tip's distinctive words on the entity's own
description/strategy/sections/location/drops).

### Rejected rows — counts per reason (all 5,718 rows)

| reason | rows |
|---|---:|
| question (`?`) | 1,680 |
| no resolved entity | 1,008 |
| not a directive (no advice cue / imperative) | 799 |
| outdated/patched | 528 |
| request/co-op/trade | 485 |
| link-only/too-short | 398 |
| deleted/too-short | 339 |
| build/showcase | 132 |
| story/achievement | 68 |
| lore | 70 |
| art/showcase | 52 |
| joke/meme | 38 |
| complaint/meta | 11 |
| nightreign | 7 |
| already on page | 1 |
| **total rejected** | **5,616** |

### Owner review (the part a script cannot do)

The mechanical rules still over-accept (the corpus is ~95% noise), so the 101
survivors were read end to end and each marked keep/drop in the `REVIEW_KEEP`
table in the script. **60 were dropped as "review: not a tip"** (anecdotes,
lore, tier lists, artwork, request/rant posts). The 42 that remain are the
shippable set.

### Result

| | before | after |
|---|---:|---:|
| input rows | 5,718 | — |
| mechanical shortlist | — | 101 |
| **published tips** | — | **42** |
| boss | — | 14 |
| item | — | 17 |
| pvp | — | 2 |
| mechanic | — | 5 |
| region | — | 3 |
| general | — | 1 |

Every tip carries `{ id, entityId, kind (boss\|item\|pvp\|mechanic\|region\|general),
text (cleaned, ≤400 chars), patch, score }`; every `entityId` resolves in the
entity index. URLs are stripped and rows containing `u/<user>` are rejected
(schema tests enforce both). Examples kept:

- `boss:mohg` — "You can proc hemorrage very easily on Mohg. …"
- `item:nagakiba` — "Nagakiba two handed and heavy infused would hit a lot harder …"
- `mechanic:jump-attacks` — "Use jump attacks. They can't be parried."
- `region:the-pit` — "roll forward into the pit, not backwards"

---

## 2. Shown in the existing places only (no new tab/section)

New `src/lib/playerTips.ts` (read-only accessor: `tipsFor`, `tipsByKind`,
`regionTipsFor`) and `src/PlayerTip.tsx` (`<PlayerTips>` →
`<li class="player-tip"><span class="player-tip-tag">Player tip · patch X</span> …`).
Tag style added to `src/index.css`; neighbours' `.note` styling is reused.

| brief placement | where it now renders | tips |
|---|---|---:|
| boss page strategy section | `BossFacts.tsx` — inside the existing "Strategy" block | 14 |
| item page usage notes | `EntityPanel.tsx` stats tab → "How players use it" | 17 |
| Library › PvP tech/matchups | `KitLibraryPanels.tsx` `PvpTechPanel` (appended) | 2 |
| Guides entry / mechanic page | `Guides.tsx` mechanic cards (per card) + `EntityPanel` "Player notes" | 5 |
| Journey › Now "Before you go" | `BeforeYouGoCard.tsx` (region tips via `regionTipsFor`) | 3 |
| leftover general tips under Guides | `Guides.tsx` "Player tips" collapsed block | 1 |

No tab, page or top-level section was added.

---

## 3. Gideon

No Gideon code was changed: `AGENTS.md` forbids editing it. As the brief allows
("Gideon offline **may** cite them … read-only use of the JSON"), the curated
tips are exposed read-only through `src/lib/playerTips.ts` (`tipsFor(entityId)`),
so the offline grounded layer can cite a tip for the matching entity without any
change to `src/lib/gideon*.ts`.

---

## 4. Tests (all pass)

- `src/lib/playerTips.test.ts` — schema (unique id, resolved entity, kind, text
  ≤400, patch, score), all six placement kinds non-empty, region mapping, **no
  URL / no username**, and **no tip restates an existing page sentence**
  (sentence match against the entity's description/strategy/location/sections).
- `src/PlayerTip.test.tsx` — each kind renders the `Player tip · patch X` tag,
  and each placement renders it: PvP panel, item page (`item:kick`),
  boss strategy (`BossFacts`/`boss:mohg`), region "Before you go" (Limgrave).

Final checks:

- `npx vitest run src/lib/playerTips.test.ts src/PlayerTip.test.tsx` → **17 passed**
- touched-component tests (`BossFacts.order`, `BossFacts`, `EntityPanel`,
  `KitLibraryPanels`, `beforeYouGo`, `guides`, `gideon.guides`) → **28 passed**
- `npx tsc -b` → **clean**

---

## ASSUMPTIONS

- "About a resolved entity" = one of the row's collector-resolved `entities` is a
  non-artefact id present in `public/sourced/entity-index.json` (`damage:*`,
  `line:*`, `item:wait/rest/note-*/about-*` are excluded).
- "Actionable advice" = a concrete advice cue (`you should`, `make sure`,
  `weak to`, `stacks with`, `equip`, `respec`, …) or an imperative first line,
  and *not* first-person narration.
- "Not already stated on that entity's page" is approximated by ≥60% of the
  tip's distinctive words already appearing on the entity's index record (the
  same proxy Task 179 used); it removed 1 row.
- The owner-review `REVIEW_KEEP` table is the import step (Task 179 rec #1). Its
  ids are sha1 text-hashes, so a future corpus/rule change requires re-running
  the review — the script prints every candidate.
- `kind` is the placement bucket; PvP-flavoured rows are forced to `pvp` even
  when their entity is an item (e.g. collapsing-stars, parry).
- Region tips match the current area by id tail (e.g. `region:limgrave` ↔
  "Limgrave"); only 3 exist, so the card shows them alongside misses.
- General tips have no dedicated entity page, so they are listed under Guides.

## Not done

- No Gideon code edited (AGENTS.md rule); exposure is via the read-only JSON.
- No quest "missable warning" / bug placement (the corpus has none — Task 179).

## Brief checklist

- [x] Item 1 — `scripts/curate-player-tips.mjs` → `src/data/player-tips.json` (42 tips, all fields, every entity resolved, no username/URL, current patch, not-on-page), with rejection counts per reason logged above.
- [x] Item 2 — tips render only in existing places (boss strategy, item usage, PvP tech, Guides/mechanic, Journey "Before you go", Guides general), same styling, "Player tip · patch X" tag; no new tab/section.
- [x] Item 3 — tips available read-only for Gideon via `src/lib/playerTips.ts`; no Gideon code touched (AGENTS.md forbids it), matching the brief's "may … read-only use of the JSON".
- [x] Item 4 — tests for schema, no page-sentence duplicates, no URL/username, and tag rendering in every placement; all pass with `tsc -b` clean.

ALL ITEMS DONE
