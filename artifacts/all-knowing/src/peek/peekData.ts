import type { Character } from '../types'
import {
  canonicalEntityId,
  edgesByRel,
  getEntity,
  status,
  type EntityKind,
  type EntityState,
} from '../lib/entityGraph'
import type { Weapon } from '../lib/ar'
import { mechanicById, mechanicSummary } from '../knowledge/mechanics'
import { npcLocate } from '../knowledge/npcLocations'
import { storylines } from '../knowledge/storylines'
import { knownFactIds } from '../lib/infer'
import { attributeStats, weaponAr, type LibraryEntity } from '../library/model'

/**
 * Task 115 §1 — the data behind a peek card.
 *
 * A peek is the compact "what is this and does it matter to me" card shown when
 * a pointer rests on an entity name, a keyboard focus lands on it, or a phone
 * long-presses it. It is deliberately pure and synchronous: the entity graph
 * supplies kind, name, icon, status and edges, `mechanics.ts` supplies the
 * jargon, `npcLocations.ts` the NPC's current grace, and the Library catalogue
 * registers its richer numeric rows (AR, scaling, negation, effects) with
 * `registerPeekCatalog` once it has loaded.
 */

export type PeekFact = {
  /** Short left label, e.g. "Attack at my stats"; empty for a plain list line. */
  label: string
  value: string
  /** For requirement rows: whether the character currently meets it. */
  ok?: boolean
}

export type PeekStatus = {
  state: EntityState
  label: string
  why: string
}

export type PeekInfo = {
  id: string
  name: string
  kind: EntityKind
  kindLabel: string
  icon?: string
  /** One-line definition or provenance line. */
  summary?: string
  status: PeekStatus
  facts: PeekFact[]
}

export const STATUS_LABELS: Record<EntityState, string> = {
  done: 'Done',
  owned: 'Owned',
  available: 'Available',
  ahead: 'Ahead of you',
  locked: 'Locked',
  missed: 'Missed',
  unknown: 'Unknown',
}

const KIND_LABELS: Record<EntityKind, string> = {
  weapon: 'Weapon',
  shield: 'Shield',
  armor: 'Armor',
  talisman: 'Talisman',
  spell: 'Spell',
  ash: 'Ash of War',
  spirit: 'Spirit Ash',
  item: 'Item',
  material: 'Material',
  boss: 'Boss',
  enemy: 'Enemy',
  npc: 'NPC',
  grace: 'Site of Grace',
  region: 'Region',
  dungeon: 'Dungeon',
  quest: 'Quest',
  gate: 'Point of no return',
  ending: 'Ending',
  build: 'Build',
  merchant: 'Merchant',
  mechanic: 'Mechanic',
}

export function kindLabel(kind: EntityKind): string {
  return KIND_LABELS[kind] ?? kind
}

const ATTR_LABELS: Record<string, string> = {
  str: 'Str',
  dex: 'Dex',
  int: 'Int',
  fai: 'Fai',
  arc: 'Arc',
}

const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

/**
 * The richer row the Library catalogue contributes. Everything is optional so
 * the same shape carries a weapon, an armor piece or a talisman.
 */
export type PeekEntityRow = {
  factId: string
  name?: string
  /** Library category, when the row came from the catalogue. */
  category?: string
  subtype?: string
  weight?: number
  requirements?: Partial<Record<string, number>>
  scaling?: Partial<Record<string, string>>
  attack?: { label: string; value: number }[]
  stats?: { label: string; value: string }[]
  effect?: string
  /** The regulation row, so AR can be computed at the character's stats. */
  weapon?: Weapon
}

const registry = new Map<string, PeekEntityRow>()

/** Register one catalogue row against its canonical entity id. */
export function registerPeekRow(row: PeekEntityRow): void {
  const id = canonicalEntityId(row.factId)
  registry.set(id, { ...registry.get(id), ...row, factId: id })
}

/** Register a whole Library catalogue (weapons resolve their regulation row). */
export function registerPeekCatalog(catalog: {
  entities: LibraryEntity[]
  weaponByName: Map<string, Weapon>
}): void {
  for (const entity of catalog.entities) {
    const weapon = entity.weaponName
      ? catalog.weaponByName.get(norm(entity.weaponName))
      : undefined
    registerPeekRow({
      factId: entity.factId || entity.id,
      name: entity.name,
      category: entity.category,
      subtype: entity.subtype,
      weight: entity.weight,
      requirements: entity.requirements,
      scaling: entity.scaling as PeekEntityRow['scaling'],
      attack: entity.attack,
      stats: entity.stats,
      weapon,
    })
  }
}

/** Test seam: drop every registered row. */
export function clearPeekData(): void {
  registry.clear()
}

function fact(label: string, value: string, ok?: boolean): PeekFact {
  return { label, value, ok }
}

function joinValues(values: string[], limit = 2): string {
  const shown = values.filter(Boolean).slice(0, limit)
  return shown.join(' · ')
}

function requirementFacts(
  requirements: Partial<Record<string, number>> | undefined,
  character: Character | undefined,
): PeekFact[] {
  if (!requirements) return []
  const attrs = character ? attributeStats(character) : null
  const unmet: string[] = []
  const met: string[] = []
  for (const [key, value] of Object.entries(requirements) as [string, number][]) {
    if (!value) continue
    const label = `${ATTR_LABELS[key] ?? key.toUpperCase()} ${value}`
    if (attrs && attrs[key as keyof typeof attrs] < value) unmet.push(label)
    else met.push(label)
  }
  if (!met.length && !unmet.length) return []
  if (unmet.length) {
    return [fact('Requirements', `${unmet.join(' · ')} (not met)`, false)]
  }
  return [fact('Requirements', met.join(' · '), true)]
}

function scalingText(scaling: Partial<Record<string, string>> | undefined): string | undefined {
  if (!scaling) return undefined
  const parts = (Object.entries(scaling) as [string, string][])
    .filter(([key, letter]) => letter && ATTR_LABELS[key])
    .map(([key, letter]) => `${ATTR_LABELS[key]} ${letter}`)
  return parts.length ? parts.join(' · ') : undefined
}

function weaponFacts(row: PeekEntityRow | undefined, character: Character | undefined): PeekFact[] {
  if (!row) return []
  const facts: PeekFact[] = []
  if (row.weapon && character) {
    facts.push(fact('Attack at my stats', String(weaponAr(row.weapon, character))))
  } else if (row.attack?.length) {
    facts.push(fact('Base attack', joinValues(row.attack.map((a) => `${a.label} ${Math.round(a.value)}`), 2)))
  }
  const scaling = scalingText(row.scaling)
  if (scaling) facts.push(fact('Scaling', scaling))
  facts.push(...requirementFacts(row.requirements, character))
  if (row.weight !== undefined) facts.push(fact('Weight', String(row.weight)))
  return facts
}

function rowStat(row: PeekEntityRow | undefined, label: string): string | undefined {
  return row?.stats?.find((s) => s.label.toLowerCase() === label.toLowerCase())?.value
}

function bossFacts(id: string, row: PeekEntityRow | undefined): PeekFact[] {
  const facts: PeekFact[] = []
  const weak = edgesByRel(id, 'weakTo').map((e) => e.label)
  const resist = edgesByRel(id, 'resists').map((e) => e.label)
  if (weak.length) facts.push(fact('Weak to', joinValues(weak, 3)))
  if (resist.length) facts.push(fact('Resists', joinValues(resist, 3)))
  const hp = rowStat(row, 'HP')
  if (hp) facts.push(fact('HP', hp))
  const level = rowStat(row, 'Recommended level') ?? (row as { recommendedLevel?: string } | undefined)?.recommendedLevel
  if (level) facts.push(fact('Recommended level', level))
  else if (row?.stats?.length && !weak.length) {
    const misc = row.stats.find((s) => s.label !== 'Drops' && s.label !== 'Status resist')
    if (misc) facts.push(fact(misc.label, misc.value))
  }
  return facts
}

/** The NPC's next unfinished authored story beat, matched by name or alias. */
function questStepFact(id: string, character: Character | undefined): PeekFact | null {
  const key = id.replace(/^npc:/, '')
  const n = norm(key)
  const line = storylines.find(
    (l) => l.aliases.some((a) => norm(a) === n) || norm(l.id) === n || norm(l.name).includes(n),
  )
  if (!line || !line.steps.length) return null
  const known = character ? knownFactIds(character) : null
  const step = line.steps.find((s) => {
    if (!known) return true
    const ids = [s.factId, ...(s.factIds ?? [])].filter((f): f is string => Boolean(f))
    return !ids.some((f) => known.has(f))
  })
  if (!step) return fact('Quest step', `${line.name} — complete`)
  return fact('Quest step', step.do)
}

function npcFacts(id: string, character: Character | undefined, row: PeekEntityRow | undefined): PeekFact[] {
  const facts: PeekFact[] = []
  if (character) {
    const key = id.replace(/^npc:/, '')
    const hit = npcLocate(character, key)
    if (hit) facts.push(fact('Where now', hit.note ? `${hit.graceName} — ${hit.note}` : hit.graceName))
  }
  const quests = edgesByRel(id, 'partOfQuest').map((e) => e.label)
  if (quests.length) facts.push(fact('Quest', joinValues(quests, 2)))
  else {
    const step = questStepFact(id, character)
    if (step) facts.push(step)
  }
  const role = row?.subtype
  if (role && !role.toLowerCase().includes('npc')) facts.push(fact('Role', role))
  return facts
}

function graceFacts(info: { state: EntityState; why: string }, summary: string | undefined): PeekFact[] {
  const facts: PeekFact[] = []
  if (summary) facts.push(fact('Region', summary))
  facts.push(fact('Discovered', info.state === 'done' ? 'Yes' : 'Not yet', info.state === 'done'))
  return facts
}

function locationFacts(id: string): PeekFact[] {
  const facts: PeekFact[] = []
  const soldBy = edgesByRel(id, 'soldBy').map((e) => e.label)
  if (soldBy.length) facts.push(fact('Sold by', joinValues(soldBy, 3)))
  const found = edgesByRel(id, 'foundIn').map((e) => e.label)
  if (found.length) facts.push(fact('Found in', joinValues(found, 3)))
  const drops = edgesByRel(id, 'droppedBy').map((e) => e.label)
  if (drops.length) facts.push(fact('Dropped by', joinValues(drops, 3)))
  return facts
}

/** The catalogue category refines an entity the graph only calls `item`. */
function effectiveKind(kind: EntityKind, row: PeekEntityRow | undefined): EntityKind {
  switch (row?.category) {
    case 'weapons':
      return 'weapon'
    case 'shields':
      return 'shield'
    case 'armor':
      return 'armor'
    case 'talismans':
      return 'talisman'
    default:
      return kind
  }
}

/** The compact card content for any entity id. */
export function peekInfo(id: string, character?: Character): PeekInfo {
  const canonical = canonicalEntityId(id)
  const entity = getEntity(canonical)
  const row = registry.get(canonical)
  const kind = effectiveKind(entity.kind, row)
  const info: { state: EntityState; why: string } = character
    ? status(canonical, character)
    : { state: 'unknown', why: 'Load a character to see your status.' }

  let facts: PeekFact[] = []
  let summary: string | undefined = entity.summary

  if (kind === 'mechanic') {
    const card = mechanicById(canonical)
    if (card) {
      summary = mechanicSummary(canonical)
      facts = card.numbers.map((n) => fact('', n))
    }
  } else if (kind === 'boss' || kind === 'enemy') {
    facts = bossFacts(canonical, row)
  } else if (kind === 'npc' || kind === 'merchant') {
    facts = npcFacts(canonical, character, row)
  } else if (kind === 'grace') {
    facts = graceFacts(info, entity.summary)
    summary = undefined
  } else if (kind === 'weapon' || kind === 'shield') {
    facts = weaponFacts(row, character)
  } else if (kind === 'armor') {
    const poise = rowStat(row, 'Poise')
    const negation = rowStat(row, 'Negation')
    if (poise) facts.push(fact('Poise', poise))
    if (negation) facts.push(fact('Negation', negation))
    if (row?.weight !== undefined) facts.push(fact('Weight', String(row.weight)))
  } else if (kind === 'talisman') {
    const effect = row?.effect ?? rowStat(row, 'Effect')
    if (effect) facts.push(fact('Effect', effect))
  } else {
    facts = locationFacts(canonical)
  }

  if (!facts.length && entity.summary && entity.summary !== 'No data for this entity yet.') {
    facts = [fact('', entity.summary)]
  }

  return {
    id: canonical,
    name: entity.name,
    kind,
    kindLabel: kindLabel(kind),
    icon: entity.icon,
    summary: summary && summary !== 'No data for this entity yet.' ? summary : undefined,
    status: { state: info.state, label: STATUS_LABELS[info.state], why: info.why },
    facts: facts.slice(0, 6),
  }
}
