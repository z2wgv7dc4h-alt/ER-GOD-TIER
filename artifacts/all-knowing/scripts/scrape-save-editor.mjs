/**
 * Pull the Elden Ring Save Editor's JSON name↔hex-ID tables (alfizari) into
 * public/sourced/open/save-ids.json — a reference for mapping inventory items /
 * flags by id. Each `ids` map is {name: hexId}; graces/bosses/maps keep their
 * source shapes.
 *
 *   node scripts/scrape-save-editor.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'public', 'sourced', 'open', 'save-ids.json')
const BASE = 'https://raw.githubusercontent.com/alfizari/Elden-Ring-Save-Editor/main/src/Resources/Json/'
const UA = 'Mozilla/5.0 all-knowing/1.0'

const ID_FILES = ['weapons', 'armor', 'talisman', 'aow', 'goods', 'cookbooks', 'whetblades']
const RAW_FILES = ['graces', 'bosses', 'maps']

async function get(name) {
  const r = await fetch(`${BASE}${name}.json`, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`${name} ${r.status}`)
  return JSON.parse(await r.text())
}

const doc = { source: 'alfizari/Elden-Ring-Save-Editor src/Resources/Json', ids: {}, raw: {} }
for (const name of ID_FILES) {
  try {
    const j = await get(name)
    const rows = j && typeof j === 'object' && !Array.isArray(j) ? j : {}
    // normalize hex "80 97 FA 01" -> "0x0197FA80"
    const out = {}
    for (const [k, v] of Object.entries(rows)) {
      if (typeof v === 'string' && /[0-9a-f]{2}( [0-9a-f]{2})*/i.test(v)) {
        const bytes = v.trim().split(/\s+/).reverse().join('')
        out[k] = '0x' + bytes.toUpperCase()
      }
    }
    doc.ids[name] = out
    console.log(`  ${name}: ${Object.keys(out).length}`)
  } catch (e) { console.log(`  ${name}: ${e.message}`) }
}
for (const name of RAW_FILES) {
  try {
    doc.raw[name] = await get(name)
  } catch (e) { console.log(`  ${name}: ${e.message}`) }
}

fs.writeFileSync(OUT, JSON.stringify(doc, null, 0))
console.log(`wrote ${OUT}  ${Math.round(fs.statSync(OUT).size / 1024)} KB`)
