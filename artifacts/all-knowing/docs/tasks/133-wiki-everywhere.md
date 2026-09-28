# Task 133 — Use the whole wiki everywhere (read it, search it, Gideon answers from it)

Task 132 folds the wiki DB (`data/raw/er-mcp.db`: 4,939 pages, 21,885 sections, full-text index) into entity
records as summaries. The full text is still not readable or searchable in the app. Make every word usable.
Read `docs/DATA-CATALOG.md` first.

## 0. Clean-up left from Task 132 (do first, commit)
Spot checks of `public/sourced/entity-index.json` found clutter:
- **Duplicate quest steps**: every NPC quest appears twice from two sources (e.g. "Sellen — Lusat found" AND
  "Sorceress Sellen — step 5"). Merge per NPC into one ordered step list (prefer the authored `storylines.ts`
  beats, attach the wiki step text/location to the matching beat, keep unmatched wiki steps in order).
- **Upgrade levels as separate items**: "Kindred of Rot Ashes +1 … +10" (and any weapon/ash "+N" rows) are listed
  as separate items. Fold into the base entity (upgrade table as a field).
- **Duplicate enemy rows**: e.g. two identical "Kindred of Rot (Boss)" enemies; dedupe by name + locations +
  NpcParam id; enemy rows that are a boss encounter merge into the boss.
- **Wiki markup in text**: 217 descriptions contain `**bold**` / wiki markup, 12 mention "Elden Ring Nightreign"
  (wiki boilerplate from the other game). Strip markup to plain text (or render it properly everywhere) and drop
  Nightreign-only sentences.
Guards: no two primary records of the same kind share a normalised name + location; no `**` in descriptions;
no "Nightreign" in player text.

## 1. Build-time wiki corpus
`scripts/export-wiki-db.py` (stdlib only) → `public/sourced/wiki/`:
- `pages/<chunk>.json`: every page → { id, title, entityId (canonical, via the alias plane), kind, url, sections:
  [{ heading, markdown }] } — markdown cleaned of wiki templates/refs into readable text with links to other pages
  converted to `[[entityId|label]]` markers (so they render as EntityLinks).
- `search-index.json` (+ chunks if > 3 MB): a prebuilt lightweight inverted index (title/heading/body terms →
  section ids, with BM25-ish weights) for client-side full-text search. No new npm deps; write a small index
  builder + query function in `src/lib/wikiSearch.ts` (tokenise, stem-lite, phrase boost, title boost).
- Loaded lazily and cached by the service worker.

## 2. Read it — entity pages
Every entity page gets a **Wiki** tab: the full page as collapsible sections (Location, Strategy, Drops, Notes,
Lore/Description, Trivia, Dialogue…), cross-links as EntityLinks, source link to the wiki page. Pages that have no
entity (lore pages, mechanics, factions, concepts) are viewable too via `openEntity('wiki:<slug>')`.

## 3. Search it — omnibox + Library
The header omnibox and Library › Search add a **Wiki** result group from full-text search (section hits with a
highlighted snippet, e.g. searching "frenzy flame proscription" or "how to get to Mohgwyn" finds the right
section). Library › Guides gets a "Search the wiki" box and browse-by-category (factions, lore, mechanics,
locations…).

## 4. Gideon answers from it
- Deterministic router: for how/where/why/what questions with no specific intent match, answer from the top wiki
  section hits (quote ≤ 2 short excerpts, cite the page, EntityLinks) instead of "I don't know".
- LLM path: add a `wiki_search(query)` tool returning top sections (id, page, heading, excerpt ≤ 600 chars,
  entity ids) and `wiki_page(id)`; update the system prompt to ground answers in them and cite pages.
- Eval fixtures: 20 questions answered from wiki content (e.g. "how do I get to Mohgwyn Palace", "what does the
  Frenzied Flame do", "who is Melina", "how do I start Ranni's quest", "what does Scadutree blessing do", "where
  is the Abyssal Woods") must return a relevant section.

## 5. Guards + perf
Tests for the corpus (every entity with a wiki page links to it), search relevance on the eval set, and bundle
budget (wiki data never in the main JS chunk; first load unaffected). `npm run audit:ui` zero issues (dev server
on :5173 running; don't start/stop it).

NEVER read .env files. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; commit after each section.
- **Audit leftover**: at 430px wide, the Library › Builds "Level-up calculator" section heading is reported covered (likely the quick-log + button mid-animation). Fix so the audit is zero at all 9 viewports.
