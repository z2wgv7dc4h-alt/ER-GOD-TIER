/**
 * Turn the scraped Fextralife Game Progress Route sections into structured
 * per-area level bands + checklists:
 *
 *   public/sourced/open/region-levels.json
 *
 * Each Progress Route section reads like:
 *   "West Limgrave :: Level : 1~15 Upgrades : +0 ~ +1 Buy Essential Gear ..."
 * so the level band, upgrade band and the ordered "do this" list are already in
 * the page text — no new fetch, no guessing.
 *
 *   node scripts/build-region-levels.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'public', 'sourced', 'open', 'guides-fextralife.json')
const OUT = path.join(ROOT, 'public', 'sourced', 'open', 'region-levels.json')

const doc = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const page = doc.pages.find((p) => p.slug === 'Game_Progress_Route')
if (!page) throw new Error('Game Progress Route page missing from guides-fextralife.json')

const areas = []
for (const s of page.sections) {
  const m = s.text.match(/Level\s*:?\s*(\d+)\s*[~\-–]\s*(\d+)/i)
  const up = s.text.match(/Upgrades\s*:?\s*\+?\s*(\d+)\s*[~\-–]\s*\+?\s*(\d+)/i)
  if (!m) continue
  // Steps are the remaining prose after the Level/Upgrades prefix.
  const steps = s.text
    .replace(/^.*?Upgrades\s*:?\s*\+?\s*\d+\s*[~\-–]\s*\+?\s*\d+/i, '')
    .replace(/^.*?Level\s*:?\s*\d+\s*[~\-–]\s*\d+/i, '')
    .trim()
  areas.push({
    area: s.heading.trim(),
    levelMin: Number(m[1]),
    levelMax: Number(m[2]),
    upgradeMin: up ? Number(up[1]) : null,
    upgradeMax: up ? Number(up[2]) : null,
    steps,
  })
}

fs.writeFileSync(OUT, JSON.stringify({ source: 'Fextralife Game Progress Route', areas }, null, 0))
console.log(`wrote ${OUT}  areas: ${areas.length}`)
for (const a of areas) console.log(`  ${a.area}: Lv ${a.levelMin}-${a.levelMax}  +${a.upgradeMin}-+${a.upgradeMax}`)
