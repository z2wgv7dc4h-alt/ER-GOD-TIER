# Status — keep this current (Claude updates it on every merge)

Last updated: 2026-10-08.

## In flight (supervisor running; see docs/ORCHESTRATION.md)
Briefs live in each task's worktree (`ER-MASTER-TOOL-wt/task-<id>/artifacts/all-knowing/docs/tasks/`) until merged.
| Task | Brief | State |
|---|---|---|
| — | nothing in flight; supervisor stopped (queue empty) | — |

## Merged recently (master)
148–152 data cleanup (one page per enemy, real descriptions, lost names restored) · 153 Gideon token
diet (−76% request size, usage counter in Settings) · 154 game icons for all items/bosses · 155/156/158
Show on map (zoom, vendor/drop/boss sources, live engine) · 159 live map on phone/offline · 160 link
fixes · 162 Gideon offline eval harness · 163 player question corpus (6,581 questions) · 164 PvP/Builds
layout · 165 bosses/guides/Now layout · 166 inference fixes + new PS5 inferences · 167 photo reader +
map grace recall 75–88% · 168 offline Gideon 40% → 84% correct · 169 docs accuracy pass · 170 player
knowledge corpus (5,718 Reddit rows, raw, not wired in) · 171 batch audit · 172 template/garbled
descriptions → 0 · 173 link gaps (orphans, drop names, Haligtree cycle, merchant kinds) · 174 docs + Help
drift · 175 equipment photos 50% → 100% (fixture overall 91%) · 176 Nightreign + cross-page description contamination removed · 177 region/location field hygiene.

## Next (proposed to the owner, not yet approved unless noted)
1. **Owner's real phone session on PS5** — the batch has landed; this is the most valuable next step.
1b. **Regression to fix:** offline Gideon eval fell from 84.4% to 79.3% correct after the 172–177 data cleanup (`docs/GIDEON-EVAL.md`) — a small DeepSeek task to find which answers changed.
2. Offline Gideon meaning search + pre-generated DeepSeek answers (approved in principle).
3. Surface current-patch Reddit tips on boss/item/quest pages (needs owner OK; the raw corpus is noisy).
4. Small leftovers: `enemy:rat` description looks like a frenzied variant's; empty descriptions (~296,
   empty beats fake). (ACCURACY-REPORT / lockout-review / questline-review stay: `scripts/accuracy-audit.mjs` uses them.)

## Owner decisions pending
- Gideon is ON HOLD. To enable DeepSeek Gideon the owner adds `VITE_GIDEON_PROVIDER=deepseek` to
  `.env.local` (Claude never opens that file).
- Task 143 (planning: goal stack, route optimiser, ending chooser, NG+ planner) — branch `task-143`, HOLD.

## Key numbers (last merge gates, Task 177)
1,546 tests passing · lint 0 · build OK · bundle budget OK (≈3.3 MB of 3.5) · links 0 dead.

## Repo
Master clean and pushed. Branches left: master, task-143 (unmerged planning work, HOLD), task-141/147/157/161
(old unmerged audit/report branches — their reports are already in master; safe to delete if wanted).
