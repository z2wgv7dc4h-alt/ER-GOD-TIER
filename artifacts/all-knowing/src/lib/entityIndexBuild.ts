import { allEntities, canonicalEntityId, edges, entityName, getEntity, hasEntity, type EntityKind } from './entityGraph'
import { byId, facts } from '../knowledge/catalog'
import { loot as lootRows } from '../knowledge/loot'
import { merchants } from '../knowledge/merchants'
import { catalogueIdFor } from './catalogueIds'
import { normalizeName } from './fanImage'
import type { EntityRecord } from './entityIndex'
import generatedAliases from '../data/aliases.json'
import overridesJson from '../data/entity-overrides.json'
import dungeonsData from '../data/dungeons.json'
import bossRoster from '../data/bosses.json'
import imageIndex from '../data/image-index.json'

import checklistBosses from '../../public/sourced/checklists/bosses.json'
import checklistWeapons from '../../public/sourced/checklists/weapons.json'
import checklistShields from '../../public/sourced/checklists/shields.json'
import checklistArmors from '../../public/sourced/checklists/armors.json'
import checklistTalismans from '../../public/sourced/checklists/talismans.json'
import checklistSorceries from '../../public/sourced/checklists/sorceries.json'
import checklistIncantations from '../../public/sourced/checklists/incantations.json'
import checklistAshes from '../../public/sourced/checklists/ashes.json'
import checklistSpirits from '../../public/sourced/checklists/spirits.json'
import checklistItems from '../../public/sourced/checklists/items.json'
import checklistNpcs from '../../public/sourced/checklists/npcs.json'
import checklistGraces from '../../public/sourced/checklists/graces.json'
import checklistLocations from '../../public/sourced/checklists/locations.json'

import acquisitionDoc from '../../public/sourced/open/acquisition.json'
import wikiDoc from '../../public/sourced/open/wiki-sections.json'
import coords from '../../public/sourced/open/coords.json'
import bossXyz from '../../public/sourced/open/boss-xyz.json'
import bossPins from '../../public/sourced/open/boss-pins.json'
import shops from '../../public/sourced/open/shops.json'
import recipesDoc from '../../public/sourced/open/recipes.json'
import fextDoc from '../../public/sourced/open/bosses-fextralife.json'

import npcCombat from '../../public/sourced/npc-combat.json'
import enemyCombat from '../../public/sourced/enemy-combat.json'
import armoryWeapons from '../../public/sourced/armory-weapons.json'
import armoryBosses from '../../public/sourced/armory-bosses.json'
import npcPlacementsDoc from '../../public/sourced/npc-placements.json'
import regulation from '../../public/sourced/regulation-vanilla-v1.17.json'

import fanBosses from '../../public/sourced/open/fanapi/bosses.json'
import fanWeapons from '../../public/sourced/open/fanapi/weapons.json'
import fanShields from '../../public/sourced/open/fanapi/shields.json'

import fanArmors from '../../public/sourced/open/fanapi/armors.json'
import fanTalismans from '../../public/sourced/open/fanapi/talismans.json'
import fanSpells from '../../public/sourced/open/fanapi/spells.json'
import fanAshes from '../../public/sourced/open/fanapi/ashes.json'
import fanSpirits from '../../public/sourced/open/fanapi/spirits.json'
import fanItems from '../../public/sourced/open/fanapi/items.json'
import fanNpcs from '../../public/sourced/open/fanapi/npcs.json'
import fanLocations from '../../public/sourced/open/fanapi/locations.json'
import magicData from '../../public/sourced/open/magic.json'
import gapfillDoc from '../../public/sourced/open/gapfill.json'
import mapExtras from '../../public/sourced/guide/map-extras.json'
import engineMarkersDoc from '../../public/sourced/open/engine-markers.json'
import eldenringMap from '../../public/sourced/open/eldenringmap.json'
import namesData from '../../public/sourced/open/names.json'

// Task 132 §1 — the full wiki DB, classified per kind by `scripts/export-wiki-db.py`.
import wikiBossDoc from '../../public/sourced/open/wiki-db/boss.json'
import wikiEnemyDoc from '../../public/sourced/open/wiki-db/enemy.json'
import wikiNpcDoc from '../../public/sourced/open/wiki-db/npc.json'
import wikiLocationDoc from '../../public/sourced/open/wiki-db/location.json'
import wikiDungeonDoc from '../../public/sourced/open/wiki-db/dungeon.json'
import wikiItemDoc from '../../public/sourced/open/wiki-db/item.json'
import wikiWeaponDoc from '../../public/sourced/open/wiki-db/weapon.json'
import wikiArmorDoc from '../../public/sourced/open/wiki-db/armor.json'
import wikiSpellDoc from '../../public/sourced/open/wiki-db/spell.json'
import wikiTalismanDoc from '../../public/sourced/open/wiki-db/talisman.json'
import wikiAshDoc from '../../public/sourced/open/wiki-db/ash.json'
import wikiSpiritDoc from '../../public/sourced/open/wiki-db/spirit.json'
import wikiRedirectDoc from '../../public/sourced/open/wiki-db/redirects.json'

/**
 * Task 119 §2 — build-time enrichment index.
 *
 * Reads every reference dataset the repo already ships, normalises the name
 * plane (case, punctuation, apostrophes, "the", parenthetical suffixes), runs it
 * through the alias plane + a fuzzy pass (≥0.92) + a small manual override
 * table, and merges each source's fields into one compact record per canonical
 * fact id. Nothing is authored here: a field is only set when some dataset has
 * it. The output is consumed by `entityEnrich.ts` at runtime and measured by
 * `entityCoverage.ts`.
 *
 * This module is build/test-only; the app bundle never imports it (it would pull
 * in every raw dataset).
 */

type Row = Record<string, unknown>
type ChecklistWeapon = {
  name: string
  image?: string
  description?: string
  attack?: unknown
  scalesWith?: unknown
  requiredAttributes?: unknown
  category?: string
  weight?: number
}
type ChecklistBoss = { name: string; region?: string; location?: string; drops?: string[] }
type RosterBoss = { id: string; name: string; region: string; location: string; drops: string[]; hp: number | null }
type ChecklistItem = { name: string; description?: string; image?: string; effect?: string; type?: string }
type ChecklistGrace = { name: string; region?: string; world?: string }
type ChecklistNpc = { name: string; image?: string; quote?: string; location?: string; role?: string }
type AcqRow = { name: string; method?: string; location?: string; near?: string; prereqs?: string[]; missable?: boolean }
type WikiSection = { id: number; page: string; heading: string; text: string }
type FextBoss = {
  name: string
  locations?: string[]
  drops?: string[]
  hp?: string
  url?: string
  sections?: { heading: string; text: string }[]
}
type CombatRow = {
  factId?: string
  name: string
  baseHp?: number
  poise?: number
  negation?: Record<string, number>
  resist?: Record<string, number>
  maps?: string[]
}
type CoordRow = { id?: string; name: string; kind?: string; world?: string; map?: string; x: number; y: number }
type RegWeapon = {
  name: string
  weaponName: string
  affinityId: number
  requirements?: Record<string, number>
  attributeScaling?: [string, number][]
  attack?: [number, number][]
}

const overrides = overridesJson as {
  aliases?: Record<string, string>
  typos?: Record<string, string>
  skip?: string[]
}

// Task 124 §1 — source typo / spelling variants folded onto one canonical name.
const typoMap = new Map<string, string>()
for (const [from, to] of Object.entries(overrides.typos ?? {})) typoMap.set(simpleNorm(from), to)

/** Correct a known source typo/inflection to the canonical spelling, else return it. */
function correctName(name: string): string {
  return typoMap.get(simpleNorm(name)) ?? name
}

const ATTR_LABELS: Record<string, string> = { str: 'Str', dex: 'Dex', int: 'Int', fai: 'Fai', arc: 'Arc' }
const DAMAGE_LABELS: Record<number, string> = { 0: 'Physical', 1: 'Magic', 2: 'Fire', 3: 'Lightning', 4: 'Holy' }
const SECTION_RE = /location|acquisition|strategy|strategies|combat|notes|drops|overview|effect|summary|use|notable loot/i
const STRATEGY_RE = /strateg|combat|fight|guide|tips|moveset|notes|attack/i

const EXCERPT = 600

export type EntityIndexBuildResult = {
  records: Record<string, EntityRecord>
  unmatched: Record<string, number>
  counts: { total: number; byKind: Record<string, number> }
}

// ---------------------------------------------------------------------------
// Name plane
// ---------------------------------------------------------------------------

/** Task 124 §1 — strip diacritics so "Great Épée" keys as "great epee". */
function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function simpleNorm(value: unknown): string {
  return fold(String(value ?? ''))
    .toLowerCase()
    .replace(/[\u2019'`"]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim()
}

/** Task 124 §1 — the spelling with a possessive `'s` dropped. */
function possNorm(value: unknown): string {
  return simpleNorm(fold(String(value ?? '')).replace(/[\u2019']s\b/gi, ''))
}

/**
 * Every key a name should be filed/found under: the plain spelling and, when it
 * carries a possessive, the collapsed one. Indexing both (rather than changing
 * the norm) keeps "Giants Gravepost" from being lost when only one side uses the
 * apostrophe.
 */
function mapKeys(value: unknown): string[] {
  const plain = simpleNorm(value)
  const poss = possNorm(value)
  return poss && poss !== plain ? [plain, poss] : [plain]
}

function stripParens(value: string): string {
  return value.replace(/\([^)]*\)/g, ' ').replace(/&/g, ' and ')
}

function baseNorm(value: unknown): string {
  return simpleNorm(stripParens(String(value ?? ''))).replace(/^the /, '').replace(/\s+/g, ' ').trim()
}

function tokens(value: string): string[] {
  return possNorm(stripParens(value)).split(' ').filter(Boolean)
}

function jaccard(a: string, b: string): number {
  const A = tokens(a)
  const B = tokens(b)
  if (!A.length || !B.length) return 0
  const setB = new Set(B)
  let hit = 0
  for (const t of A) if (setB.has(t)) hit++
  return hit / (A.length + B.length - hit)
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const prev = new Array<number>(n + 1)
  const cur = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j]
  }
  return prev[n]
}

function similarity(a: string, b: string): number {
  const na = baseNorm(a)
  const nb = baseNorm(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) {
    const scale = Math.min(na.length, nb.length) / Math.max(na.length, nb.length)
    return 0.9 + 0.1 * scale
  }
  const l = Math.max(na.length, nb.length)
  const lev = l ? 1 - levenshtein(na, nb) / l : 0
  return Math.max(jaccard(na, nb), lev)
}

function slug(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const nameIndex = new Map<string, string>()
function addName(name: unknown, id: string): void {
  for (const key of mapKeys(name)) if (key && !nameIndex.has(key)) nameIndex.set(key, id)
}

for (const entity of allEntities()) addName(entity.name, entity.id)
for (const fact of facts) for (const alias of fact.aliases) addName(alias, fact.id)
for (const row of generatedAliases as { fmgName: string; slug: string; aliases: string[] }[]) {
  addName(row.fmgName, row.slug)
  for (const alias of row.aliases) addName(alias, row.slug)
}
for (const [name, id] of Object.entries(overrides.aliases ?? {})) nameIndex.set(simpleNorm(name), id)

const entityList = allEntities()

/** Fuzzy fallback: best entity name at or above 0.92. */
function fuzzyEntity(name: string): string | undefined {
  let best: string | undefined
  let bestScore = 0.92
  for (const entity of entityList) {
    const score = similarity(name, entity.name)
    if (score > bestScore) {
      bestScore = score
      best = entity.id
    }
  }
  return best
}

/** Resolve a source name to a canonical graph id, or null when nothing matches. */
function resolveName(name: string, prefix: string): string | undefined {
  const direct = mapKeys(name).map((key) => nameIndex.get(key)).find(Boolean)
  if (direct && hasEntity(direct)) return direct
  const candidate = canonicalEntityId(`${prefix}:${slug(name)}`, name)
  if (hasEntity(candidate)) return candidate
  const fuzzy = fuzzyEntity(name)
  if (fuzzy && hasEntity(fuzzy)) return fuzzy
  return undefined
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

const records = new Map<string, EntityRecord>()
const unmatched: Record<string, number> = {}

function ensure(id: string, kind: EntityKind, name: string): EntityRecord {
  const existing = records.get(id)
  if (existing) return existing
  const record: EntityRecord = { id, kind, name, sources: [] }
  records.set(id, record)
  return record
}

function ensureEntity(entity: { id: string; kind: EntityKind; name: string; summary?: string; icon?: string }): EntityRecord {
  const record = ensure(entity.id, entity.kind, entity.name)
  if (entity.icon && !record.image) record.image = entity.icon
  return record
}

/** The graph's sentinel for "we have no facts"; never treat it as a location. */
const NO_DATA = 'No data for this entity yet.'

/**
 * Task 123 §2 — a catalogue row is a real entity even when the authored graph
 * has no row for it. Create the record under the canonical shared id, upgrading
 * a generic `item` kind to the catalogue's more specific one.
 */
function ensureCatalogue(id: string, kind: EntityKind, name: string): EntityRecord {
  const record = ensure(id, kind, name)
  record.catalogue = true
  if (record.kind === 'item' && kind !== 'item') record.kind = kind
  if (!record.image) {
    const icon = getEntity(id).icon
    if (icon) record.image = icon
  }
  return record
}

/** Graph summaries that are labels, not acquisition text. */
const GENERIC_SUMMARY_RE = /^(build item|crafting material|combat profile|dungeon boss|merchant|catalogue entity|reference)$/i

/** Only use a graph summary as an acquisition line when it is real text. */
function setLocationFromSummary(record: EntityRecord, id: string): void {
  if (record.location) return
  const summary = getEntity(id).summary
  if (summary && summary !== NO_DATA && !GENERIC_SUMMARY_RE.test(summary.trim())) {
    setText(record, 'location', summary)
  }
}

function source(record: EntityRecord, name: string): void {
  if (!record.sources.includes(name)) record.sources.push(name)
}

function setText(record: EntityRecord, field: 'description' | 'location' | 'strategy', value: unknown): void {
  if (record[field] || value == null) return
  const text = String(value).trim()
  if (text) record[field] = text
}

function setStat(record: EntityRecord, label: string, value: unknown): void {
  if (value == null) return
  const text = String(value).trim()
  if (!text || text === 'undefined' || text === 'null') return
  record.stats = record.stats ?? {}
  if (!record.stats[label]) record.stats[label] = text
}

function addDrops(record: EntityRecord, drops: unknown): void {
  if (!Array.isArray(drops)) return
  for (const drop of drops) {
    const text = String(drop ?? '').trim()
    if (!text || /^other drops$/i.test(text)) continue
    record.drops = record.drops ?? []
    if (!record.drops.includes(text)) record.drops.push(text)
  }
}

function excerpt(text: unknown): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= EXCERPT) return clean
  const cut = clean.slice(0, EXCERPT)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return stop > 120 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`
}

function numberStat(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim() && value !== '???' && value !== '-') return value.trim()
  return undefined
}

// ---------------------------------------------------------------------------
// Source maps
// ---------------------------------------------------------------------------

const checklistByName = <T extends { name: string }>(rows: T[]): Map<string, T> => {
  const map = new Map<string, T>()
  for (const row of rows) {
    for (const key of mapKeys(row.name)) if (!map.has(key)) map.set(key, row)
  }
  return map
}

const checklistWeaponByName = checklistByName(checklistWeapons as ChecklistWeapon[])
const checklistShieldByName = checklistByName(checklistShields as ChecklistWeapon[])
const armoryWeaponByName = checklistByName(armoryWeapons as { name: string }[])
const checklistTalismanByName = checklistByName(checklistTalismans as ChecklistItem[])
const checklistSorceryByName = checklistByName(checklistSorceries as ChecklistItem[])
const checklistIncantationByName = checklistByName(checklistIncantations as ChecklistItem[])
const checklistAshByName = checklistByName(checklistAshes as ChecklistItem[])
const checklistSpiritByName = checklistByName(checklistSpirits as ChecklistItem[])
const checklistItemByName = checklistByName(checklistItems as ChecklistItem[])

/** A checklist row whose normalised name ends with the entity name (short id). */
function findBySuffix(rows: ChecklistItem[], name: string): ChecklistItem | undefined {
  const key = baseNorm(name)
  if (key.length < 3) return undefined
  return rows.find((row) => baseNorm(row.name).endsWith(key))
}
const checklistNpcByName = checklistByName(checklistNpcs as ChecklistNpc[])
const checklistGraceByName = checklistByName(checklistGraces as ChecklistGrace[])
const fanNpcByName = checklistByName(fanNpcs as ChecklistNpc[])

const acqByName = checklistByName(acquisitionDoc.rows as AcqRow[])
const acqFuzzy = (name: string): AcqRow | undefined => acqByName.get(simpleNorm(name)) ?? acqByName.get(baseNorm(name))

// Task 123 §3 — grounded acquisition fallbacks for items whose location the
// acquisition dump never recorded: a vendor stock row, or the crafting recipe.
const shopsByItem = new Map<string, string>()
for (const row of shops as { vendor: string; item: string }[]) {
  const key = simpleNorm(row.item)
  if (key && !shopsByItem.has(key)) shopsByItem.set(key, row.vendor)
}
const merchantVendorByItem = new Map<string, string>()
for (const merchant of merchants) {
  for (const item of merchant.stock) {
    const key = simpleNorm(item)
    if (key && !merchantVendorByItem.has(key)) merchantVendorByItem.set(key, merchant.vendor)
  }
}
type RecipeRow = { name: string; materials: { name: string; qty?: number }[] }
const recipeByItem = new Map<string, RecipeRow>()
for (const row of ((recipesDoc as { recipes?: RecipeRow[] }).recipes ?? [])) {
  const key = simpleNorm(row.name)
  if (key && !recipeByItem.has(key)) recipeByItem.set(key, row)
}

/** A location for an item-like row, or undefined when no dataset carries one. */
function itemLocationFallback(name: string): string | undefined {
  // Ashes are named "X" by the FanAPI/Library but "Ash of War: X" by the
  // checklist/acquisition dumps; try both spellings against every source.
  const candidates = [name]
  if (!/^ash(?:es)? of war:/i.test(name)) {
    candidates.push(`Ash of War: ${name}`, `Ashes of War: ${name}`)
  }
  // Spirit ashes: the catalogue names them "Battlemage Hugues Ashes" while the
  // acquisition dump uses "Battlemage Hugues (Spirit Ash)".
  if (/ ashes$/i.test(name)) {
    const base = name.replace(/ ashes$/i, '')
    candidates.push(base, `${base} (Spirit Ash)`, `${base} Spirit Ash`)
  }
  for (const candidate of candidates) {
    const acq = acqFuzzy(candidate)
    const acqText = acq?.location ?? acq?.near
    if (acqText) return acqText
    const key = simpleNorm(candidate)
    const vendor = shopsByItem.get(key) ?? merchantVendorByItem.get(key)
    if (vendor) return `Sold by ${vendor}`
    const recipe = recipeByItem.get(key)
    if (recipe) {
      const materials = recipe.materials.map((m) => `${m.name} x${m.qty ?? 1}`).join(', ')
      return materials ? `Craftable — ${materials}` : 'Craftable'
    }
  }
  // The acquisition/drop dumps often name the base entity ("Banished Knight
  // Oleg") while the catalogue appends a suffix ("… Ashes"). Accept a prefix.
  for (const candidate of candidates) {
    const acq = acqPrefix(candidate)
    const acqText = acq?.location ?? acq?.near
    if (acqText) return acqText
  }
  return undefined
}

/** The first acquisition row whose name is a prefix of `name` (or vice versa). */
function acqPrefix(name: string): AcqRow | undefined {
  const key = simpleNorm(name)
  if (key.length < 6) return undefined
  for (const [rowKey, row] of acqByName) {
    if (rowKey.length < 6) continue
    if (key.startsWith(rowKey) || rowKey.startsWith(key)) return row
  }
  return undefined
}

const fextByName = checklistByName((fextDoc.bosses as FextBoss[]))
const fanBossByName = checklistByName(fanBosses as { name: string }[])
const checkBossByName = checklistByName(checklistBosses as ChecklistBoss[])
const armoryBossByName = checklistByName(armoryBosses as { name: string }[])

/** Exact, depluralised and singular lookups for names that differ only in plurality. */
function deplural(key: string): string {
  if (key.endsWith('ies')) return `${key.slice(0, -3)}y`
  if (key.endsWith('s')) return key.slice(0, -1)
  return key
}

function lookupName<T>(map: Map<string, T>, name: string): T | undefined {
  const keys = mapKeys(name)
  for (const key of keys) {
    const hit = map.get(key)
    if (hit) return hit
  }
  for (const key of keys) {
    const hit = map.get(deplural(key)) ?? map.get(`${key}s`) ?? map.get(`${deplural(key)}s`)
    if (hit) return hit
  }
  return undefined
}

function lookupWiki(name: string): WikiSection[] | undefined {
  const direct = lookupName(wikiByPage, name)
  if (direct) return direct
  let best: WikiSection[] | undefined
  let bestScore = 0.92
  for (const [key, rows] of wikiByPage) {
    const score = similarity(name, key)
    if (score > bestScore) {
      bestScore = score
      best = rows
    }
  }
  if (best) return best
  // Task 124 §1 — a distinctive single-token page ("Vyke") matches a longer
  // source name that contains it ("Festering Fingerprint Vyke").
  const wanted = new Set(tokens(name))
  for (const [key, rows] of wikiByPage) {
    const keyTokens = tokens(key)
    if (keyTokens.length !== 1 || keyTokens[0].length < 4 || !wanted.has(keyTokens[0])) continue
    return rows
  }
  return undefined
}

const npcCombatByFact = new Map<string, CombatRow>()
const npcCombatByName = checklistByName(npcCombat as CombatRow[])
for (const row of npcCombat as CombatRow[]) if (row.factId && !npcCombatByFact.has(row.factId)) npcCombatByFact.set(row.factId, row)

const enemyCombatByName = new Map<string, CombatRow>()
const enemyCombatTokenKeys: { tokens: Set<string>; tokenList: string[]; row: CombatRow }[] = []
const singular = (token: string): string => (token.length > 3 && token.endsWith('s') && !token.endsWith('ss') ? token.slice(0, -1) : token)
for (const row of enemyCombat as CombatRow[]) {
  for (const key of mapKeys(stripParens(row.name))) if (key && !enemyCombatByName.has(key)) enemyCombatByName.set(key, row)
  const tokenList = tokens(row.name).map(singular)
  if (tokenList.length) enemyCombatTokenKeys.push({ tokens: new Set(tokenList), tokenList, row })
}

/**
 * Task 124 §1 — an enemy row whose name is the same set of words in another
 * order ("Carian Knight Bols (Boss)" for "Bols, Carian Knight") or a superset
 * ("Fia's Champion 1" for "Fia's Champions"). Requires a two-word overlap so a
 * generic single-word coinage never matches the wrong row.
 */
function enemyCombatLookup(name: string): CombatRow | undefined {
  const direct =
    mapKeys(stripParens(name)).map((key) => enemyCombatByName.get(key)).find(Boolean) ?? lookupName(enemyCombatByName, name)
  if (direct) return direct
  const want = new Set(tokens(name).map(singular))
  if (!want.size) return undefined
  let best: CombatRow | undefined
  let bestScore = 1
  for (const candidate of enemyCombatTokenKeys) {
    const [small, large] = want.size <= candidate.tokens.size ? [want, candidate.tokens] : [candidate.tokens, want]
    let subset = true
    for (const token of small) if (!large.has(token)) { subset = false; break }
    if (!subset) continue
    if (small.size > bestScore) {
      bestScore = small.size
      best = candidate.row
    }
  }
  return best
}

const coordsByName = checklistByName(coords as CoordRow[])
const bossXyzByName = checklistByName(bossXyz as CoordRow[])
const bossPinByName = checklistByName(bossPins as CoordRow[])
const npcPlacements = (npcPlacementsDoc as { placements?: { name: string; map?: string; x?: number; y?: number; world?: string }[] }).placements ?? []
const placementByName = checklistByName(npcPlacements)

const wikiByPage = new Map<string, WikiSection[]>()
for (const section of wikiDoc.sections as WikiSection[]) {
  for (const key of mapKeys(section.page)) {
    const list = wikiByPage.get(key) ?? []
    list.push(section)
    wikiByPage.set(key, list)
  }
}

const regRows = new Map<string, RegWeapon[]>()
for (const row of regulation.weapons as RegWeapon[]) {
  for (const key of mapKeys(row.weaponName)) {
    const list = regRows.get(key) ?? []
    list.push(row)
    regRows.set(key, list)
  }
}
const scalingTiers = (regulation.scalingTiers as [number, string][]).slice().sort((a, b) => b[0] - a[0])

function regFor(name: string): RegWeapon | undefined {
  let rows: RegWeapon[] | undefined
  for (const key of [...mapKeys(name), baseNorm(name)]) {
    rows = regRows.get(key)
    if (rows?.length) break
  }
  if (!rows?.length) return undefined
  return (
    rows.find((r) => r.affinityId === 0) ??
    rows.find((r) => r.affinityId === -1) ??
    rows.slice().sort((a, b) => a.affinityId - b.affinityId)[0]
  )
}

function scalingLetter(value: number): string {
  if (!value) return ''
  for (const [min, letter] of scalingTiers) if (value >= min) return letter
  return ''
}

function formatScaling(row: RegWeapon): string | undefined {
  const parts: string[] = []
  for (const [attr, value] of row.attributeScaling ?? []) {
    const label = ATTR_LABELS[attr] ?? attr
    const letter = scalingLetter(value)
    if (label && letter) parts.push(`${label} ${letter}`)
  }
  return parts.length ? parts.join(' · ') : undefined
}

function formatRequirements(row: RegWeapon): string | undefined {
  const parts: string[] = []
  for (const [attr, value] of Object.entries(row.requirements ?? {})) {
    if ((value ?? 0) > 0) parts.push(`${ATTR_LABELS[attr] ?? attr} ${value}`)
  }
  return parts.length ? parts.join(' · ') : undefined
}

function formatAttack(row: RegWeapon): string | undefined {
  const parts: string[] = []
  for (const [type, value] of row.attack ?? []) {
    if ((value ?? 0) > 0) parts.push(`${DAMAGE_LABELS[type] ?? `Type ${type}`} ${Math.round(value)}`)
  }
  return parts.length ? parts.join(' · ') : undefined
}

function formatNegation(negation?: Record<string, number>): string | undefined {
  if (!negation) return undefined
  const label: Record<string, string> = { physical: 'Physical', magic: 'Magic', fire: 'Fire', lightning: 'Lightning', holy: 'Holy' }
  const parts = Object.entries(negation).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${label[k] ?? k} ${v}`)
  return parts.length ? parts.join(' · ') : undefined
}

/**
 * Task 124 §1 — recover the negation table from Fextralife combat prose of the
 * form "Negations (or Absorptions) Standard : 0 Slash : -10 … Holy : 0". The
 * `Standard` anchor keeps it from matching the NPC "Defenses Physical : …"
 * block, which uses a different scale.
 */
const STRATEGY_NEGATION_ORDER: [string, RegExp][] = [
  ['Standard', /Standard\s*:\s*(-?\d+)/i],
  ['Slash', /Slash\s*:\s*(-?\d+)/i],
  ['Strike', /Strike\s*:\s*(-?\d+)/i],
  ['Pierce', /Pierce\s*:\s*(-?\d+)/i],
  ['Magic', /Magic\s*:\s*(-?\d+)/i],
  ['Fire', /Fire\s*:\s*(-?\d+)/i],
  ['Lightning', /Lightning\s*:\s*(-?\d+)/i],
  ['Holy', /Holy\s*:\s*(-?\d+)/i],
]

function negationFromStrategy(text: string | undefined): string | undefined {
  if (!text || !/Standard\s*:/i.test(text)) return undefined
  const parts: string[] = []
  for (const [label, re] of STRATEGY_NEGATION_ORDER) {
    const match = re.exec(text)
    if (match) parts.push(`${label} ${match[1]}`)
  }
  return parts.length ? parts.join(' · ') : undefined
}

/**
 * Task 123 §1 — armor negation arrives in two shapes: the checklist dump uses an
 * array of `{ name, amount }`, the FanAPI dump a plain `{ key: number }` map.
 * Both must render as "Physical 12.4 · Strike 11.1 · …" — never `[object Object]`.
 */
const NEGATION_LABELS: Record<string, string> = {
  phy: 'Physical',
  physical: 'Physical',
  strike: 'Strike',
  slash: 'Slash',
  pierce: 'Pierce',
  mag: 'Magic',
  magic: 'Magic',
  fire: 'Fire',
  ligt: 'Lightning',
  lightning: 'Lightning',
  holy: 'Holy',
}

export function formatNegationEntries(value: unknown): string | undefined {
  const parts: string[] = []
  const push = (key: unknown, amount: unknown): void => {
    const n = typeof amount === 'number' ? amount : Number(amount)
    if (!Number.isFinite(n) || n === 0) return
    const name = String(key ?? '')
    parts.push(`${NEGATION_LABELS[simpleNorm(name)] ?? name} ${n}`)
  }
  if (Array.isArray(value)) {
    for (const entry of value as { name?: unknown; amount?: unknown }[]) {
      if (entry && typeof entry === 'object') push(entry.name, entry.amount)
    }
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v && typeof v === 'object' && 'amount' in (v as Record<string, unknown>)) {
        push(k, (v as { amount?: unknown }).amount)
      } else {
        push(k, v)
      }
    }
  }
  return parts.length ? parts.join(' · ') : undefined
}

type MaybeCoord = { x?: number; y?: number; map?: string; world?: string }

function coordFor(name: string): MaybeCoord | undefined {
  return (
    lookupName(coordsByName, name) ??
    lookupName(bossXyzByName, name) ??
    lookupName(bossPinByName, name) ??
    lookupName(placementByName, name)
  )
}

/** Split a multi-boss name into its components (and the whole name). */
function bossParts(name: string): string[] {
  const parts = [name, ...name.split('&').map((p) => p.trim())]
  return [...new Set(parts.filter(Boolean))]
}

function collectSections(
  name: string,
  out: { heading: string; text: string }[],
  strategy: { text?: string },
  limit: number,
): void {
  const fext = lookupName(fextByName, name)
  const fextSections = fext?.sections ?? []
  for (const section of fextSections) {
    if (!section.text) continue
    if (!STRATEGY_RE.test(section.heading) && !SECTION_RE.test(section.heading)) continue
    out.push({ heading: section.heading.trim() || 'Overview', text: excerpt(section.text) })
    if (!strategy.text && STRATEGY_RE.test(section.heading)) strategy.text = excerpt(section.text)
    if (out.length >= limit) break
  }
  const wiki = lookupWiki(name)
  if (wiki?.length) {
    for (const section of wiki) {
      if (!section.text || !SECTION_RE.test(section.heading)) continue
      out.push({ heading: section.heading, text: excerpt(section.text) })
      if (!strategy.text && STRATEGY_RE.test(section.heading)) strategy.text = excerpt(section.text)
      if (out.length >= limit) break
    }
  }
}


// ---------------------------------------------------------------------------
// Per-kind merge passes
// ---------------------------------------------------------------------------

function mergeWeapon(rawName: string, kind: 'weapon' | 'shield', forcedId?: string): string {
  const name = correctName(rawName)
  const id = forcedId ?? catalogueIdFor('item', name)
  const reg = regFor(name)
  const checklist = lookupName(checklistWeaponByName, name) ?? lookupName(checklistShieldByName, name)
  const armory = lookupName(armoryWeaponByName, name)
  const record = ensureCatalogue(id, kind, name)
  if (checklist) {
    setText(record, 'description', checklist.description)
    if (checklist.image && !record.image) record.image = checklist.image
    setStat(record, 'Weight', checklist.weight)
    setStat(record, 'Base damage', formatAttackFromChecklist(checklist.attack))
    source(record, 'checklists/weapons')
  }
  if (reg) {
    // Some armaments genuinely have no requirements (seals) or no scaling
    // (crossbows); state that plainly rather than leaving the field empty.
    const hasDamage = (reg.attack ?? []).some(([, value]) => (value ?? 0) > 0)
    setStat(record, 'Requirements', formatRequirements(reg) ?? (hasDamage ? 'None' : undefined))
    setStat(record, 'Scaling', formatScaling(reg) ?? (hasDamage ? '—' : undefined))
    setStat(record, 'Base damage', formatAttack(reg))
    source(record, 'regulation')
  }
  if (armory) {
    setText(record, 'location', (armory as Row).where)
    setStat(record, 'Skill', (armory as Row).skill)
    setStat(record, 'Weight', (armory as Row).weight)
    source(record, 'armory-weapons')
  }
  setLocationFromSummary(record, id)
  if (!record.location) {
    const loc = itemLocationFallback(name)
    if (loc) {
      setText(record, 'location', loc)
      source(record, 'acquisition')
    }
  }
  const image = (imageIndex as Record<string, string>)[simpleNorm(name)]
  if (image && !record.image) record.image = image
  return id
}

function formatAttackFromChecklist(attack: unknown): string | undefined {
  if (!Array.isArray(attack)) return undefined
  const parts: string[] = []
  for (const entry of attack as { name: string; amount: number }[]) {
    if (entry && typeof entry.amount === 'number' && entry.amount > 0) parts.push(`${entry.name} ${entry.amount}`)
  }
  return parts.length ? parts.join(' · ') : undefined
}

function mergeSimple(
  rawName: string,
  prefix: string,
  kind: EntityKind,
  checklist: { description?: string; image?: string; effect?: string; effects?: unknown } | undefined,
  sourceName: string,
  forcedId?: string,
): string {
  const name = correctName(rawName)
  const id = forcedId ?? catalogueIdFor(prefix, name)
  const record = ensureCatalogue(id, kind, name)
  if (checklist) {
    setText(record, 'description', checklist.description)
    if (checklist.image && !record.image) record.image = checklist.image
    setStat(record, 'Effect', checklist.effect)
    if (Array.isArray(checklist.effects) && checklist.effects.length) setStat(record, 'Effect', (checklist.effects as unknown[]).join(' · '))
    source(record, sourceName)
  }
  setLocationFromSummary(record, id)
  if (!record.location) {
    const loc = itemLocationFallback(name)
    if (loc) {
      setText(record, 'location', loc)
      source(record, 'acquisition')
    }
  }
  return id
}

type ArmorChecklistRow = {
  dmgNegation?: unknown
  resistance?: unknown
  weight?: number
  poise?: number
}

/** Task 123 §1/§2 — one armor record from either checklist or FanAPI shape. */
function mergeArmorRow(row: ChecklistItem, sourceName: string): string {
  const name = correctName(row.name)
  const id = catalogueIdFor('item', name)
  const record = ensureCatalogue(id, 'armor', name)
  setText(record, 'description', row.description)
  if (row.image && !record.image) record.image = row.image
  const armor = row as unknown as ArmorChecklistRow
  setStat(record, 'Negation', formatNegationEntries(armor.dmgNegation))
  setStat(record, 'Weight', armor.weight)
  if (typeof armor.poise === 'number') setStat(record, 'Poise', armor.poise)
  source(record, sourceName)
  setLocationFromSummary(record, id)
  if (!record.location) {
    const loc = itemLocationFallback(name)
    if (loc) {
      setText(record, 'location', loc)
      source(record, 'acquisition')
    }
  }
  return id
}

function mergeBoss(rawName: string, forcedId?: string): string | undefined {
  const name = correctName(rawName)
  const id = forcedId ?? resolveName(name, 'boss') ?? resolveName(name, 'invader')
  if (!id) return undefined
  const record = ensureEntity(getEntity(id))
  const parts = bossParts(name)

  // NpcParam combat (core bosses) then the wider enemy dump.
  for (const part of parts) {
    const combat = npcCombatByFact.get(id) ?? lookupName(npcCombatByName, part)
    const enemy = combat ? undefined : enemyCombatLookup(part)
    const row = combat ?? enemy
    if (!row) continue
    setStat(record, 'HP', numberStat(row.baseHp))
    setStat(record, 'Negation', formatNegation(row.negation))
    setStat(record, 'Poise', numberStat(row.poise))
    if (row.resist) {
      const resist: Record<string, string> = { poison: 'Poison', scarletRot: 'Scarlet Rot', bleed: 'Bleed', sleep: 'Sleep', madness: 'Madness', curse: 'Curse' }
      const text = Object.entries(row.resist).filter(([k]) => resist[k]).map(([k, v]) => `${resist[k]} ${v}`).join(' · ')
      if (text) setStat(record, 'Status resist', text)
    }
    source(record, combat ? 'npc-combat' : 'enemy-combat')
    if (!record.location && row.maps?.length) setText(record, 'location', row.maps.join(' · '))
  }

  // Catalog facts: region + authored drops.
  const fact = byId.get(id)
  if (fact) {
    setText(record, 'location', fact.region)
    source(record, 'catalog')
    for (const dropId of fact.drops ?? []) {
      addDrops(record, [entityName(dropId)])
    }
  }

  for (const part of parts) {
    const check = lookupName(checkBossByName, part)
    if (check) {
      addDrops(record, check.drops)
      if (!record.location) setText(record, 'location', check.location ?? check.region)
      source(record, 'checklists/bosses')
    }
    const fan = lookupName(fanBossByName, part)
    if (fan) {
      addDrops(record, (fan as ChecklistBoss).drops)
      if (!record.location) setText(record, 'location', (fan as ChecklistBoss).location ?? (fan as ChecklistBoss).region)
      source(record, 'fanapi/bosses')
    }
    const fext = lookupName(fextByName, part)
    if (fext) {
      addDrops(record, fext.drops)
      if (!record.location && fext.locations?.length) setText(record, 'location', fext.locations.join(' · '))
      setStat(record, 'HP', numberStat(fext.hp))
      source(record, 'bosses-fextralife')
    }
    const armory = lookupName(armoryBossByName, part)
    if (armory) {
      setText(record, 'location', (armory as { region?: string }).region)
      source(record, 'armory-bosses')
    }
  }

  if (!record.drops?.length) {
    for (const drop of dropsMentionedBy(record.name, parts)) addDrops(record, [drop])
  }

  const sections: { heading: string; text: string }[] = []
  const strategy: { text?: string } = {}
  for (const part of parts) collectSections(part, sections, strategy, 4)
  if (sections.length) {
    record.sections = record.sections ?? []
    for (const section of sections) if (!record.sections.some((s) => s.heading === section.heading && s.text === section.text)) record.sections.push(section)
    source(record, 'wiki-sections')
    const summary = sections.find((s) => /summary|overview|description|background/i.test(s.heading))
    if (summary) setText(record, 'description', summary.text)
  }
  setText(record, 'strategy', strategy.text)
  if (!record.strategy && record.sections?.length) setText(record, 'strategy', record.sections[0].text)
  // Task 124 §1 — the Fextralife combat prose carries the negation table for
  // bosses the structured combat dump omits; recover it rather than leave the
  // guard field blank.
  if (!record.stats?.Negation) {
    const text = [record.strategy, ...(record.sections ?? []).map((s) => s.text)].filter(Boolean).join('\n')
    const recovered = negationFromStrategy(text)
    if (recovered) {
      setStat(record, 'Negation', recovered)
      source(record, 'bosses-fextralife')
    }
  }
  if (!record.description) setText(record, 'description', byId.get(id)?.note)

  const coord = coordFor(name)
  if (coord && typeof coord.x === 'number' && typeof coord.y === 'number') {
    record.map = { x: coord.x, y: coord.y, map: coord.map, world: coord.world }
    source(record, 'coords')
  }
  const acq = acqFuzzy(name)
  if (acq && !record.location) {
    setText(record, 'location', acq.location)
    source(record, 'acquisition')
  }
  return id
}

/**
 * Items the repo already attributes to this boss in a "how"/acquisition text
 * (e.g. the Reduvia row says it drops from Bloody Finger Nerijus). Grounded in
 * the datasets, never invented — just a reverse lookup of existing prose.
 */
function dropsMentionedBy(bossName: string, parts: string[]): string[] {
  const keys = [baseNorm(bossName), ...parts.map(baseNorm)].filter((k) => k.length >= 5)
  if (!keys.length) return []
  const out: string[] = []
  const scan = (rows: { name?: string; how?: string; location?: string; near?: string | null; region?: string }[]) => {
    for (const row of rows) {
      const text = simpleNorm(`${row.how ?? ''} ${row.location ?? ''} ${row.near ?? ''} ${row.region ?? ''}`)
      if (!text) continue
      if (keys.some((k) => text.includes(k))) {
        const name = String(row.name ?? '').trim()
        if (name && !out.includes(name)) out.push(name)
      }
    }
  }
  scan(lootRows as { name?: string; how?: string; region?: string }[])
  scan(acquisitionDoc.rows as AcqRow[])
  return out.slice(0, 6)
}

function mergeGrace(name: string, forcedId?: string): string | undefined {
  const id = forcedId ?? resolveName(name, 'grace')
  if (!id) return undefined
  const record = ensureEntity(getEntity(id))
  const check = lookupName(checklistGraceByName, name)
  if (check) {
    setText(record, 'description', check.region)
    setText(record, 'location', check.region)
    source(record, 'checklists/graces')
  }
  if (!record.location) setText(record, 'location', (getEntity(id) as { summary?: string }).summary)
  const coord = lookupName(coordsByName, name)
  if (coord && typeof coord.x === 'number' && typeof coord.y === 'number') {
    record.map = { x: coord.x, y: coord.y, map: coord.map, world: coord.world }
    source(record, 'coords')
  }
  return id
}

/** Prefer the authored NPC locator ("Found at grace:x" / a note) over fan data. */
function npcLocationFromSummary(summary: string | undefined): string | undefined {
  if (!summary) return undefined
  const match = summary.match(/^Found at (grace:[a-z0-9-]+)$/)
  if (match) return getEntity(match[1]).name
  return summary
}

function mergeNpc(name: string, forcedId?: string): string | undefined {
  const id = forcedId ?? resolveName(name, 'npc')
  if (!id) return undefined
  const entity = getEntity(id)
  const record = ensureEntity(entity)
  setText(record, 'location', npcLocationFromSummary(entity.summary))
  const check = lookupName(checklistNpcByName, name)
  if (check) {
    setText(record, 'description', check.quote)
    setText(record, 'location', check.location)
    setStat(record, 'Role', check.role)
    if (check.image && !record.image) record.image = check.image
    source(record, 'checklists/npcs')
  }
  const fan = lookupName(fanNpcByName, name)
  if (fan) {
    setText(record, 'location', fan.location)
    setStat(record, 'Role', fan.role)
    source(record, 'fanapi/npcs')
  }
  const placement = lookupName(placementByName, name)
  if (placement) {
    record.map = { x: placement.x ?? 0, y: placement.y ?? 0, map: placement.map, world: placement.world }
    source(record, 'npc-placements')
  }
  if (!record.location) setText(record, 'location', (getEntity(id) as { summary?: string }).summary)
  return id
}

type GapfillRecord = {
  name: string
  prefix?: string
  kind?: EntityKind
  location?: string
  description?: string
  strategy?: string
  hp?: string
  negation?: string
  drops?: string[]
  requirements?: string
  scaling?: string
  weight?: string
  source: string
}

/**
 * Task 124 §2 — fold `public/sourced/open/gapfill.json` into the index. Every
 * record was read from a wiki page and carries that page's URL; the build only
 * fills fields the other datasets left empty, so gapfill is the lowest-priority
 * source and can never overwrite grounded data.
 */
function mergeGapfill(): void {
  const rows = (gapfillDoc as { records?: GapfillRecord[] }).records ?? []
  for (const row of rows) {
    const name = correctName(row.name)
    const prefix = row.prefix ?? 'item'
    const kind = (row.kind ?? 'item') as EntityKind
    const id =
      prefix === 'boss'
        ? resolveName(name, 'boss') ?? resolveName(name, 'invader')
        : catalogueIdFor(prefix, name)
    if (!id) continue
    const record = records.get(id) ?? (prefix === 'boss' ? ensure(id, kind, name) : ensureCatalogue(id, kind, name))
    if (kind !== 'item' && record.kind === 'item') record.kind = kind
    setText(record, 'location', row.location)
    setText(record, 'description', row.description)
    setText(record, 'strategy', row.strategy)
    setStat(record, 'HP', row.hp)
    setStat(record, 'Negation', row.negation)
    setStat(record, 'Requirements', row.requirements)
    setStat(record, 'Scaling', row.scaling)
    setStat(record, 'Weight', row.weight)
    if (row.drops?.length) addDrops(record, row.drops)
    if (row.source) record.sourceUrl = row.source
    source(record, 'gapfill')
  }
}

// ---------------------------------------------------------------------------
// Task 132 §1 — fold the classified wiki DB
// ---------------------------------------------------------------------------

type WikiRecord = {
  id: string
  title: string
  kind: string
  infobox: string
  url: string
  dlc: boolean
  categories: string[]
  region: string
  location: string
  description: string
  drops: string[]
  stats: Record<string, string>
}

const REGION_NAMES = [
  'Limgrave', 'Weeping Peninsula', 'Stormveil Castle', 'Liurnia of the Lakes', 'Moonlight Altar',
  'Academy of Raya Lucaria', 'Caelid', "Greyoll's Dragonbarrow", 'Altus Plateau', 'Capital Outskirts',
  'Mt. Gelmir', 'Volcano Manor', 'Leyndell, Royal Capital', 'Leyndell, Ashen Capital', 'Forbidden Lands',
  'Mountaintops of the Giants', 'Crumbling Farum Azula', 'Consecrated Snowfield', "Miquella's Haligtree",
  'Siofra River', 'Mohgwyn Dynasty Mausoleum', 'Ainsel River', 'Deeproot Depths', 'Nokron, Eternal City',
  'Lake of Rot', 'Subterranean Shunning-Grounds', 'Gravesite Plain', 'Scadu Altus', 'Scaduview',
  'Ancient Ruins of Rauh', 'Rauh Base', 'Cerulean Coast', "Charo's Hidden Grave", 'Jagged Peak',
  'Abyssal Woods', 'Enir-Ilim', 'Belurat, Tower Settlement', 'Castle Ensis', 'Shadow Keep',
  "Midra's Manse", 'Church of the Bud', 'Stone Coffin Fissure', 'Scadutree Base', 'Hinterland',
  'Roundtable Hold', 'Chapel of Anticipation',
]

const REGION_HINTS: [RegExp, string][] = [
  [/dragonbarrow/i, "Greyoll's Dragonbarrow"],
  [/caelid|aeonia|sellia|redmane|bestial sanctum|caelum/i, 'Caelid'],
  [/stormveil|stormhill|stormfoot/i, 'Stormveil Castle'],
  [/raya lucaria|liurnia|caria|three sisters|manus|scenic isle|village of the albinaurics/i, 'Liurnia of the Lakes'],
  [/weeping peninsula|castle morne|tombsward|morne/i, 'Weeping Peninsula'],
  [/limgrave|coastal cave|highroad|summonwater|waypoint|stranded graveyard|mistwood/i, 'Limgrave'],
  [/gelmir|volcano manor|seethewater|fort laiedd|wyndham/i, 'Mt. Gelmir'],
  [/altus|auriza|shaded castle|lux ruins|hermit village|old altus|sealed tunnel/i, 'Altus Plateau'],
  [/leyndell|capital|elden throne|ashen/i, 'Leyndell, Royal Capital'],
  [/mountaintops|castel sol|flame peak|giant|snowfield|consecrated|spiritcaller/i, 'Mountaintops of the Giants'],
  [/farum azula/i, 'Crumbling Farum Azula'],
  [/haligtree|elphael/i, "Miquella's Haligtree"],
  [/siofra/i, 'Siofra River'],
  [/ainsel|lake of rot|grand cloister|moonlight/i, 'Ainsel River'],
  [/deeproot/i, 'Deeproot Depths'],
  [/nokron|nokstella/i, 'Nokron, Eternal City'],
  [/mohgwyn/i, 'Mohgwyn Dynasty Mausoleum'],
  [/gravesite/i, 'Gravesite Plain'],
  [/scadu altus|moorth|rauh base|rauh ruins/i, 'Scadu Altus'],
  [/scaduview|scadutree|shadow keep/i, 'Scaduview'],
  [/ancient ruins of rauh/i, 'Ancient Ruins of Rauh'],
  [/cerulean/i, 'Cerulean Coast'],
  [/charo/i, "Charo's Hidden Grave"],
  [/jagged peak/i, 'Jagged Peak'],
  [/abyssal/i, 'Abyssal Woods'],
  [/enir-ilim|belurat|tower settlement/i, 'Enir-Ilim'],
  [/realm of shadow|shadow of the erdtree|land of shadow/i, 'Shadow of the Erdtree'],
]

function regionFromText(text: unknown): string | undefined {
  const raw = String(text ?? '')
  const t = simpleNorm(raw)
  if (!t) return undefined
  let best: string | undefined
  for (const region of REGION_NAMES) if (t.includes(simpleNorm(region)) && (!best || region.length > best.length)) best = region
  if (best) return best
  for (const [re, region] of REGION_HINTS) if (re.test(raw)) return region
  return undefined
}

const wikiRecords = (doc: unknown): WikiRecord[] => (doc as { records?: WikiRecord[] }).records ?? []

/** Resolve wiki redirect chains so a redirect title maps to its canonical page. */
const wikiRedirectTo = new Map<string, string>()
for (const redirect of (wikiRedirectDoc as { redirects?: { from: string; to: string }[] }).redirects ?? []) {
  const from = simpleNorm(redirect.from)
  if (from && !wikiRedirectTo.has(from)) wikiRedirectTo.set(from, redirect.to)
}
function canonicalWikiTitle(title: string): string {
  let current = title
  for (let i = 0; i < 4; i++) {
    const next = wikiRedirectTo.get(simpleNorm(current))
    if (!next || simpleNorm(next) === simpleNorm(current)) break
    current = next
  }
  return current
}

/** Enrich an existing record with a wiki record's prose/url (never overwrites). */
function enrichFromWiki(record: EntityRecord, rec: WikiRecord): void {
  setText(record, 'description', rec.description)
  setText(record, 'location', rec.location || rec.stats.Location || rec.region)
  if (rec.url) record.sourceUrl = record.sourceUrl ?? rec.url
  source(record, 'wiki-db')
}

function mergeWikiDb(): void {
  const redirects = (wikiRedirectDoc as { redirects?: { from: string; to: string }[] }).redirects ?? []
  const redirectAliases = new Map<string, string[]>()
  for (const redirect of redirects) {
    if (!redirect.from || !redirect.to) continue
    const key = simpleNorm(redirect.to)
    const list = redirectAliases.get(key) ?? []
    list.push(redirect.from)
    redirectAliases.set(key, list)
  }

  // NPCs (Characters).
  for (const rec of wikiRecords(wikiNpcDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const id = resolveName(title, 'npc') ?? resolveName(rec.title, 'npc') ?? `npc:${slug(title)}`
    const record = records.get(id) ?? ensure(id, 'npc', title)
    if (record.kind === 'item') record.kind = 'npc'
    enrichFromWiki(record, rec)
    setStat(record, 'Role', rec.stats.Role)
    setStat(record, 'Affiliation', rec.stats.Affiliation)
    if (!record.region) record.region = regionFromText(rec.location || rec.description)
    for (const alias of redirectAliases.get(simpleNorm(rec.title)) ?? []) addName(alias, id)
  }

  // Enemies: fold onto the canonical boss when the wiki enemy is a boss.
  for (const rec of wikiRecords(wikiEnemyDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const bossId = resolveName(title, 'boss') ?? resolveName(title, 'invader')
    if (bossId && records.has(bossId)) {
      enrichFromWiki(records.get(bossId)!, rec)
      continue
    }
    const id = resolveName(title, 'enemy') ?? `enemy:${slug(title)}`
    const record = records.get(id) ?? ensure(id, 'enemy', title)
    if (record.kind === 'item') record.kind = 'enemy'
    enrichFromWiki(record, rec)
    setStat(record, 'HP', rec.stats.HP)
    addDrops(record, rec.drops)
    if (!record.region) record.region = regionFromText(`${rec.location} ${rec.description}`)
    for (const alias of redirectAliases.get(simpleNorm(rec.title)) ?? []) addName(alias, id)
  }

  // Bosses: enrich the canonical record, or mint a wiki-only encounter.
  for (const rec of wikiRecords(wikiBossDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const location = rec.location || rec.stats.Location
    const region = rec.region || regionFromText(`${location} ${rec.description}`)
    const id = resolveName(title, 'boss') ?? resolveName(title, 'invader') ?? resolveName(rec.title, 'boss')
    if (id && records.has(id)) {
      const record = records.get(id)!
      enrichFromWiki(record, rec)
      setStat(record, 'HP', rec.stats.HP)
      addDrops(record, rec.drops)
      if (!record.region && region) record.region = region
      continue
    }
    const newId = id ?? `boss:${slug(title)}`
    const record = records.get(newId) ?? ensure(newId, 'boss', title)
    enrichFromWiki(record, rec)
    setStat(record, 'HP', rec.stats.HP)
    addDrops(record, rec.drops)
    const finalLocation = record.location || location || region || title
    setText(record, 'location', finalLocation)
    if (!record.region) record.region = region ?? regionFromText(finalLocation) ?? finalLocation
  }

  // Locations + subregions (filed under the existing `region` kind the Library
  // Locations category already uses).
  for (const rec of wikiRecords(wikiLocationDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const id = resolveName(title, 'region') ?? `region:${slug(title)}`
    const record = records.get(id) ?? ensure(id, 'region', title)
    if (record.kind === 'item') record.kind = 'region'
    enrichFromWiki(record, rec)
    setText(record, 'location', rec.region || rec.stats.Region || rec.location || rec.stats.Type)
    for (const alias of redirectAliases.get(simpleNorm(rec.title)) ?? []) addName(alias, id)
  }

  // Dungeons: enrich the authored `dungeon:` records the graph already knows.
  for (const rec of wikiRecords(wikiDungeonDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const id = `dungeon:${slug(title)}`
    const record = records.get(id) ?? (hasEntity(id) ? ensureEntity(getEntity(id)) : undefined)
    if (!record) continue
    enrichFromWiki(record, rec)
    setText(record, 'location', rec.region || rec.stats.Region)
  }

  // Weapons / armor / talismans / spells / ashes / spirits: enrich the
  // catalogue record; a wiki-only page becomes a non-catalogue reference record
  // (so it never inflates a 100% coverage guard).
  const catalogueDocs: [unknown, EntityKind][] = [
    [wikiWeaponDoc, 'weapon'],
    [wikiArmorDoc, 'armor'],
    [wikiTalismanDoc, 'talisman'],
    [wikiSpellDoc, 'spell'],
    [wikiAshDoc, 'ash'],
    [wikiSpiritDoc, 'spirit'],
  ]
  for (const [doc, kind] of catalogueDocs) {
    for (const rec of wikiRecords(doc)) {
      const title = canonicalWikiTitle(rec.title)
      const id = catalogueIdFor('item', title)
      const record = records.get(id) ?? ensure(id, kind, title)
      if (record.kind === 'item' && kind !== 'item') record.kind = kind
      enrichFromWiki(record, rec)
      setStat(record, 'Weight', rec.stats.Weight)
      if (rec.stats.Poise) setStat(record, 'Poise', rec.stats.Poise)
    }
  }

  // Items (goods): key items, tools, crafting materials, cookbooks, consumables.
  for (const rec of wikiRecords(wikiItemDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const id = catalogueIdFor('item', title)
    const record = records.get(id) ?? ensure(id, 'item', title)
    enrichFromWiki(record, rec)
    if (!record.location) setText(record, 'location', rec.stats.Obtained)
    setStat(record, 'Effect', rec.stats.Effect)
    for (const alias of redirectAliases.get(simpleNorm(rec.title)) ?? []) addName(alias, id)
  }
}

/** Seed every BonfireWarpParam grace with its region and plate coordinates. */
function mergeWikiGraces(): void {
  const graceIds = new Set<string>()
  const coordByName = new Map<string, { x: number; y: number; map?: string; world?: string }>()
  const addCoord = (name: string, coord: { x: number; y: number; map?: string; world?: string }) => {
    for (const key of [...mapKeys(name), baseNorm(name).replace(/\bsite of grace\b|\bsite\b/g, '').trim()]) {
      if (key && !coordByName.has(key)) coordByName.set(key, coord)
    }
  }
  for (const row of coords as (CoordRow & { kind?: string })[]) {
    if (row.kind === 'grace' && typeof row.x === 'number' && typeof row.y === 'number') {
      addCoord(row.name, { x: row.x, y: row.y, map: row.map, world: row.world })
    }
  }
  for (const grace of (mapExtras as { graces?: { name: string; lat: number; lng: number; code?: string }[] }).graces ?? []) {
    if (typeof grace.lat === 'number' && typeof grace.lng === 'number') {
      addCoord(grace.name, { x: grace.lng, y: grace.lat, world: grace.code })
    }
  }
  // Task 132 §2 — the other coordinate planes: the er-guide location markers, the
  // engine mosaic graces and the unused eldenringmap dump. Together they close
  // the last few BonfireWarpParam warps the guide's grace list alone drops.
  for (const loc of (mapExtras as { locations?: { name: string; lat: number; lng: number; code?: string }[] }).locations ?? []) {
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      addCoord(loc.name, { x: loc.lng, y: loc.lat, world: loc.code })
    }
  }
  const MOSAIC = 10496
  for (const grace of (engineMarkersDoc as { graces?: { name: string; px: number; py: number }[] }).graces ?? []) {
    if (typeof grace.px === 'number' && typeof grace.py === 'number') {
      addCoord(grace.name, { x: (grace.px / MOSAIC) * 100, y: (grace.py / MOSAIC) * 100 })
    }
  }
  for (const grace of (eldenringMap as { graces?: { name: string; x: number; y: number; world?: string }[] }).graces ?? []) {
    if (typeof grace.x === 'number' && typeof grace.y === 'number') {
      addCoord(grace.name, { x: (grace.x / MOSAIC) * 100, y: (grace.y / MOSAIC) * 100, world: grace.world })
    }
  }
  for (const row of checklistGraces as (ChecklistGrace & { id?: string; warpId?: number })[]) {
    // Exact name only: a fuzzy match would merge two distinct warps into one. A
    // second row with the same name (e.g. two "Artist's Shack" warps) keeps its
    // engine warp id so no warp is silently dropped.
    const exact = mapKeys(row.name).map((key) => nameIndex.get(key)).find((id) => id && hasEntity(id) && getEntity(id).kind === 'grace')
    const id = exact && !graceIds.has(exact) ? exact : row.id ?? `grace:${slug(row.name)}`
    graceIds.add(id)
    const record = records.get(id) ?? (exact === id ? ensureEntity(getEntity(id)) : ensure(id, 'grace', row.name))
    setText(record, 'description', row.region)
    setText(record, 'location', row.region)
    setStat(record, 'World', row.world)
    const lookupNames = [row.name, correctName(row.name)]
    const coord =
      lookupNames.flatMap((n) => [...mapKeys(n), ...mapKeys(n.replace(/ \(site of grace\)$/i, ''))]).map((key) => coordByName.get(key)).find(Boolean) ??
      lookupNames.map((n) => coordByName.get(baseNorm(n).replace(/\bsite of grace\b|\bsite\b/g, '').trim())).find(Boolean)
    if (coord) {
      record.map = { x: coord.x, y: coord.y, map: coord.map, world: coord.world }
    }
    source(record, 'checklists/graces')
  }
}

type FmgNameRow = { id: string; kind: string; name: string; info?: string }

/**
 * Task 132 §2 — surface the FMG name plane the app already carries but never
 * indexed: the goods catalogue (items), every NPC name, and every place name.
 * These are plain reference records (not Library catalogue rows), so a name
 * with no description/location never drags a coverage guard down.
 */
function mergeFmgNames(): void {
  const rows = namesData as FmgNameRow[]
  const ensureKind = (id: string, kind: EntityKind, name: string): EntityRecord => {
    const existing = records.get(id)
    if (existing) return existing
    const record = ensure(id, kind, name)
    record.catalogue = false
    return record
  }
  for (const row of rows) {
    if (row.kind === 'goods') {
      const id = catalogueIdFor('item', row.name)
      const record = records.get(id) ?? ensureKind(id, 'item', row.name)
      setText(record, 'description', row.info)
      source(record, 'names/fmg-goods')
    } else if (row.kind === 'npcs') {
      const exact = mapKeys(row.name).map((key) => nameIndex.get(key)).find((id) => id && hasEntity(id) && getEntity(id).kind === 'npc')
      const id = exact ?? row.id ?? `npc:${slug(row.name)}`
      const record = records.get(id) ?? ensureKind(id, 'npc', row.name)
      if (record.kind === 'item') record.kind = 'npc'
      setText(record, 'description', row.info)
      source(record, 'names/fmg-npcs')
    } else if (row.kind === 'places') {
      const exact = mapKeys(row.name).map((key) => nameIndex.get(key)).find((id) => id && hasEntity(id) && getEntity(id).kind === 'region')
      const id = exact ?? row.id ?? `region:${slug(row.name)}`
      const record = records.get(id) ?? ensureKind(id, 'region', row.name)
      if (record.kind === 'item') record.kind = 'region'
      source(record, 'names/fmg-places')
    } else if (row.kind === 'accessories') {
      const id = catalogueIdFor('item', row.name)
      const record = records.get(id) ?? ensureKind(id, 'talisman', row.name)
      setText(record, 'description', row.info)
      source(record, 'names/fmg-accessories')
    } else if (row.kind === 'protector') {
      const id = catalogueIdFor('item', row.name)
      const record = records.get(id) ?? ensureKind(id, 'armor', row.name)
      setText(record, 'description', row.info)
      source(record, 'names/fmg-protector')
    } else if (row.kind === 'arts') {
      const id = catalogueIdFor('item', row.name)
      const record = records.get(id) ?? ensureKind(id, 'ash', row.name)
      setText(record, 'description', row.info)
      source(record, 'names/fmg-arts')
    }
  }
}

type EnemyCombatRow = {
  factId?: string
  name: string
  baseHp?: number
  poise?: number
  negation?: Record<string, number>
  resist?: Record<string, number>
  maps?: string[]
}

/**
 * Task 132 §2 — the enemy kind. Every NpcParam combat row becomes an `enemy`
 * entity with its HP, negation/resist table and map placement. Rows are keyed by
 * their fact id so group variants stay distinct.
 */
function mergeEnemyCombat(): void {
  for (const row of enemyCombat as EnemyCombatRow[]) {
    const id = row.factId ?? `enemy:${slug(row.name)}`
    const record = records.get(id) ?? ensure(id, 'enemy', row.name)
    if (record.kind === 'item') record.kind = 'enemy'
    setText(record, 'description', row.name)
    if (row.maps?.length) setText(record, 'location', row.maps.join(' · '))
    setStat(record, 'HP', numberStat(row.baseHp))
    setStat(record, 'Poise', numberStat(row.poise))
    setStat(record, 'Negation', formatNegation(row.negation))
    if (row.resist) {
      const labels: Record<string, string> = { poison: 'Poison', scarletRot: 'Scarlet Rot', bleed: 'Bleed', sleep: 'Sleep', madness: 'Madness', curse: 'Curse' }
      const text = Object.entries(row.resist).filter(([k]) => labels[k]).map(([k, v]) => `${labels[k]} ${v}`).join(' · ')
      if (text) setStat(record, 'Status resist', text)
    }
    source(record, 'enemy-combat')
  }
}

/**
 * Task 132 §2 — the acquisition dump names 2,609 item/obtained rows. Every name
 * it carries that is not already an entity becomes a reference `item` record
 * with its acquisition text, so no scraped item name is left out of the index.
 */
function mergeAcquisitionItems(): void {
  for (const row of acquisitionDoc.rows as AcqRow[]) {
    const id = catalogueIdFor('item', row.name)
    const existing = records.get(id)
    if (existing) {
      setText(existing, 'location', row.location ?? row.near)
      continue
    }
    const record = ensure(id, 'item', correctName(row.name))
    record.catalogue = false
    setText(record, 'description', row.method)
    setText(record, 'location', row.location ?? row.near)
    source(record, 'acquisition')
  }
}

function mergeDungeon(row: { id?: string; name: string; region?: string; x?: number; y?: number; bosses?: string[] }): void {
  const id = `dungeon:${row.id ?? slug(row.name)}`
  if (!hasEntity(id)) return
  const record = ensureEntity(getEntity(id))
  setText(record, 'location', row.region)
  if (typeof row.x === 'number' && typeof row.y === 'number') record.map = { x: row.x, y: row.y }
  source(record, 'dungeons')
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------

export function buildEntityIndex(): EntityIndexBuildResult {
  records.clear()
  for (const key of Object.keys(unmatched)) delete unmatched[key]

  const bump = (key: string) => {
    unmatched[key] = (unmatched[key] ?? 0) + 1
  }

  // Seed every non-catalogue graph entity so coverage always has a record to
  // measure. Catalogue kinds (weapon/shield/armor/talisman/spell/ash/spirit/item)
  // are enumerated from their own sources below, so a quest item the catalogue
  // does not carry never inflates the item set (Task 123 §2/§3).
  const CATALOGUE_SEED_KINDS = new Set<EntityKind>(['weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'item'])
  for (const entity of entityList) {
    if (CATALOGUE_SEED_KINDS.has(entity.kind)) continue
    ensureEntity(entity)
  }

  // Task 123 §2 — enumerate the FULL catalogue, not just the graph subset. The
  // shield set is the FanAPI list the Library uses (plus the checklist dump);
  // every other name the regulation/armory/fanapi/checklist sources carry is a
  // weapon. Records use the same canonical id the Library computes.
  const shieldNameSet = new Set<string>()
  for (const row of [...(checklistShields as ChecklistWeapon[]), ...(fanShields as { name: string }[])]) {
    shieldNameSet.add(normalizeName(row.name))
  }
  for (const row of checklistShields as ChecklistWeapon[]) mergeWeapon(row.name, 'shield')
  for (const row of fanShields as { name: string }[]) mergeWeapon(row.name, 'shield')

  const weaponSeeds: [string, string][] = [
    ...(checklistWeapons as ChecklistWeapon[]).map((r) => [r.name, 'checklists/weapons'] as [string, string]),
    ...(fanWeapons as { name: string }[]).map((r) => [r.name, 'fanapi/weapons'] as [string, string]),
    ...(armoryWeapons as { name: string }[]).map((r) => [r.name, 'armory-weapons'] as [string, string]),
    ...[...new Set((regulation.weapons as RegWeapon[]).map((w) => w.weaponName))].map(
      (n) => [n, 'regulation'] as [string, string],
    ),
  ]
  const seenWeapon = new Set<string>()
  for (const [name] of weaponSeeds) {
    const key = normalizeName(name)
    if (!key || seenWeapon.has(key) || shieldNameSet.has(key)) continue
    seenWeapon.add(key)
    mergeWeapon(name, 'weapon')
  }

  // Weapons the graph knows but no checklist/armory row named.
  for (const entity of entityList) {
    if (entity.kind === 'weapon' || entity.kind === 'shield') {
      mergeWeapon(entity.name, entity.kind === 'shield' ? 'shield' : 'weapon', entity.id)
    }
  }

  // Talismans, spells, ashes, spirits, items.
  for (const row of checklistTalismans as ChecklistItem[]) mergeSimple(row.name, 'item', 'talisman', row, 'checklists/talismans')
  for (const row of fanTalismans as ChecklistItem[]) mergeSimple(row.name, 'item', 'talisman', row, 'fanapi/talismans')
  for (const row of checklistSorceries as ChecklistItem[]) mergeSimple(row.name, 'item', 'spell', row, 'checklists/sorceries')
  for (const row of checklistIncantations as ChecklistItem[]) mergeSimple(row.name, 'item', 'spell', row, 'checklists/incantations')
  for (const row of fanSpells as ChecklistItem[]) mergeSimple(row.name, 'item', 'spell', row, 'fanapi/spells')

  // The search plane carries the full magic dump; the fanapi/checklist spell
  // sets omit a handful of real incantations (e.g. Flame Sling). Record the
  // extras so peek/entity pages resolve them, without counting them among the
  // catalogue coverage set (they carry no description/location dump).
  for (const row of magicData as { name: string }[]) {
    const match = /^\[(Incantation|Sorcery)\]\s*(.+)$/.exec(row.name)
    if (!match) continue
    const spellName = correctName(match[2].trim())
    const id = catalogueIdFor('item', spellName)
    if (records.has(id)) continue
    const record = ensure(id, 'spell', spellName)
    setLocationFromSummary(record, id)
    const loc = itemLocationFallback(spellName)
    if (loc) {
      setText(record, 'location', loc)
      source(record, 'acquisition')
    }
    source(record, 'open/magic')
  }
  // The checklist prefixes every ash ("Ash Of War: X"); the FanAPI (and the
  // Library) use the bare skill name. Strip it so both share one record.
  for (const row of checklistAshes as ChecklistItem[]) {
    const short = row.name.replace(/^ash(?:es)? of war:\s*/i, '').trim() || row.name
    mergeSimple(short, 'item', 'ash', row, 'checklists/ashes')
  }
  for (const row of fanAshes as ChecklistItem[]) {
    const short = row.name.replace(/^ash(?:es)? of war:\s*/i, '').trim() || row.name
    mergeSimple(short, 'item', 'ash', row, 'fanapi/ashes')
  }
  for (const row of checklistSpirits as ChecklistItem[]) mergeSimple(row.name, 'item', 'spirit', row, 'checklists/spirits')
  for (const row of fanSpirits as ChecklistItem[]) mergeSimple(row.name, 'item', 'spirit', row, 'fanapi/spirits')
  for (const row of checklistItems as ChecklistItem[]) mergeSimple(row.name, 'item', 'item', row, 'checklists/items')
  for (const row of fanItems as ChecklistItem[]) mergeSimple(row.name, 'item', 'item', row, 'fanapi/items')

  // Armor: the full checklist + FanAPI sets, sharing the Library's id.
  for (const row of checklistArmors as ChecklistItem[]) mergeArmorRow(row, 'checklists/armors')
  for (const row of fanArmors as ChecklistItem[]) mergeArmorRow(row, 'fanapi/armors')

  for (const row of checklistNpcs as ChecklistNpc[]) if (!mergeNpc(row.name)) bump('checklists/npcs')
  for (const row of fanNpcs as ChecklistNpc[]) if (!mergeNpc(row.name)) bump('fanapi/npcs')
  for (const entity of entityList) if (entity.kind === 'npc' || entity.kind === 'merchant') mergeNpc(entity.name, entity.id)

  for (const row of checklistGraces as ChecklistGrace[]) if (!mergeGrace(row.name)) bump('checklists/graces')
  for (const entity of entityList) if (entity.kind === 'grace') mergeGrace(entity.name, entity.id)
  // Task 132 §2 — seed every BonfireWarpParam grace (418), not just the ones the
  // graph already named, with region + plate coords.
  mergeWikiGraces()

  // Backfill short graph ids (e.g. `item:lion-s-claw`) from a longer checklist
  // name (`Ash of War: Lion's Claw`) that resolves to a different canonical id.
  for (const entity of entityList) {
    if (entity.kind === 'talisman') mergeSimple(entity.name, 'item', 'talisman', lookupName(checklistTalismanByName, entity.name), 'checklists/talismans', entity.id)
    else if (entity.kind === 'spell') {
      const row = lookupName(checklistSorceryByName, entity.name) ?? lookupName(checklistIncantationByName, entity.name)
      if (row) mergeSimple(entity.name, 'item', 'spell', row, 'checklists/spells', entity.id)
    } else if (entity.kind === 'ash') {
      const row = lookupName(checklistAshByName, entity.name) ?? findBySuffix(checklistAshes as ChecklistItem[], entity.name)
      if (row) mergeSimple(entity.name, 'item', 'ash', row, 'checklists/ashes', entity.id)
    } else if (entity.kind === 'spirit') {
      const row = lookupName(checklistSpiritByName, entity.name)
      if (row) mergeSimple(entity.name, 'item', 'spirit', row, 'checklists/spirits', entity.id)
    } else if (entity.kind === 'item' || entity.kind === 'material') {
      const row = lookupName(checklistItemByName, entity.name)
      if (row) mergeSimple(entity.name, 'item', 'item', row, 'checklists/items', entity.id)
    }
  }

  for (const row of checklistBosses as ChecklistBoss[]) if (!mergeBoss(row.name)) bump('checklists/bosses')
  for (const row of fanBosses as ChecklistBoss[]) if (!mergeBoss(row.name)) bump('fanapi/bosses')
  for (const row of fextDoc.bosses as FextBoss[]) if (!mergeBoss(row.name)) bump('bosses-fextralife')
  for (const row of armoryBosses as ChecklistBoss[]) if (!mergeBoss(row.name)) bump('armory-bosses')
  for (const entity of entityList) if (entity.kind === 'boss' || entity.kind === 'enemy') mergeBoss(entity.name, entity.id)

  // Task 130 — the canonical boss roster is the lowest-priority boss source: a
  // record is only created when the graph already knows the id, but region,
  // location, HP and drops fill any field the other datasets left empty.
  for (const row of bossRoster as RosterBoss[]) {
    const record = records.get(row.id)
    if (!record) continue
    if (!record.region) record.region = row.region
    setText(record, 'location', row.location)
    if (row.hp != null) setStat(record, 'HP', row.hp)
    addDrops(record, row.drops)
    source(record, 'boss-roster')
  }
  // Every boss/enemy needs a region for the Task 130 guard: the authored
  // catalog fact region first, then the record's own location text.
  const factRegion = new Map<string, string>()
  for (const f of facts) if (f.region) factRegion.set(f.id, f.region)
  for (const [id, record] of records) {
    if (record.kind !== 'boss' && record.kind !== 'enemy') continue
    if (!record.region) record.region = factRegion.get(id) ?? record.location
  }

  // Acquisition rows that name an entity the graph knows (location/missable).
  // Catalogue rows already carry their location from `itemLocationFallback`; do
  // not spawn a bare `item` record for a quest item the catalogue leaves out.
  for (const row of acquisitionDoc.rows as AcqRow[]) {
    const id = resolveName(row.name, 'item')
    const bossId = id ?? resolveName(row.name, 'boss')
    const targetId = bossId && hasEntity(bossId) ? bossId : undefined
    if (!targetId) {
      bump('acquisition')
      continue
    }
    const entity = getEntity(targetId)
    let record = records.get(targetId)
    if (!record) {
      if (CATALOGUE_SEED_KINDS.has(entity.kind)) {
        bump('acquisition')
        continue
      }
      record = ensureEntity(entity)
    }
    setText(record, 'location', row.location ?? row.near)
    source(record, 'acquisition')
  }

  // Shops: annotate a catalogue row that is already in the index; the location
  // fallback in `itemLocationFallback` turns the vendor into "Sold by …". A
  // shop-only name the catalogue does not carry is counted, never invented.
  for (const row of shops as { vendor: string; item: string }[]) {
    const record = records.get(catalogueIdFor('item', row.item))
    if (!record) {
      bump('shops')
      continue
    }
    if (!record.sources.includes('shops')) record.sources.push('shops')
  }

  // Recipes: a description/location fallback for crafted catalogue items.
  for (const row of ((recipesDoc as { recipes?: RecipeRow[] }).recipes ?? [])) {
    const record = records.get(catalogueIdFor('item', row.name))
    if (!record) {
      bump('recipes')
      continue
    }
    const text = row.materials.map((m) => `${m.name} x${m.qty ?? 1}`).join(', ')
    setText(record, 'description', text ? `Crafting recipe: ${text}` : undefined)
    setText(record, 'location', text ? `Craftable — ${text}` : 'Craftable')
    source(record, 'recipes')
  }

  // Locations + region entities.
  for (const row of checklistLocations as { name: string; region?: string; blurb?: string }[]) {
    const id = resolveName(row.name, 'region')
    if (!id) {
      const regionId = nameIndex.get(simpleNorm(row.name))
      if (regionId && hasEntity(regionId)) {
        const record = ensureEntity(getEntity(regionId))
        setText(record, 'description', row.blurb ?? row.region)
        source(record, 'checklists/locations')
      } else bump('checklists/locations')
      continue
    }
    const record = ensureEntity(getEntity(id))
    setText(record, 'description', row.blurb ?? row.region)
    source(record, 'checklists/locations')
  }
  for (const row of fanLocations as { name: string; region?: string }[]) {
    const id = nameIndex.get(simpleNorm(row.name)) ?? resolveName(row.name, 'region')
    if (id && hasEntity(id)) {
      const record = ensureEntity(getEntity(id))
      setText(record, 'description', row.region)
      source(record, 'fanapi/locations')
    } else bump('fanapi/locations')
  }

  // Dungeons.
  for (const row of dungeonsData as unknown as { id?: string; name: string; region?: string; x?: number; y?: number }[]) {
    mergeDungeon(row)
  }

  // Task 132 §2 — the FMG name plane and the enemy-combat rows, then the
  // classified wiki DB, before the lowest-priority gap-fill, so a grounded fact
  // is never overwritten by a hand-noted gap.
  mergeEnemyCombat()
  mergeFmgNames()
  mergeAcquisitionItems()
  mergeWikiDb()

  // Task 124 §2 — the sourced gap-fill, applied last so every field is a
  // lowest-priority fallback. `setText`/`setStat` only write when absent.
  mergeGapfill()

  // Related labels from the graph edges + a wiki Summary fallback for anything
  // still without a description.
  for (const entity of entityList) {
    const record = records.get(entity.id)
    if (!record) continue
    const related = edgeLabels(entity.id)
    if (related.length) record.related = related
    if (!record.description && !record.location && entity.summary && entity.summary !== 'No data for this entity yet.') {
      setText(record, 'description', entity.summary)
    }
  }

  for (const record of records.values()) prune(record)

  const byKind: Record<string, number> = {}
  for (const record of records.values()) byKind[record.kind] = (byKind[record.kind] ?? 0) + 1

  const output: Record<string, EntityRecord> = {}
  for (const [id, record] of [...records.entries()].sort((a, b) => a[0].localeCompare(b[0]))) output[id] = record

  return { records: output, unmatched, counts: { total: records.size, byKind } }
}

function edgeLabels(id: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const edge of edges(id)) {
    if (seen.has(edge.label)) continue
    seen.add(edge.label)
    out.push(edge.label)
    if (out.length >= 6) break
  }
  return out
}

function prune(record: EntityRecord): void {
  if (record.description && record.description.length > EXCERPT) record.description = excerpt(record.description)
  if (record.location && record.location.length > EXCERPT) record.location = excerpt(record.location)
  if (record.strategy && record.strategy.length > EXCERPT) record.strategy = excerpt(record.strategy)
  if (record.drops) record.drops = record.drops.filter((d) => d && d.length <= 120).slice(0, 12)
  if (record.sections) {
    record.sections = record.sections.map((s) => ({ heading: s.heading.slice(0, 80), text: excerpt(s.text) })).slice(0, 4)
  }
}

export { EXCERPT }
