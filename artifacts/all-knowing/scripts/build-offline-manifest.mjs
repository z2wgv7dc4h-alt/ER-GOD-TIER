#!/usr/bin/env node
/**
 * Task 137 §2 — build the "everything for offline" manifest.
 *
 * Walks `public/sourced/**` and writes `public/sourced/offline-manifest.json`, a
 * flat list of every served data file with its byte size. The Settings download
 * action reads this manifest and warms each file into the dedicated Cache Storage
 * bucket the service worker serves `/sourced/**` from, so the wiki, full-text
 * search and Gideon's grounded answers work with no connection.
 *
 * The manifest never contains itself. Run with `npm run data:offline`.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const SOURCED = path.join(ROOT, 'public', 'sourced')
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

const files = walk(SOURCED)
const totalBytes = files.reduce((n, f) => n + f.bytes, 0)
const doc = {
  generatedAt: new Date().toISOString(),
  root: '/sourced',
  fileCount: files.length,
  totalBytes,
  files: files.map((f) => ({ path: `/sourced/${f.path}`, bytes: f.bytes })),
}

fs.writeFileSync(OUT, `${JSON.stringify(doc)}\n`)
console.log(
  `[offline-manifest] ${doc.fileCount} files, ${(totalBytes / 1048576).toFixed(1)} MB → ${path.relative(ROOT, OUT)}`,
)
if (!process.env.CI) console.log('[offline-manifest] remember to commit public/sourced/offline-manifest.json')
