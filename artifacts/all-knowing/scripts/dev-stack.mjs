#!/usr/bin/env node
// One-command dev stack: the local map engine + Vite together.
//
//   npm start            map engine (:8099) + Vite (:5173)
//   npm start:live       same, but the engine also reads the game process
//                        (--live-memory) and prints the EAC warning first
//
// Deliberately a ~50-line supervisor rather than a process-manager dependency:
// it works on Windows and POSIX with no install step. If the map engine is not
// set up or stops, Vite keeps running so the workspace still works on the static
// plates â€” offline is a normal state, not an error.
//
// Scratch rule: this writes nothing. Tiles/markers are produced once by the
// the engine tools (npm run map:setup), never from here.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const live = process.argv.includes('--live-memory')

const EAC_WARNING = [
  '  live-memory mode is ON.',
  '  The engine will read the running game process (PROCESS_VM_READ only) for a live player dot.',
  '  EAC cannot tell an honest read from a hostile one: running this alongside protected online',
  '  play risks a ban. Use it OFFLINE only, and only if you accept the risk.',
  '  The default `npm start` never opens the game process.',
].join('\n')

if (live) {
  // stderr so it is visible even when stdout is piped/redirected.
  console.warn(`\n${EAC_WARNING}\n`)
}

const mapEntry = join(root, 'vendor', 'elden-ring-map', 'server', 'index.js')
const viteEntry = join(root, 'node_modules', 'vite', 'bin', 'vite.js')

if (!existsSync(viteEntry)) {
  console.error('vite is not installed â€” run `npm install` first, then `npm start`.')
  process.exit(1)
}

let map = null
let vite = null
let shuttingDown = false

function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of [map, vite]) {
    if (child && child.exitCode === null && !child.killed) {
      try {
        child.kill()
      } catch {
        /* already gone */
      }
    }
  }
  // Give the children a moment to exit cleanly, then stop the supervisor.
  setTimeout(() => process.exit(code), 150)
}

function launch(label, entry, args) {
  const child = spawn(process.execPath, [entry, ...args], { cwd: root, stdio: 'inherit', env: process.env })
  child.on('error', (err) => console.warn(`[${label}] could not start: ${err.message}`))
  return child
}

map = launch('map', mapEntry, live ? ['--live-memory'] : [])
map.on('exit', (code, signal) => {
  if (shuttingDown) return
  console.warn(
    `\n[map] engine stopped (${signal || code}). The workspace stays up on the static plates.\n`,
  )
})

vite = launch('vite', viteEntry, [])
vite.on('exit', (code, signal) => {
  if (shuttingDown) return
  console.log(`\n[vite] dev server stopped (${signal || code}).`)
  shutdown(code ?? 0)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => shutdown(0))
}
