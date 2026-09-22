/**
 * Scrape Fextralife build + status/buff pages into
 * public/sourced/open/builds-fextralife.json.
 *
 * Covers the "meta" material: the Builds hub and per-stat build lists
 * (PvE/PvP/beginner/str/dex/int/fai/arc/SotE/community), the New Player Help
 * and Progress Route pages, and the status-effect pages (bleed/frost/madness/…)
 * that describe how the broken builds actually work. Stores headings + body text
 * and the page's build links; each keeps its URL.
 *
 *   node scripts/scrape-fextralife-builds.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'public', 'sourced', 'open', 'builds-fextralife.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) all-knowing/1.0'
const BASE = 'https://eldenring.wiki.fextralife.com'

const SLUGS = [
  'Builds', 'PvE_Builds', 'PvP_Builds', 'Beginner_Builds', 'Strength_Builds',
  'Dexterity_Builds', 'Intelligence_Builds', 'Faith_Builds', 'Arcane_Builds',
  'SOTE_Builds', 'Community_Builds', 'New_Player_Help', 'Game_Progress_Route',
  'Status_Effects', 'Bleed', 'Poison', 'Scarlet_Rot', 'Frostbite', 'Madness',
  'Sleep', 'Death_Blight', 'Buffs_and_Debuffs', 'Runes',
]

const NAV = new Set([
  'Elden_Ring_Wiki', 'Elden_Ring_Tarnished_Edition', 'Patch_Notes', 'Combat', 'Controls', 'Mods',
  'FAQ', 'Nightreign', 'Elden_Ring_Movie', 'Interactive_Map', 'Shadow_of_the_Erdtree_Map',
  'Locations', 'Sites_of_Grace', 'Maps', 'Weapons', 'Armor', 'Talismans', 'Ashes_of_War', 'Shields',
  'Spirit_Ashes', 'Skills', 'Upgrades', 'Damage_Types', 'Items', 'Key_Items', 'Consumables',
  'Magic_Spells', 'Sorceries', 'Incantations', 'Builds', 'Classes', 'Stats', 'Status_Effects',
  'Keepsakes', 'Gestures', 'Rebirth', 'Creatures_and_Enemies', 'NPCs', 'Merchants', 'Side_Quests',
  'Lore', 'Walkthrough', 'Endings', 'New_Game_Plus', 'New_Player_Help', 'Crafting', 'PvP',
  'Covenants', 'World_Information', 'Runes', 'NPC_Summons', 'Great_Runes', 'Demigods', 'Bosses',
])

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
  const sections = []
  const heads = [...body.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)]
  for (let i = 0; i < heads.length; i++) {
    const heading = clean(heads[i][2])
    const from = heads[i].index + heads[i][0].length
    const to = i + 1 < heads.length ? heads[i + 1].index : body.length
    const text = clean(body.slice(from, to)).slice(0, 4000)
    if (heading && text.length >= 20) sections.push({ heading, text })
  }
  const links = []
  for (const m of body.matchAll(/<a[^>]+href="\/([^"#?]+)"[^>]*title="([^"]*)"/g)) {
    const s = decodeURIComponent(m[1])
    const name = m[2].replace(/&#39;/g, "'").trim()
    if (s.startsWith('File:') || s.includes(':') || NAV.has(s) || !name) continue
    if (!links.some((l) => l.slug === s)) links.push({ slug: s, name })
  }
  return { slug, title, url: `${BASE}/${slug}`, sections, links: links.slice(0, 200) }
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
      console.log(`  ${slug}: ${p.sections.length} sections, ${p.links.length} links`)
    } else {
      console.log(`  ${slug}: (missing)`)
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  fs.writeFileSync(OUT, JSON.stringify({ source: 'Fextralife Elden Ring Wiki (builds + status)', pages }, null, 0))
  console.log(`wrote ${OUT}  pages: ${pages.length}  size: ${Math.round(fs.statSync(OUT).size / 1024)} KB`)
}

main().catch((e) => { console.error(e); process.exit(1) })
