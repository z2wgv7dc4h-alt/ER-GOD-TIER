# Orchestration — how work gets done (Claude + DeepSeek)

Claude plans, briefs, verifies and merges. DeepSeek (opencode, model `deepseek/deepseek-flash`) does the
work in git worktrees. A Node supervisor runs the queue unattended. The owner does not monitor anything.

## Layout
- Worktrees + runtime files: `C:\Users\RIGGUSPIG\Desktop\ER-MASTER-TOOL-wt\` (outside the repo).
  - `task-<id>/` — one git worktree per task (branch `task-<id>`), with a `node_modules` junction to the
    main checkout's `artifacts/all-knowing/node_modules`.
  - `queue.tsv` — `id<TAB>brief file name<TAB>deps` (deps = task ids that must be merged first, or `-`).
  - `<id>-*.md` — brief source copies; `task-<id>-<n>.log` — run logs; `supervisor.log` — events.
- Versioned copies of the tools: `scripts/orchestration/` (`supervisor.mjs`, `watch.sh`, `status.sh`).
  Copy them to the runtime folder if they change.

## Start / check / stop
- Start (once; no window): from Claude's PowerShell tool
  `Start-Process -WindowStyle Hidden -FilePath node -ArgumentList '"C:/Users/RIGGUSPIG/Desktop/ER-MASTER-TOOL-wt/supervisor.mjs"' -WorkingDirectory C:\Users\RIGGUSPIG\Desktop\ER-MASTER-TOOL-wt -RedirectStandardError C:\Users\RIGGUSPIG\Desktop\ER-MASTER-TOOL-wt\supervisor.err -RedirectStandardOutput C:\Users\RIGGUSPIG\Desktop\ER-MASTER-TOOL-wt\supervisor.out`
  (if queued tasks don't start, check `supervisor.err`; a hung supervisor is fixed by stop + start)
- Watch: Monitor tool running `bash C:/Users/RIGGUSPIG/Desktop/ER-MASTER-TOOL-wt/watch.sh`
  (prints new supervisor events and any newly visible console window). Re-arm every 30 min.
- Status: `bash /c/Users/RIGGUSPIG/Desktop/ER-MASTER-TOOL-wt/status.sh 160 163 …` (one line per task).
- Stop (PowerShell tool, never from Bash — a Bash kill whose command line matches kills itself):
  `Get-CimInstance Win32_Process | ? { ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*supervisor.mjs*') -or ($_.Name -eq 'opencode.exe' -and $_.CommandLine -like '*title task-*') } | % { Stop-Process -Id $_.ProcessId -Force }`
  Runs resume automatically on the next start (resume prompt + the task's commits).
- Exactly one supervisor at a time. It never creates worktrees (that needs `mklink`): Claude creates them.

## What the supervisor does (every 60 s)
- Starts ready tasks (deps merged) up to MAX=4 in parallel, `opencode.exe` spawned directly with
  `windowsHide: false` from a supervisor started with `Start-Process -WindowStyle Hidden` → every command
  DeepSeek runs inherits that hidden console (no popups; `windowsHide: true` made them flash, 2026-10-09).
- Restarts a run whose log is silent 10 min (max 2), resumes a run that exited without finishing (max 3),
  then reports FAILED. Stops starting runs on "Insufficient Balance" (tell the owner).
- "DONE" = `docs/tasks/<id>-report.md` contains `ALL ITEMS DONE`. "Merged" = branch tip is in master.
- On DONE it merges master into the task branch, rebuilds the index and runs every gate there
  (`gates-<id>.txt`), then logs `GATES PASS` (Claude samples output, fast-forwards master, pushes) or
  `GATES FAIL` (Claude reads the file and writes a fix brief).
- Stall = no log write AND no file change in the worktree for 10 min (long silent scrapes are not killed).

## Adding a task
1. Create the worktree (Bash):
   `git -C "<repo>" worktree add ../ER-MASTER-TOOL-wt/task-<id> -b task-<id> master`, then the junction
   (PowerShell: `New-Item -ItemType Junction -Path <wt>\task-<id>\artifacts\all-knowing\node_modules -Target "<repo>\artifacts\all-knowing\node_modules"`).
2. Write the brief from `docs/tasks/_TEMPLATE.md` into `task-<id>/artifacts/all-knowing/docs/tasks/<id>-<name>.md`.
3. Append a `queue.tsv` line. The supervisor picks it up within a minute.

## Writing briefs (what makes DeepSeek fast and accurate)
- Small and concrete: 3–6 numbered items, each with exact files, exact values, acceptance test.
  A cheap model invents anything left unstated — state numbers, names, file paths.
- File ownership: say which files other running tasks own; never run two tasks on the same files.
- Put the investigation in the brief ("find why X; trace Y") instead of doing it yourself.
- `AGENTS.md` (auto-read by opencode) carries the standing rules: no `.env`, no dev servers, no
  install/push/merge, no invented text, token-saving habits, testing rules, the completion contract
  (report checklist + `ALL ITEMS DONE`). Briefs don't repeat it.
- Testing inside a task: touched tests + `npx tsc -b` while working; full gates once at the end.
- Read-only audits: say "READ-ONLY", only the report is committed.

## Verifying and merging (Claude)
1. Read the report checklist and ASSUMPTIONS (where cheap models hide decisions).
2. Sample real output: open a few changed pages/records, or the browser preview for UI changes.
3. In the main repo: `git merge --no-edit task-<id>`, run the gates (see CLAUDE.md), push.
4. Update `docs/STATUS.md`. Remove the worktree/branch when no longer needed.

## Known pitfalls (all happened)
- Visible windows: scheduled tasks, bash supervisors using `nohup`, and scripts calling `powershell`
  all popped up consoles, and so did `windowsHide: true`. Only the hidden Node supervisor with
  `windowsHide: false` children is proven windowless.
- DeepSeek credit runs out mid-run: logs end with "Insufficient Balance"; work is kept in commits.
- PC/GPU crashes kill everything and once zeroed a branch ref (`.git/refs/heads/task-165`): restore from
  `.git/logs/refs/heads/<branch>` (last sha) and run `git fsck`.
- A task merged into another branch's base looks "merged" by commit message — the supervisor checks
  branch ancestry + the report marker instead.
- Runs that finish early or skip parts — prevented by the `ALL ITEMS DONE` contract.

## Batch cycle (standard)
Every batch of fix tasks ends with a READ-ONLY full audit task (copy `docs/tasks/_BATCH-AUDIT.md`,
new id, deps = all tasks of the batch). Its FIX LIST, already split into file-disjoint groups, becomes
the next batch's briefs. Repeat until the audit finds nothing material.

## Known limitations (be honest about them)
- Nothing merges while no Claude chat is open: DONE tasks wait (with gates already run) for Claude.
  Tasks whose deps are unmerged wait too.
- A PC reboot stops the supervisor; a new chat must start it (see "Start").
- `ALL ITEMS DONE` is self-reported — agents have checked off only part of a brief (Task 163 twice).
  Claude must compare the checklist against the brief, and briefs should include a test that fails
  unless the work exists (e.g. "≥ 5,000 rows").
- No spend cap: DeepSeek credit can run out mid-run; the supervisor pauses and Claude tells the owner.
- Popup detection (`watch.sh`) only runs while a Claude chat is open.
