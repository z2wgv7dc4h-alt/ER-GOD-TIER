import { areaFromFactId } from '../lib/areaContext'
import { canonicalFactId } from '../lib/aliases'
import { displayName } from '../lib/canonicalNames'
import { getEntity, type EntityKind, type EntityState } from '../lib/entityGraph'
import { getRecord, type EntityRecord } from '../lib/entityIndex'
import { knownFactIds, resolvedFactIds } from '../lib/infer'
import { byId, encountersByGroup, regionFactFor } from '../knowledge/catalog'
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
 * Task 166 §20 — the canonical region fact a region/dungeon page belongs to.
 * Region labels are resolved through `regionFactFor` (the same map the boss
 * roster uses) so a fact tagged "Stormveil" or "Dragonbarrow" still counts as
 * Limgrave / Caelid. This replaces the old free-text substring guess, which
 * matched any fact whose *name* merely contained the area (e.g. a Tree Sentinel
 * encounter named "(Limgrave)" marked Limgrave visited even from Altus).
 */
function regionKeyForEntity(entity: LibraryEntity, record: EntityRecord | undefined): string | undefined {
  const fid = canonicalFactId(entity.factId)
  const fact = byId.get(fid)
  if (fact?.kind === 'region') return fid
  const region = entity.region ?? fact?.region ?? record?.region
  return region ? regionFactFor(region) : undefined
}

function regionKeyForFact(id: string): string | undefined {
  const fid = canonicalFactId(id)
  const fact = byId.get(fid)
  if (fact?.kind === 'region') return fid
  const region = fact?.region ?? areaFromFactId(fid)?.region
  return region ? regionFactFor(region) : undefined
}

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
  if (bossLike && encountersByGroup.has(entity.factId)) {
    // A boss fought in several places: progress is per encounter.
    const ids = encountersByGroup.get(entity.factId)!
    const known = resolvedFactIds(character)
    const beaten = ids.filter((id) => known.has(id)).length
    if (beaten === 0 && character.defeatedBosses.includes(entity.factId)) {
      return { label: 'Logged — which one?', why: `Logged before per-location tracking. Mark which of the ${ids.length} you beat below.` }
    }
    return {
      label: `${beaten} of ${ids.length} defeated`,
      why: beaten === ids.length ? 'Every location done.' : `Fought in ${ids.length} places — each is tracked on its own.`,
    }
  }
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
    // A grace, boss or item known in the same structured region proves it was
    // visited (Task 166 §20).
    const target = regionKeyForEntity(entity, record)
    const inside = target
      ? [...knownFactIds(character)].find((id) => regionKeyForFact(id) === target)
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

/**
 * The label of the page's track button for this kind, or null when the kind is
 * not trackable. A boss fought in several places is tracked per encounter, so
 * its shared page has no single "Mark defeated".
 */
export function trackActionLabel(kind: EntityKind, on: boolean, factId?: string): string | null {
  if (factId && encountersByGroup.has(factId)) return null
  if (kind === 'boss' || kind === 'enemy') return on ? 'Defeated ✓' : 'Mark defeated'
  if (QUEST_LIKE.has(kind)) return on ? 'Done ✓' : 'Mark done'
  if (OWNABLE.has(kind)) return on ? 'Mark not owned' : 'Mark owned'
  return null
}
