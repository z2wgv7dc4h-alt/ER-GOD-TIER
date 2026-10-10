# Status — keep this current (Claude updates it on every merge)

Last updated: 2026-10-10 (17:35).

## In flight (supervisor running; see docs/ORCHESTRATION.md)
Briefs live in each task's worktree (`ER-MASTER-TOOL-wt/task-<id>/artifacts/all-knowing/docs/tasks/`) until merged.
| Task | Brief | State |
|---|---|---|
| — | nothing in flight — all planned work merged; final crawl (phone+desktop) half 1: 0 dead / 0 errors / 0 duplicates |  — |

## Merged recently (master)
148–152 data cleanup (one page per enemy, real descriptions, lost names restored) · 153 Gideon token
diet (−76% request size, usage counter in Settings) · 154 game icons for all items/bosses · 155/156/158
Show on map (zoom, vendor/drop/boss sources, live engine) · 159 live map on phone/offline · 160 link
fixes · 162 Gideon offline eval harness · 163 player question corpus (6,581 questions) · 164 PvP/Builds
layout · 165 bosses/guides/Now layout · 166 inference fixes + new PS5 inferences · 167 photo reader +
map grace recall 75–88% · 168 offline Gideon 40% → 84% correct · 169 docs accuracy pass · 170 player
knowledge corpus (5,718 Reddit rows, raw, not wired in) · 171 batch audit · 172 template/garbled
descriptions → 0 · 173 link gaps (orphans, drop names, Haligtree cycle, merchant kinds) · 174 docs + Help
drift · 175 equipment photos 50% → 100% (fixture overall 91%) · 176 Nightreign + cross-page description contamination removed · 177 region/location field hygiene · 178 offline Gideon regression fixed (85.5% correct) · 180 unused data / dead code / gaps / outbound-link audit (`docs/tasks/180-report.md`) · 181 outbound wiki links replaced by stored content (guard test) · 182 enemy map pins 0→508/613, boss runes, kind-safe pictures · 183 NPC positions, chest pin layer, weapon status build-up · 184 enemy/NPC pictures + grace/region map crops (`image-index-extra.json`) · 185 search hang fixed (catalog cache), dead controls/duplicates · 186 whole-product review (`docs/tasks/186-report.md`) · 188 fields (off-map coords, SotE-as-region, grace empty block hidden, quest/region backfill) · 189 game-name resolution · 190 polish + Gideon Clear disabled · 191 entity index lazy-loaded (no 4.4 MB on first load) · 192 graph orphans/contains edges · brand art from Grok in `public/brand/` (`docs/brand/GROK-PROMPTS.md`) · 187 junk/template text + fake merchants cleaned · 193 brand art wired in (PWA icons, splash, wordmark, category fallbacks, Gideon avatar, empty states, photo guide) · 194 duplicate search chips fixed · 195 42 curated player tips folded into existing boss/item/PvP/mechanic/region/guide sections · 179 Reddit data triage (4% useful; placements + unanswered-question gaps in `docs/tasks/179-report.md`).

## Next (proposed to the owner, not yet approved unless noted)
1. **Owner's real phone session on PS5** — the code is done; this is the next step.
1b. **Now:** owner said keep the current structure and make everything work as well as possible. UI crawl
   (phone+desktop, prod preview): 0 errors; ~30 dead controls (many false positives), ~20 duplicate groups;
   search hang → Task 185. **Re-crawl after 182–185 (2026-10-10): 0 errors, 1 dead (Gideon "Clear" on an
   empty chat), search screens now complete; remaining duplicates are repeated category/filter chips on the
   search screens (minor).**
2. Offline Gideon meaning search + pre-generated DeepSeek answers (approved in principle).
3. Surface current-patch Reddit tips on boss/item/quest pages (needs owner OK; the raw corpus is noisy).
4. Small leftovers: `enemy:rat` description looks like a frenzied variant's; empty descriptions (~296,
   empty beats fake). (ACCURACY-REPORT / lockout-review / questline-review stay: `scripts/accuracy-audit.mjs` uses them.)

## Supervisor note
It can hang silently (stops ticking, no error); fix = stop it + its runs, restart (runs resume). Run ≤4 tasks
when other heavy work is on the PC (6 saturated the CPU and caused test timeouts).
Opencode children must inherit the supervisor's hidden console (`windowsHide: false`, supervisor started with
`Start-Process -WindowStyle Hidden`); `windowsHide: true` made DeepSeek's commands flash terminal windows.

## Owner rules added 2026-10-09
- No outbound wiki links when the data is on disk — integrate it (enforced by `src/noWikiLinks.guard.test.ts`).
- Agents never start servers/background processes (they opened a window) — `AGENTS.md`.

## Owner decisions pending
- Gideon is ON HOLD. To enable DeepSeek Gideon the owner adds `VITE_GIDEON_PROVIDER=deepseek` to
  `.env.local` (Claude never opens that file).
- Task 143 (planning: goal stack, route optimiser, ending chooser, NG+ planner) — branch `task-143`, HOLD.
- From 180: Reddit tips + top unanswered questions (build recommender, PvP matchmaking, beginner primer),
  dead-code cleanup (4 modules, 62 unused exports) — proposed, not approved.

## Key numbers (last merge gates, Task 195)
1,650 tests passing · lint 0 · build OK · bundle budget OK · links 0 dead · offline Gideon 85.5% · photos 91%.

## Repo
Master clean and pushed. The wiki dump `.scratch/er-mcp.db` (49 MB) is tracked in git (everything else in `.scratch/` is throwaway). Not in git by design: map tiles/icons extracted from the owner's game install. Branches left: master, task-143 (unmerged planning work, HOLD), task-141/147/157/161
(old unmerged audit/report branches — their reports are already in master; safe to delete if wanted).
