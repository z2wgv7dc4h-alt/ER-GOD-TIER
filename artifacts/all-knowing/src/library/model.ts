import type { Campaign, Character } from '../types'
import { displayAttackRating, getWeaponAttack, statsToAttributes, type Weapon } from '../lib/ar'

/**
 * Task 95 — the Library browser's data model.
 *
 * Everything in this file is pure and synchronous: the category list, the
 * unified `LibraryEntity` shape every source is normalised into, and the
 * filtering / sorting / deep-link / compare-tray logic the UI and the tests
 * share. No React, no fetching — the browser (`LibraryBrowser`) and the
 * catalogue builder (`catalog.ts`) both read from here.
 */

export type CategoryId =
  | 'weapons'
  | 'shields'
  | 'armor'
  | 'talismans'
  | 'sorceries'
  | 'incantations'
  | 'ashes'
  | 'spirits'
  | 'items'
  | 'bosses'
  | 'npcs'
  | 'locations'
  | 'recipes'
  | 'secrets'
  | 'guides'
  | 'mechanics'
  | 'dialogue'

export type CategoryMeta = {
  id: CategoryId
  label: string
  /** Short monogram used as the rail glyph (no icon pack dependency). */
  mono: string
}

/** The rail order, exactly as the task lists it. */
export const CATEGORIES: CategoryMeta[] = [
  { id: 'weapons', label: 'Weapons', mono: 'W' },
  { id: 'shields', label: 'Shields', mono: 'Sh' },
  { id: 'armor', label: 'Armor', mono: 'A' },
  { id: 'talismans', label: 'Talismans', mono: 'T' },
  { id: 'sorceries', label: 'Sorceries', mono: 'So' },
  { id: 'incantations', label: 'Incantations', mono: 'In' },
  { id: 'ashes', label: 'Ashes of War', mono: 'Ao' },
  { id: 'spirits', label: 'Spirit Ashes', mono: 'SA' },
  { id: 'items', label: 'Items', mono: 'I' },
  { id: 'bosses', label: 'Bosses', mono: 'B' },
  { id: 'npcs', label: 'NPCs', mono: 'N' },
  { id: 'locations', label: 'Locations', mono: 'L' },
  { id: 'recipes', label: 'Recipes', mono: 'R' },
  { id: 'secrets', label: 'Secrets', mono: 'Se' },
  { id: 'guides', label: 'Guides', mono: 'G' },
  { id: 'mechanics', label: 'Mechanics', mono: 'Me' },
  { id: 'dialogue', label: 'Dialogue', mono: 'D' },
]

export function categoryMeta(id: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

export function isCategory(id: string): id is CategoryId {
  return CATEGORIES.some((c) => c.id === id)
}

export type AttributeKey = 'str' | 'dex' | 'int' | 'fai' | 'arc'

export type EntityStat = { label: string; value: string }

/**
 * One row in the browser, whatever its source. Fields are optional because a
 * boss has no scaling letters and a location has no weight; the renderer only
 * shows what a category actually carries.
 */
export type LibraryEntity = {
  /** Stable, unique across categories, e.g. `weapons:uchigatana`. */
  id: string
  /** Fact id used for ownership + `Related`, e.g. `item:uchigatana`. */
  factId: string
  name: string
  category: CategoryId
  /** Weapon type / armor slot / spell school / guide page. */
  subtype?: string
  region?: string
  campaign?: Campaign
  dlc?: boolean
  icon?: string
  weight?: number
  requirements?: Partial<Record<AttributeKey, number>>
  scaling?: Partial<Record<AttributeKey, string>>
  attack?: { label: string; value: number }[]
  stats?: EntityStat[]
  /** Free-form filter tags (damage types, spell school, …). */
  tags?: string[]
  where?: string
  lore?: string
  /** Base weapon name used to resolve the AR calculator row. */
  weaponName?: string
}

// ---------------------------------------------------------------------------
// Character-derived views
// ---------------------------------------------------------------------------

export type AttributeStats = Record<AttributeKey, number>

export function attributeStats(character: Character): AttributeStats {
  const s = character.stats
  return {
    str: s.strength,
    dex: s.dexterity,
    int: s.intelligence,
    fai: s.faith,
    arc: s.arcane,
  }
}

/**
 * `null` means the entity carries no requirements (trivially met). `false`
 * means the character does not yet meet at least one of them.
 */
export function meetsRequirements(entity: LibraryEntity, character: Character): boolean | null {
  if (!entity.requirements) return null
  const attrs = attributeStats(character)
  for (const [key, value] of Object.entries(entity.requirements) as [AttributeKey, number][]) {
    if ((value ?? 0) > 0 && attrs[key] < value) return false
  }
  return true
}

/** Every fact id the character currently holds as true, across all kinds. */
export function ownedFactIds(character: Character): Set<string> {
  return new Set([
    ...character.defeatedBosses,
    ...character.discoveredGraces,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ])
}

export function isOwned(entity: LibraryEntity, character: Character): boolean {
  const owned = ownedFactIds(character)
  return owned.has(entity.factId) || owned.has(entity.id)
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export type OwnershipFilter = 'all' | 'owned' | 'not'
export type CampaignFilter = 'all' | 'base' | 'dlc'

export const SCALING_LETTERS = ['S', 'A', 'B', 'C', 'D', 'E'] as const
export type ScalingLetter = (typeof SCALING_LETTERS)[number]

export const SCALING_RANK: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1, '–': 0, '-': 0 }

export function bestScalingRank(entity: LibraryEntity): number {
  if (!entity.scaling) return 0
  let best = 0
  for (const letter of Object.values(entity.scaling)) {
    const rank = SCALING_RANK[letter] ?? 0
    if (rank > best) best = rank
  }
  return best
}

export type LibraryFilter = {
  q: string
  owned: OwnershipFilter
  meets: boolean
  subtypes: string[]
  /** Damage-type labels (Physical/Magic/Fire/Lightning/Holy) selected. */
  damages: string[]
  scalingMin: ScalingLetter | null
  campaign: CampaignFilter
}

export function defaultFilter(): LibraryFilter {
  return { q: '', owned: 'all', meets: false, subtypes: [], damages: [], scalingMin: null, campaign: 'all' }
}

function damageLabels(entity: LibraryEntity): string[] {
  return (entity.attack ?? []).map((a) => a.label)
}

function haystack(entity: LibraryEntity): string {
  return [entity.name, entity.subtype, entity.region, entity.where, entity.lore, ...(entity.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function matchesFilter(entity: LibraryEntity, filter: LibraryFilter, character: Character): boolean {
  const q = filter.q.trim().toLowerCase()
  if (q && !haystack(entity).includes(q)) return false

  if (filter.owned !== 'all') {
    const owned = isOwned(entity, character)
    if (filter.owned === 'owned' && !owned) return false
    if (filter.owned === 'not' && owned) return false
  }

  if (filter.meets && meetsRequirements(entity, character) === false) return false

  if (filter.subtypes.length && (!entity.subtype || !filter.subtypes.includes(entity.subtype))) return false

  if (filter.damages.length) {
    const labels = damageLabels(entity)
    if (!labels.some((l) => filter.damages.includes(l))) return false
  }

  if (filter.scalingMin) {
    const min = SCALING_RANK[filter.scalingMin] ?? 0
    if (bestScalingRank(entity) < min) return false
  }

  if (filter.campaign !== 'all') {
    const dlc = entity.dlc || entity.campaign === 'sote' || entity.campaign === 'tarnished-pack'
    if (filter.campaign === 'dlc' && !dlc) return false
    if (filter.campaign === 'base' && dlc) return false
  }

  return true
}

export function applyFilters(
  entities: LibraryEntity[],
  filter: LibraryFilter,
  character: Character,
): LibraryEntity[] {
  return entities.filter((e) => matchesFilter(e, filter, character))
}

/** Distinct subtypes present in a set, sorted — for the toolbar's type chips. */
export function subtypesOf(entities: LibraryEntity[]): string[] {
  const set = new Set<string>()
  for (const e of entities) if (e.subtype) set.add(e.subtype)
  return [...set].sort((a, b) => a.localeCompare(b))
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export type SortKey = 'name' | 'ar' | 'weight' | 'requirement' | 'region'
export type SortDir = 'asc' | 'desc'

export type SortContext = {
  /** AR at the character's stats, when a weapon resolves; undefined otherwise. */
  arFor?: (entity: LibraryEntity) => number | undefined
}

export function requirementScore(entity: LibraryEntity): number {
  if (!entity.requirements) return 0
  let sum = 0
  for (const v of Object.values(entity.requirements)) sum += v ?? 0
  return sum
}

function sortValue(entity: LibraryEntity, key: SortKey, ctx: SortContext): number | string | null {
  switch (key) {
    case 'name':
      return entity.name.toLowerCase()
    case 'ar':
      return ctx.arFor?.(entity) ?? null
    case 'weight':
      return entity.weight ?? null
    case 'requirement':
      return entity.requirements ? requirementScore(entity) : null
    case 'region':
      return entity.region ? entity.region.toLowerCase() : null
    default:
      return entity.name.toLowerCase()
  }
}

/**
 * Stable sort by a chosen key. Missing values always sink to the bottom,
 * regardless of direction, so "sort by AR" never floats unknowns to the top.
 */
export function sortEntities(
  entities: LibraryEntity[],
  key: SortKey = 'name',
  dir: SortDir = 'asc',
  ctx: SortContext = {},
): LibraryEntity[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...entities].sort((a, b) => {
    const va = sortValue(a, key, ctx)
    const vb = sortValue(b, key, ctx)
    if (va === null && vb === null) return a.name.localeCompare(b.name)
    if (va === null) return 1
    if (vb === null) return -1
    let cmp: number
    if (typeof va === 'string' && typeof vb === 'string') cmp = va.localeCompare(vb)
    else if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb
    else cmp = String(va).localeCompare(String(vb))
    if (cmp === 0) return a.name.localeCompare(b.name)
    return cmp * factor
  })
}

// ---------------------------------------------------------------------------
// AR
// ---------------------------------------------------------------------------

export function weaponAr(weapon: Weapon, character: Character, upgradeLevel?: number): number {
  const level = upgradeLevel ?? 0
  const result = getWeaponAttack({
    weapon,
    attributes: statsToAttributes(character.stats),
    upgradeLevel: level,
  })
  return displayAttackRating(result.attackPower)
}

export function weaponArAtMax(weapon: Weapon, character: Character): number {
  return weaponAr(weapon, character, Math.max(0, weapon.attack.length - 1))
}

// ---------------------------------------------------------------------------
// Compare tray
// ---------------------------------------------------------------------------

export const COMPARE_CAP = 4

export function addToCompare(ids: string[], id: string, cap = COMPARE_CAP): string[] {
  if (ids.includes(id)) return ids
  if (ids.length >= cap) return ids
  return [...ids, id]
}

export function removeFromCompare(ids: string[], id: string): string[] {
  return ids.filter((x) => x !== id)
}

export function toggleCompare(ids: string[], id: string, cap = COMPARE_CAP): string[] {
  return ids.includes(id) ? removeFromCompare(ids, id) : addToCompare(ids, id, cap)
}

// ---------------------------------------------------------------------------
// Deep links — `#/library/search?cat=weapons&id=<factId>`
// ---------------------------------------------------------------------------

export type DeepLink = { cat: CategoryId | null; id: string | null; q: string | null }

export function parseDeepLink(hash: string): DeepLink | null {
  const match = hash.match(/^#\/library(?:\/([a-z]+))?(?:\?(.*))?$/)
  if (!match) return null
  const sub = match[1]
  if (sub && sub !== 'search') return null
  const params = new URLSearchParams(match[2] ?? '')
  const catRaw = params.get('cat')
  const id = params.get('id')
  const q = params.get('q')
  return {
    cat: catRaw && isCategory(catRaw) ? catRaw : null,
    id: id || null,
    q: q || null,
  }
}

export function buildDeepLink(cat: CategoryId | null, id?: string | null, q?: string | null): string {
  const params = new URLSearchParams()
  if (cat) params.set('cat', cat)
  if (id) params.set('id', id)
  if (q) params.set('q', q)
  const query = params.toString()
  return `#/library/search${query ? `?${query}` : ''}`
}
