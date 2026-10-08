// DeepSeek task supervisor (Node). Every child is spawned with windowsHide (CREATE_NO_WINDOW), so it
// gets a hidden console that all of opencode's own commands inherit — no windows ever appear.
// queue.tsv: id <TAB> brief file <TAB> deps (ids merged to master first, or "-"). Worktrees must exist.
// Every 60 s: start ready tasks (max MAX), restart runs silent STALL min (max 2), resume runs that exit
// without "ALL ITEMS DONE" (max 3), pause on "Insufficient Balance". One line per state change → supervisor.log.
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const WT = 'C:/Users/RIGGUSPIG/Desktop/ER-MASTER-TOOL-wt'
const REPO = 'C:/Users/RIGGUSPIG/Desktop/ER MASTER TOOL'
const OPENCODE = 'C:/Users/RIGGUSPIG/AppData/Roaming/npm/node_modules/opencode-ai/bin/opencode.exe'
const MAX = Number(process.env.MAX ?? 4)
const STALL_MS = 20 * 60_000
const TIMEOUT_MS = 3 * 3600_000
const runs = new Map() // id -> { child, log, started }
const said = new Map()
const tries = new Map()

const emit = (id, msg) => {
  if (said.get(id) === msg) return
  said.set(id, msg)
  const t = new Date().toTimeString().slice(0, 5)
  fs.appendFileSync(path.join(WT, 'supervisor.log'), `${t} task ${id}: ${msg}\n`)
}
const bump = (k) => { const n = (tries.get(k) ?? 0) + 1; tries.set(k, n); return n }
// Merged = the task branch has a report with ALL ITEMS DONE and its tip is contained in master.
const merged = (id) => {
  const tip = spawnSync('git', ['-C', REPO, 'rev-parse', '--verify', '-q', `task-${id}`], { windowsHide: true, encoding: 'utf8' }).stdout.trim()
  if (!tip) return false
  const anc = spawnSync('git', ['-C', REPO, 'merge-base', '--is-ancestor', tip, 'master'], { windowsHide: true })
  const rep = path.join(WT, `task-${id}`, 'artifacts', 'all-knowing', 'docs', 'tasks', `${id}-report.md`)
  return anc.status === 0 && fs.existsSync(rep) && fs.readFileSync(rep, 'utf8').includes('ALL ITEMS DONE')
}
// Newest mtime of any tracked/untracked file change in the worktree (git status), so a long silent
// command that is still writing files (e.g. a scraper) is not mistaken for a stall.
const lastActivity = (id, log) => {
  const dir = path.join(WT, `task-${id}`)
  let t = fs.statSync(log).mtimeMs
  const st = spawnSync('git', ['-C', dir, 'status', '--porcelain', '-uall'], { windowsHide: true, encoding: 'utf8' }).stdout
  for (const line of st.split(String.fromCharCode(10)).filter(Boolean).slice(0, 400)) {
    try { t = Math.max(t, fs.statSync(path.join(dir, line.slice(3).replace(/^"|"$/g, ''))).mtimeMs) } catch {}
  }
  for (const d of ['.scratch']) {
    try { for (const f of fs.readdirSync(path.join(dir, 'artifacts', 'all-knowing', d), { recursive: true }).slice(-200))
      t = Math.max(t, fs.statSync(path.join(dir, 'artifacts', 'all-knowing', d, String(f))).mtimeMs) } catch {}
  }
  return t
}
// On DONE: merge master into the task branch and run the gates there, so Claude only has to read the
// result and fast-forward. Result goes to supervisor.log as GATES PASS / GATES FAIL.
const gated = new Set()
function runGates(id) {
  if (gated.has(id)) return
  gated.add(id)
  const dir = path.join(WT, `task-${id}`, 'artifacts', 'all-knowing')
  const out = path.join(WT, `gates-${id}.txt`)
  const script = `if ! git merge --no-edit master >/dev/null 2>&1; then
  bad=$(git diff --name-only --relative --diff-filter=U | grep -vE 'public/sourced/(entity-index|aliases)\.json|src/data/aliases\.json|docs/(PAGE-AUDIT|LINKS-AUDIT|ENTITY-COVERAGE|PROGRESS-AUDIT|INFERENCE-RULES|DATA-CATALOG|GIDEON-EVAL)\.md|offline-manifest\.json')
  if [ -n "$bad" ]; then git merge --abort; echo "MERGE-CONFLICT: $bad"; exit 1; fi
  git diff --name-only --relative --diff-filter=U | xargs -r git checkout --theirs -- ; git add -A; git commit -qm "Task ${id}: merge master (generated files taken from master, regenerated below)"
  node scripts/gen-aliases.mjs >/dev/null 2>&1; npm run audit:pages >/dev/null 2>&1; npm run audit:links >/dev/null 2>&1
fi
node scripts/gen-aliases.mjs >/dev/null 2>&1; npm run index:entities >/dev/null 2>&1; node scripts/gen-aliases.mjs >/dev/null 2>&1; git add -A public/sourced src/data docs >/dev/null 2>&1; git commit -qm "Task ${id}: rebuild index after merging master" >/dev/null 2>&1
npx tsc -b >/dev/null 2>&1 || { echo TSC-FAIL; exit 1; }
npx vitest run 2>&1 | grep -E "Tests |FAIL" | head -5
npx vitest run >/dev/null 2>&1 || { echo TESTS-FAIL; exit 1; }
npm run lint >/dev/null 2>&1 || { echo LINT-FAIL; exit 1; }
npm run build >/dev/null 2>&1 || { echo BUILD-FAIL; exit 1; }
npx vitest run src/lib/bundleBudget.test.ts >/dev/null 2>&1 || { echo BUNDLE-FAIL; exit 1; }
echo ALL-GATES-PASS`
  fs.writeFileSync(path.join(WT, `.gates-${id}.sh`), script)
  const fd = fs.openSync(out, 'w')
  const c = spawn('C:/Program Files/Git/bin/bash.exe', [path.join(WT, `.gates-${id}.sh`)], { cwd: dir, windowsHide: true, stdio: ['ignore', fd, fd] })
  c.on('exit', (code) => { fs.closeSync(fd); emit(id, code === 0 ? `GATES PASS — fast-forward merge ready (${out})` : `GATES FAIL — see ${out}`) })
}
const kill = (child) => spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { windowsHide: true })

function launch(id, prompt) {
  gated.delete(id)
  const dir = path.join(WT, `task-${id}`, 'artifacts', 'all-knowing')
  const n = fs.readdirSync(WT).filter((f) => f.startsWith(`task-${id}`) && f.endsWith('.log')).length
  const log = path.join(WT, `task-${id}-${n}.log`)
  const fd = fs.openSync(log, 'w')
  const child = spawn(OPENCODE, ['run', '-m', 'deepseek/deepseek-flash', '--dir', dir, '--title', `task-${id}`, prompt], {
    cwd: dir, windowsHide: true, stdio: ['ignore', fd, fd],
  })
  child.on('exit', () => { fs.closeSync(fd); if (runs.get(id)?.child === child) runs.delete(id) })
  runs.set(id, { child, log, started: Date.now() })
}

function tick() {
  const queue = fs.readFileSync(path.join(WT, 'queue.tsv'), 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'))
  // Credit: any active log that ends with the balance error.
  for (const [, r] of runs) {
    const tail = fs.readFileSync(r.log, 'utf8').slice(-400)
    if (tail.includes('Insufficient Balance')) {
      emit('all', 'CREDIT — DeepSeek balance empty; stopped starting runs')
      return
    }
  }
  for (const [id, brief, deps] of queue) {
    if (merged(id)) continue
    const r = runs.get(id)
    if (r) {
      const age = Date.now() - lastActivity(id, r.log)
      if (age > STALL_MS || Date.now() - r.started > TIMEOUT_MS) {
        kill(r.child); runs.delete(id)
        if (bump(`s${id}`) > 2) { emit(id, 'FAILED — stalled 3 times, needs Claude'); continue }
        emit(id, `STALL — restarted (#${tries.get(`s${id}`)})`)
        launch(id, `Continue docs/tasks/${brief}. The previous run stalled. Check git log/status, commit finished work, continue. Finish with the report checklist and ALL ITEMS DONE. Never read .env or .env.local.`)
      }
      continue
    }
    const rep = path.join(WT, `task-${id}`, 'artifacts', 'all-knowing', 'docs', 'tasks', `${id}-report.md`)
    if (fs.existsSync(rep) && fs.readFileSync(rep, 'utf8').includes('ALL ITEMS DONE')) { emit(id, 'DONE — running gates on merge with master'); runGates(id); continue }
    if (!fs.existsSync(path.join(WT, `task-${id}`))) { emit(id, 'NO WORKTREE — needs Claude'); continue }
    if (deps !== '-' && !deps.split(',').every(merged)) continue
    if (runs.size >= MAX) continue
    const hasLog = fs.readdirSync(WT).some((f) => f.startsWith(`task-${id}`) && f.endsWith('.log'))
    if (hasLog) {
      if (bump(`r${id}`) > 3) { emit(id, 'FAILED — exited unfinished 3 times, needs Claude'); continue }
      emit(id, `RUNNING (resumed #${tries.get(`r${id}`)})`)
      launch(id, `Continue docs/tasks/${brief}. The previous run stopped before finishing. Check git log/status and the brief, do every remaining item, write the report checklist and ALL ITEMS DONE. Never read .env or .env.local.`)
    } else {
      emit(id, 'STARTED')
      launch(id, `Do the task in docs/tasks/${brief} exactly — every item. Never read .env or .env.local.`)
    }
  }
}

emit('supervisor', 'started (node, hidden children)')
tick()
setInterval(tick, 60_000)
