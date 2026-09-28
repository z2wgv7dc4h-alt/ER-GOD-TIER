#!/usr/bin/env node
// Task 119 §2 — build `public/sourced/entity-index.json`.
//
// The merge itself lives in TypeScript (`src/lib/entityIndexBuild.ts`) so it can
// import the entity graph, the alias plane and every raw dataset. This script
// just loads that module through Vite's in-process SSR transform (no server, no
// port) and writes the result. Usage: `npm run index:entities`.
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outFile = path.join(root, 'public/sourced/entity-index.json')

const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const mod = await server.ssrLoadModule('/src/lib/entityIndexBuild.ts')
  const result = mod.buildEntityIndex()
  const doc = {
    generatedAt: new Date().toISOString(),
    counts: result.counts,
    unmatched: result.unmatched,
    records: result.records,
  }
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(doc))
  const bytes = fs.statSync(outFile).size
  console.log(`entity-index: ${result.counts.total} records (${(bytes / 1024).toFixed(0)} KiB)`)
  console.log('by kind:', JSON.stringify(result.counts.byKind))
  const unmatched = Object.entries(result.unmatched).sort((a, b) => b[1] - a[1])
  console.log('unmatched rows per source:')
  for (const [source, count] of unmatched) console.log(`  ${source}: ${count}`)
} catch (error) {
  console.error('build-entity-index failed:', error)
  process.exitCode = 1
} finally {
  await server.close()
}
