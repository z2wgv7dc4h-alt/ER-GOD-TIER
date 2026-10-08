# Task 176 — Wrong-text descriptions (audit 171, Batch A items 3–4) — report

Branch `task-176` (from master after 172). Owned code: `src/lib/entityIndexBuild.ts`
and `src/lib/auditFixes.test.ts`. `.env` / `.env.local` were never opened.

## What changed

### §1 Nightreign text never describes a base page (`entityIndexBuild.ts`)
- New `nightreignPageTitles` set, built from `public/sourced/open/wiki-db/nightreign.json`
  record titles **and** from every `wiki-sections` page whose own **Summary** names
  `Nightreign` but no base game (the wiki's words: Limveld, Crater, Mountaintop,
  Murk, First Peak …). `lookupWiki` now refuses any page in that set for both the
  description lead and the section fallback.
- `stripNightreign` also drops any sentence naming a Nightreign-only place
  (`Limveld`, `Shifting Earth`, `Deep of Night`, `Everdark`) — such a sentence can
  be a copied Overview line that never says "Nightreign".

Before → after (the records the 171 audit found):

| record | before | after |
|---|---|---|
| `enemy:rat` | "The Crater is a massive, open pit of lava … Limveld … Crater Shifting Earth event." | now the base-page Giant Rat line (no Nightreign) |
| `enemy:rat-leyndell` | same Crater text | empty |
| `enemy:rat-siofra-river` | same Crater text | empty |
| `grace:61433800` (Murkwater Coast) | "Murk is a permanent currency that persists between Expeditions." | empty |
| `grace:61453300` (Beside the Crater-Pocked Glade) | "The Crater is a massive, open pit … Limveld …" | empty |
| `region:mountaintop-minor-erdtree` | "The First Peak … appears … during the Mountaintop Shifting Earth event." | empty |

### §2 A description only comes from the record's own page (`entityIndexBuild.ts`)
- `lookupWiki` no longer accepts a page that is another thing:
  - a **generic type/status page** whose whole title is a bare type word
    (`GENERIC_PAGE_TOKENS`: "Poison", "Crater", "Dragon", "Erdtree", "Flames" …) —
    the old substring rule had `"Rat" ⊆ "Crater"` and `"Poison" ⊆ "Poison Claw …"`;
  - a **longer superset a qualifier disowns** (`Flying Dragon (Small)` must not
    take `Flying Dragon Agheel`);
  - a **Nightreign page** (above).
- New `wikiPageKind` maps every wiki-db page to its kind, and
  `descriptionKindCompatible` gates every description: a grace is never described
  by a boss/spell/dungeon/place page, an enemy never by a spell/item/place page.
  A creature page (boss/enemy/npc) may still describe a creature.
- `wikiLead(name, recordKind)` filters its page by that compatibility;
  `buildWikiDescriptionMap` carries `{ text, kind }` and the wiki-db fill checks it;
  `mergeBoss` takes its description only from its own page; the Fextralife fallback
  is restricted to boss/enemy.

The 171 Batch A item 4 examples, before → after:

| record | before (wrong page) | after |
|---|---|---|
| `grace:200104` (Spiral Rise) | "It's one of the Spiral Incantations." (Spira, a spell) | empty |
| `grace:130000` (Maliketh, the Black Blade) | "This is not an optional boss as Maliketh must be defeated …" (boss page) | empty |
| `grace:130001` (Dragonlord Placidusax) | "In the prehistoric era … Dragonlord Placidusax, the Elden Lord …" (boss page) | empty |
| `grace:410100` (Bonny Gaol) | dungeon/place text | empty |
| `enemy:poison-claw-elder-albinauric` | "Poison is a status effect in *Elden Ring* …" (status page) | empty |
| `enemy:winter-lantern` | "Winter-Lantern Fly is a crafting material …" (item page) | empty |
| `enemy:flying-dragon-small` | "Flying Dragon Agheel is encountered in Agheel Lake …" (Agheel page) | empty |

### Tests (`auditFixes.test.ts`)
- `Task 176 §1` — no description may contain any Nightreign-only term
  (`nightreign.json` titles + Limveld / Shifting Earth / Deep of Night / Everdark);
  plus the six named contaminated records.
- `Task 176 §2` — the exact 171 Batch A item 4 records must not carry the other
  page's prose.

## Before → after numbers

| kind | description before | description after |
|---|---:|---:|
| enemy | 560/613 (91.4%) | 530/613 (86.5%) |
| grace | 273/417 (65.5%) | 17/417 (4.1%) |
| region | 273/295 (92.5%) | 256/295 (86.8%) |
| boss | 271/281 (96.4%) | 269/281 (95.7%) |
| npc / quest | 100% / 85.7% | 100% / 85.7% |

The grace/region/enemy losses are exactly the cross-page prose the audit flagged:
the removed descriptions were another entity's page (Margit's boss lead on the
Margit grace, the Lake of Rot / Nokstella / Ainsel River place leads on their
same-named graces, a spell/item/status lead on same-named enemies). Empty is
honest text; Batch A item 5 (a later task) is where grace/quest coverage is to be
refilled from real sources.

## Checks run (per brief)
- `npx tsc -b` — PASS.
- `npx vitest run src/lib/auditFixes.test.ts src/lib/entityCoverage.test.ts src/lib/entityIndexQuality.test.ts` — PASS (65 passed / 1 skipped; the skip is the pre-existing `data/raw/er-mcp.db` talisman test).
- `npm run index:entities` — PASS, 5,594 records (unchanged from HEAD).
- Extra regression spot-check (index readers): `pageAudit`, `linkIntegrity`, `inferenceAudit`, `inferChains` — PASS.

## ASSUMPTIONS
- "Nightreign text" is detected from the wiki page's own Summary naming the other
  game (plus the `nightreign.json` titles and the Nightreign-only place names),
  because a copied Overview sentence need not name the game.
- A grace is not a "place record" for description purposes: a checkpoint named
  after a boss/dungeon/location must not inherit that thing's prose.
- `src/lib/entityCoverage.ts` and `src/lib/entityIndexQuality.test.ts` are outside
  the brief's named files, but removing the contaminated descriptions drops the
  enemy description+location share to 85.6% (from 91.4%). The enemy floor is
  therefore lowered 90 → 85 in both, with a comment, per the AGENTS rule "if a
  count legitimately changed, update that number only". Region (≥95) and all other
  guards still pass unchanged.
- The brief's `Run only touched tests` was followed; the four spot-check files
  above were the only extras run.

## Not done
- Batch A item 5 (raise grace/quest coverage from real text) — a separate item.
- Generated docs (`docs/ENTITY-COVERAGE.md`, `docs/PAGE-AUDIT.md`) were not
  regenerated/committed; the brief does not ask for it.

## Brief checklist
- [x] 1. Remove Nightreign text (names from `nightreign.json`) from all descriptions; add a test (Task 176 §1)
- [x] 2. Stop cross-page contamination (171 Batch A item 4 examples); add a test with those examples (Task 176 §2)
- [x] Run only touched tests + `npx tsc -b` + `npm run index:entities`; commit; report

ALL ITEMS DONE
