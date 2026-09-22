/**
 * Scrape Fextralife boss pages into public/sourced/open/bosses-fextralife.json.
 *
 * Fextralife boss pages carry a "Locations & Drops" infobox with machine-readable
 * attributes (`data-location`, `data-drops`) plus rendered item anchors, so the
 * drop list can be read without guessing. Base + Shadow of the Erdtree.
 *
 *   node scripts/scrape-fextralife-bosses.mjs [--limit N]
 *
 * Source rows keep their page URL. Politeness: bounded concurrency + small delay.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'public', 'sourced', 'open', 'bosses-fextralife.json')
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) all-knowing/1.0'
const BASE = 'https://eldenring.wiki.fextralife.com'

const limitArg = process.argv.indexOf('--limit')
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity

const NAV = new Set([
  'Elden_Ring_Wiki', 'Elden_Ring_Tarnished_Edition', 'Patch_Notes', 'Combat', 'Controls', 'Mods',
  'FAQ', 'Nightreign', 'Elden_Ring_Movie', 'Interactive_Map', 'Shadow_of_the_Erdtree_Map',
  'Locations', 'Sites_of_Grace', 'Maps', 'Weapons', 'Armor', 'Helms', 'Chest_Armor', 'Gauntlets',
  'Leg_Armor', 'Talismans', 'Ashes_of_War', 'Shields', 'Spirit_Ashes', 'Skills', 'Upgrades',
  'Damage_Types', 'Items', 'Key_Items', 'Consumables', 'Magic_Spells', 'Sorceries', 'Incantations',
  'Builds', 'Strength_Builds', 'Beginner_Builds', 'Dexterity_Builds', 'Intelligence_Builds',
  'SOTE_Builds', 'Faith_Builds', 'Arcane_Builds', 'PvE_Builds', 'PvP_Builds', 'Community_Builds',
  'Classes', 'Build_calculator', 'Stats', 'Status_Effects', 'Buffs_and_Debuffs', 'Character_Creation',
  'Keepsakes', 'Gestures', 'Rebirth', 'Creatures_and_Enemies', 'NPCs', 'Merchants', 'Side_Quests',
  'Lore', 'Game_Progress_Route', 'Walkthrough', 'Endings', 'Shadow_Lands_Game_Progress_Route',
  'Shadow_of_the_Erdtree_Walkthrough', 'New_Game_Plus', 'New_Player_Help', 'Crafting',
  'Summon_Range_Calculator', 'Multiplayer_Coop_and_Online', 'PvP', 'Covenants', 'World_Information',
  'Runes', 'NPC_Summons', 'Remembrance_Weapons_(Boss_Weapons)', 'The_Lands_Between', 'Great_Runes',
  'Demigods', 'Bosses', 'Elden_Ring', 'Boss',
])

async function get(url) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      if (r.ok) return await r.text()
      if (r.status === 404) return null
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 400 * (a + 1)))
  }
  return null
}

function plainText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

function parseBoss(html, slug) {
  if (!html.includes('er-boss-locations-section')) return null
  const name = (html.match(/<title>([^<|]+?)\s*\|/) || [])[1]?.trim() || slug.replace(/_/g, ' ')
  const clean = plainText(html)
  const hp = (clean.match(/HP\s*([\d,]+)/) || [])[1] || ''

  const locations = [...html.matchAll(/data-location="([^"]*)"/g)]
    .map((m) => m[1])
    .filter((v, idx, arr) => v && arr.indexOf(v) === idx)

  // Full page body: strategy / combat / lore. Cutscene dialogue is skipped.
  const bodyStart = html.indexOf('mw-parser-output')
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html
  const SKIP = /search|contents|popular wikis|follow us|image gallery|dialogues/i
  const sections = []
  const heads = [...body.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)]
  for (let i = 0; i < heads.length; i++) {
    const heading = plainText(heads[i][2])
    if (!heading || SKIP.test(heading)) continue
    const from = heads[i].index + heads[i][0].length
    const to = i + 1 < heads.length ? heads[i + 1].index : body.length
    const text = plainText(body.slice(from, to)).slice(0, 5000)
    if (text.length >= 40) sections.push({ heading, text })
  }

  const drops = []
  for (const m of html.matchAll(/er-boss-location-drops"[^>]*>([\s\S]*?)<\/div>/g)) {
    const seg = m[1]
    const runes = (seg.match(/([\d,]+)\s*<a href="\/Runes"/) || [])[1]
    if (runes) {
      const r = `${runes} Runes`
      if (!drops.includes(r)) drops.push(r)
    }
    for (const a of seg.matchAll(/<a[^>]+href="\/([^"#?]+)"[^>]*title="([^"]*)"/g)) {
      if (a[1].startsWith('File:')) continue
      const t = a[2].replace(/&#39;/g, "'").trim()
      if (t && t !== 'Runes' && !drops.includes(t)) drops.push(t)
    }
  }

  return { name, locations, drops, hp, sections, url: `${BASE}/${slug}` }
}

async function main() {
  console.log('fetching boss list ...')
  const list = await get(`${BASE}/Bosses`)
  if (!list) throw new Error('could not fetch boss list')

  const slugs = []
  for (const m of list.matchAll(/<a[^>]+href="\/([^"#?]+)"/g)) {
    const s = decodeURIComponent(m[1])
    if (s.includes(':') || s.includes('/') || NAV.has(s)) continue
    if (/^(File|Category|Special|Help|Template)/.test(s)) continue
    if (!slugs.includes(s)) slugs.push(s)
  }
  console.log(`candidate slugs: ${slugs.length}`)

  const out = []
  const CONC = 6
  let i = 0
  async function worker() {
    while (i < slugs.length && out.length < LIMIT) {
      const slug = slugs[i++]
      const html = await get(`${BASE}/${slug}`)
      if (html) {
        const b = parseBoss(html, slug)
        if (b) out.push(b)
      }
      await new Promise((r) => setTimeout(r, 120))
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker))
  out.sort((a, b) => a.name.localeCompare(b.name))

  fs.writeFileSync(OUT, JSON.stringify({ source: 'Fextralife Elden Ring Wiki (Bosses)', bosses: out }, null, 0))
  const withDrops = out.filter((b) => b.drops.length).length
  console.log(`wrote ${OUT}`)
  console.log(`  bosses: ${out.length}  with drops: ${withDrops}`)
  console.log('  sample:', JSON.stringify(out[0]).slice(0, 260))
}

main().catch((e) => { console.error(e); process.exit(1) })
