/**
 * Task 104 — build `src/data/dungeons.json`, the complete minor-dungeon index
 * for the Area hub (Task 98 only authored Stormveil).
 *
 * Everything here is derived from data already in the repo:
 *   - src/data/hunts.json                       boss -> place / region / campaign
 *   - public/sourced/guide/map-extras.json      named locations + kinds + lat/lng
 *   - public/sourced/checklists/locations.json  place -> region
 *   - public/sourced/open/coords.json           named places -> mosaic x/y + world
 *   - public/sourced/open/acquisition.json       item -> nearest place (notable loot)
 *   - src/data/aliases.json                     boss / item names -> canonical slugs
 *
 * The EldenRingMap engine dump (`vendor/elden-ring-map/data/markers.json`) is
 * optional: when present (`ER_ENGINE_MARKERS` or the vendor path) it fills any
 * map coordinate the in-repo dumps miss. It is never required.
 *
 *   node scripts/gen-dungeons.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'src', 'data', 'dungeons.json')
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const hunts = read('src/data/hunts.json')
const mapExtras = read('public/sourced/guide/map-extras.json')
const checklists = read('public/sourced/checklists/locations.json')
const coords = read('public/sourced/open/coords.json')
const acquisition = read('public/sourced/open/acquisition.json').rows
const aliases = read('src/data/aliases.json')

// ---------------------------------------------------------------------------
// Canonical slug lookup (name -> fact id) from the generated alias plane
// ---------------------------------------------------------------------------

const KIND_PRIORITY = { boss: 0, invader: 1, hunt: 2, item: 3 }
function slugLookup(kinds) {
  const rows = aliases
    .filter((r) => kinds.includes(r.kind))
    .sort((a, b) => (KIND_PRIORITY[a.kind] ?? 9) - (KIND_PRIORITY[b.kind] ?? 9))
  const map = new Map()
  for (const r of rows) {
    const n = norm(r.fmgName)
    if (n && !map.has(n)) map.set(n, r.slug)
    for (const a of r.aliases ?? []) {
      const an = norm(a)
      if (an && !map.has(an)) map.set(an, r.slug)
    }
  }
  return map
}
const bossSlug = slugLookup(['boss', 'invader', 'hunt'])
const itemSlug = slugLookup(['item'])

/** Canonical boss id for a hunts row; composite fights fall back to a named part. */
function bossFactId(name) {
  const direct = bossSlug.get(norm(name))
  if (direct) return direct
  for (const part of String(name).split('&')) {
    const bare = part.replace(/\(.*?\)/g, ' ').trim()
    const hit = bossSlug.get(norm(bare))
    if (hit) return hit
  }
  return `hunt:${slug(name)}`
}
const itemFactId = (name) => itemSlug.get(norm(name)) ?? `item:${slug(name)}`

// ---------------------------------------------------------------------------
// Authored legacy dungeons (major areas the hunt list does not key as a place)
// ---------------------------------------------------------------------------

const LEGACY = [
  ['Stormveil Castle', 'Stormveil Castle', 'base'],
  ['Raya Lucaria Academy', 'Liurnia of the Lakes', 'base'],
  ['Caria Manor', 'Liurnia of the Lakes', 'base'],
  ['Volcano Manor', 'Mt. Gelmir', 'base'],
  ['Leyndell, Royal Capital', 'Leyndell, Royal Capital', 'base'],
  ['Subterranean Shunning-Grounds', 'Leyndell, Royal Capital', 'base'],
  ['Redmane Castle', 'Caelid', 'base'],
  ['The Shaded Castle', 'Altus Plateau', 'base'],
  ['Castle Sol', 'Mountaintops of the Giants', 'base'],
  ['Crumbling Farum Azula', 'Crumbling Farum Azula', 'base'],
  ["Miquella's Haligtree", "Miquella's Haligtree", 'base'],
  ['Elphael, Brace of the Haligtree', "Miquella's Haligtree", 'base'],
  ['Hidden Path to the Haligtree', 'Consecrated Snowfield', 'base'],
  ['Mohgwyn Dynasty Mausoleum', 'Mohgwyn Dynasty Mausoleum', 'base'],
  ['Nokron, Eternal City', 'Siofra River', 'base'],
  ['Nokstella, Eternal City', 'Ainsel River', 'base'],
  ['Siofra Aqueduct', 'Siofra River', 'base'],
  ["Night's Sacred Ground", 'Siofra River', 'base'],
  ['Hallowhorn Grounds', 'Siofra River', 'base'],
  ['Uhl Palace Ruins', 'Ainsel River', 'base'],
  ['Grand Cloister', 'Lake of Rot', 'base'],
  ['Deeproot Depths', 'Deeproot Depths', 'base'],
  ['Lake of Rot', 'Lake of Rot', 'base'],
  ['Moonlight Altar', 'Moonlight Altar', 'base'],
  ['Chapel of Anticipation', 'Chapel of Anticipation', 'base'],
  ['Stranded Graveyard', 'Limgrave', 'base'],
  ['Castle Morne', 'Weeping Peninsula', 'base'],
  ['Ruin-Strewn Precipice', 'Liurnia of the Lakes', 'base'],
  ['Ordina, Liturgical Town', 'Consecrated Snowfield', 'base'],
  ['Belurat, Tower Settlement', 'Gravesite Plain', 'sote'],
  ['Castle Ensis', 'Gravesite Plain', 'sote'],
  ['Shadow Keep', 'Scadu Altus', 'sote'],
  ['Enir-Ilim', 'Enir-Ilim', 'sote'],
  ["Midra's Manse", 'Abyssal Woods', 'sote'],
  ['Ruined Forge Lava Intake', 'Gravesite Plain', 'sote'],
  ['Ruined Forge of Starfall Past', 'Scadu Altus', 'sote'],
  ["Taylew's Ruined Forge", 'Rauh Base', 'sote'],
]
const legacyByName = new Map(LEGACY.map(([name, region, campaign]) => [norm(name), { name, region, campaign }]))

// Divine towers carry no hunt row unless a boss lives there; author the region.
const DIVINE_TOWERS = [
  ['Divine Tower of Limgrave', 'Limgrave', 'base'],
  ['Divine Tower of Liurnia', 'Liurnia of the Lakes', 'base'],
  ['Divine Tower of Caelid', "Greyoll's Dragonbarrow", 'base'],
  ['Divine Tower of West Altus', 'Altus Plateau', 'base'],
  ['Divine Tower of East Altus', 'Altus Plateau', 'base'],
  ['Isolated Divine Tower', 'Mountaintops of the Giants', 'base'],
]
const divineByName = new Map(DIVINE_TOWERS.map(([name, region, campaign]) => [norm(name), { name, region, campaign }]))

// ---------------------------------------------------------------------------
// Kind classification
// ---------------------------------------------------------------------------

const MINOR_KINDS = new Set(['catacomb', 'cave', 'tunnel', 'hero-grave', 'evergaol', 'divine-tower', 'ruins', 'gaol'])
const DUNGEON_KINDS = new Set([...MINOR_KINDS, 'legacy'])

// The engine calls these "ruins with a cellar": the tiny ruins that hide a boss.
const RUINS_WITH_CELLAR = new Set(
  ['Waypoint Ruins', 'Kingsrealm Ruins', 'Caelem Ruins', 'Lux Ruins', 'Writheblood Ruins', 'Wyndham Ruins', 'Moorth Ruins'].map(norm),
)

function classify(name) {
  const n = norm(name)
  if (legacyByName.has(n)) return 'legacy'
  if (/evergaol/.test(n)) return 'evergaol'
  if (/divine tower/.test(n)) return 'divine-tower'
  if (/hero s grave|heros grave/.test(n)) return 'hero-grave'
  if (/catacomb|side tomb/.test(n)) return 'catacomb'
  if (/\btunnel\b/.test(n)) return 'tunnel'
  if (/\bcave\b|grotto|hideaway|dragon s pit|coffin fissure/.test(n)) return 'cave'
  if (/gaol/.test(n)) return 'gaol'
  if (RUINS_WITH_CELLAR.has(n)) return 'ruins'
  return null
}

// ---------------------------------------------------------------------------
// Candidates: map-extras named locations + every hunt "place"
// ---------------------------------------------------------------------------

const HINT = {
  catacomb: 'catacomb',
  cave: 'cave',
  tunnel: 'tunnel',
  evergaol: 'evergaol',
  divinetower: 'divine-tower',
  herosgrave: 'hero-grave',
}

const candidates = new Map()
function add(name, hint) {
  const n = norm(name)
  if (!n) return
  const kind = classify(name) ?? hint
  if (!kind || !DUNGEON_KINDS.has(kind)) return
  if (!candidates.has(n)) candidates.set(n, { name: String(name).replace(/\s+/g, ' ').trim(), kind })
}

for (const loc of mapExtras.locations ?? []) add(loc.name, HINT[loc.kind] ?? null)
for (const h of hunts) if (h.place) add(h.place, null)
for (const [name] of LEGACY) add(name, null)
for (const [name] of DIVINE_TOWERS) add(name, null)

// ---------------------------------------------------------------------------
// Region: authored legacy > hunts place > checklist
// ---------------------------------------------------------------------------

const regionByPlace = new Map()
for (const l of checklists) if (l.name) regionByPlace.set(norm(l.name), l.region)
for (const h of hunts) if (h.place) regionByPlace.set(norm(h.place), h.region)

// ---------------------------------------------------------------------------
// Bosses per dungeon
// ---------------------------------------------------------------------------

const bossesByPlace = new Map()
for (const h of hunts) {
  if (!h.place) continue
  const n = norm(h.place)
  const list = bossesByPlace.get(n) ?? []
  if (!list.includes(h.name)) list.push(h.name)
  bossesByPlace.set(n, list)
}

const LEGACY_BOSSES = {
  'stormveil castle': ['Margit, the Fell Omen', 'Godrick the Grafted'],
  'raya lucaria academy': ['Red Wolf of Radagon', 'Rennala, Queen of the Full Moon'],
  'caria manor': ['Royal Knight Loretta'],
  'volcano manor': ['Godskin Noble', 'God-Devouring Serpent & Rykard, Lord of Blasphemy'],
  'leyndell, royal capital': ['Godfrey, First Elden Lord', 'Morgott, the Omen King'],
  'redmane castle': ['Starscourge Radahn'],
  'the shaded castle': ['Elemer of the Briar'],
  'castle sol': ['Commander Niall'],
  'crumbling farum azula': ['Godskin Duo', 'Maliketh, the Black Blade', 'Dragonlord Placidusax'],
  "miquella's haligtree": ['Loretta, Knight of the Haligtree', 'Malenia, Blade of Miquella & Malenia, Goddess of Rot'],
  'mohgwyn dynasty mausoleum': ['Mohg, Lord of Blood'],
  'deeproot depths': ['Lichdragon Fortissax'],
  'moonlight altar': ['Astel, Naturalborn of the Void'],
  'chapel of anticipation': ['Grafted Scion'],
  'stranded graveyard': ['Soldier of Godrick'],
  'castle morne': ['Leonine Misbegotten'],
  'enir-ilim': ['Promised Consort Radahn & Radahn, Consort of Miquella'],
  "midra's manse": ['Midra, Lord of Frenzied Flame'],
  'belurat, tower settlement': ['Divine Beast Dancing Lion'],
  'castle ensis': ['Rellana, Twin Moon Knight'],
  'shadow keep': ['Golden Hippopotamus', 'Messmer the Impaler & Base Serpent Messmer'],
  'divine tower of caelid': ['Godskin Apostle'],
  'hidden path to the haligtree': ['Stray Mimic Tear'],
  'nokron, eternal city': ['Mimic Tear', 'Regal Ancestor Spirit'],
  'nokstella, eternal city': ['Dragonkin Soldier of Nokstella'],
  'subterranean shunning-grounds': ['Mohg, the Omen', 'Esgar, Priest of Blood'],
}

const legacyBossByName = new Map(Object.entries(LEGACY_BOSSES).map(([k, v]) => [norm(k), v]))

function bossesFor(name) {
  const n = norm(name)
  const names = [...(bossesByPlace.get(n) ?? [])]
  for (const b of legacyBossByName.get(n) ?? []) if (!names.includes(b)) names.push(b)
  return names.map((b) => ({ id: bossFactId(b), name: b }))
}

// ---------------------------------------------------------------------------
// Loot (acquisition rows whose `near` names the dungeon)
// ---------------------------------------------------------------------------

const lootByPlace = new Map()
for (const row of acquisition) {
  const hay = norm(row.near || '')
  if (!hay) continue
  for (const n of candidates.keys()) {
    if (n.length >= 6 && hay.includes(n)) {
      const list = lootByPlace.get(n) ?? []
      if (!list.some((x) => x.name === row.name)) list.push({ id: itemFactId(row.name), name: row.name })
      lootByPlace.set(n, list)
    }
  }
}
// Hand-checked notable pickups, keyed by dungeon.
const LOOT = {
  'fringefolk hero s grave': ['Dragon Communion Seal'],
  'deathtouched catacombs': ['Uchigatana'],
  'black knife catacombs': ['Black Knifeprint'],
  'sellia crystal tunnel': ['Sword of St. Trina'],
  'lakeside crystal cave': ['Spear Talisman'],
  'gael tunnel': ['Moonveil', 'Ash of War: Cragblade'],
  'consecrated snowfield catacombs': ["Helphen's Steeple"],
  'moonlight altar': ['Black Knife Tiche'],
  'raya lucaria academy': ['Radagon Icon'],
  'caria manor': ['Sword of Night and Flame'],
  'volcano manor': ['Serpent’s Amnion'],
}
for (const [key, names] of Object.entries(LOOT)) {
  const list = lootByPlace.get(key) ?? []
  for (const nm of names) if (!list.some((x) => norm(x.name) === norm(nm))) list.push({ id: itemFactId(nm), name: nm })
  lootByPlace.set(key, list)
}

// ---------------------------------------------------------------------------
// Requirements (key / lever / imp-seal counts, when known)
// ---------------------------------------------------------------------------

const REQUIREMENTS = {
  'fringefolk hero s grave': { keys: ['Stonesword Key'], levers: 0, impSeals: 2 },
  'raya lucaria academy': { keys: ['Academy Glintstone Key'], levers: 0, impSeals: 0 },
  'sellia hideaway': { keys: ['Sellian Sealbreaker'], levers: 0, impSeals: 1 },
  "miquella's haligtree": { keys: ['Haligtree Secret Medallion'], levers: 0, impSeals: 0 },
  'mohgwyn dynasty mausoleum': { keys: ['Pureblood Knight’s Medal'], levers: 0, impSeals: 0 },
  'leyndell catacombs': { keys: [], levers: 1, impSeals: 0 },
  'auriza hero s grave': { keys: [], levers: 0, impSeals: 1 },
  'gelmir hero s grave': { keys: [], levers: 0, impSeals: 1 },
}

const requirementsByName = new Map(Object.entries(REQUIREMENTS).map(([k, v]) => [norm(k), v]))

// ---------------------------------------------------------------------------
// Coordinates: coords.json -> engine dump -> map-extras (overworld/underground)
// ---------------------------------------------------------------------------

const coordByName = new Map()
for (const c of coords) if (!coordByName.has(norm(c.name))) coordByName.set(norm(c.name), c)

function fromCoords(name) {
  const n = norm(name)
  let hit = coordByName.get(n)
  if (!hit) for (const [key, c] of coordByName) if (key.startsWith(n) || n.startsWith(key)) { hit = c; break }
  if (!hit) for (const [key, c] of coordByName) if (key.includes(n) || n.includes(key)) { hit = c; break }
  return hit ? { x: hit.x, y: hit.y, world: hit.world } : null
}

const ENGINE_PATHS = [process.env.ER_ENGINE_MARKERS, path.join(ROOT, 'vendor', 'elden-ring-map', 'data', 'markers.json')].filter(Boolean)
let engineByName = new Map()
for (const p of ENGINE_PATHS) {
  try {
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'))
    for (const m of doc.markers ?? []) {
      const en = (m.names && m.names.en) || ''
      if (en && m.px != null && !engineByName.has(norm(en))) engineByName.set(norm(en), m)
    }
    console.log(`engine markers: ${engineByName.size} named rows from ${p}`)
    break
  } catch { /* optional */ }
}
function fromEngine(name) {
  const m = engineByName.get(norm(name))
  if (!m) return null
  const world = m.master === 'M01' ? 'underground' : m.master === 'M10' ? 'shadow' : 'overworld'
  return { x: (m.px / 10496) * 100, y: (m.py / 10496) * 100, world }
}

// Affine fits (map-extras world coords -> engine mosaic px) from the engine
// graces; used only when the two in-repo dumps above miss. Percent = px/10496.
const AFFINE = {
  overworld: { px: [-0.029507, 41.144689, -440.298062], py: [-41.190138, -0.000362, -693.419377] },
  underground: { px: [-0.119306, 40.702704, -399.656229], py: [-41.337836, -0.160743, -696.870354] },
}
const mapExtraByCode = new Map()
for (const loc of [...(mapExtras.locations ?? []), ...(mapExtras.graces ?? [])]) {
  const n = norm(loc.name)
  if (n && !mapExtraByCode.has(n)) mapExtraByCode.set(n, loc)
}
function fromMapExtras(name) {
  const loc = mapExtraByCode.get(norm(name))
  if (!loc || loc.lat == null) return null
  const a = AFFINE[loc.code]
  if (!a) return null
  const px = a.px[0] * loc.lat + a.px[1] * loc.lng + a.px[2]
  const py = a.py[0] * loc.lat + a.py[1] * loc.lng + a.py[2]
  return { x: (px / 10496) * 100, y: (py / 10496) * 100, world: loc.code }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

// Keep Stormveil's id aligned with the Task 80 authored `knowledge/dungeons.ts`
// row so the entity graph has one Stormveil, not two.
const ID_OVERRIDES = { 'stormveil castle': 'stormveil' }

const out = []
for (const { name, kind } of candidates.values()) {
  const n = norm(name)
  const curated = legacyByName.get(n) ?? divineByName.get(n)
  const region = curated?.region ?? regionByPlace.get(n) ?? null
  if (!region) continue // never invent a region

  const coord = fromCoords(name) ?? fromEngine(name) ?? fromMapExtras(name)
  const hunt = hunts.find((h) => h.place && norm(h.place) === n)
  const campaign = curated?.campaign ?? hunt?.campaign ?? (coord?.world === 'shadow' ? 'sote' : 'base')
  const req = requirementsByName.get(n) ?? { keys: [], levers: 0, impSeals: 0 }

  out.push({
    id: ID_OVERRIDES[n] ?? slug(name),
    name,
    kind,
    region,
    world: coord?.world ?? (campaign === 'sote' ? 'shadow' : 'overworld'),
    x: coord ? Math.round(coord.x * 100) / 100 : null,
    y: coord ? Math.round(coord.y * 100) / 100 : null,
    bosses: bossesFor(name),
    loot: (lootByPlace.get(n) ?? []).slice(0, 6),
    keys: req.keys,
    levers: req.levers,
    impSeals: req.impSeals,
    dlc: campaign === 'sote',
  })
}

out.sort((a, b) => a.name.localeCompare(b.name))
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n')

const byKind = {}
for (const d of out) byKind[d.kind] = (byKind[d.kind] ?? 0) + 1
console.log(`wrote ${OUT}`)
console.log(`  ${out.length} dungeons  kinds=${JSON.stringify(byKind)}`)
console.log(`  ${new Set(out.flatMap((d) => d.bosses.map((b) => b.id))).size} unique bosses  ${out.filter((d) => d.dlc).length} dlc  ${out.filter((d) => d.x == null).length} no-coords`)
