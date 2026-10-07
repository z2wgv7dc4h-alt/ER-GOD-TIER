#!/usr/bin/env node
/**
 * Task 159 — ship the vendored map engine as production assets.
 *
 * `npm run build` runs this after `vite build`. It copies the engine's static
 * `web/` tree (HTML/JS/CSS/icons, plus the generated `web/tiles/**` if the game
 * install has been extracted) into `dist/engine/`, and writes the few `/api/*`
 * responses the engine's own frontend reads as plain static files, so the live
 * map works from a static host / installed PWA with no PC process running.
 *
 * The dynamic API is deliberately not shimmed: `/api/events` is the SSE stream
 * for the PC save reader / live player position. Without it the engine still
 * draws tiles and markers; the host's status logic (src/lib/mapEngine.ts) treats
 * a reachable tile manifest as "live" regardless of the reader.
 *
 * Marker data preference, mirroring the dev middleware (vite.config.ts):
 *   1. the generated `vendor/elden-ring-map/data/{markers,items,pieces}.json`;
 *   2. the committed `public/sourced/open/engine-markers.json` fallback so a
 *      checkout with no game extraction still ships a valid marker feed.
 *
 * Tiles are generated from the user's own install and gitignored; they are
 * copied when present and simply absent otherwise.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const WEB = path.join(ROOT, 'vendor', 'elden-ring-map', 'web')
const DATA = path.join(ROOT, 'vendor', 'elden-ring-map', 'data')
const SOURCED = path.join(ROOT, 'public', 'sourced', 'open')
const DIST_ENGINE = path.join(ROOT, 'dist', 'engine')

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function engineFeed() {
  const markers = readJson(path.join(DATA, 'markers.json'), { markers: [] }).markers ?? []
  const items = readJson(path.join(DATA, 'items.json'), { markers: [] }).markers ?? []
  const pieces = readJson(path.join(DATA, 'pieces.json'), { markers: [] }).markers ?? []
  const all = [...markers, ...items, ...pieces]
  if (all.length) return all
  // Fallback: the committed engine export (engine's own markers + named pickups).
  const doc = readJson(path.join(SOURCED, 'engine-markers.json'), { markers: [], items: [] })
  const toFeed = (m) => ({
    id: m.id,
    cat: m.cat || 'poi',
    names: { en: m.name, ru: m.name },
    flag: 0,
    master: m.master || 'M00',
    px: m.px,
    py: m.py,
    ...(m.map ? { map: m.map } : {}),
  })
  return [...(doc.markers ?? []), ...(doc.items ?? [])].filter((m) => m.px != null).map(toFeed)
}

function placeNames() {
  return (
    readJson(path.join(DATA, 'place-names.json'), null) ??
    readJson(path.join(SOURCED, 'map-place-names.json'), { labels: [] })
  )
}

function dirBytes(dir) {
  let total = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) total += dirBytes(abs)
    else if (entry.isFile()) total += fs.statSync(abs).size
  }
  return total
}

function countFiles(dir) {
  let n = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(path.join(dir, entry.name))
    else if (entry.isFile()) n += 1
  }
  return n
}

if (!fs.existsSync(WEB)) {
  console.error('[engine-dist] missing vendor/elden-ring-map/web — nothing to copy')
  process.exit(1)
}

fs.rmSync(DIST_ENGINE, { recursive: true, force: true })
fs.mkdirSync(DIST_ENGINE, { recursive: true })
fs.cpSync(WEB, DIST_ENGINE, { recursive: true })

const api = path.join(DIST_ENGINE, 'api')
fs.mkdirSync(api, { recursive: true })

const feed = engineFeed()
fs.writeFileSync(path.join(api, 'markers'), JSON.stringify({ locales: ['en', 'ru'], markers: feed }))
fs.writeFileSync(path.join(api, 'saves'), JSON.stringify({ current: null, slot: null, saves: [] }))
fs.writeFileSync(path.join(api, 'place-names'), JSON.stringify(placeNames()))
fs.writeFileSync(
  path.join(api, 'state'),
  JSON.stringify({
    savePath: '',
    characters: [],
    activeSlot: null,
    markerCount: feed.length,
    live: { enabled: false, status: 'off' },
    checked: {},
    at: Date.now(),
  }),
)

const bytes = dirBytes(DIST_ENGINE)
const files = countFiles(DIST_ENGINE)
const hasTiles = fs.existsSync(path.join(DIST_ENGINE, 'tiles', 'manifest.json'))
console.log(
  `[engine-dist] ${files} files, ${(bytes / 1048576).toFixed(1)} MB → dist/engine` +
    ` (${feed.length} markers, tiles ${hasTiles ? 'copied' : 'not present'})`,
)
