# Task 181 — Replace outbound wiki links with the content we already have (180 Batch D) — report

Removed the 8 outbound wiki/guide hrefs named in `docs/tasks/180-report.md` §4a rows 1–6 from the
four owned components and rendered the stored prose in-app instead. Community resources (#7) and
Gideon citations (#8) are untouched. `.env` / `.env.local` were never opened.

On-disk corpora used: `open/bosses-fextralife.json` (163 bosses / 1,329 sections),
`open/guides-fextralife.json` (27 pages / 376 sections), `open/builds-fextralife.json`
(23 pages / 218 sections). No game text was invented; everything rendered comes from those files.

## What changed

| # | before | after |
|---|---|---|
| 1 | `BossFacts.tsx:304` strategy block showed one 260-char excerpt + `<a href={fext.url}>Full fight guide</a>` | strategy block keeps the excerpt, then a collapsible `<details>` renders **all** stored `bosses-fextralife` sections (`WikiText`). Link removed. |
| 2 | `PackData.tsx:238` `<a href={g.url}>Open full guide</a>` | collapsible `<details>Open full guide</details>` renders the full stored excerpt text (`g.text`) when longer than the 600-char preview. Link removed. |
| 2b | `PackData.tsx:279` GuidesFor chips were `<a href={g.url}>` | each hit is a `<details>` with heading + page, expanding the stored excerpt text. Link removed. |
| 3 | `WikiTab.tsx:43` "Open on the wiki ↗" chip to `page.url` | chip removed; the tab already renders `page.sections` in collapsible blocks. |
| 4 | `Build.tsx:192` `<a href={p.url}>{p.title}</a>` + headings only | `MetaBuildsCard` renders every stored page title + all its section headings **and bodies** in collapsibles. `metaPageViews` no longer imported (the pure helper still exported and tested). Link removed. |
| 5 | `Build.tsx:289/294/299/304` four hard-coded Fextralife links (PvP_Builds, PvP, Poise, Patch+Notes) | new `StoredSources` looks up the stored `builds`/`guides` page by title and renders its body in a collapsible. Two topics exist on disk: **PvP Builds** → `builds-fextralife` "PvP Builds"; **PvP rules & status scaling** → `builds-fextralife` "Status Effects". Two do not: **Poise breakpoints** and **Patch notes (1.17)** — see "Dropped" below. |

Test `src/GuidesFor.guard.test.ts` item updated: it asserted `href={g.url}` (Task 165 §10); the
brief changes that behaviour, so it now asserts `not.toContain('href={g.url}')`, that `Open full
guide` is present, and that the stored text is rendered (`<WikiText text={g.text}`). New
`src/noWikiLinks.guard.test.ts` scans the four components and fails if any of them names
`fextralife.com` / `fandom.com` / `wiki.gg`, or binds an `href` to a stored `.url`.

## Dropped topics (§5, no on-disk page)

- **Poise breakpoints** — no "Poise" page or section exists in `guides-fextralife` /
  `builds-fextralife` (the term only appears inside other pages' prose, and there is no
  breakpoint section). The app already carries authored poise-breakpoint content
  (`src/knowledge/tech.ts` `tech:poise-breakpoints`, rendered in "Tech & cheese" on the same page)
  and `mechanic:poise` in `src/knowledge/mechanics.ts`, so the outbound link was redundant anyway.
- **Patch notes (1.17)** — not on disk in any sourced file. Dropped.

Both drops are why the PvP Sources block now shows two `<details>` (PvP Builds, Status scaling)
instead of a four-item link list.

## Data fields left as-is

The stored rows still carry their `url` fields (`bosses-fextralife` 163, `guides-fextralife` 27,
`builds-fextralife` 23, etc.). The brief scopes the change to rendering, so the dormant URL values
(180-report §4b) were not removed; they are now simply not surfaced as links by these components.

## Checks run

- `npx tsc -b` — clean.
- `npx vitest run` on the touched/consumer files — all pass:
  `src/GuidesFor.guard.test.ts`, `src/noWikiLinks.guard.test.ts`, `src/WikiMarkdown.test.tsx`,
  `src/Build.kits.test.tsx`, `src/library/BossFacts.order.test.ts`, `src/library/BossFacts.test.ts`,
  `src/lib/guides.test.ts`, `src/lib/metaBuilds.test.ts` (8 files / 38 tests), plus
  `src/Atlas.test.tsx`, `src/Atlas.engineSelection.test.tsx`, `src/Atlas.focus.test.tsx`,
  `src/Codex.is.search.test.ts` (4 files / 13 tests) because `GuidesFor` is mounted by Atlas/Codex.
- `Select-String` over the four components for `href`, `fextralife.com`, `fandom.com`, `wiki.gg`,
  `.url` — no matches remain.
- Source scan of all UI render sites now shows no wiki href in `BossFacts.tsx`, `PackData.tsx`,
  `WikiTab.tsx`, `Build.tsx`.

Full gates (`npm run index:entities`, full `vitest`, `lint`, `build`, `test:bundle`, page/link
audits) were not run: the brief does not ask for them and no data/generator changed.

## ASSUMPTIONS

- "Stored sections in the strategy area" = render **all** `bosses-fextralife.sections` for the boss,
  keeping the existing one-line excerpt above them (avoids dropping the glance the order test and
  the previous design relied on).
- Item 2's "Open full guide" is kept only when the stored text is longer than the 600-char preview;
  shorter excerpts are already fully shown, so a duplicate collapsible would add nothing.
- For §5 I matched topics to stored pages by title (`PvP Builds`, `Status Effects`) rather than
  trying to reconstruct the exact Fextralife `/PvP` and `/Poise` pages, which are not on disk.
- "Status scaling" maps to the stored `builds-fextralife` "Status Effects" page as the closest
  on-disk content; the exact `/PvP` rules page is not on disk.
- Plain-text source credit ("Source: Fextralife (scraped offline)") is kept per the brief.

## Not done / not changed

- No change to `src/library/Guides.tsx` community resources (#7) or `src/GideonAnswer.tsx` (#8).
- `src/lib/guides.test.ts` still asserts every excerpt keeps a real `url`; that is a **data**
  guarantee (the field is retained) and still passes, so it was left untouched.
- No new app-side data files or generators were added or regenerated.

## Brief checklist

- [x] 1. Boss "Full fight guide" → stored `bosses-fextralife` sections rendered collapsibly in the strategy area, no outbound link
- [x] 2. Guides "Open full guide" + GuidesFor chips → stored `guides-fextralife` text opened in-app
- [x] 3. Wiki chip removed; the tab still renders the sections
- [x] 4. Meta-build link → stored `builds-fextralife` headings/body rendered
- [x] 5. The 4 hard-coded PvP/mechanics links replaced by stored guides/builds content (PvP Builds, Status scaling); Poise breakpoints and Patch notes not on disk, dropped and reported
- [x] 6. Community resources (#7) and Gideon citations (#8) kept; plain-text source credit used
- [x] 7. Test: no `href` to fextralife/fandom/wiki domains in these components (new `noWikiLinks.guard.test.ts` + updated `GuidesFor.guard.test.ts`)

ALL ITEMS DONE
