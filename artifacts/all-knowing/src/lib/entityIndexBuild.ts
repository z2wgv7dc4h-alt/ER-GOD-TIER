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
type ChecklistItem = { name: string; description?: string; image?: string; effect?: string; type?: string }
type ChecklistGrace = { name: string; region?: string; world?: string }
type ChecklistNpc = { name: string; image?: string; quote?: string; location?: string; role?: string }
type AcqRow = { name: string; location?: string; near?: string; missable?: boolean }
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

const overrides = overridesJson as { aliases?: Record<string, string>; skip?: string[] }

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

function simpleNorm(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[\u2019'`"]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim()
}

function stripParens(value: string): string {
  return value.replace(/\([^)]*\)/g, ' ').replace(/&/g, ' and ')
}

function baseNorm(value: unknown): string {
  return simpleNorm(stripParens(String(value ?? ''))).replace(/^the /, '').replace(/\s+/g, ' ').trim()
}

function tokens(value: string): string[] {
  return baseNorm(value).split(' ').filter(Boolean)
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
  const key = simpleNorm(name)
  if (key && !nameIndex.has(key)) nameIndex.set(key, id)
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
  const direct = nameIndex.get(simpleNorm(name)) ?? nameIndex.get(baseNorm(name))
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
  for (const row of rows) if (!map.has(simpleNorm(row.name))) map.set(simpleNorm(row.name), row)
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
  const keys = [simpleNorm(name), baseNorm(name)]
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
  return best
}

const npcCombatByFact = new Map<string, CombatRow>()
const npcCombatByName = checklistByName(npcCombat as CombatRow[])
for (const row of npcCombat as CombatRow[]) if (row.factId && !npcCombatByFact.has(row.factId)) npcCombatByFact.set(row.factId, row)

const enemyCombatByName = new Map<string, CombatRow>()
for (const row of enemyCombat as CombatRow[]) {
  const key = simpleNorm(stripParens(row.name))
  if (key && !enemyCombatByName.has(key)) enemyCombatByName.set(key, row)
}

const coordsByName = checklistByName(coords as CoordRow[])
const bossXyzByName = checklistByName(bossXyz as CoordRow[])
const bossPinByName = checklistByName(bossPins as CoordRow[])
const npcPlacements = (npcPlacementsDoc as { placements?: { name: string; map?: string; x?: number; y?: number; world?: string }[] }).placements ?? []
const placementByName = checklistByName(npcPlacements)

const wikiByPage = new Map<string, WikiSection[]>()
for (const section of wikiDoc.sections as WikiSection[]) {
  const key = simpleNorm(section.page)
  const list = wikiByPage.get(key) ?? []
  list.push(section)
  wikiByPage.set(key, list)
}

const regRows = new Map<string, RegWeapon[]>()
for (const row of regulation.weapons as RegWeapon[]) {
  const key = simpleNorm(row.weaponName)
  const list = regRows.get(key) ?? []
  list.push(row)
  regRows.set(key, list)
}
const scalingTiers = (regulation.scalingTiers as [number, string][]).slice().sort((a, b) => b[0] - a[0])

function regFor(name: string): RegWeapon | undefined {
  const rows = regRows.get(simpleNorm(name)) ?? regRows.get(baseNorm(name))
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

function mergeWeapon(name: string, kind: 'weapon' | 'shield', forcedId?: string): string {
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
  name: string,
  prefix: string,
  kind: EntityKind,
  checklist: { description?: string; image?: string; effect?: string; effects?: unknown } | undefined,
  sourceName: string,
  forcedId?: string,
): string {
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
  const id = catalogueIdFor('item', row.name)
  const record = ensureCatalogue(id, 'armor', row.name)
  setText(record, 'description', row.description)
  if (row.image && !record.image) record.image = row.image
  const armor = row as unknown as ArmorChecklistRow
  setStat(record, 'Negation', formatNegationEntries(armor.dmgNegation))
  setStat(record, 'Weight', armor.weight)
  if (typeof armor.poise === 'number') setStat(record, 'Poise', armor.poise)
  source(record, sourceName)
  setLocationFromSummary(record, id)
  if (!record.location) {
    const loc = itemLocationFallback(row.name)
    if (loc) {
      setText(record, 'location', loc)
      source(record, 'acquisition')
    }
  }
  return id
}

function mergeBoss(name: string, forcedId?: string): string | undefined {
  const id = forcedId ?? resolveName(name, 'boss') ?? resolveName(name, 'invader')
  if (!id) return undefined
  const record = ensureEntity(getEntity(id))
  const parts = bossParts(name)

  // NpcParam combat (core bosses) then the wider enemy dump.
  for (const part of parts) {
    const combat = npcCombatByFact.get(id) ?? lookupName(npcCombatByName, part)
    const enemy = combat ? undefined : (enemyCombatByName.get(simpleNorm(stripParens(part))) ?? lookupName(enemyCombatByName, part))
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
    const spellName = match[2].trim()
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
  for (const row of fanAshes as ChecklistItem[]) mergeSimple(row.name, 'item', 'ash', row, 'fanapi/ashes')
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
