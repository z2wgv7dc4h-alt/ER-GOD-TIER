#!/usr/bin/env node
// Task 130 §1 — build the canonical boss roster.
//
//   node scripts/build-boss-roster.mjs
//
// One record per boss *encounter* (a boss fought in two places is two records),
// merged from every boss dataset the repo already ships and written to
// `src/data/bosses.json` (committed). The record's `id` is the canonical fact id
// shared with the entity graph, so the roster can drive Setup, progress, the
// Area hub, the Library and the completion "Missing" views off one authority.
//
// Nothing is invented: a name only enters the roster because some source row
// carries it. A field is only set when a source has it.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))

const hunts = read('src/data/hunts.json')
const dungeons = read('src/data/dungeons.json')
const aliases = read('src/data/aliases.json')
const entityIndex = read('public/sourced/entity-index.json').records ?? {}
const checklistBosses = read('public/sourced/checklists/bosses.json')
const fanBosses = read('public/sourced/open/fanapi/bosses.json')
const armoryBosses = read('public/sourced/armory-bosses.json')
const fextBosses = read('public/sourced/open/bosses-fextralife.json').bosses ?? []
const bossList = read('public/sourced/open/boss-list.json')
const bossPins = read('public/sourced/open/boss-pins.json')
const engineMarkers = read('public/sourced/open/engine-markers.json').markers ?? []
const npcCombat = read('public/sourced/npc-combat.json')
const enemyCombat = read('public/sourced/enemy-combat.json')
const wikiBosses = read('public/sourced/open/wiki-db/boss.json').records ?? []
const graceXyz = read('public/sourced/open/grace-xyz.json')
// Task 173 §10 — the one loot list, shared with src/knowledge/dropNames.ts.
const dropAliasDoc = read('src/data/drop-aliases.json')

// ---------------------------------------------------------------------------
// Name / id plane
// ---------------------------------------------------------------------------

const ENTITY_PAREN = /\s*\((?:x\d|[^)]*)\)\s*/g

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/&#39;|'|’|`/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\b(the|of|and|a)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip parenthetical qualifiers / "(x2)" and composite "&"/"and" joins. */
function coreName(name) {
  return String(name ?? '')
    .split(/\s*(?:&| and | \+ )\s*/i)[0]
    .replace(ENTITY_PAREN, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slug(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Entity index boss records: name -> canonical id. Catalog `boss:`/`invader:`
// ids are kept apart from `hunt:` rows so a composite hunt can still prefer the
// authored boss it contains.
const catalogByName = new Map()
const huntEntityByName = new Map()
const entityBossById = new Map()
for (const [id, record] of Object.entries(entityIndex)) {
  if (record.kind !== 'boss') continue
  // Per-encounter ids (`<group>--<place>`) are this script's own output; reading
  // them back would nest ids on the next run. Resolve names to the shared id only.
  if (id.includes('--')) continue
  entityBossById.set(id, record)
  const target = id.startsWith('hunt:') ? huntEntityByName : catalogByName
  for (const variant of [record.name, coreName(record.name)]) {
    const key = norm(variant)
    if (key && !target.has(key)) target.set(key, id)
  }
}

// Generated alias plane: FMG name + aliases -> canonical id. `slug` already
// carries the `kind:` prefix for engine rows.
// Authored/engine boss-invader names and hunt names are kept apart so a
// composite fight prefers the canonical boss it contains over its hunt row.
const aliasNameToBoss = new Map()
const aliasNameToHunt = new Map()
for (const row of aliases) {
  if (!['boss', 'invader', 'hunt'].includes(row.kind)) continue
  const id = row.slug?.includes(':') ? row.slug : `${row.kind}:${row.slug}`
  // Rows derived from this script's own output (encounter ids, roster name
  // fallbacks, aka ids) would feed the roster back into itself on the next run.
  if (id.includes('--') || row.source === 'boss-roster') continue
  const target = row.kind === 'hunt' ? aliasNameToHunt : aliasNameToBoss
  for (const name of [row.fmgName, ...(row.aliases ?? [])]) {
    const key = norm(name)
    if (key && !target.has(key)) target.set(key, id)
  }
}
// Hunts carry their own encounter-level ids for field bosses the graph knows.
for (const hunt of hunts) {
  const key = norm(hunt.name)
  if (key && !aliasNameToHunt.has(key)) aliasNameToHunt.set(key, hunt.id)
}

/** Token overlap for a fuzzy last resort (e.g. source typos). */
function similar(a, b) {
  const at = new Set(norm(a).split(' ').filter(Boolean))
  const bt = new Set(norm(b).split(' ').filter(Boolean))
  if (!at.size || !bt.size) return 0
  let shared = 0
  for (const token of at) if (bt.has(token)) shared++
  return shared / Math.max(at.size, bt.size)
}

const entityNames = [...catalogByName.entries(), ...huntEntityByName.entries()]

function splitFight(name) {
  return String(name)
    .split(/\s*(?:&| and | \+ )\s*/i)
    .flatMap((part) => [part, coreName(part)])
    .filter(Boolean)
}

/** Drop a trailing "Duo / Trio / Twin(s) / (x2)" qualifier. */
function withoutGroupSuffix(name) {
  return coreName(name)
    .replace(/\s*\b(duo|trio|quad|twin|twins|x\d)\b\s*$/i, '')
    .replace(/\s+\band\b\s*$/i, '')
    .trim()
}

/**
 * Source misspellings / spacing variants of a real boss (checklist + FanAPI dumps).
 * Without these the roster mints a phantom second boss for the same fight.
 */
const MISSPELLED = new Map(
  [
    ['Godfrey the Grafted', 'Godefroy the Grafted'],
    ['Erdtree Burial Watchdogs', 'Erdtree Burial Watchdog'],
    ['Deathrite Bird', 'Death Rite Bird'],
    ['Spirit-Caller Snail', 'Spiritcaller Snail'],
    ['Adan, Theif of Fire', 'Adan, Thief of Fire'],
  ].map(([typo, real]) => [norm(typo), real]),
)

/**
 * Separate bosses whose names the fuzzy resolver would fold into another one:
 * the wiki gives each its own page, drops and arena.
 */
const DISTINCT_BOSSES = new Map(
  [
    ['Astel, Stars of Darkness', 'boss:astel-stars-of-darkness'], // not Astel, Naturalborn of the Void
    ['Bloodhound Knight', 'boss:bloodhound-knight'], // Lakeside Crystal Cave; not Darriwil
    ['Frenzied Duelist', 'boss:frenzied-duelist'], // Gaol Cave; not a Grave Warden Duelist
    ['Putrid Grave Warden Duelist', 'boss:putrid-grave-warden-duelist'], // Consecrated Snowfield catacomb
  ].map(([name, id]) => [norm(name), id]),
)

/** Best canonical id for a source name, or null when the roster must mint one. */
function canonicalId(rawName) {
  const distinct = DISTINCT_BOSSES.get(norm(rawName))
  if (distinct) return distinct
  const name = MISSPELLED.get(norm(rawName)) ?? rawName
  const group = withoutGroupSuffix(name)
  // Try the group-stripped / composite-part forms first so a name like
  // "Mad Pumpkin Head Duo" resolves to the catalog boss, never to a previously
  // minted `boss:mad-pumpkin-head-duo` row in the index.
  const candidates = [group, ...splitFight(group), name, coreName(name), ...splitFight(name)]
  // A catalog boss the name contains (a composite fight, or a qualified name)
  // always wins over the hunt row for the composite.
  for (const candidate of candidates) {
    const key = norm(candidate)
    if (!key) continue
    const hit = catalogByName.get(key) ?? aliasNameToBoss.get(key)
    if (hit) return hit
  }
  for (const candidate of candidates) {
    const key = norm(candidate)
    if (!key) continue
    const hit = huntEntityByName.get(key) ?? aliasNameToHunt.get(key)
    if (hit) return hit
  }
  // Fuzzy fallback: a near-identical known boss, or a part of a composite fight.
  let best = null
  let bestScore = 0.8
  for (const [knownName, id] of entityNames) {
    const score = similar(name, knownName)
    if (score > bestScore) {
      bestScore = score
      best = id
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Region / campaign
// ---------------------------------------------------------------------------

const SOTE_REGIONS = new Set([
  'Gravesite Plain',
  'Scadu Altus',
  'Scaduview',
  'Ancient Ruins of Rauh',
  'Rauh Base',
  'Cerulean Coast',
  "Charo's Hidden Grave",
  'Jagged Peak',
  'Abyssal Woods',
  'Enir-Ilim',
  'Belurat, Tower Settlement',
  'Castle Ensis',
  'Shadow Keep',
  "Midra's Manse",
  'Church of the Bud',
  'Finger Ruins of Dheo',
  'Finger Ruins of Miyr',
  'Stone Coffin Fissure',
  'Scadutree Base',
  'Hinterland',
  'Recluses’ River',
  "Recluses' River",
  'Shadow of the Erdtree',
])

// Every region the base hunts carry, longest first so sub-regions win.
const BASE_REGIONS = [
  'Limgrave',
  'Weeping Peninsula',
  'Stormveil Castle',
  'Liurnia of the Lakes',
  'Moonlight Altar',
  'Academy of Raya Lucaria',
  'Caelid',
  "Greyoll's Dragonbarrow",
  'Altus Plateau',
  'Capital Outskirts',
  'Mt. Gelmir',
  'Volcano Manor',
  'Leyndell, Royal Capital',
  'Leyndell, Ashen Capital',
  'Forbidden Lands',
  'Mountaintops of the Giants',
  'Crumbling Farum Azula',
  'Consecrated Snowfield',
  "Miquella's Haligtree",
  'Siofra River',
  'Mohgwyn Dynasty Mausoleum',
  'Ainsel River',
  'Deeproot Depths',
  'Nokron, Eternal City',
  'Lake of Rot',
  'Subterranean Shunning-Grounds',
]

const ALL_REGIONS = [...BASE_REGIONS, ...SOTE_REGIONS].sort((a, b) => b.length - a.length)

/** Region hints for location text that does not name a region directly. */
const REGION_HINTS = [
  [/dragonbarrow/i, "Greyoll's Dragonbarrow"],
  [/caelid|aeonia|sellia|redmane|bestial sanctum|caelum/i, 'Caelid'],
  [/stormveil|stormhill|stormfoot/i, 'Stormveil Castle'],
  [/raya lucaria|liurnia|caria|three sisters|manus|scenic isle|village of the albinaurics/i, 'Liurnia of the Lakes'],
  [/weeping peninsula|castle morne|tombsward|morne/i, 'Weeping Peninsula'],
  [/limgrave|coastal cave|highroad|summonwater|waypoint|stranded graveyard|mistwood/i, 'Limgrave'],
  [/gelmir|volcano manor|seethewater|fort laiedd|wyndham/i, 'Mt. Gelmir'],
  [/altus|auriza|shaded castle|lux ruins|hermit village|old altus|sealed tunnel/i, 'Altus Plateau'],
  [/leyndell|capital|elden throne|ashen/i, 'Leyndell, Royal Capital'],
  [/forbidden lands/i, 'Forbidden Lands'],
  [/mountaintops|castel sol|flame peak|giant|snowfield|consecrated|spiritcaller/i, 'Mountaintops of the Giants'],
  [/farum azula/i, 'Crumbling Farum Azula'],
  [/haligtree|elphael/i, "Miquella's Haligtree"],
  [/siofra/i, 'Siofra River'],
  [/ainsel|lake of rot|grand cloister|moonlight/i, 'Ainsel River'],
  [/deeproot/i, 'Deeproot Depths'],
  [/nokron/i, 'Nokron, Eternal City'],
  [/mohgwyn/i, 'Mohgwyn Dynasty Mausoleum'],
  [/gravesite/i, 'Gravesite Plain'],
  [/scadu altus|moorth|rauh base|rauh ruins/i, 'Scadu Altus'],
  [/rauh/i, 'Ancient Ruins of Rauh'],
  [/scaduview|scadutree|shadow keep/i, 'Scaduview'],
  [/ancient ruins of rauh/i, 'Ancient Ruins of Rauh'],
  [/cerulean/i, 'Cerulean Coast'],
  [/charo/i, "Charo's Hidden Grave"],
  [/jagged peak/i, 'Jagged Peak'],
  [/abyssal/i, 'Abyssal Woods'],
  [/enir-ilim|belurat|tower settlement/i, 'Enir-Ilim'],
  [/shadow of the erdtree|realm of shadow|land of shadow/i, 'Shadow of the Erdtree'],
]

const DUNGEON_BY_NAME = new Map()
for (const d of dungeons) DUNGEON_BY_NAME.set(norm(d.name), d)

function regionFromText(...texts) {
  const text = texts.filter(Boolean).join(' · ')
  if (!text) return null
  for (const region of ALL_REGIONS) {
    if (norm(text).includes(norm(region))) return region
  }
  const dungeon = DUNGEON_BY_NAME.get(norm(text))
  if (dungeon?.region) return dungeon.region
  for (const [re, region] of REGION_HINTS) if (re.test(text)) return region
  return null
}

function isSote(text) {
  const region = regionFromText(text)
  if (region && SOTE_REGIONS.has(region)) return true
  return /shadow of the erdtree|realm of shadow|land of shadow|scadutree|dlc/i.test(String(text ?? ''))
}

// ---------------------------------------------------------------------------
// Combat / drops / coords indexes
// ---------------------------------------------------------------------------

function combatIndex(rows) {
  const map = new Map()
  for (const row of rows) {
    const keys = [row.factId && row.factId.split(':')[1], row.name, row.paramName]
    for (const key of keys) {
      const n = norm(key)
      if (n && !map.has(n)) map.set(n, row)
    }
  }
  return map
}
const combatById = new Map()
for (const row of [...npcCombat, ...enemyCombat]) {
  if (row.factId && !combatById.has(row.factId)) combatById.set(row.factId, row)
}
const combatByName = combatIndex([...npcCombat, ...enemyCombat])

function combatFor(id, name) {
  const byId = combatById.get(id)
  if (byId) return byId
  const byName = combatByName.get(norm(name))
  if (byName) return byName
  for (const part of String(name).split(/\s*(?:&| and | \+ )\s*/i)) {
    const hit = combatByName.get(norm(part))
    if (hit) return hit
  }
  return null
}

const fextByName = new Map()
for (const row of fextBosses) {
  const key = norm(row.name)
  if (key && !fextByName.has(key)) fextByName.set(key, row)
}

const dropsByName = new Map()
function addDrops(name, list) {
  if (!Array.isArray(list)) return
  const key = norm(name)
  const bucket = dropsByName.get(key) ?? new Set()
  for (const drop of list) if (drop) bucket.add(String(drop))
  dropsByName.set(key, bucket)
}
for (const row of checklistBosses) addDrops(row.name, row.drops)
for (const row of fanBosses) addDrops(row.name, row.drops)
for (const row of fextBosses) addDrops(row.name, row.drops)
for (const record of entityBossById.values()) if (record.drops) addDrops(record.name, record.drops)

// Coords: boss-pins then engine markers then the entity record map. All three
// carry map-percent coordinates (px / 10496 * 100 for engine markers).
const pinByName = new Map()
for (const pin of bossPins) if (!pinByName.has(norm(pin.name))) pinByName.set(norm(pin.name), pin)
const markerByName = new Map()
for (const marker of engineMarkers) {
  if (marker.cat !== 'boss') continue
  if (!markerByName.has(norm(marker.name))) markerByName.set(norm(marker.name), marker)
}

function coordsFor(id, name) {
  const pin = pinByName.get(norm(name))
  if (pin && typeof pin.x === 'number' && typeof pin.y === 'number') {
    return { x: round2(pin.x), y: round2(pin.y), map: pin.map ?? null }
  }
  const marker = markerByName.get(norm(name))
  if (marker && typeof marker.px === 'number' && typeof marker.py === 'number') {
    return { x: round2((marker.px / 10496) * 100), y: round2((marker.py / 10496) * 100), map: marker.map ?? null }
  }
  const record = entityBossById.get(id)
  // Map percent only: some index records carry a legacy dungeon's local world
  // coordinates (x = -370), which are not a pin.
  const inMap = (v) => typeof v === 'number' && v >= 0 && v <= 100
  if (record?.map && inMap(record.map.x) && inMap(record.map.y)) {
    return { x: round2(record.map.x), y: round2(record.map.y), map: record.map.map ?? null }
  }
  return null
}
const round2 = (n) => Math.round(n * 100) / 100

// Graces for "nearest grace" (map-percent coordinates).
const graceCoords = read('public/sourced/open/coords.json')
  .filter((row) => row.kind === 'grace' && typeof row.x === 'number' && typeof row.y === 'number')
  .map((row) => ({ name: row.name, region: regionFromText(row.name) ?? '', x: row.x, y: row.y }))

const graceByRegion = new Map()
for (const grace of graceCoords) {
  const list = graceByRegion.get(grace.region) ?? []
  list.push(grace)
  graceByRegion.set(grace.region, list)
}

function nearestGrace(region, coords) {
  if (!coords) return null
  const pool = graceByRegion.get(region) ?? graceCoords
  let best = null
  let bestDist = Infinity
  for (const grace of pool) {
    const dx = grace.x - coords.x
    const dy = grace.y - coords.y
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      best = grace
    }
  }
  // 6% of the map is roughly "the same area"; beyond that a grace is misleading.
  if (!best || bestDist > 36) return null
  return best.name
}

function fextGrace(name) {
  const row = fextByName.get(norm(name))
  if (!row) return null
  const text = (row.sections ?? []).map((s) => s.text).join(' ')
  const match = text.match(/Closest Site of Grace:\s*([A-Za-z0-9'’.,\- ]+?)(?:\s+(?:Multiplayer|You can|This|From|Map|Talk)|$)/i)
  return match ? match[1].trim() : null
}

// ---------------------------------------------------------------------------
// Tier / required
// ---------------------------------------------------------------------------

const GREAT_RUNE_BOSSES = new Set([
  'godrick', 'rennala', 'radahn', 'rykard', 'morgott', 'mohg', 'malenia',
])
const REMEMBRANCE_BOSSES = new Set([
  'godrick', 'rennala', 'radahn', 'rykard', 'morgott', 'malenia', 'mohg', 'fortissax',
  'fire-giant', 'placidusax', 'maliketh', 'godfrey', 'radagon', 'ancestor-spirit',
  'regal-ancestor', 'astel', 'divine-beast', 'rennala-sote', 'messmer', 'midra',
  'consort', 'bayle', 'metyr', 'romina',
])
// Fixed main-path fights every run must clear to finish the base game.
const REQUIRED_ENDING = new Set([
  'boss:morgott', 'boss:fire-giant', 'boss:godskin-duo', 'boss:maliketh',
  'boss:godfrey', 'boss:radagon', 'boss:radagon-elden-beast', 'boss:elden-beast',
])

const ARMORY_TIER = {
  Remembrance: 'remembrance',
  'Great Enemy': 'major',
  Mandatory: 'major',
  Boss: 'major',
  Tutorial: 'mini',
  Optional: 'field',
  Field: 'field',
  Night: 'field',
  Tarnished: 'field',
  Evergaol: 'evergaol',
  Cave: 'dungeon',
  Catacombs: 'dungeon',
}
const armoryTypeByName = new Map()
for (const row of armoryBosses) if (!armoryTypeByName.has(norm(row.name))) armoryTypeByName.set(norm(row.name), row.type)

const TIER_RANK = { 'great-rune': 0, remembrance: 1, major: 2, evergaol: 3, dungeon: 4, field: 5, mini: 6 }

function tierFor(id, name, drops, location) {
  const type = armoryTypeByName.get(norm(name))
  const dropText = drops.map((d) => d.toLowerCase()).join(' ')
  if (GREAT_RUNE_BOSSES.has(id.split(':')[1]) || /great rune/.test(dropText)) return 'great-rune'
  if (REMEMBRANCE_BOSSES.has(id.split(':')[1]) || /remembrance/.test(dropText)) return 'remembrance'
  if (type === 'Evergaol' || /evergaol/i.test(location ?? '')) return 'evergaol'
  if (type && ARMORY_TIER[type]) return ARMORY_TIER[type]
  if (type === 'Field' || type === 'Night' || type === 'Tarnished') return 'field'
  return 'major'
}

// ---------------------------------------------------------------------------
// Encounter assembly
// ---------------------------------------------------------------------------

const encounters = new Map() // key -> record
const sourceFailures = []
const sourceHits = {}

function hit(source) {
  sourceHits[source] = (sourceHits[source] ?? 0) + 1
}

function recordKey(id, name, location) {
  const place = norm(location) || norm(regionFromText(location)) || norm(name)
  return `${id}|${place}`
}

function upsert({ id, name, campaign, region, location, grace, tier, requiredForEnding, drops, coords, hp, sources, encounterKey, flag, sourceName }) {
  const key = encounterKey ?? recordKey(id, name, location)
  const existing = encounters.get(key)
  if (existing) {
    existing.drops = [...new Set([...existing.drops, ...drops])]
    if (!existing.coords && coords) existing.coords = coords
    if (!existing.hp && hp) existing.hp = hp
    if (!existing.grace && grace) existing.grace = grace
    if (!existing.flag && flag) existing.flag = flag
    if (existing.region === 'The Lands Between' && region !== 'The Lands Between') existing.region = region
    if (TIER_RANK[tier] < TIER_RANK[existing.tier]) existing.tier = tier
    if (requiredForEnding) existing.requiredForEnding = true
    existing.sources = [...new Set([...existing.sources, ...sources])]
    return existing
  }
  const record = {
    id,
    name,
    campaign: campaign ?? (isSote(`${region} ${location}`) ? 'sote' : 'base'),
    region,
    location,
    grace: grace ?? null,
    tier,
    requiredForEnding: Boolean(requiredForEnding),
    drops,
    coords: coords ?? null,
    hp: hp ?? null,
    sources,
    flag: flag ?? null,
    sourceName: sourceName ?? null,
  }
  encounters.set(key, record)
  return record
}

function hpFromCombat(row) {
  const hp = row?.baseHp
  if (typeof hp === 'number' && hp > 0) return hp
  return null
}
function hpFromFext(name) {
  const row = fextByName.get(norm(name))
  if (!row?.hp) return null
  const n = Number(String(row.hp).replace(/[^0-9]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

// 1. Hunts: the encounter spine (region + campaign + place).
for (const hunt of hunts) {
  const id = canonicalId(hunt.name) ?? hunt.id
  const entity = entityBossById.get(id) ?? entityBossById.get(hunt.id)
  const name = entity?.name ?? hunt.name
  // A boss hunted in several places must not borrow the boss's general location
  // ("Liurnia of the Lakes" for the Limgrave Night's Cavalry): use this hunt's region.
  const multiSpawn = hunts.filter((h) => norm(h.name) === norm(hunt.name)).length > 1
  const location = hunt.place || (multiSpawn ? hunt.region : regionFromText(entity?.location) || hunt.region)
  const coords = coordsFor(id, name)
  const combat = combatFor(id, name)
  const drops = [...(dropsByName.get(norm(name)) ?? [])]
  const tier = tierFor(id, name, drops, hunt.place || location)
  const record = upsert({
    id, name, campaign: hunt.campaign, region: hunt.region, location,
    grace: fextGrace(name) ?? nearestGrace(hunt.region, coords),
    tier, requiredForEnding: REQUIRED_ENDING.has(id), drops,
    coords, hp: hpFromCombat(combat) ?? hpFromFext(name), sources: ['hunts'], flag: hunt.flag, sourceName: hunt.name,
    // Field bosses with no place still separate by their kill flag.
    encounterKey: hunt.place ? undefined : `${id}|${hunt.region}|${hunt.flag}`,
  })
  // The hunt table's own id (dungeon checklists log it) — an alias of this fight
  // once the roster files it under another id; kept only if unique (below).
  record.huntIds = [...new Set([...(record.huntIds ?? []), hunt.id])]
  // Canonical/major fields from the entity index.
  if (entity) {
    if (entity.location && !record.location) record.location = entity.location
    record.drops = [...new Set([...record.drops, ...(entity.drops ?? [])])]
  }
  hit('hunts')
}

// 2. boss-list / hosted bosses: placed encounters (coords + map). The engine
// dump is a fallback for names no hunt placed; where a name already has an
// encounter it only donates coordinates.
const huntNameRegion = new Map()
for (const hunt of hunts) {
  const key = norm(hunt.name)
  const list = huntNameRegion.get(key) ?? []
  list.push(hunt.region)
  huntNameRegion.set(key, list)
}
const encounterCount = (id) => [...encounters.values()].filter((r) => r.id === id).length
const encounterForName = (id) => [...encounters.values()].find((r) => r.id === id)

// Engine master `M10` is the Shadow of the Erdtree world; a boss-list row's
// kill flag tells us which world it is, even when the internal name carries no
// region.
const markerMasterByFlag = new Map()
for (const marker of engineMarkers) {
  if (marker.cat !== 'boss') continue
  const flag = Number(String(marker.id).split(':')[1])
  if (Number.isFinite(flag)) markerMasterByFlag.set(flag, marker.master)
}
const isDlcEncounter = (row) =>
  markerMasterByFlag.get(row.killEventFlagId) === 'M10' ||
  markerMasterByFlag.get(row.clearedEventFlagId) === 'M10'

for (const row of bossList) {
  const id = canonicalId(row.vanillaPlaceName) ?? `boss:${slug(row.vanillaPlaceName)}`
  if (!canonicalId(row.vanillaPlaceName)) sourceFailures.push({ source: 'boss-list', name: row.vanillaPlaceName })
  const name = entityBossById.get(id)?.name ?? row.vanillaPlaceName
  let region = huntNameRegion.get(norm(name))?.[0] ?? entityBossById.get(id)?.region ?? regionFromText(name) ?? 'The Lands Between'
  const dlc = isDlcEncounter(row) || isSote(region) || isSote(name)
  if (region === 'The Lands Between' && dlc) region = 'Shadow of the Erdtree'
  // The game's kill flag identifies the fight; a name only when no flag matches.
  const byFlag = [...encounters.values()].find((r) => r.flag && r.flag === row.killEventFlagId)
  const existing = byFlag ?? encounterForName(id)
  if (existing) {
    if (!existing.flag) existing.flag = row.killEventFlagId
    if (!existing.coords) existing.coords = coordsFor(id, name)
    const combat = combatFor(id, name)
    const hp = hpFromCombat(combat) ?? hpFromFext(name)
    if (!existing.hp && hp) existing.hp = hp
    if (dlc) existing.campaign = 'sote'
    hit('boss-list')
    continue
  }
  const coords = coordsFor(id, name)
  const combat = combatFor(id, name)
  const drops = [...(dropsByName.get(norm(name)) ?? [])]
  upsert({
    id, name, region, location: region,
    campaign: dlc ? 'sote' : 'base',
    grace: nearestGrace(region, coords),
    tier: tierFor(id, name, drops, region),
    requiredForEnding: REQUIRED_ENDING.has(id),
    drops, coords, hp: hpFromCombat(combat) ?? hpFromFext(name),
    sources: ['boss-list'],
    flag: row.killEventFlagId,
  })
  hit('boss-list')
}

// 3. Engine markers: field bosses that spawn in several places. Bring each
// multi-spawn name up to one encounter per spawn, using the nearest place
// label so the extra rows read as real places rather than bare regions.
const placeLabels = read('public/sourced/open/map-place-names.json').labels ?? []
function nearestPlace(marker) {
  const pool = placeLabels.filter((l) => l.master === marker.master && l.names?.en)
  let best = null
  let bestDist = Infinity
  for (const label of pool) {
    const dx = label.px - marker.px
    const dy = label.py - marker.py
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      best = label.names.en
    }
  }
  return best
}
const markerGroups = new Map()
for (const marker of engineMarkers) {
  if (marker.cat !== 'boss') continue
  const key = norm(marker.name)
  const list = markerGroups.get(key) ?? []
  list.push(marker)
  markerGroups.set(key, list)
}
for (const [key, markers] of markerGroups) {
  if (markers.length < 2) continue
  const name = markers[0].name
  const id = canonicalId(name) ?? `boss:${slug(name)}`
  let existing = encounterCount(id)
  if (existing >= markers.length) continue
  const baseRegion = huntNameRegion.get(key)?.[0] ?? regionFromText(name) ?? 'The Lands Between'
  const used = new Set([...encounters.values()].filter((r) => r.id === id).map((r) => norm(r.location)))
  for (const marker of markers) {
    if (existing >= markers.length) break
    // A marker whose kill flag already has an encounter is that same fight, not a
    // second spawn (it minted phantom Adula / Putrid Avatar / Bell Bearing rows).
    const markerFlag = Number(String(marker.id).split(':')[1])
    if ([...encounters.values()].some((r) => r.flag && r.flag === markerFlag)) continue
    // A marker keyed by the fight's *cleared* flag is the same fight as an
    // encounter keyed by its *kill* flag (Perfumer Tricia, Crucible Knight Ordovis).
    const sameFight = bossList.find((row) => row.clearedEventFlagId === markerFlag)
    if (sameFight && [...encounters.values()].some((r) => r.flag === sameFight.killEventFlagId)) continue
    // Only a flag the game's boss list records as a kill/clear is a separate fight;
    // others are a duo partner (flag +1) or a dragon's flee point (Adula, Lansseax).
    if (!bossList.some((row) => row.killEventFlagId === markerFlag || row.clearedEventFlagId === markerFlag)) continue
    const place = nearestPlace(marker)
    const location = place ?? baseRegion
    const locationKey = norm(location)
    if (used.has(locationKey)) continue
    used.add(locationKey)
    const region = regionFromText(location) ?? baseRegion
    const coords = { x: round2((marker.px / 10496) * 100), y: round2((marker.py / 10496) * 100), map: marker.map ?? null }
    const combat = combatFor(id, name)
    const drops = [...(dropsByName.get(norm(name)) ?? [])]
    upsert({
      id, name, region, location,
      campaign: marker.master === 'M10' || isSote(`${region} ${location}`) ? 'sote' : 'base',
      grace: nearestGrace(region, coords),
      tier: tierFor(id, name, drops, location),
      requiredForEnding: REQUIRED_ENDING.has(id),
      drops, coords, hp: hpFromCombat(combat) ?? hpFromFext(name),
      sources: ['engine-markers'],
      flag: Number(String(marker.id).split(':')[1]) || null,
    })
    existing++
    hit('engine-markers')
  }
}

// 4. Fextralife: names the other sources miss, with location text.
for (const row of fextBosses) {
  const name = row.name
  const id = canonicalId(name) ?? `boss:${slug(name)}`
  const known = [...encounters.values()].some((r) => r.id === id)
  if (known) continue
  const locationText = (row.locations ?? []).filter(Boolean).join(', ')
  const region = regionFromText(locationText) ?? 'The Lands Between'
  const coords = coordsFor(id, name)
  const drops = [...(dropsByName.get(norm(name)) ?? [])]
  const location = locationText || region
  upsert({
    id, name, region, location,
    campaign: isSote(`${locationText} ${(row.sections ?? []).map((s) => s.heading).join(' ')}`) ? 'sote' : 'base',
    grace: fextGrace(name) ?? nearestGrace(region, coords),
    tier: tierFor(id, name, drops, location),
    requiredForEnding: REQUIRED_ENDING.has(id),
    drops, coords, hp: hpFromFext(name) ?? hpFromCombat(combatFor(id, name)),
    sources: ['bosses-fextralife'],
  })
  hit('bosses-fextralife')
}

// 4b. Named vanilla bosses only the wiki snapshot's boss table carries (no
// GameAreaParam row, hunt or Fextralife page). An explicit list: the wiki's
// boss infobox also covers generic enemies (Dragon, Godrick Soldier, Snake
// Snail) and phases of other fights (God-Devouring Serpent), which are not
// bosses of their own. Crucible Knight Floh is left out: no HP, no drops, and
// its evergaol cannot be confirmed in the base game.
const WIKI_ONLY_BOSSES = {
  'Crucible Knight Devonia': 'Ancient Ruins of Rauh',
  'Logur, the Beast Claw': 'Gravesite Plain',
  'Madding Hand': 'Abyssal Woods',
  'Moonrithyll, Carian Knight': 'Gravesite Plain',
  'Knight of the Solitary Gaol': 'Scadu Altus',
  'Elder Dragon Greyoll': "Greyoll's Dragonbarrow",
}
{
  const wikiBoss = read('public/sourced/open/wiki-db/boss.json')
  const rows = Array.isArray(wikiBoss) ? wikiBoss : wikiBoss.records ?? []
  for (const [name, region] of Object.entries(WIKI_ONLY_BOSSES)) {
    const page = rows.find((r) => r.title === name)
    if (!page) continue
    const id = canonicalId(name) ?? `boss:${slug(name)}`
    if ([...encounters.values()].some((r) => r.id === id)) continue
    const drops = String(page.stats?.Drops ?? '')
      .split('·')
      .map((d) => d.replace(/\[\[|\]\]|\{\{[^}]*\}\}?/g, '').replace(/\s*\(weapon\)$/i, '').trim())
      .filter(Boolean)
    const hp = Number(String(page.stats?.HP ?? '').replace(/[^0-9]/g, '')) || null
    upsert({
      id, name, region, location: page.location || region,
      campaign: page.dlc ? 'sote' : 'base',
      grace: null, tier: tierFor(id, name, drops, page.location), requiredForEnding: false,
      drops, coords: coordsFor(id, name), hp, sources: ['wiki-db/boss'],
    })
    hit('wiki-db/boss')
  }
}

// 5. Checklist / FanAPI / armory rows: names the graph knows but that no
// encounter source has placed yet.
for (const row of [...checklistBosses, ...fanBosses]) {
  const name = row.name
  const id = canonicalId(name) ?? `boss:${slug(name)}`
  if ([...encounters.values()].some((r) => r.id === id)) continue
  const region = row.region || regionFromText(row.location) || 'The Lands Between'
  const location = row.location || region
  const coords = coordsFor(id, name)
  const drops = [...(dropsByName.get(norm(name)) ?? [])]
  upsert({
    id, name, region, location,
    campaign: isSote(`${region} ${location}`) ? 'sote' : 'base',
    grace: nearestGrace(region, coords),
    tier: tierFor(id, name, drops, location),
    requiredForEnding: REQUIRED_ENDING.has(id),
    drops, coords, hp: hpFromCombat(combatFor(id, name)) ?? hpFromFext(name),
    sources: ['checklists/bosses'],
  })
  sourceFailures.push({ source: 'checklists/fanapi', name })
  hit('checklists/bosses')
}

// 6. Armory-only names.
for (const row of armoryBosses) {
  const name = row.name
  const id = canonicalId(name) ?? `boss:${slug(name)}`
  if ([...encounters.values()].some((r) => r.id === id)) continue
  const region = row.region || regionFromText(row.location) || 'The Lands Between'
  const location = row.location || region
  const coords = coordsFor(id, name)
  const drops = [...(dropsByName.get(norm(name)) ?? [])]
  upsert({
    id, name, region, location,
    campaign: isSote(`${region} ${location}`) ? 'sote' : 'base',
    grace: nearestGrace(region, coords),
    tier: tierFor(id, name, drops, location),
    requiredForEnding: REQUIRED_ENDING.has(id),
    drops, coords, hp: hpFromCombat(combatFor(id, name)) ?? hpFromFext(name),
    sources: ['armory-bosses'],
  })
  sourceFailures.push({ source: 'armory-bosses', name })
  hit('armory-bosses')
}

// Region fallback: the enrichment index already resolved a region for most
// canonical bosses; use it when no source placed the encounter.
for (const record of encounters.values()) {
  if (record.region !== 'The Lands Between') continue
  const fallback = entityBossById.get(record.id)?.region
  if (fallback && fallback !== 'The Lands Between') record.region = fallback
}

// Task 132 §2 — close the remaining "The Lands Between" placeholders. A region
// another source carries for the same name wins; else the dominant region of the
// boss's engine map/area group (grace-xyz majorRegion, ≥60% agreement) is used.
const sourceRegionByName = new Map()
const rememberRegion = (name, region) => {
  const key = norm(name)
  if (key && region && region !== 'The Lands Between' && !sourceRegionByName.has(key)) sourceRegionByName.set(key, region)
}
for (const row of checklistBosses) rememberRegion(row.name, row.region || regionFromText(row.location))
for (const row of fanBosses) rememberRegion(row.name, row.region || regionFromText(row.location))
for (const row of armoryBosses) rememberRegion(row.name, row.region || regionFromText(row.location))
for (const row of fextBosses) rememberRegion(row.name, regionFromText((row.locations ?? []).join(', ')))
for (const row of wikiBosses) rememberRegion(row.title, row.region || regionFromText(row.location))

const areaVotes = new Map()
const gridVotes = new Map()
for (const g of graceXyz) {
  const label = g.majorRegion || g.subRegion
  if (!label) continue
  const area = areaVotes.get(g.areaNo) ?? new Map()
  area.set(label, (area.get(label) ?? 0) + 1)
  areaVotes.set(g.areaNo, area)
  const gridKey = `${g.areaNo}|${g.gridX}|${g.gridZ}`
  const grid = gridVotes.get(gridKey) ?? new Map()
  grid.set(label, (grid.get(label) ?? 0) + 1)
  gridVotes.set(gridKey, grid)
}
const topOf = (bucket) => {
  if (!bucket) return null
  const [top] = [...bucket.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? top[0] : null
}
const gridRegion = (areaNo, gridX, gridZ) => topOf(gridVotes.get(`${areaNo}|${gridX}|${gridZ}`))
/** The nearest grace-xyz row in the same area, by the engine world x/z. */
const nearestGraceRegion = (row) => {
  let best = null
  let bestDist = Infinity
  for (const g of graceXyz) {
    if (g.areaNo !== row.areaNo) continue
    const dx = g.x - row.x
    const dz = g.z - row.z
    const dist = dx * dx + dz * dz
    if (dist < bestDist) { bestDist = dist; best = g }
  }
  if (!best || bestDist > 2500) return null
  return best.majorRegion || best.subRegion || null
}
const bossListByName = new Map()
for (const row of bossList) if (!bossListByName.has(norm(row.vanillaPlaceName))) bossListByName.set(norm(row.vanillaPlaceName), row)
const remaining = []
for (const record of encounters.values()) {
  if (record.region !== 'The Lands Between') continue
  const row = bossListByName.get(norm(record.name))
  const fallback =
    sourceRegionByName.get(norm(record.name)) ??
    (row ? gridRegion(row.areaNo, row.gridX, row.gridZ) : null) ??
    (row ? nearestGraceRegion(row) : null) ??
    (row ? topOf(areaVotes.get(row.areaNo)) : null) ??
    entityBossById.get(record.id)?.region
  if (fallback && fallback !== 'The Lands Between') record.region = fallback
  else remaining.push(record.name)
}
if (remaining.length) console.log(`placeholder regions still unresolved: ${remaining.length} (${remaining.join(', ')})`)

// Same fight, filed twice by sources that carry no kill flag (Fextralife,
// checklist, armory). Each entry was checked against the flagged fight's place.
// The removed id is kept on the surviving row as `aka`, so references resolve.
{
  // A flagged fight whose authored catalog id differs from the id sources gave it.
  const FIGHT_ID_BY_FLAG = {
    11050800: 'boss:godfrey', // Elden Throne: Godfrey, First Elden Lord / Hoarah Loux (not the golden shade)
    12030800: 'boss:fia-champions', // Deeproot Depths
    // Lord Contender's Evergaol boss. Not invader:vyke — that is Festering Fingerprint
    // Vyke, the NPC invasion (drops Vyke's War Spear); this fight drops Vyke's Dragonbolt.
    1053560800: 'hunt:roundtable-knight-vyke',
  }
  // The fight's own name where the id sources resolved it to belongs to another fight.
  const FIGHT_OWN_NAME = { 1053560800: 'Roundtable Knight Vyke' }
  const catalogBossIds = new Set([...entityBossById.keys()].filter((id) => id.startsWith('boss:') || id.startsWith('invader:')))
  // unflagged duplicate id -> the kill flag of the fight it is
  const SAME_FIGHT = {
    'boss:putrid-crystalians': 31110800, // Sellia Hideaway trio
    'boss:nox-duo': 1049390800, // Nox Swordstress & Nox Monk, Sellia
    'boss:redmane-combo-crucible-knight': 1051360800, // Redmane Castle
    'boss:redmane-combo-misbegotten': 1051360800, // Redmane Castle (same fight, armory's other half)
    'boss:fell-twins': 34140850, // Divine Tower of East Altus
    'boss:beast-of-farum-azula': 31030800, // Groveside Cave beastman
    'boss:burial-tree-watchdog': 30020800, // Stormfoot Catacombs
    'boss:malenia-goddess-of-rot': 15000800, // Malenia's second phase
    'boss:abductor-virgin-duo': 16000860, // Subterranean Inquisition Chamber
    'boss:abductor-virgins': 16000860,
    'boss:leda-and-allies-boss': 20010850, // Needle Knight Leda, Enir-Ilim
    'boss:vyke-knight-of-the-roundtable': 1053560800, // armory's name for the evergaol fight
    'boss:rick-soldier-of-godrick': 18000850, // Stranded Graveyard
  }
  // A generic page row for a boss that is already a group of encounters.
  const DROP_ROWS = new Set(['boss:crystalians'])
  const fold = (keep, other) => {
    keep.drops = [...new Set([...keep.drops, ...other.drops])]
    keep.sources = [...new Set([...keep.sources, ...other.sources])]
    if (!keep.coords && other.coords) keep.coords = other.coords
    if (!keep.hp && other.hp) keep.hp = other.hp
    keep.aka = [...new Set([...(keep.aka ?? []), other.id, ...(other.aka ?? [])])].filter((id) => id !== keep.id)
  }
  const entries = () => [...encounters.entries()]
  for (const [flag, id] of Object.entries(FIGHT_ID_BY_FLAG)) {
    const fight = entries().find(([, r]) => r.flag === Number(flag))
    if (!fight) continue
    const [, record] = fight
    for (const [key, other] of entries()) {
      if (other !== record && other.id === id) {
        fold(record, other)
        encounters.delete(key)
      }
    }
    // The id a source resolved the fight to is an alias only when it is not a
    // different catalog fight (invader:vyke is Festering Fingerprint Vyke).
    if (record.id !== id && !(catalogBossIds.has(record.id) && FIGHT_OWN_NAME[flag])) {
      record.aka = [...new Set([...(record.aka ?? []), record.id])]
    }
    if (FIGHT_OWN_NAME[flag]) record.name = FIGHT_OWN_NAME[flag]
    record.id = id
  }
  for (const [dupId, flag] of Object.entries(SAME_FIGHT)) {
    const target = entries().find(([, r]) => r.flag === flag)?.[1]
    if (!target) continue
    for (const [key, other] of entries()) {
      if (other.id === dupId && other !== target) {
        fold(target, other)
        encounters.delete(key)
      }
    }
  }
  for (const [key, record] of entries()) if (DROP_ROWS.has(record.id)) encounters.delete(key)
}

// One fight, one row: rows that carry the same game kill flag are the same
// fight minted under two ids by different sources (hunts "Nox Swordstress &
// Nox Monk" vs armory "Nox Duo"). Keep the id the entity graph / catalog knows,
// else the hunt row, and fold the others' data into it.
{
  const byFlag = new Map()
  for (const [key, record] of encounters) {
    if (!record.flag) continue
    const list = byFlag.get(record.flag) ?? []
    list.push([key, record])
    byFlag.set(record.flag, list)
  }
  let merged = 0
  for (const list of byFlag.values()) {
    if (new Set(list.map(([, r]) => r.id)).size < 2) continue
    list.sort(([, a], [, b]) =>
      Number(entityBossById.has(b.id)) - Number(entityBossById.has(a.id)) ||
      Number(b.sources.includes('hunts')) - Number(a.sources.includes('hunts')) ||
      a.id.localeCompare(b.id))
    const [, keep] = list[0]
    for (const [key, other] of list.slice(1)) {
      if (other.id === keep.id) continue
      keep.drops = [...new Set([...keep.drops, ...other.drops])]
      keep.sources = [...new Set([...keep.sources, ...other.sources])]
      if (!keep.coords && other.coords) keep.coords = other.coords
      if (!keep.hp && other.hp) keep.hp = other.hp
      encounters.delete(key)
      merged++
    }
  }
  console.log(`merged ${merged} duplicate rows that share a kill flag`)
}

// Separated bosses (DISTINCT_BOSSES) used to share one id, so name-based drop
// merges pooled their drops. Drops that the separated boss's own wiki page lists
// and the other boss's page does not are removed from the other boss.
{
  const SPLIT_FROM = {
    'boss:astel-stars-of-darkness': 'boss:astel',
    'boss:bloodhound-knight': 'boss:darriwil',
    'boss:frenzied-duelist': 'boss:grave-warden-duelist',
    'boss:putrid-grave-warden-duelist': 'boss:grave-warden-duelist',
  }
  const wikiBoss = read('public/sourced/open/wiki-db/boss.json')
  const pages = new Map((Array.isArray(wikiBoss) ? wikiBoss : wikiBoss.records ?? []).map((r) => [norm(r.title), r]))
  const pageDrops = (name) => new Set((pages.get(norm(name))?.drops ?? []).map((d) => norm(d)))
  const all = [...encounters.values()]
  for (const [splitId, fromId] of Object.entries(SPLIT_FROM)) {
    const split = all.find((r) => r.id === splitId)
    if (!split) continue
    const own = pageDrops(split.name)
    for (const other of all.filter((r) => r.id === fromId)) {
      const keep = pageDrops(other.name)
      other.drops = other.drops.filter((d) => !own.has(norm(d)) || keep.has(norm(d)))
    }
  }
}

// ---------------------------------------------------------------------------
// One entity per encounter
// ---------------------------------------------------------------------------
//
// A boss fought in several places (Night's Cavalry x9, Tree Sentinel, Deathbird…)
// used to share one fact id, so logging one ticked them all and every copy showed
// the pooled drops and one map pin. Each encounter now gets its own id
// (`<group>--<place>`) and keeps the shared id as `group`. Per-encounter data:
//  - map pin: the game's kill flag -> boss-list row -> cleared flag -> boss-pins,
//    else the engine marker with that flag;
//  - HP / runes / drops / description: the wiki page's per-encounter tab
//    (`public/sourced/open/wiki-db/boss-encounters.json`), matched by place.
// An encounter with no matching tab keeps no drops rather than the pooled list,
// which belongs on the group page.

const wikiEncounterDoc = fs.existsSync(path.join(root, 'public/sourced/open/wiki-db/boss-encounters.json'))
  ? read('public/sourced/open/wiki-db/boss-encounters.json')
  : { encounters: [] }
const wikiTabsByPage = new Map()
for (const tab of wikiEncounterDoc.encounters ?? []) {
  const key = norm(tab.page)
  const list = wikiTabsByPage.get(key) ?? []
  list.push(tab)
  wikiTabsByPage.set(key, list)
}
const bossListByKill = new Map(bossList.map((row) => [row.killEventFlagId, row]))
const pinByFlag = new Map(bossPins.filter((p) => p.flag != null).map((p) => [p.flag, p]))
const markerByFlag = new Map()
for (const marker of engineMarkers) {
  if (marker.cat !== 'boss') continue
  const flag = Number(String(marker.id).split(':')[1])
  if (Number.isFinite(flag)) markerByFlag.set(flag, marker)
}

function coordsForFlag(flag) {
  if (!flag) return null
  const row = bossListByKill.get(flag)
  const pin = pinByFlag.get(row?.clearedEventFlagId) ?? pinByFlag.get(flag)
  if (pin && typeof pin.x === 'number') return { x: round2(pin.x), y: round2(pin.y), map: pin.map ?? null }
  const marker = markerByFlag.get(flag) ?? markerByFlag.get(row?.clearedEventFlagId)
  if (marker && typeof marker.px === 'number') {
    return { x: round2((marker.px / 10496) * 100), y: round2((marker.py / 10496) * 100), map: marker.map ?? null }
  }
  return null
}

const tokens = (text) => new Set(norm(text).split(' ').filter((t) => t.length > 2))
function tabScore(encounter, tab) {
  const want = tokens(`${encounter.location} ${encounter.region}`)
  const have = tokens(`${tab.tab} ${tab.location} ${tab.text}`)
  let score = 0
  for (const t of want) if (have.has(t)) score++
  // The tab label / infobox location naming the region is the strongest signal.
  if (tokens(`${tab.tab} ${tab.location}`).has(norm(encounter.region).split(' ')[0])) score += 2
  return score
}

const byGroup = new Map()
for (const record of encounters.values()) {
  const list = byGroup.get(record.id) ?? []
  list.push(record)
  byGroup.set(record.id, list)
}
let splitGroups = 0
let tabMatched = 0
for (const [group, list] of byGroup) {
  if (list.length < 2) continue
  splitGroups++
  const name = list[0].name
  // The wiki page for the fight: exact name, core name, else a page whose name the
  // boss name contains ("Crystalian" for Crystalian Duo, "Crucible Knight" for Ordovis).
  const nameKey = norm(name)
  let tabs = wikiTabsByPage.get(nameKey) ?? wikiTabsByPage.get(norm(coreName(name)))
  if (!tabs) {
    // Only a page whose words start the boss name and whose remainder is a group
    // word or a proper name after a multi-word page ("crucible knight" ordovis).
    // A one-word generic page ("Dragon") must not claim "Glintstone Dragon Adula".
    const page = [...wikiTabsByPage.keys()]
      .filter((p) => {
        if (!nameKey.startsWith(`${p} `) && nameKey !== p) return false
        const rest = nameKey.slice(p.length).trim()
        return p.includes(' ') || /^(duo|trio|twins?|x\d)?$/.test(rest)
      })
      .sort((a, b) => b.length - a.length)[0]
    tabs = page ? wikiTabsByPage.get(page) : []
  }
  tabs = [...tabs]
  // Greedy best-first pairing so each wiki tab describes one encounter.
  const pairs = []
  for (const record of list) for (const tab of tabs) pairs.push({ record, tab, score: tabScore(record, tab) })
  pairs.sort((a, b) => b.score - a.score)
  const usedTab = new Set()
  const tabFor = new Map()
  for (const p of pairs) {
    if (p.score < 1 || usedTab.has(p.tab) || tabFor.has(p.record)) continue
    usedTab.add(p.tab)
    tabFor.set(p.record, p.tab)
  }
  // One encounter and one tab left over describe each other (Deathbird Limgrave = "Stormhill").
  const openRecords = list.filter((r) => !tabFor.has(r))
  const openTabs = tabs.filter((t) => !usedTab.has(t))
  if (openRecords.length === 1 && openTabs.length === 1) tabFor.set(openRecords[0], openTabs[0])
  const usedIds = new Set()
  for (const record of list) {
    // A different fight folded under this id keeps its own game name
    // ("Astel, Stars of Darkness"); plain casing/format variants do not.
    const own = record.sourceName
    if (own && norm(own) !== nameKey && norm(coreName(own)) !== norm(coreName(name))) record.name = own
    const base = `${group}--${slug(record.location || record.region)}`
    let id = base
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`
    usedIds.add(id)
    record.group = group
    record.id = id
    const coords = coordsForFlag(record.flag)
    if (coords) record.coords = coords
    const tab = tabFor.get(record)
    record.drops = tab ? tab.drops : []
    if (tab) {
      tabMatched++
      if (tab.hp) record.hp = tab.hp
      record.runes = tab.runes ?? null
      record.about = tab.text || null
    }
  }
}
// An encounter with no tab but its own distinct fight name (Astel, Stars of
// Darkness; Bloodhound Knight at Lakeside Crystal Cave) has its own wiki page —
// that page is its data. A name shared by the other copies is not used: that
// page describes all of them, not this one.
const wikiBossDoc = read('public/sourced/open/wiki-db/boss.json')
const wikiBossByTitle = new Map((Array.isArray(wikiBossDoc) ? wikiBossDoc : wikiBossDoc.records ?? []).map((row) => [norm(row.title), row]))
let pageMatched = 0
for (const [, list] of byGroup) {
  if (list.length < 2) continue
  for (const record of list) {
    if (record.about || record.drops.length) continue
    const key = norm(record.name)
    if (list.filter((r) => norm(r.name) === key).length > 1) continue
    const page = wikiBossByTitle.get(key)
    if (!page) continue
    const drops = (page.drops ?? []).filter((d) => d && !/^various$/i.test(d))
    if (drops.length) record.drops = drops
    const hp = Number(String(page.stats?.HP ?? '').replace(/[^0-9]/g, ''))
    if (hp > 0) record.hp = hp
    const runes = Number(String(page.stats?.Runes ?? '').replace(/[^0-9]/g, ''))
    if (runes > 0) record.runes = runes
    pageMatched++
  }
}
console.log(`split ${splitGroups} multi-location bosses into their own encounters; ${tabMatched} matched a wiki encounter tab, ${pageMatched} their own wiki page`)

// Rune rewards are not item drops: sources list them as "120,000 Runes" and
// "120000 Runes" side by side, and pooled lists mixed several bosses' amounts.
// Keep them out of `drops`; set `runes` when the sources agree on one amount.
const RUNE_LINE = /^[\d,.\s]+runes?(\s*\(ng[^)]*\))?$/i
// Drop strings to the game's own item spelling (open/names.json, the install's
// FMG): wiki markup, "(if …)" notes, "Smithing Stone 6" -> "Smithing Stone [6]",
// two items pasted into one string, and old names ("Rennala's Great Rune").
const gameItemNames = new Map()
for (const row of read('public/sourced/open/names.json')) {
  if (!['goods', 'weapon', 'protector', 'accessories', 'gems'].includes(row.kind)) continue
  const key = row.name.toLowerCase()
  if (!gameItemNames.has(key)) gameItemNames.set(key, row.name)
}
const DROP_RENAMES = { "rennala's great rune": 'Great Rune of the Unborn', 'ash of war: glintsword arch': 'Ash of War: Glintblade Phalanx' }
// Task 173 §10 — mirror src/knowledge/dropNames.ts so the roster and the graph
// normalise a drop string to the same thing (counts, wiki notes, the shared
// alias table, and the strings that name no single item).
const DROP_ALIASES = new Map(Object.entries(dropAliasDoc.aliases ?? {}).map(([key, value]) => [key.toLowerCase(), value]))
const DROP_DROPPED = new Set((dropAliasDoc.dropped ?? []).map((s) => s.toLowerCase()))
const DROP_GENERIC = /^(?:somber\s+|ghost[- ]?|grave\s+)?smithing stones?$|^golden runes?$|^(?:grave|ghost)[- ]?glovewort$|^crystal tear$|^larval tear$|^hero(?:'|’)?s? runes?$/i
const DROP_NOTE = /\s*\((?:if|unless|after|before|when|once|from|requires?|only|ng\+?|new game)[^)]*\)?\s*$/i
const DROP_JUNK = /^(?:see\b|unlocks\b|includes?\b|sometimes\b|specifying\b|\(include)/i
function sharedDropClean(raw) {
  let t = String(raw)
    .replace(/\{\{[^}]*\}?\}?|\[\[|\]\]/g, '')
    .replace(/^\s*[*•#\-\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t) return null
  if (DROP_JUNK.test(t) || RUNE_LINE.test(t)) return null
  if (/^[\d~≈.,\s]*runes?(\s*\(ng[^)]*\))?$/i.test(t)) return null
  t = t.replace(/^\d+\s*x\s+/i, '').replace(/\s*(?:x\s*\d+|\d+\s*x|\*\s*\d+)$/i, '')
  t = t.replace(DROP_NOTE, '').trim()
  if (!t) return null
  const key = t.toLowerCase()
  if (DROP_DROPPED.has(key)) return null
  const alias = DROP_ALIASES.get(key)
  if (alias) return alias
  if (DROP_GENERIC.test(t)) return null
  if (/\bset$/i.test(t)) return null
  return t
}
function cleanDropPart(raw) {
  const shared = sharedDropClean(raw)
  if (shared == null) return []
  const d = shared
  if (!d || /runes-currency|^(n\/a|other drops|see .+)$/i.test(d) || RUNE_LINE.test(d)) return []
  // Half of a note split on its comma ("the Fell Omen not already defeated)") or a bare number.
  if (/^[\d,.\s]+$/.test(d) || (d.includes(')') && !d.includes('('))) return []
  const known = (s) => DROP_RENAMES[s.toLowerCase()] ?? gameItemNames.get(s.toLowerCase())
  if (known(d)) return [known(d)]
  // Spirit ashes: the game names the item after the spirit ("Black Knife Tiche").
  const ashes = /^(.*?)\s+(?:spirit\s+)?ashes$/i.exec(d)
  if (ashes && known(ashes[1])) return [known(ashes[1])]
  const numbered = /^(.*?)\s*[([]?\+?(\d+)[)\]]?$/.exec(d)
  if (numbered) {
    const [, base, n] = numbered
    const hit = known(`${base} [${n}]`) ?? known(`${base} +${n}`)
    if (hit) return [hit]
  }
  return [d]
}
function cleanDrop(raw) {
  return String(raw).split(/,\s+/).flatMap(cleanDropPart)
}
for (const record of encounters.values()) {
  const amounts = new Set(record.drops.filter((d) => RUNE_LINE.test(String(d).trim()) && !/\(ng/i.test(d)).map((d) => Number(String(d).replace(/\(.*$/, '').replace(/[^0-9]/g, ''))))
  const seen = new Set()
  record.drops = record.drops.flatMap(cleanDrop).filter((d) => {
    const key = d.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (record.runes == null && amounts.size === 1) record.runes = [...amounts][0]
}

// ---------------------------------------------------------------------------
// Sort + write
// ---------------------------------------------------------------------------

// An alias must never name a live fight or group (the golden shade stays
// boss:godfrey-golden even though the Elden Throne row once carried that id).
{
  // A hunt id names one fight only when no other row came from it
  // (hunt:night-s-cavalry covers all nine riders, so it aliases none of them).
  const huntUse = new Map()
  for (const record of encounters.values()) for (const h of record.huntIds ?? []) huntUse.set(h, (huntUse.get(h) ?? 0) + 1)
  for (const record of encounters.values()) {
    const own = (record.huntIds ?? []).filter((h) => huntUse.get(h) === 1 && h !== record.id)
    if (own.length) record.aka = [...new Set([...(record.aka ?? []), ...own])]
  }
  const live = new Set([...encounters.values()].flatMap((r) => [r.id, r.group].filter(Boolean)))
  for (const record of encounters.values()) {
    if (record.aka) record.aka = record.aka.filter((id) => id !== record.id && !live.has(id))
  }
}

const roster = [...encounters.values()]
  .map((r) => ({
    id: r.id,
    ...(r.group ? { group: r.group } : {}),
    name: r.name.replace(/\s*\(x(\d)\)$/i, ' ×$1'), // "Fell Twin(x2)" -> "Fell Twin ×2"
    campaign: r.campaign,
    region: r.region || 'The Lands Between',
    location: r.location || r.region || 'The Lands Between',
    grace: r.grace ?? null,
    tier: r.tier,
    requiredForEnding: r.requiredForEnding,
    drops: [...new Set(r.drops)].sort(),
    coords: r.coords ?? null,
    hp: r.hp ?? null,
    runes: r.runes ?? null,
    flag: r.flag ?? null,
    ...(r.aka?.length ? { aka: [...r.aka].sort() } : {}),
    ...(r.group ? { about: r.about ?? null } : {}),
    sources: r.sources.sort(),
  }))
  .sort(
    (a, b) =>
      a.campaign.localeCompare(b.campaign) ||
      a.region.localeCompare(b.region) ||
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      a.name.localeCompare(b.name) ||
      a.location.localeCompare(b.location),
  )

const outFile = path.join(root, 'src/data/bosses.json')
fs.writeFileSync(outFile, JSON.stringify(roster, null, 2) + '\n')

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const countBy = (fn) => {
  const out = {}
  for (const row of roster) {
    const key = fn(row)
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

const missingRegion = roster.filter((r) => !r.region || r.region === 'The Lands Between')
const missingLocation = roster.filter((r) => !r.location)
const distinctIds = new Set(roster.map((r) => r.id))
const inIndex = roster.filter((r) => entityBossById.has(r.id))

const fextNames = new Set(fextBosses.map((b) => norm(b.name)))
const rosterNames = new Set(roster.map((r) => norm(coreName(r.name))))
const fextOnly = [...fextNames].filter((n) => n && !rosterNames.has(n) && ![...rosterNames].some((rn) => rn.includes(n) || n.includes(rn)))
const rosterNotFext = [...rosterNames].filter((n) => n && !fextNames.has(n) && ![...fextNames].some((fn) => fn.includes(n) || n.includes(fn)))

console.log(`boss roster: ${roster.length} encounters · ${distinctIds.size} distinct fact ids`)
console.log(`written: src/data/bosses.json`)
console.log(`by campaign: ${JSON.stringify(countBy((r) => r.campaign))}`)
console.log(`by tier: ${JSON.stringify(countBy((r) => r.tier))}`)
console.log(`required for ending: ${roster.filter((r) => r.requiredForEnding).length}`)
console.log(`with coords: ${roster.filter((r) => r.coords).length} · with HP: ${roster.filter((r) => r.hp).length} · with grace: ${roster.filter((r) => r.grace).length}`)
console.log(`with drops: ${roster.filter((r) => r.drops.length).length}`)
console.log(`distinct ids already in the entity index: ${inIndex.length}/${distinctIds.size}`)
console.log(`location+region complete: ${roster.filter((r) => r.location && r.region).length}/${roster.length}`)
console.log(`missing region: ${missingRegion.length}; missing location: ${missingLocation.length}`)
console.log(`\nsource rows that failed to join (no canonical id): ${sourceFailures.length}`)
for (const fail of sourceFailures.slice(0, 40)) console.log(`  ${fail.source}: ${fail.name}`)
console.log(`\nFextralife cross-check (fext rows ${fextBosses.length}, unique ${fextNames.size}):`)
console.log(`  roster names not on the Fextralife boss list: ${rosterNotFext.length}`)
console.log(rosterNotFext.slice(0, 40).map((n) => `    ${n}`).join('\n'))
console.log(`  Fextralife names not in the roster: ${fextOnly.length}`)
console.log(fextOnly.slice(0, 40).map((n) => `    ${n}`).join('\n'))
console.log(`\nsource contribution: ${JSON.stringify(sourceHits)}`)
