# Task 190 — 186 review, Batch D (+ Batch G item 20) — report

Branch `task-190`. Scope taken from `docs/tasks/186-report.md` FIX LIST: **Batch D items 13 & 15**
(item 14 skipped — `STATUS.md` is Claude's) plus **Batch G item 20** (owner-approved Gideon change).
`.env` / `.env.local` were never opened. No dev server / preview / background process was started
(the `index:entities` script uses Vite's in-process SSR, no port). Only the brief, my source/test
edits and this report are committed.

---

## What changed

### Item 13 — help strings name the real Library tabs (`src/lib/shortcuts.ts`)
The in-app help ("Shortcuts & help" sheet, driven by `SHORTCUT_GROUPS`) still named the removed
`kit` view and the legacy `Codex` / `Kits` labels.

- `3 · Library` note: `search / builds / kit` → **`search / builds / pvp / guides`** (the four real
  Library sub-views from `src/lib/sections.ts`).
- Deleted the redundant `{ keys: 'Codex', … }` row (the removed `#/library/search` "Codex" surface)
  and renamed `{ keys: 'Kits', … }` → **`{ keys: 'Builds', … }`** (same real text, real tab).
- The Help body already said `Library (search / builds / PvP / guides)`; only the shortcut rows were stale.

New tests in `src/lib/shortcuts.test.ts`: the Library note must equal the `SECTIONS` library sub-labels
exactly, and no row may contain `codex` / `kit` / `kits`.

### Item 15 — one `Show arena on map` on a boss page (`src/library/BossFacts.tsx`)
The action was rendered twice: an inline chip in `BossFacts`'s "Where to reach it" block **and** the
`EntityPanel` footer. Removed the inline copy (and the now-dead `onShowOnMap` prop); the footer button
is the single copy.

- `src/library/BossFacts.tsx`: dropped the inline `<button>Show arena on map</button>` block and the
  `onShowOnMap` prop/type entry (it was only ever passed by `EntityPanel`).
- `src/library/EntityPanel.tsx`: dropped the one `onShowOnMap={onShowOnMap}` pass-through to lazy
  `BossFacts`. This one line is outside the three owned files but is the direct, required consequence of
  removing the prop; footer buttons are untouched.
- `src/library/EntityPanel.test.tsx` needed no change: it asserts the boss panel *contains*
  `Show arena on map`, which it still does via the footer.

New source-guard test in `src/library/BossFacts.order.test.ts`: `BossFacts.tsx` must never contain
`Show arena on map` again.

### Item 20 — Gideon `Clear` disabled on an empty chat (`src/Gideon.tsx`)
The last dead control in the 186 crawl (`.scratch/crawl/2026-10-10_12-49-49.md`). On a chat that only
holds the opening greeting there is nothing to clear, so the chip is now disabled.

- `disabled={log.length <= 1}` added to the `Clear` chip (kept the same markup/class/title so the
  footer/row layout is unchanged).

New test in `src/shell/coverage.test.tsx` (row 12b): the rendered Gideon has a `disabled` `Clear`
button while the chat is empty.

---

## Final check results (run once, at the end)

| gate | result |
|---|---|
| `npx tsc -b` | PASS (exit 0) — also run after each edit |
| `npx vitest run` | PASS — **221 files, 1587 passed, 11 skipped, 0 failed** (was 1583 passed in 186; +4 = my new tests) |
| `npm run lint` | PASS (exit 0) — **0 errors / 46 warnings** (same 46 pre-existing warnings as 186) |
| `npm run build` (via `test:bundle`) | PASS — 77 JS + 7 CSS chunks, PWA precache, engine 76 files / 2.5 MB |
| `npm run test:bundle` | PASS — **7 passed** |
| `npm run audit:pages` | PASS — **5599 entities, 9 flagged** |
| `npm run audit:links` | PASS — **dead data 0, dead renderer 0, guard violations 0** |
| `npm run index:entities` | PASS (exit 0) — 5595 records; regenerated `entity-index.json` is **byte-identical to the committed one except `generatedAt`** |

Touched tests run while working: `src/lib/shortcuts.test.ts`, `src/library/BossFacts.order.test.ts`,
`src/shell/coverage.test.tsx`, plus `src/Help.test.tsx`, `src/library/EntityPanel.test.tsx`,
`src/library/BossFacts.test.ts`, `src/GuidesFor.guard.test.ts`, `src/noWikiLinks.guard.test.ts` — all
pass.

Generated files written by the audit runs (`docs/PAGE-AUDIT.md`, `docs/LINKS-AUDIT.md`) and by
`index:entities` (`public/sourced/entity-index.json`, timestamp-only) were **reverted** so the branch
carries only my intended changes.

---

## ASSUMPTIONS

- **Item 14 skipped as instructed** ("STATUS.md is Claude's"); `docs/STATUS.md` was not touched.
- Help wording: I read "drop the kit/Codex/Kits legacy wording" as *replace with the real tab names*,
  so I renamed `Kits` → `Builds` and deleted the redundant `Codex` row rather than invent a new label
  for it (its content — a search hit opening a page — is already covered by the `Search` row).
- **`src/library/EntityPanel.tsx` was edited by one line** even though only `BossFacts.tsx` was listed
  as owned: deleting the duplicate required removing the now-unused `onShowOnMap` prop, and leaving the
  pass-through would have been a dead prop (and a `tsc` unused-variable failure). No other `EntityPanel`
  logic was touched; the footer `Show arena on map` remains.
- The "empty chat" test is defined as `log.length <= 1` (only the opening greeting), which is exactly
  the crawl's "Clear on the initial, untouched conversation" case.
- I ran `npm run index:entities` per the full-gates list; because it rewrote only `generatedAt` I
  reverted the file, matching how 186 handled generated output.

## Not done / notes

- Batch D item 14 (STATUS.md) — skipped by the brief.
- Batches A, B, C, E, F and item 20's neighbours are other tasks' batches; untouched.
- `docs/tasks/190-fix.md` (the brief) is untracked in this worktree; I committed it with the source
  edits so the branch is self-contained.

## Checklist

- [x] 13. `shortcuts.ts` Library note names real tabs; `kit` / `Codex` / `Kits` words gone; tested.
- [x] 15. Duplicate `Show arena on map` removed from `BossFacts.tsx`; footer copy is the only one; tested.
- [x] 20. Gideon `Clear` disabled on an empty chat; touched test added.
      (Batch D item 14 — `docs/STATUS.md` — is out of scope per the brief: "STATUS.md is Claude's".)
- [x] Touched tests + `npx tsc -b` while working; full gates once at the end.
- [x] Report written with before/after examples, gate results and ASSUMPTIONS.

ALL ITEMS DONE
