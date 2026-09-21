# Task briefs for DeepSeek

**2026-09-22 — superseded.** The from-scratch scaffold plan (`_archived-scratch-plan/`) is dead;
the user already had a much further-along real implementation, "All-Knowing," which now lives at
`artifacts/all-knowing/`. That repo's own `HANDOFF-CLAUDE.md`, `HANDOFF.md`, `ARCHITECTURE.md`,
and `DATA.md` are the live source of truth — read those, not the archived plan here, and not the
top-level `PROJECT_BRIEF.md`'s old MVP task list (still useful for the AI-companion Phase 2/3
spec and the licensing policy, not for sequencing).

Task briefs from here on are cut from `artifacts/all-knowing/HANDOFF-CLAUDE.md`'s own "§6 Gaps
and TODOs (ordered)" list, which is already prioritized P0 → P3. Don't reinvent sequencing —
follow that list.

## How to run one

```bash
deepseek-agent run \
  --model deepseek-flash-4.1 \
  --workdir "C:\Users\RIGGUSPIG\Desktop\ER MASTER TOOL\artifacts\all-knowing" \
  --prompt-file "../../docs/tasks/06-p0-hardening.md"
```

Adapt to your actual CLI invocation — the point is: workdir is `artifacts/all-knowing` (the real
repo root), not the outer `ER MASTER TOOL` folder.

## Status

- Claude already fixed two real bugs found during review, before any task ran: a crash in
  `WorldRibbon` (`worldState.ts` calling the 2-arg `st()` helper with 1 arg — should've been the
  local `q()` wrapper) and a TS role-widening error in `Gideon.tsx`'s chat log setters. Both
  confirmed fixed: app boots clean in-browser, `npx tsc -b` now only reports harmless unused-var
  warnings.
- `06-p0-hardening.md` — ready to run. Covers HANDOFF-CLAUDE.md's P0 items 1, 3, 4, 5 (alias
  table, tests, CI typecheck, honest empty states). P0 item 2 (split `App.tsx`) is pulled into
  its own task (`07-split-app.md`) since it touches nearly every room and is easy to conflict
  with item 1 if run in the same pass — run 06 first, review, then 07.
- `08-nexus-data-ingestion.md` — ready to run, independent of 06/07 (touches `src/knowledge/`
  data files and `public/sourced/pack-icons/`, not the room UI or kernel) — can run in parallel
  with 06/07 if you want, or sequentially, your call.
- `09-atlas-engine-and-plates.md` — ready to run, independent of the others. Two unrelated
  halves in one file (clone in the vendor map engine; upgrade the static fallback plate images
  from the Nexus 960 pack) — **corrects an earlier framing mistake**: this is not "build a
  tiling pipeline," the real tile/zoom map is already a feature of the vendored engine per
  `artifacts/all-knowing/docs/MAP-ENGINE.md` ("All-Knowing does not grow a second map"). Part A
  (vendor engine) **cannot be locally verified at all** — confirmed via
  `artifacts/all-knowing/docs/SOURCE-PACK.md`: there is no Elden Ring install on this dev
  machine, full stop, not just "maybe." Get as far as cloning/wiring, then stop and report.
- `10-build-lab-ar.md` — ready to run, independent of the others. Ports real attack-rating math
  from `ThomasJClark/elden-ring-weapon-calculator`, per `artifacts/all-knowing/docs/REVIEW.md`'s
  own explicit priority order (this is its #2 item, right after the alias table). Doesn't need a
  local game install — the source repo ships its own regulation data.
- `11-save-parser.md` — ready to run, independent of the others. Real `.sl2` parsing adapted
  from `EthanShoeDev/elden-ring-compass`'s `save-parser-ts`, per `REVIEW.md`'s #5 product-order
  item. `src/lib/save.ts` already names this exact target in a code comment. License on the
  source repo wasn't confirmed by an initial check — DeepSeek must verify before vendoring
  anything. Needs a real `.sl2` sample to fully test; may need to ask the user for one.

## Also read before briefing more tasks

`artifacts/all-knowing/docs/REVIEW.md` has a dated, prioritized "Product order from here" list —
treat it as more current than `SCOPE.md`'s longer architecture wishlist (some of `SCOPE.md`'s
items, like three-state facts, already look implemented in the code — cross-check before
task-briefing anything from it, don't assume it's all still open).
`artifacts/all-knowing/docs/PS5-ATLAS.md` names **four** worlds (Lands Between, Underground,
Ashen Capital, Realm of Shadow) — Task 09's plate work only accounted for three; Ashen Capital
may need its own `AtlasWorld` entry too, not just Shadow. Flag this to whoever picks up 09 if it
wasn't already caught.
