# Task 198 — Visual bugs: invisible active tab text, truncated wordmark

Branch `task-198`. Scope per the brief: the shell/tab styles in `src/index.css`
(the `.subtabs` / section-tab / header rules only), `src/shell/Header.tsx` and
tests. Tasks 196/197 own Library/Builds files and were not touched.

## 1. Active section / sub-tab text was invisible

**Root cause.** The active-tab rules live in *two* stylesheets that both target
the same selectors: `src/index.css` (imported first) and `src/ui/ui.css`
(imported second, "so these rules win by source order"). The cascade resolves
per property, so even when `ui.css` is later, `index.css`'s `.subtabs
button.active { color: var(--gold) }` still painted the text **gold** while
`ui.css` supplied `background: var(--gold)` — gold on gold. (`index.css` never
declared a background for `.subtabs`, so `ui.css`'s gold fill survived.) Both
examples in the brief are `.subtabs` (Library › Builds, Builds › Your build).

**Fix** — `src/index.css`, the two active rules now declare *both* properties in
the readable "dark text on gold" pairing, matching `ui.css`:

```css
.section-tabs button.active { color: var(--bg-raised); border-color: var(--gold); background: var(--gold); }
.subtabs button.active      { color: var(--bg-raised); border-color: var(--gold); background: var(--gold); }
```

`var(--bg-raised)` = `#14110c` on `var(--gold)` = `#c9a227`. Whichever file wins
the cascade, the pair is identical, so the label is legible.

**Every tab bar checked:**

| Tab bar | Selector / style | Result |
| --- | --- | --- |
| Sections (header) | `.section-tabs button.active` | fixed (dark on gold) |
| Section sub-views | `.subtabs button.active` | fixed (dark on gold) |
| Builds views (Build.tsx) | `.subtabs builds-tabs button.active` | fixed (same selector) |
| `Segmented` (ui/index.tsx) | `.subtabs button.active` | fixed (same selector) |
| Phone bottom tabs | `.tabbar button.active` | gold text on transparent gradient — already readable |
| Library entity panel | `.lib-panel-tabs button` → `.chip on` | gold text on `rgba(201,162,39,.1)` — already readable |
| Setup dots | `.setup-dot` | dot fill, no text — n/a |

## 2. "ALL-KNOWING" wordmark was cut off ("ALL-KNOWI")

**Root cause.** This is a **source-asset** bug, not a box-crop: `wordmark.webp`
is 800×200 (4:1) and `.brand-mark` was 144×36 / 108×27 (also 4:1) with
`background-size: contain`, so nothing was being cropped by CSS *or* could be.
The committed image itself ends mid-word: its opaque bounding box touches the
right edge. Task 193's own report (§ ASSUMPTIONS 2) already recorded "wordmark
is truncated at the source … the final 'NG' run off the 2000×500 canvas", and
noted a corrected wordmark could just replace the file.

**Fix.**
- Regenerated `public/brand/wordmark.webp` (800×200, transparent) reading
  **"ALL-KNOWING"** in the app's own display face, Cinzel, in the brand antique
  gold (`#c9a227`) with an engraved edge treatment. Rendered from the repo's
  self-hosted `public/fonts/cinzel-normal-latin.woff2`; no invented artwork and
  no new external asset. Ink bounding box has even ~27/29px side margins, so the
  full word is present at every size. 46,536 B → 27,734 B.
- `src/index.css` `.brand-mark` now keeps the slot ratio instead of a fixed
  `height`, so the mark scales to the available width and cannot distort:
  ```css
  .brand-mark { flex: none; width: 144px; aspect-ratio: 4 / 1; max-width: 100%; … background: … / contain no-repeat; }
  ```
  Phone override `width: 108px` (height now derived from the 4:1 ratio).

At 390px the slot is 108×27 and at 1280px 144×36; with the complete 4:1 asset
inside a 4:1 box, the whole word renders at both widths.

## 3. Guard test

`src/shell/activeTabs.guard.test.ts` parses `index.css` and `ui/ui.css`, resolves
`var()`s, and computes the *effective* `color` / `background` for
`.section-tabs button.active` and `.subtabs button.active` under **both** possible
stylesheet orders. Each must be defined and differ. On the old CSS the
`.subtabs` case fails for the `ui.css → index.css` order (gold on gold); with the
fix both orders pass.

## Checks run

- `npx tsc -b` → 0 errors.
- `npx vitest run src/shell/activeTabs.guard.test.ts` → 2 passed.
- `npx vitest run src/shell/Header.guard.test.ts src/lib/brandArt.test.ts` →
  7 passed (brand-file existence still holds).
- `npx vitest run src/App.shell.guards.test.ts src/App.shell.guard.test.ts
  src/shell/activeTabs.guard.test.ts` → 12 passed.

Per AGENTS.md the full suite / lint / build / audits were not run (the
supervisor runs the gates once).

## ASSUMPTIONS

1. **The wordmark asset, not the CSS box, was the truncation.** The committed
   800×200 image already reads "ALL-KNOWI"; a 4:1 `contain` box cannot crop it.
   Scaling alone therefore could not reveal the missing letters, so I replaced
   the image (which Task 193 explicitly said could be replaced) with a complete
   one rendered from the repo's Cinzel webfont.
2. **Regenerating brand art is in scope.** The brand files are not in AGENTS.md's
   "never hand-edit generated files" list, and Task 193 anticipated replacement.
   No external/network art was used; the typeface and the name are already files
   on disk.
3. **"Dark text on gold" chosen** over "gold text with underline" because
   `ui.css` already intended a filled gold pill with dark text; matching it keeps
   the two stylesheets consistent regardless of order.
4. **`aspect-ratio` instead of a fixed `height`** so the 4:1 ratio is explicit and
   the mark scales to whatever width the header gives it; the visual size at
   390/1280 is unchanged from before (108×27 / 144×36).
5. **`docs/tasks/198-ui.md` left untracked** — it is the task brief supplied by
   the supervisor, not part of the change.

## Not done / notes

- Nothing from the brief was skipped. `src/shell/Header.tsx` needed no markup
  change; the brand slot already renders the wordmark via `.brand-mark` and the
  fix was CSS + asset.

## Checklist

- [x] 1. Active section and sub-tab labels readable (dark on gold) across every tab bar
- [x] 2. "ALL-KNOWING" wordmark complete and scaled to the available width at 390px and 1280px
- [x] 3. Test/guard: active tab text colour ≠ its background colour

ALL ITEMS DONE
