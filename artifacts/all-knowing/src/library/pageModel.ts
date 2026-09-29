import { areaFromFactId } from '../lib/areaContext'
import { displayName } from '../lib/canonicalNames'
import { getEntity, type EntityKind, type EntityState } from '../lib/entityGraph'
import { getRecord, type EntityRecord } from '../lib/entityIndex'
import { knownFactIds } from '../lib/infer'
import type { Character } from '../types'
import type { CategoryId, LibraryEntity } from './model'

/**
 * The entity page's player-facing model: the name, region, lore, status line
 * and owned-action label the panel shows. It lives here, not inside the React
 * components, so the page audit (`src/lib/pageAudit.ts`) checks exactly what a
 * player sees instead of a re-implementation of it.
 */

export const NO_DATA = 'No data for this entity yet.'

const CATEGORY_BY_KIND: Record<EntityKind, CategoryId> = {
  weapon: 'weapons',
  shield: 'shields',
  armor: 'armor',
  talisman: 'talismans',
  spell: 'sorceries',
  ash: 'ashes',
  spirit: 'spirits',
  item: 'items',
  material: 'items',
  boss: 'bosses',
  enemy: 'bosses',
  npc: 'npcs',
  grace: 'locations',
  region: 'locations',
  dungeon: 'locations',
  quest: 'guides',
  gate: 'guides',
  ending: 'guides',
  build: 'guides',
  merchant: 'npcs',
  mechanic: 'mechanics',
}

/** The overlay's entity for any id: readable name, its region and real lore only. */
export function overlayEntity(entityId: string, wikiTitle?: string | null): LibraryEntity {
  const e = getEntity(entityId)
  const area = areaFromFactId(entityId)
  const record = getRecord(e.id)
  const region = e.kind === 'region' ? undefined : area?.region ?? record?.region
  return {
    id: e.id,
    factId: e.id,
    name: wikiTitle ?? displayName(record?.name && !/[A-Z]/.test(e.name) ? record.name : e.name),
    category: CATEGORY_BY_KIND[e.kind],
    subtype: e.kind,
    icon: e.icon,
    region,
    lore: e.summary && e.summary !== NO_DATA && e.summary !== region ? e.summary : undefined,
  }
}

const QUEST_LIKE = new Set<EntityKind>(['quest', 'gate', 'ending'])
const REFERENCE = new Set<EntityKind>(['mechanic', 'build'])
const OWNABLE = new Set<EntityKind>(['item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material'])

/**
 * Task 144 §1 — the status line fits the kind. A region is not "Owned", a grace
 * is "Discovered", a boss is "Defeated / Not yet / Can't reach yet", an item
 * says where to get it, and an NPC shows the current quest step.
 */
export function kindStatus(
  kind: EntityKind,
  info: { state: EntityState; why: string },
  entity: LibraryEntity,
  record: EntityRecord | undefined,
  character: Character,
): { label: string; why: string } {
  const bossLike = kind === 'boss' || kind === 'enemy'
  const done = info.state === 'done' || info.state === 'owned'
  const blocked = info.state === 'locked' || info.state === 'missed' || info.state === 'ahead'
  const inRegion = entity.region ? `In ${entity.region}.` : record?.location ? `${record.location}.` : ''
  if (bossLike) {
    if (done) return { label: 'Defeated', why: info.why }
    if (blocked) return { label: "Can't reach yet", why: info.why }
    if (info.state === 'unknown') return { label: 'Unknown', why: info.why }
    return { label: 'Not yet', why: inRegion || 'Not defeated on this character.' }
  }
  if (kind === 'grace') {
    if (done) return { label: 'Discovered', why: inRegion || info.why }
    if (info.state === 'locked' || info.state === 'missed') return { label: 'Missed', why: info.why }
    return { label: 'Not yet', why: inRegion || 'Not discovered on this character.' }
  }
  if (kind === 'npc' || kind === 'merchant') {
    const known = knownFactIds(character)
    const steps = record?.questSteps ?? []
    const next = steps.find((s) => !(s.entityId && known.has(s.entityId)))
    if (next) return { label: `Quest step ${next.order}`, why: next.title }
    if (steps.length) return { label: 'Questline complete', why: steps[steps.length - 1]?.title ?? '' }
    return { label: record?.stats?.Role ?? (kind === 'merchant' ? 'Merchant' : 'NPC'), why: entity.where || record?.location || inRegion || 'No tracked quest steps.' }
  }
  if (kind === 'region' || kind === 'dungeon') {
    if (done) return { label: 'Visited', why: inRegion || info.why }
    // A grace, boss or item known inside the area proves it was visited.
    const area = entity.name.toLowerCase()
    const inside = area.length >= 4
      ? [...knownFactIds(character)].find((id) => {
          const at = areaFromFactId(id)
          return [at?.region, at?.place].some((n) => n && (n.toLowerCase().includes(area) || (n.length >= 4 && area.includes(n.toLowerCase()))))
        })
      : undefined
    if (inside) return { label: 'Visited', why: `Inferred — you reached ${getEntity(inside).name}.` }
    if (blocked) return { label: "Can't reach yet", why: info.why }
    return { label: 'Not visited yet', why: inRegion || 'Progress is counted below.' }
  }
  if (QUEST_LIKE.has(kind)) {
    if (done) return { label: 'Done', why: info.why }
    if (info.state === 'missed') return { label: 'Closed off', why: info.why }
    if (blocked) return { label: 'Not yet', why: info.why }
    return { label: 'Not done', why: inRegion || 'Not done on this character.' }
  }
  if (REFERENCE.has(kind)) return { label: kind === 'build' ? 'Build' : 'How it works', why: 'Reference — nothing to track.' }
  // item-shaped: weapons, armor, talismans, spells, ashes, spirits, items…
  if (done) return { label: 'Owned', why: info.why }
  if (blocked) return { label: info.state === 'missed' ? 'Missed' : 'Not yet', why: info.why }
  const where = entity.where || record?.location
  if (where) return { label: 'Where to get', why: where }
  return { label: info.state === 'unknown' ? 'Unknown' : 'Not owned', why: info.state === 'available' ? 'Not on this character yet.' : info.why }
}

/** The label of the page's track button for this kind, or null when the kind is not trackable. */
export function trackActionLabel(kind: EntityKind, on: boolean): string | null {
  if (kind === 'boss' || kind === 'enemy') return on ? 'Defeated ✓' : 'Mark defeated'
  if (QUEST_LIKE.has(kind)) return on ? 'Done ✓' : 'Mark done'
  if (OWNABLE.has(kind)) return on ? 'Mark not owned' : 'Mark owned'
  return null
}
