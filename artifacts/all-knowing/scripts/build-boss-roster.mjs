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

/** Best canonical id for a source name, or null when the roster must mint one. */
function canonicalId(name) {
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
  if (record?.map && typeof record.map.x === 'number' && typeof record.map.y === 'number') {
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

function upsert({ id, name, campaign, region, location, grace, tier, requiredForEnding, drops, coords, hp, sources, encounterKey }) {
  const key = encounterKey ?? recordKey(id, name, location)
  const existing = encounters.get(key)
  if (existing) {
    existing.drops = [...new Set([...existing.drops, ...drops])]
    if (!existing.coords && coords) existing.coords = coords
    if (!existing.hp && hp) existing.hp = hp
    if (!existing.grace && grace) existing.grace = grace
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
  const location = hunt.place || regionFromText(entity?.location) || hunt.region
  const coords = coordsFor(id, name)
  const combat = combatFor(id, name)
  const drops = [...(dropsByName.get(norm(name)) ?? [])]
  const tier = tierFor(id, name, drops, hunt.place || location)
  const record = upsert({
    id, name, campaign: hunt.campaign, region: hunt.region, location,
    grace: fextGrace(name) ?? nearestGrace(hunt.region, coords),
    tier, requiredForEnding: REQUIRED_ENDING.has(id), drops,
    coords, hp: hpFromCombat(combat) ?? hpFromFext(name), sources: ['hunts'],
    // Field bosses with no place still separate by their kill flag.
    encounterKey: hunt.place ? undefined : `${id}|${hunt.region}|${hunt.flag}`,
  })
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
  const existing = encounterForName(id)
  if (existing) {
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

// ---------------------------------------------------------------------------
// Sort + write
// ---------------------------------------------------------------------------

const roster = [...encounters.values()]
  .map((r) => ({
    id: r.id,
    name: r.name,
    campaign: r.campaign,
    region: r.region || 'The Lands Between',
    location: r.location || r.region || 'The Lands Between',
    grace: r.grace ?? null,
    tier: r.tier,
    requiredForEnding: r.requiredForEnding,
    drops: [...new Set(r.drops)].sort(),
    coords: r.coords ?? null,
    hp: r.hp ?? null,
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
