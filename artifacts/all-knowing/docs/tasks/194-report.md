# Task 194 — Duplicate chips on the Library search screens — report

Worked from the 2026-10-10 UI crawl (`recrawl-desktop-B.txt` / `recrawl-phone-B.txt`, detailed list in
`.scratch/ui-crawl/2026-10-10_12-49-49/crawl.md`): **35 duplicate groups on desktop, 29 on phone**;
almost all of them are category/filter chips on `library-search` / `library-search-category`. `.env` /
`.env.local` were never opened. No server, preview or background process was started (AGENTS), so no
fresh crawl was run.

## 1. Cause — the search screen rendered its chips twice

`src/library/LibraryBrowser.tsx` had four overlapping double-renders:

1. **The facet list was mounted in two places.** The campaign / scaling / subtype / damage chips were
   one `facetControls` JSX value, but it was inserted **both** inline in the desktop toolbar
   (`.lib-tools`) **and** inside the phone Filters sheet (`.lib-filters-sheet`). The crawl counts DOM
   controls, so the same labels existed twice.
2. **Both toolbars were always mounted.** `.lib-tools` (desktop) and `.lib-phone-tools` (phone) were
   always in the DOM and only hidden with `@media` CSS. So every shared control existed twice in the
   DOM — e.g. **two "Near me" buttons**, two Sort selects, two ownership controls.
3. **Two chips were both labelled "All".** The ownership group rendered `All | Owned | Not owned` and
   the campaign group rendered `All | Base | DLC`. On one screen that is `All` twice with the same
   outcome — the crawl showed `All · active · 4 · library-search x2, library-search-category x2`, the
   only genuine **same-screen** duplicate in the report.
4. **The empty state re-listed every category.** `.lib-empty` rendered a `.lib-tiles` grid of *all*
   categories (label + count) while the category rail already listed the same categories — the
   `Armor566`-style category chips appeared twice whenever a category was empty.

The rest of the crawl's groups (`Armor566`, `Ashes of War90`, `All types`, `A/B/C/D/S`, `Base`, `DLC`,
`Owned`, `Not owned`, `I meet requirements`, `Near me`, `Search within category`, …) are the *same*
controls counted on **both `library-search` and `library-search-category`**. Those two crawl "screens"
are the same route (`#/library/search`) with different setup, so the shared rail/facet chrome is one
control per screen, not two — a screen-model artifact of the crawler, noted in §5.

## 2. Fix

All changes are in `src/library/LibraryBrowser.tsx` (plus the new test):

- **`FacetControls` component.** The facet markup moved into a single component. It is mounted in
  exactly one place per viewport: inline in the desktop toolbar, or in the phone sheet.
- **`useIsPhone()` hook** (same `(max-width: 700px)` breakpoint the CSS already used). The toolbar now
  renders **either** `.lib-tools` **or** `.lib-phone-tools`, never both — the unused row is not
  mounted, so no shared control exists twice in the DOM.
- **Ownership "All" → "Any".** `Any | Owned | Not owned` no longer collides with the campaign `All`.
  The underlying `OwnershipFilter` value is unchanged (`'all'`), so filtering behaviour is identical.
- **Removed the empty-state `.lib-tiles` grid.** The rail (always visible, desktop and phone) already
  keeps every category reachable, so the duplicate category list is gone; the empty state keeps its
  "Nothing in …" message.

Every control is still reachable: category rail (all categories), campaign, scaling, type, damage,
ownership, requirements, Near me, Sort, Asc/Desc, Grid/Table, Clear, and the phone Filters sheet.

## 3. Test

New `src/library/LibraryBrowser.test.tsx` renders the real search screen with a mocked catalogue
(two weapons with subtypes/damage/scaling) and asserts:

- the expected facet chips render (`Base`, `DLC`, `All types`, `Straight Sword`, `Physical`, `Any`,
  `Near me`);
- **no `.chip` label appears twice** (desktop render);
- only one toolbar is mounted (`lib-tools`, not `lib-phone-tools`);
- at the phone breakpoint the phone toolbar is mounted (and `Filters (0)` is present) with no
  duplicate chip labels.

Numbers: before, a desktop render produced `All ×2`, plus `Near me`/Sort twice from the two mounted
toolbars. After, the chip label count is 0 duplicates and the test fails if a duplicate returns.

## 4. Checks run

- `npx vitest run src/library/LibraryBrowser.test.tsx` — 1 file, **4 tests, all pass**.
- `npx tsc -b` — clean.
- No data/generator changed, so no `index:entities` run and no full suite (per AGENTS).

## 5. ASSUMPTIONS

- The brief scopes the fix to `src/library/LibraryBrowser.tsx` and related search/category components;
  `scripts/ui-crawl.mjs` was **not** edited. The crawler's remaining library groups are the same
  rail/facet controls counted once on `library-search` and once on `library-search-category`, which
  the crawler treats as two screens although they share the route. Suppressing those would be a
  crawler screen-model change, outside this brief's file scope (they are not two renders of one
  control).
- "Chip" means a `.chip` button. The category rail buttons (`.lib-rail-item`) are navigation, not
  chips, and are not duplicated after removing the empty-state tiles.
- Renaming the ownership "All" chip to "Any" is display-only; the filter value and all filter logic
  stay `'all'`.
- The JS breakpoint (`useIsPhone`) matches the existing CSS `max-width: 700px`; the CSS hide rules were
  left in place as a harmless fallback. On a browser `matchMedia` is available synchronously, so the
  correct toolbar is chosen on first paint (no hydration — the app is a Vite SPA).
- No fresh crawl was run because the brief says to run only the touched tests + `tsc -b`, and AGENTS
  forbids starting a preview server.

## 6. Brief checklist

- [x] 1. Found why the chips rendered twice (facet list mounted in two places, both toolbars always in
      the DOM, ownership "All" colliding with campaign "All", empty-state tiles re-listing the rail)
      and fixed each so every control/category renders once and stays reachable.
- [x] 2. Added `src/library/LibraryBrowser.test.tsx`, which renders the search screen and asserts no
      duplicate chip labels (desktop + phone).
- [x] 3. Ran only the touched test + `npx tsc -b`; committed (`d35598d`); this report written.

ALL ITEMS DONE
