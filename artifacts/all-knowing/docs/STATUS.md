# Status — keep this current (Claude updates it on every merge)

Last updated: 2026-10-07.

## In flight (supervisor running; see docs/ORCHESTRATION.md)
Briefs live in each task's worktree (`ER-MASTER-TOOL-wt/task-<id>/artifacts/all-knowing/docs/tasks/`) until merged.
| Task | Brief | State |
|---|---|---|
| 160 | `160-link-fixes.md` — fix Task 157 audit findings (dead/wrong-kind links, dead search results, unfireable infer chains, Mark-done on untrackable pages, duplicates) | 10+ commits, finishing |
| 170 | `170-player-knowledge.md` — Reddit/forum player knowledge (strategies, cheese, bugs, missables, PvP; patch-flagged) — split out because Task 163 skipped it twice | queued |
| 167 | `167-photo-reader.md` — score + tune PS5 photo reader on owner's 13 photos, map-photo grace recall (old Task 141), ~150 web photos self-consistency set | running |
| 168 | `168-gideon-offline.md` — offline Gideon from 40% → ≥75% correct on `npm run eval:gideon` | running |
| 171 | `171-batch-audit.md` — post-batch full read-only audit → next batch's fix list | queued, waits for 160,166,167,168,170 merged |
| 166 | `166-brief.md` — inference fixes + new PS5 inferences (proposal items 11, 13–20) | queued, waits for 160 merged |

## Merged recently (master)
148–152 data cleanup (one page per enemy, real descriptions, lost names restored) · 153 Gideon token
diet (−76% request size, usage counter in Settings) · 154 game icons for all items/bosses · 155/156/158
Show on map (zoom, vendor/drop/boss sources, live engine) · 159 live map on phone/offline · 162 Gideon
offline eval harness (baseline 40.4% correct) · 163 player question corpus (6,581 questions, 20 nicknames) · 164 PvP/Builds layout · 165 bosses/guides/Now layout ·
169 docs accuracy pass (~25 claims fixed, 4 stale docs archived, README doc index) · `AGENTS.md` completion contract · orchestration tooling.

## Next (proposed to the owner, not yet approved unless noted)
1. After 168: offline Gideon meaning search (in-browser embeddings) + pre-generated DeepSeek answers,
   re-scored with `npm run eval:gideon` (owner approved the plan in principle).
2. After 170: surface current-patch Reddit tips on boss/item/quest pages (needs owner OK).
3. Data gaps: ~320 empty descriptions, NPC map positions (~33%), Omen variant pages.
4. Real phone test session by the owner once 160–168 land.
5. Housekeeping: remove merged worktrees/branches (`task-148`…`task-165`, `task-141` after 167).

## Owner decisions pending
- Gideon is ON HOLD. To enable DeepSeek Gideon the owner adds `VITE_GIDEON_PROVIDER=deepseek` to
  `.env.local` (Claude never opens that file).
- Task 143 (planning: goal stack, route optimiser, ending chooser, NG+ planner) — on branch `task-143`,
  HOLD; re-judge after the UX work, likely redo on the new layout.
- Task 161 UX proposal (`docs/tasks/161-proposal.md`) items not yet scheduled: none besides 166.

## Key numbers (last merge gates)
1,495 tests passing · lint 0 · build OK · bundle budget OK · page audit 4 flagged · links 0 dead.
