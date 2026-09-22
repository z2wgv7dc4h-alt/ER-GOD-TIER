/**
 * Scrape a curated set of Fextralife Elden Ring guide pages into
 * public/sourced/open/guides-fextralife.json.
 *
 * These are mechanics/guide pages (upgrades, smithing stones, bell bearings,
 * progress route, stats, damage types, …). Only the page's headings + body text
 * and head-link lists are stored (each page keeps its URL); no wiki HTML.
 *
 *   node scripts/scrape-fextralife-guides.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'public', 'sourced', 'open', 'guides-fextralife.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) all-knowing/1.0'
const BASE = 'https://eldenring.wiki.fextralife.com'

const SLUGS = [
  'Upgrades', 'Smithing_Stones', 'Somber_Smithing_Stones', 'Bell_Bearings',
  'Game_Progress_Route', 'Side_Quests', 'Stats', 'Damage_Types', 'Status_Effects',
  'Ashes_of_War', 'Talismans', 'Spirit_Ashes', 'Incantations', 'Sorceries',
  'Weapons', 'Shields', 'Armor', 'Key_Items', 'Consumables', 'Merchants',
  'Crafting', 'Buffs_and_Debuffs', 'Great_Runes', 'Remembrance_Weapons_(Boss_Weapons)',
  'Keepsakes', 'Classes',
]

const clean = (s) =>
  s.replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()

function parsePage(html, slug) {
  const title = (html.match(/<title>([^<|]+?)\s*\|/) || [])[1]?.trim() || slug.replace(/_/g, ' ')
  const start = html.indexOf('mw-parser-output')
  const body = start >= 0 ? html.slice(start) : html
  const heads = [...body.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)]
  const sections = []
  for (let i = 0; i < heads.length; i++) {
    const heading = clean(heads[i][2])
    const from = heads[i].index + heads[i][0].length
    const to = i + 1 < heads.length ? heads[i + 1].index : body.length
    const text = clean(body.slice(from, to)).slice(0, 4000)
    if (!heading || text.length < 20) continue
    sections.push({ heading, text })
  }
  return { slug, title, url: `${BASE}/${slug}`, sections }
}

async function get(url) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      if (r.ok) return await r.text()
      if (r.status === 404) return null
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 500 * (a + 1)))
  }
  return null
}

async function main() {
  const pages = []
  for (const slug of SLUGS) {
    const html = await get(`${BASE}/${slug}`)
    if (html) {
      const p = parsePage(html, slug)
      if (p.sections.length) pages.push(p)
      console.log(`  ${slug}: ${p.sections.length} sections`)
    } else {
      console.log(`  ${slug}: (missing)`)
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  fs.writeFileSync(OUT, JSON.stringify({ source: 'Fextralife Elden Ring Wiki (guide pages)', pages }, null, 0))
  const kb = Math.round(fs.statSync(OUT).size / 1024)
  console.log(`wrote ${OUT}  pages: ${pages.length}  size: ${kb} KB`)
}

main().catch((e) => { console.error(e); process.exit(1) })
