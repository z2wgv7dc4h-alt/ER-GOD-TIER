#!/usr/bin/env node
/**
 * Task 137 §2 — build the "everything for offline" manifest.
 *
 * Walks `public/sourced/**` plus the built `dist/engine/**` (Task 159) and writes
 * `public/sourced/offline-manifest.json`, a flat list of every served data file
 * with its byte size. The Settings download action reads this manifest and warms
 * each file into the dedicated Cache Storage bucket the service worker serves
 * `/sourced/**` and `/engine/**` from, so the wiki, full-text search, Gideon's
 * grounded answers and the live map work with no connection.
 *
 * The manifest never contains itself. Run with `npm run data:offline` after
 * `npm run build` (the engine tree only exists once it has been built).
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const SOURCED = path.join(ROOT, 'public', 'sourced')
const ENGINE = path.join(ROOT, 'dist', 'engine')
const OUT = path.join(SOURCED, 'offline-manifest.json')
const SELF = 'offline-manifest.json'

function walk(dir, rel = '') {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      out.push(...walk(abs, relPath))
      continue
    }
    if (!entry.isFile()) continue
    if (relPath === SELF) continue
    out.push({ path: relPath, bytes: fs.statSync(abs).size })
  }
  out.sort((a, b) => a.path.localeCompare(b.path))
  return out
}

// Task 159 — the engine is copied into `dist/engine` by the build. When it is
// present, list its files too so "Download everything for offline" warms the
// live map (tiles included) into the same cache bucket the service worker uses.
const sourced = walk(SOURCED).map((f) => ({ path: `/sourced/${f.path}`, bytes: f.bytes }))
const engine = fs.existsSync(ENGINE)
  ? walk(ENGINE).map((f) => ({ path: `/engine/${f.path}`, bytes: f.bytes }))
  : []
const files = [...sourced, ...engine].sort((a, b) => a.path.localeCompare(b.path))
const totalBytes = files.reduce((n, f) => n + f.bytes, 0)
const doc = {
  generatedAt: new Date().toISOString(),
  root: '/',
  roots: ['/sourced', '/engine'],
  fileCount: files.length,
  totalBytes,
  files,
}

fs.writeFileSync(OUT, `${JSON.stringify(doc)}\n`)
console.log(
  `[offline-manifest] ${doc.fileCount} files, ${(totalBytes / 1048576).toFixed(1)} MB` +
    ` (${engine.length} engine files) → ${path.relative(ROOT, OUT)}`,
)
if (!process.env.CI) console.log('[offline-manifest] remember to commit public/sourced/offline-manifest.json')
