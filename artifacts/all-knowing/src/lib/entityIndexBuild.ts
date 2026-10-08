import { allEntities, canonicalEntityId, edges, entityName, getEntity, hasEntity, type EntityKind } from './entityGraph'
import { allLines } from '../knowledge/storylines'
import { byId, facts } from '../knowledge/catalog'
import { loot as lootRows } from '../knowledge/loot'
import { merchants } from '../knowledge/merchants'
import { catalogueIdFor } from './catalogueIds'
import { normalizeName } from './fanImage'
import { displayName, JUNK_NAME } from './canonicalNames'
import { itemEntityNameSet, matchWikiStepToBeat } from './questStepMatch'
import type { EnemyVariant, EntityRecord, QuestStepEntry } from './entityIndex'
import generatedAliases from '../data/aliases.json'
import overridesJson from '../data/entity-overrides.json'
import gameNameAliases from '../data/game-name-aliases.json'
import gamePlaceRegions from '../data/game-place-regions.json'
import dungeonsData from '../data/dungeons.json'
import bossRoster from '../data/bosses.json'
import imageIndex from '../data/image-index.json'
// Task 154 — game-text name -> icon id, from `scripts/extract-item-icons.py`.
// The icon files are 128px WebP under public/sourced/images/game-icons/.
import itemIconsJson from '../../public/sourced/open/item-icons.json'
// Task 154 step 3 — boss name -> locally cached Fandom portrait, filled by
// `scripts/ingest-boss-images.py`.
import bossImagesJson from '../../public/sourced/open/boss-images.json'

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
import checklistCreatures from '../../public/sourced/checklists/creatures.json'

import acquisitionDoc from '../../public/sourced/open/acquisition.json'
import wikiDoc from '../../public/sourced/open/wiki-sections.json'
import coords from '../../public/sourced/open/coords.json'
import bossXyz from '../../public/sourced/open/boss-xyz.json'
import bossPins from '../../public/sourced/open/boss-pins.json'
import enemyDropsDoc from '../../public/sourced/open/enemy-drops.json'
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
import fanCreatures from '../../public/sourced/open/fanapi/creatures.json'
import magicData from '../../public/sourced/open/magic.json'
import gapfillDoc from '../../public/sourced/open/gapfill.json'
import mapExtras from '../../public/sourced/guide/map-extras.json'
import engineMarkersDoc from '../../public/sourced/open/engine-markers.json'
import eldenringMap from '../../public/sourced/open/eldenringmap.json'
import namesData from '../../public/sourced/open/names.json'
// The game's own item descriptions (FMG *Caption), keyed by the same numeric id
// as names.json within each kind. Build-time only — this module never ships.
import goodsCaptions from '../../public/sourced/open/text/GoodsCaption.json'
import protectorCaptions from '../../public/sourced/open/text/ProtectorCaption.json'
import accessoryCaptions from '../../public/sourced/open/text/AccessoryCaption.json'
import artsCaptions from '../../public/sourced/open/text/ArtsCaption.json'
import gemCaptions from '../../public/sourced/open/text/GemCaption.json'
import weaponCaptions from '../../public/sourced/open/text/WeaponCaption.json'
import saveIds from '../../public/sourced/open/save-ids.json'
import npcQuestsDoc from '../../public/sourced/open/npc-quests.json'
import placeNames from '../../public/sourced/open/place-names.json'
import mapPoints from '../../public/sourced/open/map-points.json'
import mapLots from '../../public/sourced/open/map-lots.json'
import msbEnemies from '../../public/sourced/open/msb-enemies.json'
// Task 132 §1 — the map-id -> player place plane.
import mapRegionsData from '../../public/sourced/open/map-regions.json'
import graceXyzData from '../../public/sourced/open/grace-xyz.json'
import gameAreasData from '../../public/sourced/open/game-areas.json'
import mapPlaceNamesData from '../../public/sourced/open/map-place-names.json'

// Task 132 §1 — the full wiki DB, classified per kind by `scripts/export-wiki-db.py`.
import wikiBossDoc from '../../public/sourced/open/wiki-db/boss.json'
import wikiEnemyDoc from '../../public/sourced/open/wiki-db/enemy.json'
import wikiNpcDoc from '../../public/sourced/open/wiki-db/npc.json'
import wikiLocationDoc from '../../public/sourced/open/wiki-db/location.json'
import wikiRegionDoc from '../../public/sourced/open/wiki-db/region.json'
import wikiSkillDoc from '../../public/sourced/open/wiki-db/skill.json'
import wikiDungeonDoc from '../../public/sourced/open/wiki-db/dungeon.json'
import wikiItemDoc from '../../public/sourced/open/wiki-db/item.json'
import wikiWeaponDoc from '../../public/sourced/open/wiki-db/weapon.json'
import wikiArmorDoc from '../../public/sourced/open/wiki-db/armor.json'
import wikiSpellDoc from '../../public/sourced/open/wiki-db/spell.json'
import wikiTalismanDoc from '../../public/sourced/open/wiki-db/talisman.json'
import wikiAshDoc from '../../public/sourced/open/wiki-db/ash.json'
import wikiSpiritDoc from '../../public/sourced/open/wiki-db/spirit.json'
import wikiRedirectDoc from '../../public/sourced/open/wiki-db/redirects.json'
import nightreignDoc from '../../public/sourced/open/wiki-db/nightreign.json'
// Task 140 §1 — the parsed `spells` table (FP cost / slots / casting reqs) that
// the item infobox omits. Generated by `scripts/export-wiki-db-tables.mjs`.
import wikiSpellTableDoc from '../../public/sourced/open/wiki-db/spell-table.json'

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
type RosterBoss = {
  id: string
  name: string
  region: string
  location: string
  drops: string[]
  hp: number | null
  group?: string
  runes?: number | null
  about?: string | null
  coords?: { x: number; y: number; map?: string | null } | null
}
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

/**
 * Task 177 — the generic half of a split item and its specific half share one
 * catalog fact id. A source row named after a half ("Dectus Medallion (right)")
 * used to rename the generic record, leaving two same-kind records with one
 * display name. The record keeps its catalog fact's own name instead.
 */
const MEDALLION_HALF_FACTS = new Set(['item:dusk-medallion', 'item:haligtree-secret-medallion'])

function tokens(value: string): string[] {
  return possNorm(stripParens(value)).split(' ').filter(Boolean)
}

/** Whole tokens including any parenthetical qualifier ("Flying Dragon (Small)"). */
function fullTokens(value: string): string[] {
  return simpleNorm(value).split(' ').filter(Boolean)
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

/**
 * Task 154 — item-like records without a picture take the game's own icon.
 * `item-icons.json` keys are the game text-table names, so look a record up by
 * its exact (normalised) name, then by any alias from the alias plane.
 */
const GAME_ICON_KINDS = new Set(['weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'item', 'material', 'ammo'])

const gameIconByName = new Map<string, number>()

/** Every key a record or game name may be filed under for an icon lookup. */
function iconKeys(name: string): string[] {
  const variants = [name, name.replace(/\[[^\]]*\]/g, ' ')] // "Grave Glovewort [1]" -> base
  const keys: string[] = []
  for (const variant of variants) keys.push(...mapKeys(variant), baseNorm(variant))
  return keys
}

for (const [name, iconId] of Object.entries(itemIconsJson as Record<string, number>)) {
  for (const key of iconKeys(name)) {
    if (key && !gameIconByName.has(key)) gameIconByName.set(key, iconId)
  }
}
for (const row of generatedAliases as { kind: string; fmgName: string; aliases: string[] }[]) {
  if (row.kind !== 'item') continue
  const icon = iconKeys(row.fmgName)
    .map((key) => gameIconByName.get(key))
    .find((value) => value != null)
  if (icon == null) continue
  for (const alias of row.aliases) {
    for (const key of iconKeys(alias)) {
      if (key && !gameIconByName.has(key)) gameIconByName.set(key, icon)
    }
  }
}

function gameIconFor(name: string): number | undefined {
  // The Library keeps a few rows under their wiki heading ("Ash of War: X",
  // "Skill: X"); the game's own icon is filed under the bare art name.
  const variants = [
    name,
    name.replace(/^ash(?:es)? of war:\s*/i, ''),
    name.replace(/^skill:\s*/i, ''),
  ]
  for (const variant of variants) {
    for (const key of iconKeys(variant)) {
      const iconId = key ? gameIconByName.get(key) : undefined
      if (iconId != null) return iconId
    }
  }
  return undefined
}

function fillGameIcons(): void {
  let filled = 0
  for (const record of records.values()) {
    if (record.image || !GAME_ICON_KINDS.has(record.kind)) continue
    const iconId = gameIconFor(record.name)
    if (iconId == null) continue
    record.image = `/sourced/images/game-icons/${iconId}.webp`
    filled++
  }
  if (filled) console.log(`game icons filled: ${filled}`)
}

/** Task 154 step 3 — the Fandom portraits for bosses the FanAPI never had. */
const bossImageByName = new Map<string, string>()
for (const [name, path] of Object.entries(bossImagesJson as Record<string, string>)) {
  for (const key of iconKeys(name)) if (key && !bossImageByName.has(key)) bossImageByName.set(key, path)
}

function fillBossImages(): void {
  let filled = 0
  for (const record of records.values()) {
    if (record.image || record.kind !== 'boss') continue
    const path = iconKeys(record.name)
      .map((key) => bossImageByName.get(key))
      .find((value) => value != null)
    if (!path) continue
    record.image = path
    filled++
  }
  if (filled) console.log(`boss images filled: ${filled}`)
}

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

const OWNED_RESOLVE_KINDS = new Set<EntityKind>([
  'item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material',
])
const PLACE_RESOLVE_KINDS = new Set<EntityKind>(['region', 'grace', 'dungeon'])

/**
 * Task 160 — a name shared by several kinds must resolve only within the kind
 * the caller asked for. `resolveName('Patches', 'boss')` used to fall through to
 * whichever entity the name index happened to hold first (the `line:patches`
 * quest page), so a boss/wiki row merged its data — including shop stock — onto
 * the quest line. The prefix now gates the name index, the canonical candidate
 * and the fuzzy fallback.
 */
function kindMatchesResolvePrefix(kind: EntityKind, prefix: string): boolean {
  switch (prefix) {
    case 'boss':
    case 'invader':
    case 'hunt':
    case 'area':
    case 'bossflag':
      return kind === 'boss' || kind === 'enemy'
    case 'enemy':
      return kind === 'enemy' || kind === 'boss'
    case 'npc':
      return kind === 'npc'
    case 'merchant':
      return kind === 'merchant'
    case 'grace':
    case 'point':
      return kind === 'grace'
    case 'region':
    case 'location':
      return PLACE_RESOLVE_KINDS.has(kind)
    case 'dungeon':
      return kind === 'dungeon'
    case 'quest':
    case 'line':
      return kind === 'quest' || kind === 'ending'
    case 'gate':
      return kind === 'gate'
    case 'build':
      return kind === 'build'
    case 'mechanic':
    case 'damage':
      return kind === 'mechanic'
    case 'item':
    case 'loot':
      return OWNED_RESOLVE_KINDS.has(kind)
    default:
      return true
  }
}

function resolveName(name: string, prefix: string): string | undefined {
  const direct = mapKeys(name).map((key) => nameIndex.get(key)).find(Boolean)
  if (direct && hasEntity(direct) && kindMatchesResolvePrefix(getEntity(direct).kind, prefix)) return direct
  const candidate = canonicalEntityId(`${prefix}:${slug(name)}`, name)
  if (hasEntity(candidate) && kindMatchesResolvePrefix(getEntity(candidate).kind, prefix)) return candidate
  const fuzzy = fuzzyEntity(name)
  if (fuzzy && hasEntity(fuzzy) && kindMatchesResolvePrefix(getEntity(fuzzy).kind, prefix)) return fuzzy
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

/**
 * Task 160 §8 — drop strings arrive from the wiki and the rosters with counts,
 * notes and place prefixes that stop the graph resolving them to the real item
 * ("3x Dragon Heart", "Ash of War: Holy Ground", "Cathedral of Manus Celes:
 * Adula's Moonblade", "Smithing Stone (7) x 5"). Clean the ones that name a
 * real item and drop the strings that name no item at all (rune totals, wiki
 * placeholders, section headers).
 */
function cleanDropText(raw: unknown): string | null {
  let text = String(raw ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return null
  if (/^other drops$/i.test(text)) return null
  // Wiki/template noise and section headers, not loot.
  if (/\{\{|icon|\}\}/i.test(text)) return null
  if (/^(n\/?a|various|#drops|useful loot|see |sometimes:|include all|specifying |no runes|xx runes|\?+)$/i.test(text)) return null
  // A rune total ("40~67 Runes", "70k Runes", wiki "583 runes-currency…") is a
  // number, not an item; "Golden Runes" / "Rune Arc" do not start with digits.
  if (/^\s*[\d~≈?kx.,\-\s]*runes?\b/i.test(text)) return null
  if (/^[\d~≈]+$/.test(text)) return null
  text = text.replace(/^[*•\s]+/, '')
  text = text.replace(/^\d+\s*x\s+/i, '')
  text = text.replace(/\s*(?:x\s*\d+|\d+\s*x|\*\s*\d+)$/i, '')
  text = text.replace(/^unlocks\s+/i, '')
  text = text.replace(/^ash of war:\s*/i, '')
  if (/:\s+/.test(text) && !/^ash of war/i.test(text)) text = text.split(/:\s+/).pop() ?? text
  text = text.replace(/\((\d+)\)/g, '[$1]')
  // A trailing "(ash)"/"(ashes)" is a wiki qualifier, not part of the name.
  text = text.replace(/\s*\((?:ash|ashes)\)\s*$/i, '')
  text = text.replace(/^[*•\s]+/, '').trim()
  if (!text) return null
  return text
}

function addDrops(record: EntityRecord, drops: unknown): void {
  if (!Array.isArray(drops)) return
  for (const drop of drops) {
    const text = cleanDropText(drop)
    if (!text) continue
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

/** The acquisition-method labels the wiki dumps prefix a location with. */
const ACQ_METHOD_LABEL =
  'loot|location|obtained|guaranteed drops?|dragon communion|reward|source|drop|quest item|remembrance item|purchase|purchased|quest|defeat|trade|equipped|tailor|random loot|random drop|painting treasure|painting item|received upon|altered version is received upon'

/** A leading acquisition-method label on a location; group 1 is the place text. */
const ACQ_LABEL_RE = new RegExp(`^(?:${ACQ_METHOD_LABEL})\\s*[:：]\\s*(.*)$`, 'i')

/**
 * Task 177 — a bare place *type* ("Church", "Shack", "Subregion", "grace") is
 * never a location; the name already carries the type and `region` carries the
 * parent. The wiki's `stats.Type` used to be stored verbatim as `location`.
 */
const BARE_PLACE_TYPE =
  /^(?:church|shack|village|tower|rise|fort|subregion|grace|site of grace|sites of grace|ruins?|cave|tunnel|catacombs?|mausoleum|evergaol|capital|manor|castle|town|city|bridge|gate|mine|gaol|keep|palace|academy|dungeon|well|square|grounds|region|location|area)$/i

/** Task 177 — true when the text is only a generic place-type word. */
function isBarePlaceType(value: unknown): boolean {
  return BARE_PLACE_TYPE.test(String(value ?? '').trim())
}

/**
 * Task 177 — the acquisition dump often stores the whole wiki paragraph in
 * `location` (`"**Location**: Shadow Keep\n- The … is found in …"`). Keep only
 * the real place: prefer the concise `near` field, else the text after a
 * `Location:`/`Loot:`/`Guaranteed Drop:`/`Dragon Communion:` label, else the
 * first line. A sentence or a bullet is prose, never a place.
 */
function cleanAcquisitionPlace(location: unknown, near: unknown): string | undefined {
  const nearText = String(near ?? '').trim()
  if (nearText) return nearText
  const raw = String(location ?? '').trim()
  if (!raw) return undefined
  const text = raw.replace(/\*+/g, '')
  const label = ACQ_LABEL_RE.exec(text)
  // A single-line, unlabelled acquisition sentence is not a wiki paragraph: it
  // is the only locator the record carries, so keep it (cleaning it would empty
  // the field and drop every item/talisman/spirit below the coverage guard).
  if (!label && !text.includes('\n')) return text
  const first = (label ? label[1] : text.split(/\r?\n/)[0]).replace(/^[-*•\s]+/, '').trim()
  if (!first) return undefined
  if (/^merchant$/i.test(first) || isBarePlaceType(first)) return undefined
  if (first.length > 48 || /[.!?]\s*$/.test(first)) return undefined
  if (/^(?:the|a|an|about|acquired|found|dropped|it |this )/i.test(first)) return undefined
  return first
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
    const acqText = acq ? cleanAcquisitionPlace(acq.location, acq.near) : undefined
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
    const acqText = acq ? cleanAcquisitionPlace(acq.location, acq.near) : undefined
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

/**
 * Task 151 §2 — the FanAPI creature plane carries a real, unique description
 * for many enemies ("The Giant Bats of Limgrave are nocturnal creatures…"). It
 * is a description fallback after the wiki, per the task's source order.
 */
const creatureDescriptionByName = new Map<string, string>()
for (const row of checklistCreatures as { name: string; description?: string }[]) {
  const text = row.description?.trim()
  if (text && text.length >= 20) {
    for (const key of mapKeys(row.name)) if (key && !creatureDescriptionByName.has(key)) creatureDescriptionByName.set(key, text)
  }
}

function creatureLead(name: string): string | undefined {
  return lookupName(creatureDescriptionByName, name)
}

/**
 * Task 176 — a short list of common type words that must never capture a longer
 * place or creature name. A page literally titled "Ruins" must not become the
 * description of "Seaside Ruins", and a page titled "Poison" must not describe
 * "Poison Claw Elder Albinauric".
 */
const GENERIC_PAGE_TOKENS = new Set([
  'ruin', 'ruins', 'grace', 'cave', 'catacomb', 'catacombs', 'tower', 'fort', 'church',
  'shack', 'village', 'rise', 'town', 'mausoleum', 'bridge', 'camp', 'gate', 'tunnel',
  'mine', 'castle', 'manor', 'academy', 'palace', 'keep', 'gaol', 'dungeon', 'capital',
  'city', 'well', 'square', 'grounds', 'area', 'region', 'location', 'crater', 'grave',
  'poison', 'scarlet', 'rot', 'bleed', 'sleep', 'madness', 'death', 'frost', 'freeze',
  'curse', 'status', 'effect', 'damage', 'resistance', 'immunity', 'robustness',
  'vitality', 'focus', 'stamina', 'fire', 'flame', 'lightning', 'magic', 'holy',
  'dragon', 'erdtree', 'dragonkin',
])

/**
 * Task 176 — the wiki's page for `name`. The exact page (apart from
 * possessives/plurals) always wins. The fuzzy pass tolerates a qualifier the
 * record name adds ("Abductor Virgin Both" -> "Abductor Virgin"), but never a
 * generic type page ("Poison" for "Poison Claw Elder Albinauric"), a longer
 * superset a qualifier disowns ("Flying Dragon (Small)" vs "Flying Dragon
 * Agheel") or an unrelated substring ("Rat" vs "Crater"). Nightreign-only pages
 * are never used.
 */
function lookupWiki(name: string): WikiSection[] | undefined {
  const direct = lookupName(wikiByPage, name)
  if (direct && !nightreignPageTitles.has(direct[0]?.page ?? '')) return direct
  const na = baseNorm(name)
  const tokenA = fullTokens(name)
  const hasQualifier = /\([^)]*\)/.test(name)
  let best: WikiSection[] | undefined
  let bestScore = 0.92
  for (const [key, rows] of wikiByPage) {
    if (nightreignPageTitles.has(rows[0]?.page ?? '')) continue
    const nb = baseNorm(key)
    if (!na || !nb || GENERIC_PAGE_TOKENS.has(nb)) continue
    // A record with a parenthetical qualifier ("Flying Dragon (Small)") must not
    // fall through to the longer base page ("Flying Dragon Agheel"): the
    // qualifier names a different thing, not a spelling of the page title.
    if (hasQualifier && nb.length > na.length && nb.startsWith(na)) continue
    const score = similarity(name, key)
    if (score > bestScore) {
      bestScore = score
      best = rows
    }
  }
  if (best) return best
  // Task 124 §1 — a distinctive single-token page ("Vyke") matches a longer
  // source name that contains it ("Festering Fingerprint Vyke"). Generic type
  // or status words never qualify.
  const wanted = new Set(tokenA)
  for (const [key, rows] of wikiByPage) {
    if (nightreignPageTitles.has(rows[0]?.page ?? '')) continue
    const keyTokens = fullTokens(key)
    if (keyTokens.length !== 1 || keyTokens[0].length < 4 || GENERIC_PAGE_TOKENS.has(keyTokens[0]) || !wanted.has(keyTokens[0])) continue
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

/**
 * Task 176 — pages that are *only* about Elden Ring: Nightreign. A page whose
 * Summary names Nightreign but no base game ("Limveld", "Crater", "Mountaintop")
 * carries another game's prose and must never render on an Elden Ring page.
 */
const nightreignPageTitles = new Set<string>()
{
  const summaryByPage = new Map<string, string>()
  for (const section of wikiDoc.sections as WikiSection[]) {
    if (!/summary/i.test(section.heading)) continue
    summaryByPage.set(section.page, `${summaryByPage.get(section.page) ?? ''} ${section.text ?? ''}`)
  }
  for (const [page, summary] of summaryByPage) {
    if (!/nightreign/i.test(summary)) continue
    if (/elden ring/i.test(summary.replace(/elden ring nightreign/gi, ''))) continue
    nightreignPageTitles.add(page)
  }
  // The Nightreign item pages the wiki export already classifies.
  for (const rec of (nightreignDoc as { records?: { title?: string }[] }).records ?? []) {
    if (rec.title) nightreignPageTitles.add(rec.title)
  }
}

/** Task 176 — the wiki-db kind of each page, so a description stays on its kind. */
const wikiPageKind = new Map<string, string>()
for (const [doc, kind] of [
  [wikiBossDoc, 'boss'],
  [wikiEnemyDoc, 'enemy'],
  [wikiNpcDoc, 'npc'],
  [wikiLocationDoc, 'location'],
  [wikiRegionDoc, 'region'],
  [wikiDungeonDoc, 'dungeon'],
  [wikiItemDoc, 'item'],
  [wikiWeaponDoc, 'weapon'],
  [wikiArmorDoc, 'armor'],
  [wikiSpellDoc, 'spell'],
  [wikiTalismanDoc, 'talisman'],
  [wikiAshDoc, 'ash'],
  [wikiSpiritDoc, 'spirit'],
] as [unknown, string][]) {
  for (const rec of (doc as { records?: { title?: string }[] }).records ?? []) {
    const key = simpleNorm(rec.title)
    if (key && !wikiPageKind.has(key)) wikiPageKind.set(key, kind)
  }
}

/**
 * Task 176 — a wiki page may only describe a record of a compatible kind. A
 * grace is not a boss, a spell or a place just because it shares a name: a
 * checkpoint is not the thing it stands beside. Region and dungeon pages may
 * quote neighbouring place kinds.
 */
function descriptionKindCompatible(recordKind: string, wikiKind: string): boolean {
  if (recordKind === wikiKind) return true
  if ((recordKind === 'enemy' || recordKind === 'boss') && (wikiKind === 'enemy' || wikiKind === 'boss' || wikiKind === 'npc')) return true
  if ((recordKind === 'npc' || recordKind === 'merchant') && (wikiKind === 'npc' || wikiKind === 'merchant' || wikiKind === 'location')) return true
  const placeRecord = recordKind === 'region' || recordKind === 'dungeon'
  const placeWiki = wikiKind === 'location' || wikiKind === 'region'
  return placeRecord && placeWiki
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

/** "Int 70", dropping the zero rows, from a checklist `requires` array. */
function formatChecklistRequires(requires: unknown): string | undefined {
  if (!Array.isArray(requires)) return undefined
  const label: Record<string, string> = { strength: 'Str', dexterity: 'Dex', intelligence: 'Int', faith: 'Fai', arcane: 'Arc' }
  const parts: string[] = []
  for (const entry of requires as { name?: string; amount?: number }[]) {
    const amount = Number(entry?.amount ?? 0)
    if (!amount) continue
    const key = label[String(entry?.name ?? '').toLowerCase()]
    if (key) parts.push(`${key} ${amount}`)
  }
  return parts.length ? parts.join(' · ') : undefined
}

function mergeSimple(
  rawName: string,
  prefix: string,
  kind: EntityKind,
  checklist:
    | {
        description?: string
        image?: string
        effect?: string
        effects?: unknown
        type?: string
        category?: string
        cost?: number
        slots?: number
        requires?: unknown
      }
    | undefined,
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
    // Task 140 §1 — the checklists carry type / cost / slots / requirements for
    // spells and goods; the builder previously dropped all but Effect, so the
    // accuracy sample found every spell missing its FP cost and slot count.
    setStat(record, 'Type', checklist.type ?? checklist.category)
    if (typeof checklist.cost === 'number') setStat(record, 'FP cost', checklist.cost)
    if (typeof checklist.slots === 'number') setStat(record, 'Slots', checklist.slots)
    setStat(record, 'Requirements', formatChecklistRequires(checklist.requires))
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
  category?: string
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
  // Task 140 §1 — carry the armour slot through; it was only known to the wiki
  // infobox, so catalogue armour had no usable slot.
  setStat(record, 'Type', armor.category)
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

/** Fold one NpcParam combat row onto a record, translating its map tiles. */
function applyCombatStats(record: EntityRecord, row: CombatRow, sourceName: string): void {
  setStat(record, 'HP', numberStat(row.baseHp))
  setStat(record, 'Negation', formatNegation(row.negation))
  setStat(record, 'Poise', numberStat(row.poise))
  if (row.resist) {
    const resist: Record<string, string> = { poison: 'Poison', scarletRot: 'Scarlet Rot', bleed: 'Bleed', sleep: 'Sleep', madness: 'Madness', curse: 'Curse' }
    const text = Object.entries(row.resist).filter(([k]) => resist[k]).map(([k, v]) => `${resist[k]} ${v}`).join(' · ')
    if (text) setStat(record, 'Status resist', text)
  }
  if (!record.location) {
    const located = describeMaps(row.maps)
    if (located) setText(record, 'location', located)
  }
  source(record, sourceName)
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
    applyCombatStats(record, row, combat ? 'npc-combat' : 'enemy-combat')
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
  }
  // Task 176 — a boss's description comes only from its own exact wiki page, of a
  // compatible kind; never from a fuzzy neighbour page the section pass matched.
  const ownWiki = lookupWiki(name)
  if (ownWiki?.length && descriptionKindCompatible(record.kind, wikiPageKind.get(simpleNorm(ownWiki[0].page)) ?? record.kind)) {
    const summary = ownWiki.find((s) => /summary|overview|description|background/i.test(s.heading))
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

/**
 * A dump 'role' that is really a drop list or a pasted item description
 * ("x2 Golden Rune (1), Grovel for Mercy" for Patches) is not a role.
 */
function plausibleRole(role: string | undefined): string | undefined {
  if (!role) return undefined
  return /\d/.test(role) || role.length > 60 ? undefined : role
}

/** Prefer the authored NPC locator ("Found at grace:x" / a note) over fan data. */
function npcLocationFromSummary(summary: string | undefined): string | undefined {
  if (!summary || summary === NO_DATA || summary === 'Location not recorded') return undefined
  const match = summary.match(/^Found at (.+)$/)
  if (match) return /^grace:[a-z0-9-]+$/.test(match[1]) ? getEntity(match[1]).name : match[1]
  return summary
}

/** An existing record of the wanted kind whose name normalises to `name`. */
function findRecordByName(name: string, kind: EntityKind): string | undefined {
  const keys = new Set(mapKeys(name))
  for (const [id, record] of records) {
    if (record.kind !== kind) continue
    for (const key of mapKeys(record.name)) if (keys.has(key)) return id
  }
  return undefined
}

/**
 * Task 132 §2 — an NPC row must resolve to an `npc` entity, never a quest-line
 * beat or a boss that merely shares the name (Sellen, Patches, Ranni). Reuse a
 * real npc record when one exists, else mint `npc:<slug>`.
 */
function npcRecordId(name: string, forcedId?: string): string | undefined {
  if (forcedId) return forcedId
  const resolved = resolveName(name, 'npc')
  if (resolved && hasEntity(resolved) && getEntity(resolved).kind === 'npc') return resolved
  const existing = findRecordByName(name, 'npc')
  return existing ?? `npc:${slug(name)}`
}

function mergeNpc(name: string, forcedId?: string): string | undefined {
  const id = npcRecordId(name, forcedId)
  if (!id) return undefined
  const entity = getEntity(id)
  const record = records.get(id) ?? (hasEntity(id) ? ensureEntity(entity) : ensure(id, 'npc', name))
  setText(record, 'location', npcLocationFromSummary(entity.summary))
  const check = lookupName(checklistNpcByName, name)
  if (check) {
    setText(record, 'description', check.quote)
    setText(record, 'location', check.location)
    setStat(record, 'Role', plausibleRole(check.role))
    if (check.image && !record.image) record.image = check.image
    source(record, 'checklists/npcs')
  }
  const fan = lookupName(fanNpcByName, name)
  if (fan) {
    setText(record, 'location', fan.location)
    setStat(record, 'Role', plausibleRole(fan.role))
    source(record, 'fanapi/npcs')
  }
  const placement = lookupName(placementByName, name)
  if (placement) {
    record.map = { x: placement.x ?? 0, y: placement.y ?? 0, map: placement.map, world: placement.world }
    source(record, 'npc-placements')
  }
  if (!record.location) setText(record, 'location', npcLocationFromSummary((getEntity(id) as { summary?: string }).summary))
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

/** A row of the wiki DB's parsed `spells` table (Task 140 §1). */
type SpellTableRow = {
  name: string
  fp_cost?: string | number | null
  slots_used?: number | null
  int_req?: number | null
  fai_req?: number | null
  arc_req?: number | null
  effect?: string | null
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

// ---------------------------------------------------------------------------
// Task 132 §1 — map-tile ids -> the human place the player actually sees
// ---------------------------------------------------------------------------
//
// Raw engine tiles (`m14_00_00_00 · m60_38_47_00`) are internal ids; every
// player-visible field must read as a place name instead. Three committed
// sources describe a tile: the engine's own `MapNameOverride` rows in
// `map-regions.json`, the sub-region each grace in `grace-xyz.json` belongs to,
// and the `WorldMapPlaceNameParam` banners. For interior maps the FMG place id
// is `area*1000 + gridX*10 + gridZ`, which names the exact cave/catacomb/tunnel.

type MapTile = { area: number; gx: number; gz: number; tier: number }

function parseMapId(id: unknown): MapTile | undefined {
  const m = /^m(\d{2})_(\d{2})_(\d{2})_(\d{2})$/.exec(String(id ?? '').trim())
  if (!m) return undefined
  return { area: Number(m[1]), gx: Number(m[2]), gz: Number(m[3]), tier: Number(m[4]) }
}

/** Per-tile names the engine's own `MapNameOverride` records carry. */
const mapTileNames = new Map<string, string[]>()
for (const [key, rows] of Object.entries(mapRegionsData as Record<string, { kind?: string; name?: string }[]>)) {
  const names: string[] = []
  for (const row of rows) {
    if (row.kind === 'MapNameOverride' && row.name && !names.includes(row.name)) names.push(row.name)
  }
  if (names.length) mapTileNames.set(key, names)
}

function voteWinner(votes: Map<string, number> | undefined): string | undefined {
  if (!votes?.size) return undefined
  return [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]
}

const gridVotes = new Map<string, Map<string, number>>()
const areaVotes = new Map<number, Map<string, number>>()
for (const g of graceXyzData as { areaNo: number; gridX: number; gridZ: number; subRegion?: string | null; majorRegion?: string | null }[]) {
  const label = g.subRegion || g.majorRegion
  if (!label) continue
  const gk = `${g.areaNo}|${g.gridX}|${g.gridZ}`
  const grid = gridVotes.get(gk) ?? new Map<string, number>()
  grid.set(label, (grid.get(label) ?? 0) + 1)
  gridVotes.set(gk, grid)
  const area = areaVotes.get(g.areaNo) ?? new Map<string, number>()
  area.set(label, (area.get(label) ?? 0) + 1)
  areaVotes.set(g.areaNo, area)
}
// `game-areas.json` names the region of every encounter flag; fold it in as an
// area-level fallback where the grace dump has no vote.
for (const row of gameAreasData as { flag?: number; region?: string }[]) {
  if (typeof row.flag !== 'number' || !row.region) continue
  const areaNo = Math.floor(row.flag / 1_000_000)
  if (!areaNo) continue
  const area = areaVotes.get(areaNo) ?? new Map<string, number>()
  area.set(row.region, (area.get(row.region) ?? 0) + 1)
  areaVotes.set(areaNo, area)
}

/** FMG PlaceName ids: `area*1000 + gridX*10 + gridZ` for the interior maps. */
const placeNameById = new Map<string, string>()
for (const row of namesData as FmgNameRow[]) {
  if (row.kind !== 'places') continue
  const id = String(row.id).replace(/^places:/, '')
  if (id && !placeNameById.has(id)) placeNameById.set(id, row.name)
}

/** Coarse area names as a last resort when no tile-level source names one. */
const AREA_FALLBACK_NAMES: Record<number, string> = {
  10: 'Stormveil Castle',
  11: 'Leyndell, Royal Capital',
  12: 'Nokron, Eternal City',
  13: 'Crumbling Farum Azula',
  14: 'Academy of Raya Lucaria',
  15: "Miquella's Haligtree",
  16: 'Volcano Manor',
  18: 'Stranded Graveyard',
  19: 'Stone Platform',
  20: 'Belurat, Tower Settlement',
  21: 'Shadow Keep',
  22: 'Stone Coffin Fissure',
  25: 'Roundtable Hold',
  28: "Midra's Manse",
  30: 'Catacombs',
  31: 'Caves',
  32: 'Tunnels',
  33: "Knight's Study",
  35: 'Subterranean Shunning-Grounds',
  39: 'Ruin-Strewn Precipice',
  40: 'Fog Rift Catacombs',
  41: 'Belurat Gaol',
  42: 'Ruined Forge',
  43: 'Rivermouth Cave',
  45: 'Shadow of the Erdtree',
}

const TILE_WORLD = 256
const WORLD_OFFSET_X = -7168
const WORLD_OFFSET_Y = 16640
const PLACE_LABELS = (mapPlaceNamesData as { labels?: { name?: string; names?: { en?: string }; px: number; py: number; master: string }[] }).labels ?? []
const NAMED_MARKERS = [
  ...((engineMarkersDoc as { markers?: { name?: string; master?: string; px?: number; py?: number }[] }).markers ?? []),
  ...PLACE_LABELS.map((l) => ({ name: l.names?.en || l.name, master: l.master, px: l.px, py: l.py })),
].filter((m) => m.name && typeof m.px === 'number' && typeof m.py === 'number')

type MapInfo = { region: string; place?: string }
const mapInfoCache = new Map<string, MapInfo>()

/** The region a tile sits in, from the richest committed source. */
function mapInfo(id: string): MapInfo | undefined {
  const cached = mapInfoCache.get(id)
  if (cached) return cached
  const tile = parseMapId(id)
  if (!tile) return undefined
  const gridRegion = voteWinner(gridVotes.get(`${tile.area}|${tile.gx}|${tile.gz}`))

  let region: string | undefined
  const override = mapTileNames.get(id)
  if (override?.length) {
    region = gridRegion && override.some((n) => simpleNorm(n) === simpleNorm(gridRegion)) ? gridRegion : override[0]
  }
  if (!region && tile.area < 60) region = placeNameById.get(String(tile.area * 1000 + tile.gx * 10 + tile.gz))
  if (!region) region = gridRegion
  if (!region) {
    // The nearest named neighbouring tile, but only when it is close enough to
    // be the same sub-region (a missing _47 tile beside a named _48).
    let best: string[] | undefined
    let bestDist = Infinity
    for (const [key, names] of mapTileNames) {
      const t = parseMapId(key)
      if (!t || t.area !== tile.area || t.tier !== 0) continue
      const dist = (t.gx - tile.gx) ** 2 + (t.gz - tile.gz) ** 2
      if (dist < bestDist) {
        bestDist = dist
        best = names
      }
    }
    if (best?.length && bestDist <= 16) region = best[0]
  }
  if (!region) region = voteWinner(areaVotes.get(tile.area)) ?? AREA_FALLBACK_NAMES[tile.area]

  let place: string | undefined
  if (tile.area === 60 || tile.area === 61) {
    const master = tile.area === 61 ? 'M10' : 'M00'
    const px = tile.gx * TILE_WORLD + TILE_WORLD / 2 + WORLD_OFFSET_X
    const py = WORLD_OFFSET_Y - (tile.gz * TILE_WORLD + TILE_WORLD / 2)
    let best: string | undefined
    let bestDist = Infinity
    for (const m of NAMED_MARKERS) {
      if (m.master !== master) continue
      const dx = (m.px as number) - px
      const dy = (m.py as number) - py
      const dist = dx * dx + dy * dy
      if (dist < bestDist) {
        bestDist = dist
        best = m.name
      }
    }
    if (best && bestDist <= 240 * 240 && simpleNorm(best) !== simpleNorm(region ?? '')) place = best
  }

  const info: MapInfo = { region: region ?? place ?? 'The Lands Between', place }
  mapInfoCache.set(id, info)
  return info
}

/** One human line for a `maps` array: region, plus the nearest place when the
 * encounter sits in a single tile. Never emits a raw engine id. */
function describeMaps(maps: unknown): string | undefined {
  if (!Array.isArray(maps) || !maps.length) return undefined
  const regions: string[] = []
  const labels: string[] = []
  for (const raw of maps) {
    const info = mapInfo(String(raw))
    if (!info) continue
    if (!regions.includes(info.region)) regions.push(info.region)
    const label = info.place ? `${info.region} — ${info.place}` : info.region
    if (!labels.includes(label)) labels.push(label)
  }
  if (!labels.length) return undefined
  if (labels.length === 1) return labels[0]
  if (regions.length === 1) return regions[0]
  return regions.slice(0, 4).join(' · ') + (regions.length > 4 ? ' · …' : '')
}

const MAP_ID_RE = /\bm\d{2}_\d{2}_\d{2}_\d{2}\b/g
/** Safety net: replace any raw tile id that survived into player-visible text. */
function humanizeMapIds(text: string): string {
  MAP_ID_RE.lastIndex = 0
  if (!MAP_ID_RE.test(text)) return text
  MAP_ID_RE.lastIndex = 0
  return text.replace(MAP_ID_RE, (id) => mapInfo(id)?.region ?? 'the Lands Between')
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

/** A broken parse ("| res madness = }}") or a stray plural "s" is not prose. */
function plausibleWikiLead(text: string): boolean {
  const t = text.trim()
  if (t.length < 20) return false
  if (/[{}]/.test(t) || /^\s*[|,;:]/.test(t) || /\s=\s/.test(t)) return false
  if (/^[a-z]{1,3},/i.test(t)) return false
  return true
}

/**
 * Task 148 §3 — true when a wiki lead is usable prose *after repair*. A
 * subjectless lead ("is a character …") or a stripped-subject "The is a …"
 * carries its subject in the record name; a bare unrepairable template is not
 * written. Broken parses never pass.
 */
function usableWikiDescription(text: string): boolean {
  const t = text.trim()
  if (!plausibleWikiLead(t)) return false
  if (/^the is an?\b/i.test(t)) return false
  // Task 151 §1 — a bare category/placement definition ("X is a location within
  // the Realm of Shadow in Shadow of the Erdtree.") is a wiki template repeated
  // across a whole family, not prose; the record's own Overview is used instead.
  if (WIKI_DEFINITIONAL.test(t)) return false
  if (PLACE_DEFINITIONAL.test(t)) return false
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean)
  // A one-clause lead that begins mid-thought has no subject to restore.
  if (sentences.length <= 1 && SUBJECTLESS_DESC.test(t)) return false
  return true
}

/** Restore the subject a broken wiki lead dropped ("The is a …", "is a …"). */
function repairWikiLead(text: string, name: string): string {
  const t = text.trim()
  if (/^the is\b/i.test(t)) return `${name} ${t.replace(/^the\s+/i, '')}`
  if (SUBJECTLESS_DESC.test(t)) return `${name} ${t}`
  return t
}

/** The message a subjectless wiki lead is missing ("… is/are …"). */
const SUBJECTLESS_DESC = /^(?:is|are|was|were|has|have)\b/i

/** One best wiki lead per page title, with the page kind for compatibility. */
function buildWikiDescriptionMap(): Map<string, { text: string; kind: string }> {
  const docs: [unknown, string][] = [
    [wikiBossDoc, 'boss'],
    [wikiEnemyDoc, 'enemy'],
    [wikiNpcDoc, 'npc'],
    [wikiLocationDoc, 'location'],
    [wikiRegionDoc, 'region'],
    [wikiSkillDoc, 'item'],
    [wikiDungeonDoc, 'dungeon'],
    [wikiItemDoc, 'item'],
    [wikiWeaponDoc, 'weapon'],
    [wikiArmorDoc, 'armor'],
    [wikiSpellDoc, 'spell'],
    [wikiTalismanDoc, 'talisman'],
    [wikiAshDoc, 'ash'],
    [wikiSpiritDoc, 'spirit'],
  ]
  const map = new Map<string, { text: string; kind: string }>()
  for (const [doc, kind] of docs) {
    for (const rec of wikiRecords(doc)) {
      const description = (rec.description ?? '').trim()
      if (!plausibleWikiLead(description)) continue
      for (const title of [rec.title, canonicalWikiTitle(rec.title)]) {
        const key = simpleNorm(title)
        if (!key) continue
        const current = map.get(key)
        if (!current || description.length > current.text.length) map.set(key, { text: description, kind })
      }
    }
  }
  return map
}

/** Prose the wiki uses on a page for content it cut before release. */
const CUT_DESC = /was cut from|unattainable|cut content|unused content/i

/**
 * Task 148 §4 — page titles the wiki files under cut/unused content. Detection
 * is `{{Infobox … Cut}}`, the `Unused Content` category, or the lead saying the
 * content was cut. The record is flagged, never deleted.
 */
function buildCutNameSet(): Set<string> {
  const docs: unknown[] = [
    wikiBossDoc,
    wikiEnemyDoc,
    wikiNpcDoc,
    wikiLocationDoc,
    wikiRegionDoc,
    wikiSkillDoc,
    wikiDungeonDoc,
    wikiItemDoc,
    wikiWeaponDoc,
    wikiArmorDoc,
    wikiSpellDoc,
    wikiTalismanDoc,
    wikiAshDoc,
    wikiSpiritDoc,
  ]
  const set = new Set<string>()
  for (const doc of docs) {
    for (const rec of wikiRecords(doc)) {
      const categories = (rec.categories ?? []).join(' | ')
      const cut =
        /unused content|cut content|scrapped content|removed content/i.test(categories) ||
        /\bcut\b/i.test(rec.infobox ?? '') ||
        CUT_DESC.test(rec.description ?? '')
      if (!cut) continue
      for (const title of [rec.title, canonicalWikiTitle(rec.title)]) {
        const key = simpleNorm(title)
        if (key) set.add(key)
      }
    }
  }
  return set
}

/** Enrich an existing record with a wiki record's prose/url (never overwrites). */
function enrichFromWiki(record: EntityRecord, rec: WikiRecord): void {
  setText(record, 'description', rec.description)
  // Task 177 — never store a bare place type ("Village", "Subregion", "grace")
  // as the location; prefer the wiki's real parent region when that is all it has.
  const place = [rec.location, rec.stats.Location, rec.region, rec.stats.Region].find(
    (value) => value && !isBarePlaceType(value),
  )
  if (place) setText(record, 'location', place)
  if (rec.url) record.sourceUrl = record.sourceUrl ?? rec.url
  source(record, 'wiki-db')
}

/** A merchant field that is really the entity kind, not a place. */
const MERCHANT_PLACEHOLDER = /^merchant$/i

/**
 * Task 148 §6 — merchants. A shop-inventory sub-row ("Brother Corhyn — Altus
 * Plateau") inherits its base merchant's real description, region, pin and
 * stats; a base merchant still missing prose takes the wiki Character page's
 * lead. Only real text is written — a bare template is never invented.
 */
function enrichMerchants(): void {
  const wikiByName = new Map<string, WikiRecord>()
  for (const rec of wikiRecords(wikiNpcDoc)) {
    const key = simpleNorm(rec.title)
    if (key && !wikiByName.has(key)) wikiByName.set(key, rec)
  }
  const merchantByName = new Map<string, EntityRecord>()
  for (const record of records.values()) {
    if (record.kind === 'merchant' && !merchantByName.has(record.name)) merchantByName.set(record.name, record)
  }
  for (const record of records.values()) {
    if (record.kind !== 'merchant') continue
    const baseName = record.name.split(' - ')[0].trim()
    const base = baseName !== record.name ? merchantByName.get(baseName) : undefined
    if (base) {
      if (!record.description && base.description) record.description = base.description
      if (!record.region && base.region) record.region = base.region
      if ((!record.location || MERCHANT_PLACEHOLDER.test(record.location)) && base.location) record.location = base.location
      if (!record.map && base.map) record.map = { ...base.map }
      if (base.stats) {
        record.stats = record.stats ?? {}
        for (const [label, value] of Object.entries(base.stats)) if (!record.stats[label]) record.stats[label] = value
      }
    }
    const wiki = wikiByName.get(simpleNorm(baseName))
    if (!wiki) continue
    const wikiLocation = wiki.location || wiki.stats?.Location || wiki.region
    if ((!record.location || MERCHANT_PLACEHOLDER.test(record.location)) && wikiLocation) record.location = wikiLocation
    if (!record.region && (wiki.region || wikiLocation)) record.region = wiki.region || wikiLocation
    const lead = (wiki.description ?? '').trim()
    if (!record.description && usableWikiDescription(lead) && !SUBJECTLESS_DESC.test(lead)) {
      record.description = lead
      source(record, 'wiki-db')
    }
  }
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

  // NPCs (Characters). Never fold a Character page onto a quest-line record: the
  // character keeps its own `npc:` entity so name lookups prefer npc > quest.
  for (const rec of wikiRecords(wikiNpcDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const resolved = resolveName(title, 'npc') ?? resolveName(rec.title, 'npc')
    const resolvedRecord = resolved ? records.get(resolved) : undefined
    const id = resolvedRecord && resolvedRecord.kind === 'npc' ? resolved! : `npc:${slug(title)}`
    const record = records.get(id) ?? ensure(id, 'npc', title)
    if (record.kind === 'item') record.kind = 'npc'
    enrichFromWiki(record, rec)
    setStat(record, 'Role', rec.stats.Role)
    setStat(record, 'Affiliation', rec.stats.Affiliation)
    if (!record.region) record.region = regionFromText(rec.location || rec.description)
    addName(rec.title, id)
    addName(title, id)
    for (const alias of redirectAliases.get(simpleNorm(rec.title)) ?? []) addName(alias, id)
  }

  // Enemies: fold onto the canonical boss when the wiki enemy is a boss.
  for (const rec of wikiRecords(wikiEnemyDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const bossId = resolveName(title, 'boss') ?? resolveName(title, 'invader')
    if (bossId && records.has(bossId)) {
      enrichFromWiki(records.get(bossId)!, rec)
      setStat(records.get(bossId)!, 'Runes', rec.stats.Runes)
      continue
    }    const id = resolveName(title, 'enemy') ?? `enemy:${slug(title)}`
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
      setStat(record, 'Runes', rec.stats.Runes)
      addDrops(record, rec.drops)
      if (!record.region && region) record.region = region
      continue
    }
    // Task 160 #14 — the wiki files a page under "boss" by category, so an NPC
    // or a generic overview ("Count Ymir", "Dragon") lands here. When the title
    // already names a real page of another kind, enrich that page instead of
    // minting a second, pictureless boss page for the same thing.
    if (!id) {
      const existing = resolveName(title, 'wiki')
      if (existing && records.has(existing)) {
        const record = records.get(existing)!
        enrichFromWiki(record, rec)
        setStat(record, 'HP', rec.stats.HP)
        setStat(record, 'Runes', rec.stats.Runes)
        addDrops(record, rec.drops)
        if (!record.region && region) record.region = region
        continue
      }
    }
    const newId = id ?? `boss:${slug(title)}`
    const record = records.get(newId) ?? ensure(newId, 'boss', title)
    enrichFromWiki(record, rec)
    setStat(record, 'HP', rec.stats.HP)
    setStat(record, 'Runes', rec.stats.Runes)
    addDrops(record, rec.drops)
    const finalLocation = record.location || location || region || title
    setText(record, 'location', finalLocation)
    if (!record.region) record.region = region ?? regionFromText(finalLocation) ?? finalLocation
  }

  // Locations + subregions (filed under the existing `region` kind the Library
  // Locations category already uses).
  for (const rec of wikiRecords(wikiLocationDoc)) {
    const title = canonicalWikiTitle(rec.title)
    // Only fold onto an existing *region* entity; a wiki Location page that
    // resolves to a grace/boss keeps its own location record so the page's
    // description + region are not lost on the wrong kind.
    const resolved = resolveName(title, 'region')
    const id = resolved && hasEntity(resolved) && getEntity(resolved).kind === 'region' ? resolved : `region:${slug(title)}`
    const record = records.get(id) ?? ensure(id, 'region', title)
    if (record.kind === 'item') record.kind = 'region'
    enrichFromWiki(record, rec)
    for (const alias of redirectAliases.get(simpleNorm(rec.title)) ?? []) addName(alias, id)
  }

  // Regions: the top-level overworld/DLC regions (a small set beside the
  // Location pages).
  for (const rec of wikiRecords(wikiRegionDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const resolved = resolveName(title, 'region')
    const id = resolved && hasEntity(resolved) && getEntity(resolved).kind === 'region' ? resolved : `region:${slug(title)}`
    const record = records.get(id) ?? ensure(id, 'region', title)
    if (record.kind === 'item') record.kind = 'region'
    enrichFromWiki(record, rec)
  }

  // Skills: unique/weapon skills already have an ash/weapon record; the wiki
  // page only enriches it, it never mints a new kind for a non-player skill.
  for (const rec of wikiRecords(wikiSkillDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const record = records.get(catalogueIdFor('item', title))
    if (!record) continue
    setText(record, 'description', rec.description)
    if (!record.location) setText(record, 'location', rec.location || rec.region)
    source(record, 'wiki-db/skill')
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
      // The wiki names every ash "Ash of War: X" while the checklist/FanAPI use
      // the bare skill; strip it so the wiki page enriches the existing record
      // instead of minting a duplicate.
      const bare = kind === 'ash' ? title.replace(/^ash(?:es)? of war:\s*/i, '').trim() || title : title
      const id = catalogueIdFor('item', bare)
      const record = records.get(id) ?? ensure(id, kind, bare)
      if (record.kind === 'item' && kind !== 'item') record.kind = kind
      enrichFromWiki(record, rec)
      setStat(record, 'Weight', rec.stats.Weight)
      if (rec.stats.Poise) setStat(record, 'Poise', rec.stats.Poise)
      // Task 140 §1 — the wiki infobox also carries the equipment slot / weapon
      // type, the skill, and (for goods-type pages) the effect. `setStat` never
      // overwrites a regulation/checklist value, so game data still wins.
      setStat(record, 'Type', rec.stats.Type)
      setStat(record, 'Skill', rec.stats.Skill)
      setStat(record, 'Effect', rec.stats.Effect)
    }
  }

  // The item infobox omits FP cost, slot count and casting requirements; the
  // wiki DB's parsed `spells` table carries them. `setStat` keeps any checklist
  // value already present, so this only fills the gap (e.g. the spells seeded
  // from `open/magic.json` with no checklist row).
  for (const row of (wikiSpellTableDoc as { records?: SpellTableRow[] }).records ?? []) {
    const id = resolveName(row.name, 'spell') ?? catalogueIdFor('item', row.name)
    const record = records.get(id) ?? (hasEntity(id) ? ensureEntity(getEntity(id)) : undefined)
    if (!record || record.kind !== 'spell') continue
    setStat(record, 'FP cost', row.fp_cost)
    if (typeof row.slots_used === 'number') setStat(record, 'Slots', row.slots_used)
    const req: string[] = []
    if (row.int_req) req.push(`Int ${row.int_req}`)
    if (row.fai_req) req.push(`Fai ${row.fai_req}`)
    if (row.arc_req) req.push(`Arc ${row.arc_req}`)
    if (req.length) setStat(record, 'Requirements', req.join(' · '))
    setStat(record, 'Effect', row.effect)
    source(record, 'wiki-db/spells')
  }

  // Items (goods): key items, tools, crafting materials, cookbooks, consumables.
  for (const rec of wikiRecords(wikiItemDoc)) {
    const title = canonicalWikiTitle(rec.title)
    const id = catalogueIdFor('item', title)
    const record = records.get(id) ?? ensure(id, 'item', title)
    enrichFromWiki(record, rec)
    if (!record.location) setText(record, 'location', rec.stats.Obtained)
    setStat(record, 'Effect', rec.stats.Effect)
    setStat(record, 'Type', rec.stats.Type)
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
const CAPTIONS_BY_KIND: Record<string, Record<string, string>> = {
  goods: goodsCaptions as Record<string, string>,
  protector: protectorCaptions as Record<string, string>,
  accessories: accessoryCaptions as Record<string, string>,
  arts: artsCaptions as Record<string, string>,
  gems: gemCaptions as Record<string, string>,
  weapon: weaponCaptions as Record<string, string>,
}

/**
 * The in-game description for an FMG name row. Task 151 §1/§2 — the `info` line
 * is the short effect summary ("Offer to Twin Maiden Husks for new item
 * access"), shared verbatim by a whole family of goods; the caption of the same
 * id is the game's own unique flavour prose. Prefer the caption for goods so a
 * bell bearing or cookbook carries real text, and keep the effect line as the
 * caption's fallback. Other kinds (weapons, armour, Ashes of War) keep their
 * `info` line, which is the game's caption family the task allows.
 */
function fmgDescription(row: FmgNameRow): string | undefined {
  const num = row.id?.split(':')[1]
  const caption = num ? CAPTIONS_BY_KIND[row.kind]?.[num]?.trim() : undefined
  const usableCaption = caption && !/^\[?ERROR\]?$|^%null%$|^no text$/i.test(caption) ? caption : undefined
  if (row.kind === 'goods' && usableCaption && usableCaption.length >= 20) {
    return usableCaption.replace(/\n{3,}/g, '\n\n')
  }
  if (row.info) return row.info
  if (usableCaption) return usableCaption.replace(/\n{3,}/g, '\n\n')
  return undefined
}

function mergeFmgNames(): void {
  const rows = namesData as FmgNameRow[]
  // Task 132 §2 — the FMG `arts` plane carries 265 rows, but most are unique
  // weapon skills / enemy attacks, not the player-equippable Ashes of War. Fold
  // only the real Ashes of War (save-ids aow ∪ checklist ∪ FanAPI ∪ wiki ash
  // pages) so the `ash` kind is not inflated by non-player entries.
  const stripAsh = (name: string) => simpleNorm(name.replace(/^ash(?:es)? of war:\s*/i, ''))
  const ashOfWarNames = new Set<string>()
  for (const name of Object.keys((saveIds as { ids?: { aow?: Record<string, string> } }).ids?.aow ?? {})) ashOfWarNames.add(stripAsh(name))
  for (const row of checklistAshes as ChecklistItem[]) ashOfWarNames.add(stripAsh(row.name))
  for (const row of fanAshes as ChecklistItem[]) ashOfWarNames.add(stripAsh(row.name))
  for (const rec of wikiRecords(wikiAshDoc)) ashOfWarNames.add(stripAsh(rec.title))
  const ensureKind = (id: string, kind: EntityKind, name: string): EntityRecord => {
    const existing = records.get(id)
    if (existing) return existing
    const record = ensure(id, kind, name)
    record.catalogue = false
    return record
  }
  for (const row of rows) {
    if (row.kind === 'goods') {
      // Task 151 §1 — a spirit-ash / flask upgrade row ("… +1") must not become
      // its own record: the alias plane already folds the name onto the base id,
      // which would otherwise rename the base page. `foldUpgrades` builds the
      // upgrade table from this very row.
      if (/\s\+\d+$/.test(row.name) && (/^summons?\b/i.test(row.info ?? '') || FLASK_NAME_RE.test(row.name.replace(/\s\+\d+$/, '').trim()))) continue
      const id = catalogueIdFor('item', row.name)
      const record = records.get(id) ?? ensureKind(id, 'item', row.name)
      setText(record, 'description', fmgDescription(row))
      // The short `info` line is a real effect fact; keep it as a stat now that
      // the caption owns the prose.
      setStat(record, 'Effect', row.info)
      source(record, 'names/fmg-goods')
    } else if (row.kind === 'npcs') {
      const exact = mapKeys(row.name).map((key) => nameIndex.get(key)).find((id) => id && hasEntity(id) && getEntity(id).kind === 'npc')
      const id = exact ?? row.id ?? `npc:${slug(row.name)}`
      const record = records.get(id) ?? ensureKind(id, 'npc', row.name)
      if (record.kind === 'item') record.kind = 'npc'
      setText(record, 'description', fmgDescription(row))
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
      setText(record, 'description', fmgDescription(row))
      source(record, 'names/fmg-accessories')
    } else if (row.kind === 'protector') {
      const id = catalogueIdFor('item', row.name)
      const record = records.get(id) ?? ensureKind(id, 'armor', row.name)
      setText(record, 'description', fmgDescription(row))
      source(record, 'names/fmg-protector')
    } else if (row.kind === 'arts') {
      if (!ashOfWarNames.has(stripAsh(row.name))) continue
      const id = catalogueIdFor('item', row.name)
      const record = records.get(id) ?? ensureKind(id, 'ash', row.name)
      setText(record, 'description', fmgDescription(row))
      source(record, 'names/fmg-arts')
    } else if (row.kind === 'weapon') {
      // Weapons are enumerated elsewhere; only describe a record that exists.
      const record = records.get(catalogueIdFor('item', row.name))
      if (record) setText(record, 'description', fmgDescription(row))
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
 * Task 132 §3 — fold the remaining open dumps the app never indexed: place
 * names (region aliases), map points (grace/region aliases), map lots (item
 * name aliases) and the MSB enemy placements (per-model map ids unioned onto
 * the enemy-combat rows). Nothing here mints a new entity: it only makes the
 * scraped names resolve to the records the other sources already built.
 */
function mergeExtraSources(): void {
  const aliasToExisting = (name: string): void => {
    const clean = String(name).replace(/<[^>]+>/g, '').trim()
    if (!clean) return
    const id = mapKeys(clean).map((key) => nameIndex.get(key)).find((candidate) => candidate && records.has(candidate))
    if (id) addName(clean, id)
  }
  for (const value of Object.values(placeNames as Record<string, string>)) {
    const name = String(value).replace(/<[^>]+>/g, '').trim()
    if (!name || /^(discovered|cleared|completed)$/i.test(name)) continue
    aliasToExisting(name)
  }
  for (const row of mapPoints as { name: string }[]) {
    for (const part of String(row.name).split(/\s*[-–—]\s*/)) {
      aliasToExisting(part.replace(/^guidance of grace:\s*/i, ''))
    }
    aliasToExisting(row.name.replace(/^guidance of grace:\s*/i, ''))
  }
  for (const row of mapLots as { name: string }[]) {
    const id = catalogueIdFor('item', row.name)
    if (records.has(id)) addName(row.name, id)
  }
  // Per-model map ids from the MSB dump widen each enemy-combat row's maps.
  const byModel = new Map<string, Set<string>>()
  for (const row of msbEnemies as { model?: string; map?: string }[]) {
    if (!row.model || !row.map) continue
    const set = byModel.get(row.model) ?? new Set<string>()
    set.add(row.map)
    byModel.set(row.model, set)
  }
  for (const row of enemyCombat as (EnemyCombatRow & { model?: string })[]) {
    if (!row.model) continue
    const extra = byModel.get(row.model)
    if (!extra?.size) continue
    row.maps = row.maps ?? []
    for (const map of extra) if (!row.maps.includes(map)) row.maps.push(map)
  }
}

/**
 * Task 132 §2 — the enemy kind. Every NpcParam combat row becomes an `enemy`
 * entity with its HP, negation/resist table and map placement, keyed by its fact
 * id so group variants stay distinct. A row whose name is already an NPC, boss
 * or quest entity is merged onto that record instead (never a second primary
 * record); the collision pass below does this once the wiki NPC plane exists.
 */
function mergeEnemyCombat(): void {
  for (const row of enemyCombat as EnemyCombatRow[]) {
    const id = row.factId ?? `enemy:${slug(row.name)}`
    const record = records.get(id) ?? ensure(id, 'enemy', row.name)
    if (record.kind === 'item') record.kind = 'enemy'
    applyCombatStats(record, row, 'enemy-combat')
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
      setText(existing, 'location', cleanAcquisitionPlace(row.location, row.near))
      continue
    }
    const record = ensure(id, 'item', correctName(row.name))
    record.catalogue = false
    setText(record, 'description', row.method)
    setText(record, 'location', cleanAcquisitionPlace(row.location, row.near))
    source(record, 'acquisition')
  }
}

/**
 * Task 132 §2 — link the wiki DB's 341 NPC quest steps to their NPC entity.
 *
 * Each step becomes a reference `quest` record (`quest:<npc>-step-N`) whose
 * `related` names the NPC, and the NPC record gains a "Questline" section listing
 * the step order/location/action, so the entity page peeks the whole line.
 */
/**
 * A person often has several records — `npc:sellen`, `merchant:sellen`, a boss
 * or hunt row (Patches). The step merge attaches the questline to whichever it
 * resolves first, which left 13 NPC pages saying "No tracked quest steps"
 * (Sellen, Rogier, Seluvis, Patches…). Every same-named NPC/merchant record
 * without a questline gets the one its twin carries.
 */
function shareQuestSteps(): void {
  const PERSON = new Set(['npc', 'merchant', 'boss'])
  const withSteps = new Map<string, EntityRecord>()
  for (const record of records.values()) {
    if (!PERSON.has(record.kind) || !record.questSteps?.length) continue
    const key = simpleNorm(record.name)
    const cur = withSteps.get(key)
    if (!cur || record.questSteps.length > (cur.questSteps?.length ?? 0)) withSteps.set(key, record)
  }
  for (const record of records.values()) {
    if ((record.kind !== 'npc' && record.kind !== 'merchant') || record.questSteps?.length) continue
    const twin = withSteps.get(simpleNorm(record.name))
    if (!twin || twin === record) continue
    record.questSteps = twin.questSteps
    const section = twin.sections?.find((s) => /^questline/i.test(s.heading))
    if (section && !record.sections?.some((s) => /^questline/i.test(s.heading))) {
      record.sections = [...(record.sections ?? []), section]
    }
  }
}

function mergeNpcQuestSteps(): void {
  const quests = (npcQuestsDoc as {
    quests?: { npc: string; url?: string; steps: { id: string; order: number; location?: string; action?: string; breaks?: boolean }[] }[]
  }).quests ?? []
  const bySimple = new Map<string, string>()
  for (const [id, rec] of records) {
    // Only real character-ish records; never the authored quest-line beats.
    if (rec.kind === 'item' || rec.kind === 'quest' || rec.kind === 'ending') continue
    const key = simpleNorm(rec.name)
    if (key && !bySimple.has(key)) bySimple.set(key, id)
  }
  const questNpcId = (name: string): string | undefined => {
    const resolved = resolveName(name, 'npc')
    const resolvedRecord = resolved ? records.get(resolved) : undefined
    if (resolvedRecord && resolvedRecord.kind !== 'quest' && resolvedRecord.kind !== 'ending') return resolved
    const key = simpleNorm(name)
    const exact = bySimple.get(key)
    if (exact) return exact
    // Fall back to the closest entity whose name contains (or is contained by)
    // the quest NPC name — the DB spells some names slightly differently.
    for (const [candidate, id] of bySimple) {
      if (candidate.length >= 4 && key.length >= 4 && (candidate.includes(key) || key.includes(candidate))) {
        const rec = records.get(id)
        if (rec && rec.kind !== 'quest' && rec.kind !== 'ending') return id
      }
    }
    return undefined
  }
  // Task 137 §3 — the item/thing names the matcher treats as an item signal.
  const itemEntities = (() => {
    const itemKinds = new Set(['item', 'weapon', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material'])
    const names: string[] = []
    for (const rec of records.values()) if (itemKinds.has(rec.kind)) names.push(rec.name)
    return itemEntityNameSet(names)
  })()
  // Task 133 §0 — the authored `storylines.ts` line that owns each NPC, so its
  // beats define the order and identity of the merged step list.
  const lineByName = new Map<string, (typeof allLines)[number]>()
  for (const line of allLines) {
    lineByName.set(simpleNorm(line.name), line)
    for (const alias of line.aliases ?? []) {
      const key = simpleNorm(alias)
      if (key && !lineByName.has(key)) lineByName.set(key, line)
    }
  }
  // Task 160 §5 — two wiki steps of one NPC often happen at the same place and
  // would build two reference pages with an identical name. Track the display
  // names already used so the later step gets a distinguishing `(step N)`.
  const usedDisplayNames = new Set<string>()
  for (const record of records.values()) usedDisplayNames.add(record.name)
  for (const quest of quests) {
    if (!quest.npc) continue
    const npcId = questNpcId(quest.npc)
    const npcRecord = npcId ? records.get(npcId) : undefined
    const npcName = npcRecord?.name ?? quest.npc
    if (npcRecord) {
      if (quest.url) npcRecord.sourceUrl = npcRecord.sourceUrl ?? quest.url
      source(npcRecord, 'npc-quests')
    }
    const line = lineByName.get(simpleNorm(quest.npc)) ?? lineByName.get(simpleNorm(npcName))
    const merged: QuestStepEntry[] = []
    const used = new Set<number>()
    if (line?.steps?.length) {
      // Prefer the authored beats; attach the best-matching wiki step so the
      // merged list carries the wiki location/action without a second list.
      for (const step of line.steps) {
        const beatId = step.factId && records.has(step.factId) ? step.factId : undefined
        // Task 137 §3 — only attach a wiki step on a location or item signal;
        // token overlap alone is no longer enough to claim a beat.
        const match = matchWikiStepToBeat(
          { do: step.do, detail: step.detail, region: beatId ? records.get(beatId)?.region : undefined },
          quest.steps,
          { entityNames: itemEntities, used },
        )
        const ws = match ? quest.steps[match.index] : undefined
        if (match) used.add(match.index)
        if (beatId && beatId.startsWith('quest:') && ws) {
          const beat = records.get(beatId)!
          setText(beat, 'description', ws.action)
          setText(beat, 'location', ws.location)
          if (!beat.region) beat.region = regionFromText(ws.location)
          beat.related = [npcName, ...(ws.breaks ? ['breaks the quest'] : [])]
          beat.sections = [...(beat.sections ?? []), { heading: `Wiki: ${ws.location || 'step'}`, text: excerpt(ws.action ?? '') }]
          source(beat, 'npc-quests')
        }
        merged.push({
          order: merged.length + 1,
          title: step.do,
          source: ws ? 'wiki' : 'authored',
          location: ws?.location,
          text: excerpt(ws?.action ?? step.detail ?? ''),
          breaks: ws?.breaks,
          entityId: beatId,
        })
      }
    }
    // Unmatched wiki steps keep their own reference record, in order.
    quest.steps.forEach((step, i) => {
      if (used.has(i)) return
      const id = `quest:${slug(quest.npc)}-step-${step.order}`
      const base = `${npcName} — ${step.location || `step ${step.order}`}`
      // Two steps at one location are distinct events: qualify the later page.
      const display = usedDisplayNames.has(base) ? `${base} (step ${step.order})` : base
      usedDisplayNames.add(display)
      const record = ensure(id, 'quest', display)
      record.catalogue = false
      setText(record, 'description', step.action)
      setText(record, 'location', step.location)
      if (!record.region) record.region = regionFromText(step.location)
      record.related = [npcName, ...(step.breaks ? ['breaks the quest'] : [])]
      source(record, 'npc-quests')
      merged.push({
        order: merged.length + 1,
        title: `${npcName} — ${step.location || `step ${step.order}`}`,
        source: 'wiki',
        location: step.location,
        text: excerpt(step.action ?? ''),
        breaks: step.breaks,
        entityId: id,
      })
    })
    if (npcRecord && merged.length) {
      npcRecord.sections = (npcRecord.sections ?? []).filter((s) => !/^questline/i.test(s.heading))
      npcRecord.sections.push({
        heading: `Questline (${merged.length} steps)`,
        text: merged.map((s) => `${s.order}. ${s.location ? `[${s.location}] ` : ''}${s.title}${s.breaks ? ' (breaks the quest)' : ''}`).join('\n'),
      })
      npcRecord.questSteps = merged
    }
  }
}

// ---------------------------------------------------------------------------
// Task 132 §2/§3/§4 — collisions, junk name rows, region fill, enemy prose
// ---------------------------------------------------------------------------

/** The colliding key: a name with a trailing `(Boss)`/`(NPC)` qualifier dropped. */
function collisionKey(name: unknown): string {
  return simpleNorm(String(name ?? '').replace(/\s*\((?:boss|npc|enemy)\)\s*$/i, ''))
}

function richness(record: EntityRecord): number {
  return (record.description ? 2 : 0) + (record.location ? 1 : 0) + (record.stats && Object.keys(record.stats).length ? 1 : 0)
}

/**
 * The one primary record per name across the character kinds. Reference-only
 * FMG name-plane stubs (`catalogue: false`) are excluded so an empty `npcs:`
 * row can never outrank an authored boss; priority is npc > boss > quest.
 */
function primaryNamedRecords(): Map<string, string> {
  const PRIORITY: Record<string, number> = { npc: 0, boss: 1, quest: 2 }
  const best = new Map<string, string>()
  for (const [id, record] of records) {
    const rank = PRIORITY[record.kind]
    if (rank === undefined || record.catalogue === false) continue
    const key = collisionKey(record.name)
    if (!key) continue
    const currentId = best.get(key)
    if (!currentId) {
      best.set(key, id)
      continue
    }
    const current = records.get(currentId)
    if (!current) {
      best.set(key, id)
      continue
    }
    const currentRank = PRIORITY[current.kind] ?? 9
    if (rank < currentRank || (rank === currentRank && richness(record) > richness(current))) best.set(key, id)
  }
  return best
}

/**
 * Task 132 §2 — an enemy (NpcParam) row whose name is already an NPC, boss or
 * quest entity merges onto that record as combat stats. The duplicate `enemy:`
 * primary row is removed and its name aliased to the winner.
 */
function resolveEnemyCollisions(): void {
  const best = primaryNamedRecords()
  const primaryIds = new Set(best.values())
  const targetFor = (name: string): string | undefined => {
    const direct = best.get(collisionKey(name))
    if (direct) return direct
    // A wiki Character title can differ from the authored npc display name
    // ("Blaidd the Half-Wolf" vs "Blaidd"); the name plane carries the alias.
    for (const key of mapKeys(name)) {
      const viaIndex = nameIndex.get(key)
      if (viaIndex && primaryIds.has(viaIndex)) return viaIndex
    }
    return undefined
  }
  for (const row of enemyCombat as CombatRow[]) {
    const targetId = targetFor(row.name)
    if (!targetId) continue
    const target = records.get(targetId)
    if (target) applyCombatStats(target, row, 'enemy-combat')
  }
  for (const [targetId] of best) {
    const target = records.get(targetId)
    if (!target || usableEnemyDescription(target.description, target.name)) continue
    const key = collisionKey(target.name)
    for (const record of records.values()) {
      if (record.id === targetId || collisionKey(record.name) !== key) continue
      if (usableEnemyDescription(record.description, record.name)) {
        setText(target, 'description', record.description)
        break
      }
    }
    if (!target.location) {
      for (const record of records.values()) {
        if (record.id === targetId || collisionKey(record.name) !== key || !record.location) continue
        setText(target, 'location', record.location)
        break
      }
    }
  }
  for (const [id, record] of [...records]) {
    if (record.kind !== 'enemy') continue
    const targetId = targetFor(record.name)
    if (!targetId || targetId === id) continue
    const target = records.get(targetId)
    if (!target) continue
    addName(record.name, targetId)
    records.delete(id)
  }
}

/** A name-plane row that carries no fact of its own. */
/**
 * The FMG NpcName plane names boss-fight phases and placeholders as their own
 * "NPC" rows with no data ("Radahn, Consort of Miquella", "Someone Yet Unseen").
 * Placeholder rows are dropped; a boss-fight name is folded into the real
 * record — via the wiki redirect ("Base Serpent Messmer" -> "Messmer the
 * Impaler") or a longer boss name it starts ("Perfumer Tricia" -> "Perfumer
 * Tricia & Misbegotten Warrior") — and kept as a search alias for it.
 */
const NIGHTREIGN_TITLES = new Set(
  ((nightreignDoc as { records?: { title: string }[] }).records ?? []).map((r) => simpleNorm(r.title)),
)

/**
 * Match every boss, enemy and NPC page to the data the repo already carries:
 *
 *  - enemies: engine placeholder rows (dummies, BuddyStone, Bonfire, the bare
 *    player "Human") are not enemies and are dropped; placements, maps and region
 *    come from the vanilla map files by the exact NpcParam id
 *    (`open/msb-enemies.json`); drops/description from the vanilla wiki enemy
 *    page and FanAPI creatures, and the image, by the enemy's base name
 *    ("Red Bear (Boss) (Gravesite Plain …)" -> "Red Bear");
 *  - bosses: the roster's rune reward and map pin for every fight, an image by
 *    the fight's base name (encounters and variants share their boss's art);
 *  - NPCs: region and map pin from the NPC placements, an image by name.
 */
const ENGINE_PLACEHOLDER = /^(human|buddystone|bonfire|c\d{4}|.* dummy)$/i
function baseName(name: string): string {
  return name.replace(/^\(.*?\)\s*/, '').replace(/\s*\(.*$/, '').replace(/\s*×\d+$/, '').trim()
}
function imageFor(name: string): string | undefined {
  const index = imageIndex as Record<string, string>
  return index[simpleNorm(name)] ?? index[simpleNorm(baseName(name))]
}

function enrichCreatures(): void {
  // Vanilla placements per NpcParam id.
  const placements = new Map<number, string[]>()
  for (const row of msbEnemies as { id?: string; map?: string }[]) {
    const npc = Number(row.id)
    if (!npc || !row.map) continue
    const list = placements.get(npc) ?? []
    list.push(row.map)
    placements.set(npc, list)
  }
  const wikiEnemies = new Map<string, { title: string; description?: string; drops?: string[]; location?: string }>()
  for (const row of (wikiEnemyDoc as { records?: { title: string; description?: string; drops?: string[]; location?: string }[] }).records ?? []) {
    wikiEnemies.set(simpleNorm(row.title), row)
  }
  const creatureDrops = new Map<string, string[]>()
  for (const row of fanCreatures as { name: string; drops?: string[] }[]) {
    if (row.drops?.length) creatureDrops.set(simpleNorm(row.name), row.drops)
  }
  // Task 145 — the game's own drop tables, keyed by the record's NpcParam id.
  const regulationDrops = new Map<number, { item: string; chance: number }[]>()
  for (const row of (enemyDropsDoc as { rows: { npcParamId: number; drops: { item: string; chance: number }[] }[] }).rows) {
    regulationDrops.set(row.npcParamId, row.drops)
  }

  for (const [id, record] of [...records]) {
    if (record.kind !== 'enemy') continue
    if (ENGINE_PLACEHOLDER.test(record.name.trim()) && !hasEntity(id)) {
      records.delete(id)
      continue
    }
    const npc = Number(id.split(':')[1])
    const regulation = regulationDrops.get(npc)
    if (regulation?.length) {
      addDrops(record, regulation.map((d) => d.item))
      setStat(record, 'Drop rates', regulation.map((d) => `${d.item} ${d.chance}%`).join(' · '))
      source(record, 'regulation/item-lots')
    }
    const maps = placements.get(npc)
    if (maps?.length) {
      const distinct = [...new Set(maps)]
      setStat(record, 'Placements', maps.length)
      const located = describeMaps(distinct)
      // The install's own placements outrank the older combat dump's map list.
      if (located) record.location = located
      const votes = new Map<string, number>()
      for (const m of maps) {
        const region = mapInfo(m)?.region
        if (region) votes.set(region, (votes.get(region) ?? 0) + 1)
      }
      const region = voteWinner(votes)
      if (region) record.region = region
      source(record, 'msb-enemies')
    }
    const base = simpleNorm(baseName(record.name))
    const wiki = wikiEnemies.get(base)
    if (wiki) {
      setText(record, 'description', wiki.description)
      addDrops(record, wiki.drops ?? [])
      source(record, 'wiki-db/enemy')
    }
    const drops = creatureDrops.get(base)
    if (drops) {
      addDrops(record, drops)
      source(record, 'fanapi/creatures')
    }
    if (!record.image) record.image = imageFor(record.name)
    // Rune rewards are not item drops ("Runes", "8561 Runes").
    if (record.drops) {
      record.drops = record.drops.filter((d) => !/^[\d,.\s]*runes?$/i.test(String(d).trim()))
      if (!record.drops.length) delete record.drops
    }
  }

  for (const row of bossRoster as RosterBoss[]) {
    const record = records.get(row.id)
    if (!record) continue
    if (row.runes != null) setStat(record, 'Runes', row.runes)
    const c = row.coords
    if (!record.map && c && c.x >= 0 && c.x <= 100 && c.y >= 0 && c.y <= 100) {
      record.map = { x: c.x, y: c.y, map: c.map ?? undefined }
    }
    if (!record.image) record.image = imageFor(row.name)
  }

  const npcPins = new Map<string, { map: string; px?: number; py?: number; world?: string }>()
  for (const p of (npcPlacementsDoc as { placements?: { name: string; map: string; px?: number; py?: number; world?: string }[] }).placements ?? []) {
    const key = simpleNorm(p.name.replace(/ · underground$/, ''))
    if (!npcPins.has(key)) npcPins.set(key, p)
  }
  for (const record of records.values()) {
    if (record.kind !== 'npc' && record.kind !== 'merchant') continue
    const pin = npcPins.get(simpleNorm(record.name))
    if (pin) {
      if (!record.region) record.region = mapInfo(pin.map)?.region
      if (!record.map && typeof pin.px === 'number' && typeof pin.py === 'number') {
        record.map = { x: Math.round((pin.px / 10496) * 10000) / 100, y: Math.round((pin.py / 10496) * 10000) / 100, map: pin.map, world: pin.world }
      }
    }
    if (!record.image) record.image = imageFor(record.name)
  }
}

function foldFmgNpcRows(): void {
  const byName = new Map<string, string>()
  for (const [id, record] of records) {
    if (/^npcs:\d+$/.test(id)) continue
    const key = simpleNorm(record.name)
    if (key && !byName.has(key)) byName.set(key, id)
  }
  const bossNames = [...records.values()].filter((r) => r.kind === 'boss').map((r) => [simpleNorm(r.name), r.id] as const)
  const targetFor = (name: string): string | undefined => {
    const redirect = wikiRedirectTo.get(simpleNorm(name))
    const direct = (redirect && byName.get(simpleNorm(redirect))) ?? byName.get(simpleNorm(name))
    if (direct) return direct
    const base = simpleNorm(redirect ?? name)
    if (base.length < 6) return undefined
    return bossNames.find(([n]) => n.startsWith(`${base} `))?.[1]
  }
  for (const [id, record] of [...records]) {
    if (JUNK_NAME.test(record.name.trim()) && !hasEntity(id)) {
      records.delete(id)
      continue
    }
    // Elden Ring Nightreign relics (a separate game) that the wiki acquisition
    // table lists alongside Elden Ring items — the wiki export tags them.
    if (NIGHTREIGN_TITLES.has(simpleNorm(record.name)) && !hasEntity(id)) {
      records.delete(id)
      continue
    }
    if (!/^npcs:\d+$/.test(id)) continue
    const target = targetFor(record.name)
    if (!target || target === id) continue
    // Task 160 §5 — a `npcs:<id>` row that carries real content (a description,
    // a location, quest steps) is the same character as the same-named primary
    // record, not a second page: fold its fields in before dropping the stub.
    const keeper = records.get(target)
    if (keeper) mergeRecords(keeper, record)
    else addName(record.name, target)
    records.delete(id)
  }
}

function isFmgEmpty(record: EntityRecord): boolean {
  if (!(record.sources ?? []).some((s) => s.startsWith('names/fmg'))) return false
  return (
    !record.description &&
    !record.location &&
    !record.strategy &&
    !record.map &&
    !record.drops?.length &&
    !(record.stats && Object.keys(record.stats).length) &&
    !record.sections?.length
  )
}

/**
 * Task 132 §3 — the FMG name plane is a search aid, not a fact source. An empty
 * row that duplicates a real record is aliased onto it and dropped; an empty
 * place row with no real location is junk and dropped outright.
 */
function cleanupFmgDuplicates(): void {
  const keep = new Map<string, EntityRecord>()
  for (const record of records.values()) {
    if (isFmgEmpty(record)) continue
    const key = baseNorm(record.name)
    if (!key) continue
    const existing = keep.get(key)
    if (!existing || richness(record) > richness(existing) || (existing.kind === 'region' && record.kind !== 'region')) keep.set(key, record)
  }
  for (const [id, record] of [...records]) {
    if (!isFmgEmpty(record)) continue
    const keeper = keep.get(baseNorm(record.name))
    if (keeper && keeper.id !== id) {
      addName(record.name, keeper.id)
      records.delete(id)
    } else if (record.kind === 'region' || !record.catalogue) {
      // Task 160 #14 — an empty FMG name row with no real counterpart and no
      // catalogue anchor renders a page whose every section is empty; keep it
      // out of the index rather than ship a no-data page.
      // Task 177 — unless the wiki has a page for the name (e.g. a gesture whose
      // only fact was an acquisition paragraph that is no longer a location): the
      // final fill gives it a real caption, so it is not a no-data page.
      if (record.kind === 'item' && lookupWiki(record.name)?.length) continue
      records.delete(id)
    }
  }
}

/**
 * Task 132 §3 — regions carry the graces inside them and a parent region so no
 * location page is an empty shell. Guarded by the coverage test at ≥95%.
 */
function enrichRegions(): void {
  const gracesByRegion = new Map<string, string[]>()
  for (const grace of checklistGraces as ChecklistGrace[]) {
    if (!grace.region) continue
    const key = baseNorm(grace.region)
    const list = gracesByRegion.get(key) ?? []
    if (!list.includes(grace.name)) list.push(grace.name)
    gracesByRegion.set(key, list)
  }
  for (const record of records.values()) {
    if (record.kind !== 'region') continue
    const graces = gracesByRegion.get(baseNorm(record.name)) ?? []
    if (graces.length) {
      record.sections = record.sections ?? []
      if (!record.sections.some((s) => /sites? of grace|graces/i.test(s.heading))) {
        record.sections.push({ heading: `Sites of Grace (${graces.length})`, text: excerpt(graces.slice(0, 12).join(' · ')) })
        source(record, 'checklists/graces')
      }
    }
    if (!record.location) {
      const parent = regionFromText(record.name) ?? regionFromText(record.description)
      setText(record, 'location', parent && baseNorm(parent) !== baseNorm(record.name) ? parent : 'The Lands Between')
    }
  }
}

/** A wiki/enemy description that says something beyond the name. */
function usableEnemyDescription(text: string | undefined, name: string): boolean {
  if (!text) return false
  const t = text.trim()
  if (t.length < 20) return false
  if (simpleNorm(t) === simpleNorm(name)) return false
  if (!/^[A-Z0-9"'(]/.test(t)) return false
  if (/^(the\s+)?is\s/i.test(t)) return false
  // A bare "X are enemies in Elden Ring." is the extraction's lead sentence, not
  // a description; a longer entry that continues into real prose is kept.
  if (/(are|is)\s+(an?\s+)?(enemies|enemy|adversar\w*|wildlife)/i.test(t) && t.length < 80) return false
  return true
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
// Task 146 — restore the in-game names, missing items and quest pictures that
// commit 07e7eb0 dropped. Each reads the repo's own committed data.
// ---------------------------------------------------------------------------

/** A checklist NPC quote that is a placeholder, not something to restore. */
const PLACEHOLDER_QUOTE = /^(insert npc quote here\.?|\.{3}|…|no text|tba|\?{3})$/i

/**
 * Task 146 §1 — every PlaceName FMG row the PS5 map reader can show must resolve.
 * `game-name-aliases.json` names the record each verbatim spelling belongs to; a
 * `region:` target that does not exist yet is a place the index never built
 * (Minor Erdtrees, colosseums, DLC sub-areas). Create it as a reference region
 * with its committed parent region and, when the engine ships a pin, its coords.
 */
function seedGamePlaceRegions(): void {
  const pinByName = new Map<string, { px: number; py: number; master?: string }>()
  for (const m of (engineMarkersDoc as { markers?: { name?: string; px?: number; py?: number; master?: string }[] }).markers ?? []) {
    const key = m.name ? simpleNorm(m.name) : ''
    if (key && typeof m.px === 'number' && typeof m.py === 'number' && !pinByName.has(key)) {
      pinByName.set(key, { px: m.px, py: m.py, master: m.master })
    }
  }
  const parentByName = gamePlaceRegions as Record<string, string>
  let created = 0
  for (const [name, id] of Object.entries(gameNameAliases as Record<string, string>)) {
    if (!id.startsWith('region:') || records.has(id)) continue
    const record = ensure(id, 'region', name)
    record.catalogue = false
    const parent = parentByName[name]
    if (parent) setText(record, 'location', parent)
    const pin = pinByName.get(simpleNorm(name))
    if (pin) {
      const toPct = (v: number) => Math.round((v / 10496) * 10000) / 100
      record.map = { x: toPct(pin.px), y: toPct(pin.py), world: pin.master === 'M10' ? 'shadow' : 'overworld' }
    }
    source(record, 'names/fmg-places')
    addName(name, id)
    created++
  }
  if (created) console.log(`game place regions: ${created} created`)
}

/** The in-game description from the FMG name row's own `info` line. */
function fmgInfo(id: string): string | undefined {
  return (namesData as FmgNameRow[]).find((row) => row.id === id)?.info?.trim() || undefined
}

/** An FMG goods/protector description that is really the spirit summon's. */
const SPIRIT_SUMMON_DESC = /^(ashen remains in which spirits yet dwell|summons? spirit)/i

/**
 * Task 146 §2 — items the game's FMG tables carry but the index never built, plus
 * a base/altered pair the name plane folded together. Descriptions come from the
 * FMG `info` line; ids match the natural catalogue slug.
 */
function seedGameItems(): void {
  // Twinned Armor: 600100 is the base chest piece (D's armor, alters into the
  // 601100 "…(Altered)" row). The index kept the altered row under the base id.
  const twinned = records.get('item:twinned-armor')
  if (twinned && /altered/i.test(twinned.name)) {
    records.delete('item:twinned-armor')
    twinned.id = 'item:twinned-armor-altered'
    records.set(twinned.id, twinned)
    addName('Twinned Armor (Altered)', twinned.id)
  }
  if (hasEntity('item:twinned-armor')) {
    const base = records.get('item:twinned-armor') ?? ensureEntity(getEntity('item:twinned-armor'))
    base.kind = 'armor'
    base.name = getEntity('item:twinned-armor').name
    setText(base, 'description', fmgInfo('protector:600100'))
    source(base, 'names/fmg-protector')
  }
  const altered = records.get('item:twinned-armor-altered')
  if (altered) {
    setText(altered, 'description', fmgInfo('protector:601100'))
    source(altered, 'names/fmg-protector')
  }

  // Gold Sewing Needle (goods 8162) is a distinct item from the plain Sewing
  // Needle (8161); the checklist folded both onto one record.
  const gold = records.get('item:gold-sewing-needle') ?? ensure('item:gold-sewing-needle', 'item', 'Gold Sewing Needle')
  gold.catalogue = false
  setText(gold, 'description', fmgInfo('goods:8162'))
  source(gold, 'names/fmg-goods')
  addName('Gold Sewing Needle', gold.id)

  // Pest-Thread Spears (goods 2007210) is the DLC incantation; the base-game
  // "Pest Threads" checklist row shared its id. Move the base to its own id.
  const pest = records.get('item:pest-thread-spears')
  if (pest && simpleNorm(pest.name) !== 'pest thread spears') {
    records.delete('item:pest-thread-spears')
    pest.id = 'item:pest-threads'
    records.set(pest.id, pest)
    addName('Pest Threads', pest.id)
  }
  const spears = records.get('item:pest-thread-spears') ?? ensure('item:pest-thread-spears', 'spell', 'Pest-Thread Spears')
  spears.kind = 'spell'
  spears.catalogue = false
  setText(spears, 'description', fmgInfo('goods:2007210'))
  source(spears, 'names/fmg-goods')
  addName('Pest-Thread Spears', spears.id)

  // Perfumer Tricia (goods 217000) is the spirit summon, not the boss whose name
  // it shares. Give the boss back its own line and keep the summon separate.
  const boss = records.get('boss:perfumer-tricia')
  if (boss && SPIRIT_SUMMON_DESC.test(boss.description ?? '')) delete boss.description
  const spirit = records.get('item:perfumer-tricia') ?? ensure('item:perfumer-tricia', 'spirit', 'Perfumer Tricia')
  spirit.kind = 'spirit'
  spirit.catalogue = false
  setText(spirit, 'description', fmgInfo('goods:217000'))
  source(spirit, 'names/fmg-goods')
  addName('Perfumer Tricia', spirit.id)
}

/**
 * Task 146 §3 — commit 07e7eb0 dropped the real merchant quotes (Enia, Miriel).
 * A vendor whose name is `<npc> - <stock>` never matched the NPC checklist row,
 * so it lost the line. Restore the checklist quote for the vendor's base name;
 * placeholder lines are skipped, never restored.
 */
function restoreMerchantQuotes(): void {
  const quoteByNpc = new Map<string, string>()
  for (const row of checklistNpcs as ChecklistNpc[]) {
    const quote = row.quote?.trim()
    if (!quote || PLACEHOLDER_QUOTE.test(quote)) continue
    for (const key of [simpleNorm(row.name), simpleNorm(row.name.split(',')[0])]) {
      if (key && !quoteByNpc.has(key)) quoteByNpc.set(key, quote)
    }
  }
  let restored = 0
  for (const record of records.values()) {
    if (record.kind !== 'merchant') continue
    // Drop a placeholder the earlier exact-name merge may have set.
    if (record.description && PLACEHOLDER_QUOTE.test(record.description.trim())) {
      delete record.description
      continue
    }
    if (record.description) continue
    const base = record.name.replace(/\s+-\s+.*$/, '').trim()
    const quote = quoteByNpc.get(simpleNorm(base))
    if (!quote) continue
    setText(record, 'description', quote)
    source(record, 'checklists/npcs')
    restored++
  }
  if (restored) console.log(`merchant quotes restored: ${restored}`)
}

/**
 * Task 146 §3 — the quest (`line:*`) pages carried the NPC's picture. Restore it
 * from the repo image index by the line's name, else by one of its aliases (an
 * ending like "Age of Order" is pictured by its NPC, Goldmask).
 */
function restoreLineImages(): void {
  const aliasImage = new Map<string, string>()
  for (const line of allLines) {
    for (const alias of [line.name, ...(line.aliases ?? [])]) {
      const img = (imageIndex as Record<string, string>)[simpleNorm(alias)]
      if (img) {
        aliasImage.set(`line:${line.id}`, img)
        break
      }
    }
  }
  let restored = 0
  for (const record of records.values()) {
    if (!record.id.startsWith('line:') || record.image) continue
    const img = imageFor(record.name) ?? aliasImage.get(record.id)
    if (!img) continue
    record.image = img
    restored++
  }
  if (restored) console.log(`line images restored: ${restored}`)
}

// ---------------------------------------------------------------------------
// Task 148 follow-up — remove the wiki's template lead sentences
// ---------------------------------------------------------------------------

/**
 * A wiki template sentence that describes only the record's category
 * ("Glintstone Dragon Adula is an optional boss in Elden Ring.", "The Battle Axe
 * is an Axe, a melee armament ."). It is never real prose and must never ship.
 * Task 172 — widened to the full category frame ("X is an optional boss in
 * Shadow of the Erdtree", "X is a location in the Lands Between"), a deictic
 * lead ("This is an optional boss …") and an extraction fragment whose subject
 * the parser cut off ("s are Enemies in Elden Ring, and."; ", also known as …").
 */
const TEMPLATE_DESC = /in Elden Ring\.|a melee armament/i
const GAME_TEMPLATE_FRAME =
  /\b(is|are|was) (a|an|the|one of the)\b[^.]{0,80}\bin (Elden Ring|Shadow of the Erdtree|the Lands Between)\b/i
const THIS_IS_LEAD = /^This is an? /
const LEAD_FRAGMENT = /^[,.;:)]|^s are /

/** A sentence that only states the record's category, or is a cut-off fragment. */
function isTemplateSentence(sentence: string): boolean {
  return TEMPLATE_DESC.test(sentence) || GAME_TEMPLATE_FRAME.test(sentence) || THIS_IS_LEAD.test(sentence) || LEAD_FRAGMENT.test(sentence)
}

/**
 * Keep every sentence of `text` except the template/corrupted ones, in order.
 * Task 172 — runs on every final description, whatever source wrote it, so a
 * template can never reach the index.
 */
function stripTemplateSentences(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !isTemplateSentence(sentence))
    .join(' ')
    .trim()
}

/** The game's own text for a record name (exact match), else undefined. */
let gameTextByName: Map<string, string> | undefined
function gameTextFor(name: string): string | undefined {
  if (!gameTextByName) {
    gameTextByName = new Map()
    for (const row of namesData as FmgNameRow[]) {
      const key = simpleNorm(row.name)
      if (!key || gameTextByName.has(key)) continue
      const text = fmgDescription(row)
      if (text && !isTemplateSentence(text)) gameTextByName.set(key, text)
    }
  }
  return gameTextByName.get(simpleNorm(name))
}

/**
 * Task 150 §2 — a sentence that only files the entity under a category
 * ("Mohg, Lord of Blood and Mohg, the Omen are Bosses.") or restates its type is
 * not a description. Long sentences that merely *begin* with a type word
 * ("Luminary Mohg is a Demigod and a Shardbearer who is encountered…") are real.
 */
const WIKI_DEFINITIONAL =
  /^[^.]{0,70}\b(?:is|are)\b[^.]{0,30}\b(?:in Elden Ring|boss(?:es)?|demigod|shardbearer|spell|incantation|sorcery|item|weapon|armou?r|talisman|spirit ash|ash of war|location|dungeon|enemy|creature|painting|gesture|consumable|material|key item)\b\s*\.?$/i

/** A wiki sentence that reads as real prose, not a fragment or a definition. */
function acceptableLeadSentence(raw: string): boolean {
  const sentence = raw.trim()
  if (sentence.length < 20) return false
  if (isTemplateSentence(sentence)) return false
  if (WIKI_DEFINITIONAL.test(sentence)) return false
  if (PLACE_DEFINITIONAL.test(sentence)) return false
  if (/^(?:also|and|but|or|which|who|where)\b/i.test(sentence)) return false
  // Skip list/bullet rows and anything with no words.
  if (/^[-*·\d]/.test(sentence) || !/[a-z]/.test(sentence)) return false
  return true
}

/**
 * Task 151 §1 — drop the wiki's category/placement definition sentences ("X is
 * a location within the Realm of Shadow in Shadow of the Erdtree.", "X is a
 * Location in Elden Ring.") from a lead, so a place page keeps only its real
 * Overview prose. Scoped to place-like kinds where the record can be refilled.
 */
function stripDefinitionalSentences(text: string): string {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !WIKI_DEFINITIONAL.test(sentence) && !PLACE_DEFINITIONAL.test(sentence))
    .join(' ')
    .trim()
}

/**
 * A wiki placement definition ("X is a location in Shadow of the Erdtree.",
 * "X is a location within the Realm of Shadow…"). Its only fact is that the page
 * is a place, which `location`/`region` already carry.
 */
const PLACE_DEFINITIONAL = /\b(?:is|are)\s+(?:an?\s+)?(?:location|place|subregion|region|area|site)\b/i

/** Section headings worth quoting first, in priority order. */
const LEAD_HEADING_ORDER = ['overview', 'background', 'description', 'summary', 'characteristics', 'location', 'notes', 'trivia']

/**
 * Task 150 §2 — pages whose prose describes a record that has no page of its
 * own. The Omen boss shares Mohg's character page; the Omen has no separate
 * lead, so its page is the honest source (it names the Shunning-Grounds fight).
 */
const WIKI_PAGE_ALIAS: Record<string, string> = {
  'mohg the omen': 'Mohg, Lord of Blood',
}

/**
 * The first real sentence the wiki page carries for a name, preferring
 * Overview/Background prose over a Summary line the build would discard. Used to
 * fill a page whose description is empty or is only a place name.
 *
 * Task 176 — the page must be the record's own (exact name) and of a compatible
 * kind; a fuzzy neighbour or a Nightreign-only page is never quoted.
 */
function wikiLead(name: string, recordKind?: string): string | undefined {
  const alias = WIKI_PAGE_ALIAS[simpleNorm(name)]
  let sections = alias ? lookupWiki(alias) : undefined
  if (!sections?.length) sections = lookupWiki(name)
  if (!sections?.length) return undefined
  if (recordKind) {
    sections = sections.filter((section) => {
      const wikiKind = wikiPageKind.get(simpleNorm(section.page))
      return !wikiKind || descriptionKindCompatible(recordKind, wikiKind)
    })
    if (!sections.length) return undefined
  }
  const rank = (heading: string) => {
    const i = LEAD_HEADING_ORDER.findIndex((h) => heading.toLowerCase().includes(h))
    return i === -1 ? LEAD_HEADING_ORDER.length : i
  }
  const ordered = [...sections].sort((a, b) => rank(a.heading) - rank(b.heading))
  for (const section of ordered) {
    if (!section.text) continue
    const cleaned = cleanProse(section.text)
    for (const raw of cleaned.split(/(?<=[.!?])\s+/)) {
      if (acceptableLeadSentence(raw)) return raw.trim()
    }
  }
  return undefined
}

/**
 * Task 150 §2 — the Fextralife boss page's first real sentence, the last resort
 * before a place-only description is dropped. Its "Boss"/"Location"/"Combat"
 * notes lead with a usable line ("This is an optional boss, but it must be
 * defeated to access …"); battle-data sections are skipped.
 */
function fextLead(name: string): string | undefined {
  const row = lookupName(fextByName, name)
  if (!row?.sections?.length) return undefined
  for (const section of row.sections) {
    const heading = (section.heading ?? '').toLowerCase()
    if (/combat|guide|strategy|moveset|video|reward|lore item/.test(heading)) continue
    const cleaned = cleanProse(section.text ?? '')
    for (const raw of cleaned.split(/(?<=[.!?])\s+/)) {
      if (acceptableLeadSentence(raw)) return raw.trim()
    }
  }
  return undefined
}

/** True when the text is exactly the record's region or location (a place label). */
function isPlaceText(record: EntityRecord): boolean {
  const description = record.description?.trim()
  if (!description) return false
  return (
    (!!record.region && simpleNorm(description) === simpleNorm(record.region)) ||
    (!!record.location && simpleNorm(description) === simpleNorm(record.location))
  )
}

/**
 * Task 150 §2 — kinds whose records describe a single thing the wiki has a page
 * for. `quest`/`line` records are step labels, not entities, so a wiki lead for
 * the NPC would misdescribe the step; those only ever lose a place-only text.
 */
const FILLABLE_DESC_KINDS = new Set<string>([
  'boss',
  'dungeon',
  'region',
  'grace',
  'mechanic',
  'build',
  'ending',
  'gate',
  'weapon',
  'npc',
  'merchant',
  'spirit',
  'item',
  'ash',
  'armor',
  'talisman',
  'spell',
  'enemy',
])

/** Place-like kinds whose lead may be a wiki category definition (Task 151 §1). */
const PLACE_DESC_KINDS = new Set<string>(['region', 'dungeon', 'grace'])

/**
 * Task 160 §5 — the same ownable item can arrive under two ids (a catalogue row
 * and an FMG/checklist row). When the two records share an exact name and only
 * one is catalogue-anchored, fold the unanchored one onto the anchor so the
 * graph shows one page, and alias the dropped name. Boss/grace/region records are
 * excluded: two same-named places can be genuinely different.
 */
function foldUnanchoredDuplicates(): void {
  const anchor = new Map<string, string>()
  for (const [id, record] of records) {
    if (record.catalogue === false || !OWNED_RESOLVE_KINDS.has(record.kind as EntityKind)) continue
    const key = `${record.kind}|${simpleNorm(record.name)}`
    if (!anchor.has(key)) anchor.set(key, id)
  }
  for (const [id, record] of [...records]) {
    if (record.catalogue !== false || !OWNED_RESOLVE_KINDS.has(record.kind as EntityKind)) continue
    const target = anchor.get(`${record.kind}|${simpleNorm(record.name)}`)
    if (!target || target === id) continue
    const keeper = records.get(target)
    if (keeper) mergeRecords(keeper, record)
    records.delete(id)
  }
}

/**
 * Task 160 §5 — a hunt checklist row with the same name as a real boss page is
 * the same fight, not a second page. Fold the hunt record onto the boss so the
 * two pages become one (the alias plane re-points the `hunt:` id).
 */
function foldHuntDuplicates(): void {
  const bossByName = new Map<string, string>()
  for (const [id, record] of records) {
    if (id.startsWith('hunt:') || (record.kind !== 'boss' && record.kind !== 'enemy')) continue
    const key = simpleNorm(record.name)
    if (key && !bossByName.has(key)) bossByName.set(key, id)
  }
  for (const [id, record] of [...records]) {
    if (!id.startsWith('hunt:')) continue
    const target = bossByName.get(simpleNorm(record.name))
    if (!target || target === id) continue
    const keeper = records.get(target)
    if (keeper) mergeRecords(keeper, record)
    records.delete(id)
  }
}

/**
 * Task 160 §7 — a wiki sub-location page (a cave, catacomb or tunnel the
 * location plane also lists) arrives as a bare `region:` record with no region
 * of its own; the dungeon index already has the real page. Fold the region
 * record onto the dungeon so the same place is not two pages, and the dungeon's
 * contents are not split. A macro region (it carries its own `region`) is left
 * alone even when a dungeon happens to share its name.
 */
function mergeSubLocationDuplicates(): void {
  const dungeonByName = new Map<string, string>()
  for (const [id, record] of records) {
    if (record.kind !== 'dungeon') continue
    const key = simpleNorm(record.name)
    if (key && !dungeonByName.has(key)) dungeonByName.set(key, id)
  }
  for (const [id, record] of [...records]) {
    if (record.kind !== 'region' || record.region) continue
    const target = dungeonByName.get(simpleNorm(record.name))
    if (!target || target === id) continue
    const keeper = records.get(target)
    if (keeper) mergeRecords(keeper, record)
    records.delete(id)
  }
}

/**
 * Task 160 §5 — two graces of the same name are different warp points (the
 * Leyndell Royal vs Ashen Capital, two Artist's Shacks). Keep them separate but
 * qualify the display name with the region so the two pages are distinguishable.
 */
function qualifyDuplicateGraceNames(): void {
  const byName = new Map<string, EntityRecord[]>()
  for (const record of records.values()) {
    if (record.kind !== 'grace') continue
    const key = simpleNorm(record.name)
    if (!key) continue
    const list = byName.get(key) ?? []
    list.push(record)
    byName.set(key, list)
  }
  for (const list of byName.values()) {
    if (list.length < 2) continue
    for (const record of list) {
      const qualifier = record.region || record.location
      if (!qualifier || simpleNorm(qualifier) === simpleNorm(record.name)) continue
      record.name = `${record.name} (${qualifier})`
    }
  }
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
    // An id that is only an alias of another fact (a hunt id the roster files
    // under an encounter) gets no page of its own; links to it resolve.
    if (canonicalEntityId(entity.id) !== entity.id && hasEntity(canonicalEntityId(entity.id))) continue
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
  // The game's goods name table lists every spell a player can hold; a magic-dump
  // entry missing from it is an enemy/boss-only cast (Smarag's Glint Breath).
  const playerGoods = new Set((namesData as FmgNameRow[]).filter((r) => r.kind === 'goods').map((r) => simpleNorm(r.name)))
  for (const row of magicData as { name: string }[]) {
    const match = /^\[(Incantation|Sorcery)\]\s*(.+)$/.exec(row.name)
    if (!match) continue
    const spellName = correctName(match[2].trim())
    if (!playerGoods.has(simpleNorm(spellName))) continue
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
    if (row.group) {
      // One encounter of a boss fought in several places: its own wiki tab text
      // and rune reward, and the shared boss it belongs to.
      setText(record, 'description', row.about ?? undefined)
      if (row.runes != null) setStat(record, 'Runes', row.runes)
      record.related = [...new Set([...(record.related ?? []), 'Part of: ' + row.name])]
      source(record, 'wiki-db/boss-encounters')
    }
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
    setText(record, 'location', cleanAcquisitionPlace(row.location, row.near))
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
  mergeExtraSources()
  mergeEnemyCombat()
  mergeFmgNames()
  mergeAcquisitionItems()
  mergeWikiDb()
  mergeNpcQuestSteps()

  // Task 132 §2/§3/§4 — once every source has landed: dissolve enemy/NPC name
  // collisions, drop the empty FMG name-plane rows, give regions their graces
  // and every enemy a real description.
  cleanupFmgDuplicates()
  foldFmgNpcRows()
  resolveEnemyCollisions()
  // Task 133 §0 — fold `+N` upgrades, collapse duplicate primaries (enemies
  // above all) and merge boss-encounter enemy rows onto their boss.
  foldUpgrades()
  dedupePrimary()
  mergeBossEncounterEnemies()
  // After the FMG name-plane cleanup, so empty name rows are already folded away.
  shareQuestSteps()
  // Task 146 §1 — place names the PS5 reader sees but the index never built.
  seedGamePlaceRegions()
  enrichRegions()

  // Any other record the catalog places (quest beats, items) gets that region
  // when no source gave one, so area views can find it. This runs after quest
  // step matching on purpose: a bare region is too weak a signal to pair a wiki
  // step with an authored beat.
  const catalogRegion = new Map<string, string>()
  for (const f of facts) if (f.region) catalogRegion.set(f.id, f.region)
  for (const [id, record] of records) {
    if (!record.region && catalogRegion.has(id)) record.region = catalogRegion.get(id)
  }

  // Task 124 §2 — the sourced gap-fill, applied last so every field is a
  // lowest-priority fallback. `setText`/`setStat` only write when absent.
  mergeGapfill()

  enrichCreatures()
  // Task 148 §6 — merchants: base-merchant fields and their shop sub-rows.
  enrichMerchants()
  // Placements can give two variants of one enemy the same name + location.
  dedupePrimary()
  // Task 148 §1 — then one enemy page per exact display name.
  mergeEnemyVariants()
  // Task 160 §5 — collapse true same-name duplicates (an unanchored FMG row onto
  // its catalogue anchor, a hunt checklist row onto its boss) and qualify the
  // same-name graces that must stay separate.
  foldUnanchoredDuplicates()
  foldHuntDuplicates()
  mergeSubLocationDuplicates()
  qualifyDuplicateGraceNames()

  // Task 146 §2/§3 — the missing items, the real merchant quotes and the quest
  // pictures, restored from the committed sources after every merge has landed.
  seedGameItems()
  restoreMerchantQuotes()
  restoreLineImages()

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

  // Task 154 step 3 — base boss portraits before the encounter inheritance below.
  fillBossImages()

  // An encounter borrows what is true of every copy of its boss — strategy and
  // the combat profile — from the shared record, without overwriting its own.
  for (const row of bossRoster as RosterBoss[]) {
    if (!row.group) continue
    const record = records.get(row.id)
    const shared = records.get(row.group)
    if (!record || !shared) continue
    // Drops are per encounter (its wiki tab). Name-based merges above pooled every
    // copy's drops onto it; a known roster row is the authority. When the roster
    // has none the pooled source drops stay, filling the gap instead of blanking it.
    if (row.drops.length) {
      record.drops = []
      addDrops(record, row.drops)
    }
    setText(record, 'strategy', shared.strategy)
    if (!record.image && shared.image) record.image = shared.image
    if (!record.stats?.Runes && shared.stats?.Runes) setStat(record, 'Runes', shared.stats.Runes)
    for (const [label, value] of Object.entries(shared.stats ?? {})) {
      if (label === 'HP' || label === 'Drops' || label === 'Runes') continue
      setStat(record, label, value)
    }
  }

  // A catalog record named after a real item (e.g. item:rennala-great-rune =
  // Great Rune of the Unborn) takes its twin's description/image when it has none.
  const twinByName = new Map<string, EntityRecord>()
  for (const record of records.values()) {
    const key = `${record.kind}|${simpleNorm(record.name)}`
    if (record.description && !twinByName.has(key)) twinByName.set(key, record)
  }
  for (const record of records.values()) {
    if (record.description) continue
    const twin = twinByName.get(`${record.kind}|${simpleNorm(record.name)}`)
    if (!twin || twin === record) continue
    setText(record, 'description', twin.description)
    setText(record, 'location', twin.location)
    if (!record.image && twin.image) record.image = twin.image
  }

  const wikiDescriptions = buildWikiDescriptionMap()
  const cutNames = buildCutNameSet()
  for (const record of records.values()) {
    // Task 148 §2 — drop the dump's junk rows (Dummy Entity, "Type 7" armour
    // prototypes, "test gem") before they reach the page.
    if (JUNK_RECORD_NAME.test(record.name.trim())) {
      records.delete(record.id)
      continue
    }
    // Strip wiki markup first: the pointer drop is stored as "See [[#Drops" and
    // only becomes "See #Drops" after pruning.
    prune(record)
    // Task 177 — `location` holds a place, never a bare type word ("Church",
    // "Subregion", "grace"), a leaked markdown heading ("# Castleward Tunnel")
    // or the merchant placeholder. A real parent region stays in `region`.
    if (record.location) {
      let loc = record.location.replace(/^#+\s*/, '').trim()
      const label = ACQ_LABEL_RE.exec(loc)
      if (label) loc = label[1].trim()
      loc = loc.replace(/Subterranean Shunning,\s*Grounds?/i, 'Subterranean Shunning-Grounds')
      if (/^merchant$/i.test(loc) || isBarePlaceType(loc)) loc = ''
      record.location = loc || undefined
    }
    // Task 177 — the same hygiene for `region`: a bare type word ("Subregion")
    // is not a region; drop it so a place shows its real parent or nothing.
    if (record.region && isBarePlaceType(record.region)) record.region = undefined
    // A placeholder or one-word "description" ("drop", "merchant", "Caelid") is
    // not a description; step 3 refills it from the wiki or it stays empty. A
    // bare region name (a quest beat's only text) is real locator data: keep it
    // as the location instead of discarding it, so the page is not left empty.
    if (record.description && PLACEHOLDER_DESC.test(record.description.trim())) {
      const placeholder = record.description.trim()
      if (!record.location && record.region && simpleNorm(placeholder) === simpleNorm(record.region)) {
        record.location = placeholder
      }
      record.description = undefined
    }
    // Task 151 §1 — a place whose only lead is the wiki's category template
    // ("X is a location within the Realm of Shadow…") loses it here so the lead
    // fallback below can quote the page's real Overview prose instead.
    if (record.description && PLACE_DESC_KINDS.has(record.kind)) {
      record.description = stripDefinitionalSentences(record.description) || undefined
    }
    const currentDescription = record.description?.trim()
    const placeOnly = isPlaceText(record)
    // Task 148 §3 + Task 150 §2 — an empty, subjectless ("is a character …") or
    // place-only description is replaced with the wiki page's lead paragraph.
    // The subject a broken lead dropped is restored from the record name; a bare
    // template is never used.
    if (!currentDescription || SUBJECTLESS_DESC.test(currentDescription) || /^the is\b/i.test(currentDescription) || placeOnly) {
      const wiki = wikiDescriptions.get(simpleNorm(record.name))
      // Task 176 — only a wiki page of a compatible kind may fill the record.
      if (wiki && descriptionKindCompatible(record.kind, wiki.kind)) {
        const text = repairWikiLead(wiki.text, record.name)
        if (usableWikiDescription(text)) {
          record.description = text
          source(record, 'wiki-db')
        }
      }
    }
    // Task 148 follow-up — a wiki template sentence ("X is a … in Elden Ring.")
    // is not a description. Drop every template sentence and keep the rest.
    // A template sentence is never written by the build.
    if (record.description) {
      const stripped = stripTemplateSentences(record.description)
      record.description = stripped || undefined
    }
    // Task 150 §2 — when nothing real survived (or the description is only the
    // place name) take the game's own caption, then the wiki page's first real
    // Overview/Background sentence, then the Fextralife page. Quest/line records
    // are step labels and character names: wiki lore would misdescribe the step,
    // so they are never given prose this way.
    if ((!record.description || isPlaceText(record)) && FILLABLE_DESC_KINDS.has(record.kind)) {
      // Task 176 — Fextralife only carries boss/enemy pages; never let a boss
      // strategy sentence land on a grace that merely shares the boss's arena name.
      const fext = record.kind === 'boss' || record.kind === 'enemy' ? fextLead(record.name) : undefined
      const real =
        record.kind === 'enemy'
          ? wikiLead(record.name, record.kind) ?? creatureLead(record.name) ?? fext ?? gameTextFor(record.name)
          : gameTextFor(record.name) ?? wikiLead(record.name, record.kind) ?? fext
      // Task 172 — a fallback source may still hand back a template sentence
      // ("X is a boss in Elden Ring."); strip it here so the cleanup above is not
      // undone by this later fill.
      const cleaned = real ? stripTemplateSentences(real) : ''
      if (cleaned) {
        record.description = cleaned
        source(record, 'wiki-sections')
      }
    }
    // A description that is only the place name is removed — the location
    // already shows it — unless a real one was found above. When the record has
    // no location yet, the place text moves there so the page is not left empty.
    if (record.description && isPlaceText(record)) {
      const place = record.description.trim()
      if (!record.location) record.location = place
      record.description = undefined
    }
    // Rune rewards are not item drops ("120,000 Runes", "Runes"); the runes stat
    // carries them. "See #Drops" is a wiki pointer, never an item.
    if (record.drops) {
      record.drops = record.drops.filter(
        (d) =>
          !/^[\d,.\s]*runes?(\s*\(ng[^)]*\))?$/i.test(String(d).trim()) &&
          !DROP_PLACEHOLDER.test(String(d).trim()),
      )
      if (!record.drops.length) delete record.drops
    }
    // Task 148 §4 — content the wiki lists as cut/unused is flagged, not deleted.
    if (cutNames.has(simpleNorm(record.name)) || (record.description && CUT_DESC.test(record.description))) {
      record.cut = true
      record.stats = record.stats ?? {}
      record.stats.Status = 'Cut content (not obtainable)'
    }
    // Task 177 — the generic half of a split item keeps the catalog fact's own
    // name, so it does not duplicate the specific half ("Dectus Medallion" vs
    // "Dectus Medallion (Right)").
    if (MEDALLION_HALF_FACTS.has(record.id)) {
      const fact = byId.get(record.id)
      if (fact?.name) record.name = fact.name
    }
    // Repair dump casing ("Axe Of Godfrey") so every screen, not just the
    // entity panel, shows the game's spelling. Ids are unchanged.
    record.name = displayName(record.name)
  }

  // Task 154 — give every item-like record without a picture the game's own icon.
  fillGameIcons()

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

/**
 * Task 133 §0 — drop the wiki's Nightreign boilerplate (the wiki mixes the
 * separate game `Elden Ring: Nightreign` into many lead sentences). Trailing
 * clauses that mention it are removed; when the whole sentence is Nightreign
 * only, it goes. The base-game half of a shared sentence is kept.
 */
function stripNightreign(text: string): string {
  let t = text
  // "… in Elden Ring and Elden Ring Nightreign." -> "… in Elden Ring."
  t = t.replace(/\s+and\s+Elden Ring Nightreign/gi, '')
  // "… in Elden Ring and <clause> Nightreign." -> "… in Elden Ring."
  t = t.replace(/\s+and\s+[^.]*?Nightreign[^.]*?\./gi, '.')
  // Standalone trailing sentences about Nightreign.
  t = t.replace(/\s*(?:They|It)\s+(?:also\s+)?(?:are|is|appear|appears|appears? as)[^.]*Nightreign[^.]*\./gi, '')
  // Anything left: drop the sentence that names it. Task 176 — also drop a
  // sentence about a Nightreign-only place (the page Summary names the other
  // game, but a copied Overview sentence need not name it).
  t = t
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/nightreign/i.test(sentence) && !/\b(?:Limveld|Shifting Earth|Deep of Night|Everdark)\b/i.test(sentence))
    .join(' ')
  return t.replace(/\s+([.,;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim()
}

/**
 * Task 133 §0 — every player-visible field is stored as plain text. Wiki
 * templates, refs, HTML tags, `'''bold'''`/`''italic''`/`**bold**`, `==headings==`
 * and `[[links]]` are stripped while keeping the readable label.
 */
export function cleanProse(text: string): string {
  let t = text
  t = t.replace(/<!--[\s\S]*?-->/g, ' ')
  t = t.replace(/<ref[^>]*\/>/gi, ' ').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, ' ')
  t = t.replace(/<[^>]+>/g, ' ')
  t = t.replace(/\{\{[^{}]*\}\}/g, ' ')
  t = t.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
  t = t.replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, '$1')
  t = t.replace(/\[https?:\/\/[^\s\]]+\]/g, ' ')
  t = t.replace(/\[\[|\]\]/g, '')
  t = t.replace(/'''/g, '').replace(/\*\*/g, '').replace(/==+/g, '')
  t = t.replace(/\bISBN[^,;]*/gi, ' ')
  t = stripNightreign(t)
  return t.replace(/\s+([.,;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim()
}

function prune(record: EntityRecord): void {
  // Task 133 §0 — strip wiki markup / Nightreign boilerplate first, then the
  // raw-tile guard and truncation.
  if (record.name) record.name = cleanProse(record.name)
  if (record.description) record.description = humanizeMapIds(cleanProse(record.description))
  if (record.location) record.location = humanizeMapIds(cleanProse(record.location))
  if (record.strategy) record.strategy = humanizeMapIds(cleanProse(record.strategy))
  if (record.description && record.description.length > EXCERPT) record.description = excerpt(record.description)
  if (record.location && record.location.length > EXCERPT) record.location = excerpt(record.location)
  if (record.strategy && record.strategy.length > EXCERPT) record.strategy = excerpt(record.strategy)
  if (record.drops) record.drops = record.drops.filter((d) => d && d.length <= 120).map(cleanProse).slice(0, 12)
  if (record.related) record.related = record.related.map(cleanProse).filter(Boolean)
  if (record.stats) for (const [label, value] of Object.entries(record.stats)) record.stats[label] = cleanProse(value)
  if (record.sections) {
    record.sections = record.sections
      .map((s) => ({ heading: cleanProse(s.heading).slice(0, 80), text: excerpt(humanizeMapIds(cleanProse(s.text))) }))
      .filter((s) => s.heading || s.text)
      .slice(0, 4)
  }
  if (record.upgradeLevels) {
    for (const level of record.upgradeLevels) if (level.effect) level.effect = cleanProse(level.effect)
  }
  if (record.questSteps) {
    for (const step of record.questSteps) {
      step.title = cleanProse(step.title)
      if (step.text) step.text = cleanProse(step.text)
      if (step.location) step.location = cleanProse(step.location)
    }
  }
}

/** The only goods that are genuinely reinforced rather than separate pickups. */
const FLASK_NAME_RE = /^flask of (crimson|cerulean) tears$/i

/**
 * Task 133 §0 — a `+N` row is only the *same item reinforced* for a spirit-ash
 * summon, a weapon/shield reinforcement level or one of the two Flasks. Those
 * fold into their base entity as an `upgradeLevels` table.
 *
 * Everything else is a distinct collectible with its own pickup location, so
 * its `+N` row must stay a record of its own: talismans above all ("Crimson
 * Amber Medallion +1/+2/+3", "Great-Jar's Arsenal", "Erdtree's Favor +2" …)
 * but also armour and any ordinary good whose `+N` is a separate pickup.
 */
function isFoldableUpgrade(record: EntityRecord, baseName: string): boolean {
  if (record.kind === 'talisman' || record.kind === 'armor') return false
  if (record.kind === 'spirit' || record.kind === 'weapon' || record.kind === 'shield' || record.kind === 'ash') return true
  if (record.kind !== 'item') return false
  // FMG goods: only spirit-ash summons and the two flasks carry upgrade levels.
  return /^summons?\b/i.test(record.description ?? '') || FLASK_NAME_RE.test(baseName)
}

function foldUpgrades(): void {
  const pattern = /^(.*?)\s+\+(\d+)$/
  const baseIdFor = (baseName: string): string | undefined => {
    const catalogue = catalogueIdFor('item', baseName)
    if (records.has(catalogue)) return catalogue
    for (const key of mapKeys(baseName)) {
      const candidate = nameIndex.get(key)
      if (candidate && records.has(candidate)) return candidate
    }
    return undefined
  }
  const addLevel = (base: EntityRecord, level: number, name: string, effect: string | undefined): void => {
    base.upgradeLevels = base.upgradeLevels ?? []
    if (!base.upgradeLevels.some((row) => row.level === level && row.name === name)) {
      base.upgradeLevels.push({ level, name, effect })
    }
  }
  for (const record of [...records.values()]) {
    const match = pattern.exec(record.name)
    if (!match) continue
    const baseName = match[1].trim()
    const level = Number(match[2])
    if (!baseName || !Number.isFinite(level)) continue
    if (!isFoldableUpgrade(record, baseName)) continue
    const baseId = baseIdFor(baseName)
    const base = baseId ? records.get(baseId) : undefined
    if (!base || base.id === record.id) continue
    addLevel(base, level, record.name, record.description)
    addName(record.name, base.id)
    records.delete(record.id)
  }
  // Task 151 §1 — the alias plane resolves an upgrade "+N" name straight to its
  // base id, so the FMG goods row never becomes its own record and `foldUpgrades`
  // above cannot see it. Build those levels from the FMG goods plane itself, so
  // spirit-ash and flask upgrades keep their upgrade table on the base page.
  for (const row of namesData as FmgNameRow[]) {
    if (row.kind !== 'goods') continue
    const match = pattern.exec(row.name)
    if (!match) continue
    const baseName = match[1].trim()
    const level = Number(match[2])
    if (!baseName || !Number.isFinite(level)) continue
    if (!/^summons?\b/i.test(row.info ?? '') && !FLASK_NAME_RE.test(baseName)) continue
    const baseId = baseIdFor(baseName)
    const base = baseId ? records.get(baseId) : undefined
    if (!base) continue
    addLevel(base, level, row.name, row.info)
  }
  for (const record of records.values()) if (record.upgradeLevels) record.upgradeLevels.sort((a, b) => a.level - b.level)
}

/** How many player-visible fields a record carries (merge tie-break). */
function filled(record: EntityRecord): number {
  return (
    (record.description ? 2 : 0) +
    (record.location ? 1 : 0) +
    (record.map ? 1 : 0) +
    (record.drops?.length ? 1 : 0) +
    (record.sections?.length ? 1 : 0) +
    (record.stats && Object.keys(record.stats).length ? 1 : 0) +
    (record.upgradeLevels?.length ? 1 : 0) +
    (record.questSteps?.length ? 1 : 0)
  )
}

function mergeRecords(keep: EntityRecord, drop: EntityRecord): void {
  if (!keep.description && drop.description) keep.description = drop.description
  if (!keep.location && drop.location) keep.location = drop.location
  if (!keep.region && drop.region) keep.region = drop.region
  if (!keep.map && drop.map) keep.map = drop.map
  addDrops(keep, drop.drops)
  if (drop.sections?.length) {
    keep.sections = keep.sections ?? []
    for (const section of drop.sections) {
      if (!keep.sections.some((s) => s.heading === section.heading && s.text === section.text)) keep.sections.push(section)
    }
  }
  if (drop.stats) keep.stats = { ...drop.stats, ...(keep.stats ?? {}) }
  if (drop.upgradeLevels?.length) {
    keep.upgradeLevels = keep.upgradeLevels ?? []
    for (const row of drop.upgradeLevels) if (!keep.upgradeLevels.some((r) => r.level === row.level && r.name === row.name)) keep.upgradeLevels.push(row)
  }
  if (!keep.questSteps?.length && drop.questSteps?.length) keep.questSteps = drop.questSteps
  for (const sourceName of drop.sources ?? []) if (!keep.sources.includes(sourceName)) keep.sources.push(sourceName)
  addName(drop.name, keep.id)
}

/**
 * Task 133 §0 — one primary record per normalised name + location per kind. The
 * enemy plane carried 500+ NpcParam rows that share a name and placement; the
 * grace/weapon planes a handful of synonym rows. The richest (most fields, and
 * a graph entity where one exists) wins.
 */
function dedupePrimary(): void {
  const groups = new Map<string, EntityRecord[]>()
  for (const record of records.values()) {
    if (record.catalogue === false) continue
    const key = `${record.kind}|${simpleNorm(record.name)}|${simpleNorm(record.location)}`
    if (!key) continue
    const list = groups.get(key) ?? []
    list.push(record)
    groups.set(key, list)
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue
    list.sort(
      (a, b) =>
        Number(canonicalEntityId(b.id) === b.id) - Number(canonicalEntityId(a.id) === a.id) ||
        Number(hasEntity(b.id)) - Number(hasEntity(a.id)) ||
        filled(b) - filled(a) ||
        (b.sources?.length ?? 0) - (a.sources?.length ?? 0) ||
        a.id.localeCompare(b.id),
    )
    const keep = list[0]
    for (let i = 1; i < list.length; i++) {
      mergeRecords(keep, list[i])
      records.delete(list[i].id)
    }
  }
}

/**
 * Task 133 §0 — an enemy that is really a boss encounter (`X (Boss)`) merges its
 * combat profile into the named boss record instead of standing as a second
 * primary creature.
 */
function mergeBossEncounterEnemies(): void {
  const bossByBase = new Map<string, string>()
  for (const [id, record] of records) {
    if (record.kind !== 'boss') continue
    const key = baseNorm(record.name)
    if (key && !bossByBase.has(key)) bossByBase.set(key, id)
  }
  const prefixMatch = (base: string): string | undefined => {
    let best: string | undefined
    let bestLen = 0
    for (const [key, bossId] of bossByBase) {
      if (key.startsWith(`${base} `) || base.startsWith(`${key} `)) {
        const len = Math.min(key.length, base.length)
        if (len > bestLen) {
          bestLen = len
          best = bossId
        }
      }
    }
    return best
  }
  for (const [id, record] of [...records]) {
    if (record.kind !== 'enemy' || !/\(boss\)\s*$/i.test(record.name)) continue
    const base = baseNorm(record.name)
    const target = bossByBase.get(base) ?? prefixMatch(base)
    if (!target || target === id) continue
    const boss = records.get(target)
    if (!boss) continue
    mergeRecords(boss, record)
    records.delete(id)
  }
}

/** A drop-list entry that is a pointer, not a real dropped item. */
const DROP_PLACEHOLDER = /^see #drops$/i

/** Task 148 §2 — junk/placeholder rows that are not real game content. */
const JUNK_RECORD_NAME = /^(?:dummy entity|type \d+|test gem.*)$/i

/**
 * Task 148 §2 — a template fragment ("The is a …") or a bare token ("drop",
 * "merchant", "other", a region name used as prose) is not a description.
 */
const PLACEHOLDER_DESC = /^(?:the is an?\b|\w+$)/i

/**
 * Task 148 §1 — one page per enemy. Every surviving enemy record is folded onto
 * one per *exact display name*; only identical names merge (a "(Boss)" row or a
 * differently titled creature stays its own page). Placements, locations,
 * regions and drops are unioned, the drop table is kept per placement in
 * `variants` (never concatenated into a "Drop rates" stat), and every old
 * `enemy:<npcParamId>` id stays resolvable through the generated alias plane.
 */
function mergeEnemyVariants(): void {
  const dropsById = new Map<number, { item: string; chance: number }[]>()
  for (const row of (enemyDropsDoc as { rows: { npcParamId: number; drops: { item: string; chance: number }[] }[] }).rows) {
    dropsById.set(
      row.npcParamId,
      row.drops.map((d) => ({ item: d.item, chance: d.chance })),
    )
  }

  const groups = new Map<string, EntityRecord[]>()
  for (const record of records.values()) {
    if (record.kind !== 'enemy') continue
    record.name = displayName(record.name.trim()).replace(/\s+/g, ' ')
    const list = groups.get(record.name) ?? []
    list.push(record)
    groups.set(record.name, list)
  }

  for (const [name, list] of groups) {
    const wanted = slug(name) ? `enemy:${slug(name)}` : 'enemy:unknown'
    let keep = list.find((r) => r.id === wanted)
    if (!keep) {
      let target = wanted
      let n = 2
      while (records.has(target) && !list.includes(records.get(target)!)) target = `${wanted}-${n++}`
      keep = [...list].sort((a, b) => filled(b) - filled(a) || a.id.localeCompare(b.id))[0]
      records.delete(keep.id)
      keep.id = target
      records.set(target, keep)
    }

    const variants: EnemyVariant[] = []
    const locations: string[] = []
    const regions: string[] = []
    const drops: string[] = []
    for (const member of list) {
      const npcMatch = /^enemy:(\d+)$/.exec(member.id)
      const npcParamId = npcMatch ? Number(npcMatch[1]) : undefined
      const memberDrops = npcParamId != null ? dropsById.get(npcParamId) ?? [] : []
      variants.push({
        ...(npcParamId != null ? { npcParamId } : {}),
        ...(member.location ? { location: member.location } : {}),
        ...(member.region ? { region: member.region } : {}),
        drops: memberDrops,
      })
      if (member.location && !locations.includes(member.location)) locations.push(member.location)
      if (member.region && !regions.includes(member.region)) regions.push(member.region)
      for (const drop of memberDrops) if (!drops.includes(drop.item)) drops.push(drop.item)
      for (const drop of member.drops ?? []) {
        if (DROP_PLACEHOLDER.test(drop)) continue
        if (!drops.includes(drop)) drops.push(drop)
      }
      if (member.id !== keep.id) {
        mergeRecords(keep, member)
        records.delete(member.id)
      }
      addName(member.name, keep.id)
      addName(member.id, keep.id)
    }

    keep.variants = variants.length > 1 ? variants : undefined
    if (locations.length) keep.location = locations.slice(0, 6).join(' · ')
    if (regions.length) keep.region = regions.slice(0, 4).join(' · ')
    if (drops.length) keep.drops = drops
    // The per-placement drop table lives in `variants`, not as a concatenated stat.
    if (keep.stats) delete keep.stats['Drop rates']
  }
}

export { EXCERPT }
