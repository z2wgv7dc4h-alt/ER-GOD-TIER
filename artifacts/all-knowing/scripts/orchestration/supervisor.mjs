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
const STALL_MS = 10 * 60_000
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
const kill = (child) => spawnSync('taskkill', ['/T', '/F', '/PID', String(child.pid)], { windowsHide: true })

function launch(id, prompt) {
  const dir = path.join(WT, `task-${id}`, 'artifacts', 'all-knowing')
  const n = fs.readdirSync(WT).filter((f) => f.startsWith(`task-${id}`) && f.endsWith('.log')).length
  const log = path.join(WT, `task-${id}-${n}.log`)
  const fd = fs.openSync(log, 'w')
  const child = spawn(OPENCODE, ['run', '-m', 'deepseek/deepseek-flash', '--dir', dir, '--title', `task-${id}`, prompt], {
    cwd: dir, windowsHide: true, stdio: ['ignore', fd, fd],
  })
  child.on('exit', () => { fs.closeSync(fd); runs.delete(id) })
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
      const age = Date.now() - fs.statSync(r.log).mtimeMs
      if (age > STALL_MS || Date.now() - r.started > TIMEOUT_MS) {
        kill(r.child); runs.delete(id)
        if (bump(`s${id}`) > 2) { emit(id, 'FAILED — stalled 3 times, needs Claude'); continue }
        emit(id, `STALL — restarted (#${tries.get(`s${id}`)})`)
        launch(id, `Continue docs/tasks/${brief}. The previous run stalled. Check git log/status, commit finished work, continue. Finish with the report checklist and ALL ITEMS DONE. Never read .env or .env.local.`)
      }
      continue
    }
    const rep = path.join(WT, `task-${id}`, 'artifacts', 'all-knowing', 'docs', 'tasks', `${id}-report.md`)
    if (fs.existsSync(rep) && fs.readFileSync(rep, 'utf8').includes('ALL ITEMS DONE')) { emit(id, 'DONE — ready to verify+merge'); continue }
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
