# Task 191 — 186 review, Batch E — report

Batch E (performance) of the `docs/tasks/186-report.md` FIX LIST: items 16 and 17. Branch `task-191`.
Owned files only: `src/lib/entityEnrich.ts`, `src/App.tsx` (index loading only), `src/lib/pwa.ts`,
plus the tests that cover them. `.env` / `.env.local` were never opened; no server, preview or
background process was started.

---

## Item 16 — `entity-index.json` (4.4 MB) now loads lazily from the screen that needs it

**Before:** `App.tsx` called `ensureEntityIndex()` in a mount effect (`useEffect(() => { ensureEntityIndex() }, [])`),
so every session fetched `/sourced/entity-index.json` before the user asked for anything.

**After:** that mount effect is gone. The index is fetched on first actual need:

- `src/App.tsx` warms it when the active section is record-backed (Journey, Library, Gideon, or
  Tarnished › Gear), when the Tarnished overview is showing a non-empty character (its item-progress
  meter needs the full item universe), or when the command palette opens (`searchOpen`).
- Every card that reads a record still triggers the same one fetch through `useEnrichment`
  (`EntityActions`, `BossFacts`, `EntityPanel`, `LibraryBrowser`, `PeekCard`), `useLibraryCatalog`,
  the Area picker (`AreaChip`), the PS5 scanner and Gideon's grounded answers, all unchanged.
- A **first-run (empty) character** on the default Tarnished overview touches none of those, so a
  cold first load no longer downloads the 4.4 MB file at all.

New predicate `shouldLoadEntityIndex(section, sub)` in `entityEnrich.ts` centralises "which screens
warm the index" and is unit-tested. The `clearEntityIndex` test seam now also resets the in-flight
loader so a test (or a future caller) can drop the cache and refetch.

**Measured first-load (fresh `vite build`, before = pre-change source, after = this change):**

| metric | before | after |
|---|---:|---:|
| emitted JS (all chunks) | 3,519,478 B / 77 chunks | 3,519,713 B / 77 chunks |
| bundle budget (3.5 MiB) | pass (95.9%) | pass (95.9%) |
| install precache entries | 134 | **133** |
| install precache raw payload | 15,420,660 B (14.71 MiB) | **14,005,187 B (13.36 MiB)** |
| `sourced/aliases.json` at install | 1,415,708 B | 0 B |

The only network change on a cold first load is that the 4.4 MB index is no longer requested during
startup; JS is unchanged (±235 B, within the 3.5 MiB budget).

## Item 17 — the 1.4 MB alias plane is no longer precached at install

`public/sourced/aliases.json` is 1,415,708 B / 7,226 rows, not "small". It was removed from
`PRECACHE_DATA` (`src/lib/pwa.ts`), which feeds `includeAssets`, so the service worker no longer
downloads it during install (precache 134 → 133 entries; raw payload −1.42 MB, above). It is still
available offline: the existing `/sourced/**` **CacheFirst** runtime rule caches it on first use, and
`src/lib/aliases.ts` fetches it lazily at first alias lookup. The stale "small … (aliases …)" comments
were corrected. `pwa.test.ts` now asserts aliases is *not* in `includeAssets` and *is* served
CacheFirst from `SOURCED_OFFLINE_CACHE`.

## Tests

- New `src/lib/entityEnrich.test.ts` (8 tests): loader is lazy (no fetch until asked), idempotent
  (`ensureEntityIndex` twice → one fetch), settles empty on failure, refetches after the clear seam,
  and `shouldLoadEntityIndex` warms the right screens while skipping the Tarnished
  overview/setup/profiles. A source guard also fails if `App.tsx` regains a mount-only
  `ensureEntityIndex()`.
- `src/lib/pwa.test.ts`: precache list updated + a negative assertion for the alias plane.

## Final checks (once, at the end)

| gate | result |
|---|---|
| `npx tsc -b` | PASS (exit 0) |
| `npx vitest run` | PASS — **222 files, 1594 passed, 8 skipped, 0 failed** (186 was 221/1583/11; +1 file = this task, +3 previously-skipped `bundleBudget` dist checks now ran on a fresh `dist/`, +8 new tests) |
| `npm run lint` | PASS (exit 0, warnings only) |
| `npm run build` | PASS |
| `npm run test:bundle` | PASS — build + **7 passed** |
| `npm run audit:pages` | PASS — 5599 entities, 9 flagged (first attempt hit a transient Vite SSR transport timeout; rerun clean) |
| `npm run audit:links` | PASS — dead data 0, dead renderer 0, guard violations 0 |
| `npm run index:entities` | NOT RUN — see assumptions |

## ASSUMPTIONS

1. "the screen that first needs it" is implemented by moving the trigger out of the app shell mount
   into a screen predicate plus the existing consuming hooks, not by idle/`requestIdleCallback`
   prefetching (which would still be "on mount").
2. The Tarnished overview with a **non-empty** character still warms the index, because its
   "Items found" completion meter derives its denominator from the full index (`itemCatalogueIds`);
   skipping it would print a wrong 100% until some other screen loaded the index. Only a first-run
   **empty** character skips the download, which is the cold/slow first-load case the audit measured.
3. `shouldLoadEntityIndex` takes plain `section`/`sub` strings (not the `Section`/`Sub` types) to keep
   `entityEnrich.ts` free of an import cycle, and lives there (an owned file) so it is unit-testable.
4. Item 17 took the "stop precaching" option, not "split the table": no smaller shell-needed subset of
   the alias plane exists (`aliases.ts` builds one name→slug index from the whole file), and the
   runtime `CacheFirst` rule already covers offline use.
5. `clearEntityIndex` is now a wrapper in `entityEnrich.ts` that resets the in-flight loader; no
   production caller imported it from there (tests import it from `entityIndex`), so this is additive.
6. `npm run index:entities` was deliberately not run: no generator or source data changed, and it
   would rewrite only the `generatedAt` timestamp, producing a spurious 4.4 MB diff.
7. `audit:pages` and `audit:links` regenerated `docs/PAGE-AUDIT.md` and `docs/LINKS-AUDIT.md`; both
   were reverted so the only committed changes are the Batch E code, tests and this report.

## Item checklist

- [x] 16. Load `entity-index.json` lazily from the screen that first needs it instead of on app mount.
- [x] 17. Stop precaching the 1.4 MB `aliases.json` at install and fix the stale "small" comment.
- [x] Tests for each item (`entityEnrich.test.ts`, `pwa.test.ts`).
- [x] Bundle budget still passes; first-load measured before/after.
- [x] Full gates run once at the end (`tsc`, `vitest`, `lint`, `build`, `test:bundle`, `audit:pages`, `audit:links`).

ALL ITEMS DONE
