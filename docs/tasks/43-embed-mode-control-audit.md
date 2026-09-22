# Task 43 — Audit the map engine for more sidebar-only controls hidden in embed mode

## Context

Repo root is `artifacts/all-knowing/`. Read `vendor/elden-ring-map/web/index.html`,
`web/js/app.js`, and `web/css/app.css` first, plus the two most recent commits touching this
vendor directory (`git log --oneline -- vendor/elden-ring-map` — look for "world-switcher" and
"category filters" fixes) to see the established pattern for this exact class of bug.

Twice this session, a real control turned out to exist and work correctly, but be **unreachable**
because it lived inside `#sidebar`, which `#app.embed #sidebar { display: none; }` hides entirely
whenever the map is embedded (`?embed=1` — the mode All-Knowing's Atlas room always uses):

1. The master/world switcher (M00/M01/M10/M11 — Lands Between/Underground/Shadow/Shadow
   Underground) — fixed by adding a floating `#embed-layer-buttons` copy.
2. The category filter checkboxes (~50 marker-type toggles) — fixed by adding a collapsed-by-
   default floating `#embed-categories` panel.

Both fixes followed the same shape: generalize the JS function that populates the sidebar element
by id (`$('some-id')`) to instead populate every element sharing a class
(`document.querySelectorAll('.some-class')`), add a matching floating copy of the HTML element
with that class, and gate its visibility to `#app.embed` only. This task is a systematic pass to
find and fix every *remaining* instance of this same bug, not just react to the next one the user
happens to notice.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp`/
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Read through every `<section>` inside `#sidebar` in `index.html` and every function in `app.js`
that populates or wires an element by a sidebar-scoped id, and determine for each one: is this
control meaningfully usable on the embedded map without it? If not, apply the same floating-copy
pattern already established for the world-switcher and category filters.

## Requirements

Go through the sidebar's sections one at a time and make a real judgment call for each, not a
blanket "fix everything":
- **Character panel** (`#character`) — shows save-bound stats/progress. Likely fine to stay
  sidebar-only (All-Knowing's own shell already shows character info outside the iframe) — verify
  this assumption against what's actually in the panel before deciding, don't just assume.
- **Progress bar** (`#progress`) — same consideration as above.
- **Search** (`#search` / `#search-results`) — likely genuinely useful and currently unreachable
  in embed mode. If so, apply the floating-copy pattern.
- **Options** (`hide-found`, `show-labels`, `show-icons` checkboxes) — check if these meaningfully
  affect the embedded view; if so, they're in the same boat as the category filters.
- **Save picker** (`#save-extension`, `#save-character`) — check whether this is relevant in
  All-Knowing's embed context (the outer app has its own save-handling UI) before deciding whether
  it needs a floating copy or is legitimately sidebar-only/redundant here.
- Zoom controls, popup, tooltip — already outside the sidebar, not in scope.

For each control you decide needs a floating embed-mode copy, follow the exact established
pattern (shared class, `querySelectorAll`, `#app.embed` visibility gate, collapsed-by-default if
the panel is large). For each you decide is fine to leave sidebar-only, write a one-line comment
in the code explaining why (so the next person doesn't have to re-derive the same judgment call).

## Explicit exclusions

- Don't touch the All-Knowing React app itself (`artifacts/all-knowing/src/`) — this task is
  entirely inside `vendor/elden-ring-map/web/`.
- Don't redesign the sidebar's non-embed (desktop, non-iframe) experience — it already works.

## Acceptance criteria

- For every sidebar control, report your judgment (needs a floating copy / doesn't / already
  fine) and why.
- For each control you fix, verify end-to-end in-browser the same way the two prior fixes were
  verified (real DOM checks against `iframe.contentDocument`, not just "should work").
- No automated test suite exists for this vendor JS — verification is manual/in-browser, described
  clearly in your report.
