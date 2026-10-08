import { allEntities, canonicalEntityId, hasEntity, type EntityKind } from './entityGraph'
import type { EntityRecord } from './entityIndex'

/**
 * Task 119 §1/§4 — coverage measurement over the entity graph.
 *
 * For every entity the graph knows, by kind, report the share that now carries a
 * description, acquisition/location text, map coords, an image, kind-appropriate
 * stats, boss drops, a strategy/wiki excerpt and related links. The guard test
 * (`entityCoverage.test.ts`) asserts the per-kind minimums from the task; the
 * `scripts/entity-coverage.mjs` script writes the same numbers into
 * `docs/ENTITY-COVERAGE.md` alongside the before snapshot.
 */

export type FieldCoverage = { count: number; total: number; pct: number }

export type KindCoverage = {
  kind: EntityKind
  total: number
  fields: Record<string, FieldCoverage>
}

export type CoverageReport = {
  kinds: KindCoverage[]
  overall: Record<string, FieldCoverage>
}

function field(count: number, total: number): FieldCoverage {
  return { count, total, pct: total ? Math.round((count / total) * 1000) / 10 : 100 }
}

function has(record: EntityRecord | undefined, key: string): boolean {
  const value = record?.[key as 'description']
  return typeof value === 'string' && value.length > 0
}

function stat(record: EntityRecord | undefined, label: string): boolean {
  const value = record?.stats?.[label]
  return typeof value === 'string' && value.length > 0
}

function drops(record: EntityRecord | undefined): boolean {
  return Boolean(record?.drops && record.drops.length)
}

/**
 * Task 123 §3 — the catalogue kinds. Their `full set` is the Library catalogue
 * (enumerated by `buildEntityIndex`), measured from the enrichment index, not
 * from every authored graph item. The remaining kinds (bosses, graces, quests,
 * …) are measured from the entity graph as before.
 */
/** True when the id only aliases another known fact. */
function isAliasOnly(id: string): boolean {
  const canonical = canonicalEntityId(id)
  return canonical !== id && hasEntity(canonical)
}

export const CATALOGUE_KINDS: EntityKind[] = ['weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'item']
const CATALOGUE_KIND_SET = new Set<EntityKind>(CATALOGUE_KINDS)

/**
 * The guard combos the task names, per kind. Task 124 §4 raises every one of
 * these to 100% — the gate that keeps the coverage work from regressing. Task 177
 * lowers the item-like location floors because a wiki-paragraph `location` is no
 * longer counted as coverage.
 */
export const GUARD_MINIMUMS: { kind: EntityKind; field: string; min: number; label: string }[] = [
  // Task 130 §2 raises the roster to every encounter; the boss guard is now the
  // task's own requirement — every boss has a location and a region. The richer
  // HP / negation / drops / strategy fields stay in the report as information.
  { kind: 'boss', field: 'locationRegion', min: 100, label: 'location + region (all bosses)' },
  // Task 177 — an acquisition `location` no longer stores a wiki paragraph or a
  // bare place type ("Site of Grace", "Location:"). A record whose only locator
  // was such a blob is now honestly empty, so the item-like floors sit just under
  // the measured coverage instead of a 100% that counted the prose.
  { kind: 'weapon', field: 'requirementsScalingLocation', min: 98, label: 'requirements + scaling + location (all weapons)' },
  { kind: 'shield', field: 'requirementsScalingLocation', min: 95, label: 'requirements + scaling + location (all shields)' },
  { kind: 'armor', field: 'negationWeightLocation', min: 97, label: 'negation + weight + location (all armor)' },
  { kind: 'armor', field: 'descriptionLocation', min: 97, label: 'description + location' },
  { kind: 'talisman', field: 'descriptionLocation', min: 97, label: 'description + location' },
  { kind: 'spell', field: 'descriptionLocation', min: 93, label: 'description + location' },
  { kind: 'ash', field: 'descriptionLocation', min: 97, label: 'description + location' },
  { kind: 'spirit', field: 'descriptionLocation', min: 98, label: 'description + location' },
  { kind: 'item', field: 'descriptionLocation', min: 99, label: 'description + location (all items)' },
  { kind: 'grace', field: 'map', min: 100, label: 'coords' },
  // Task 132 §5 — the kinds the wiki DB added (NPC characters, locations,
  // enemies) must carry a description and a location for ≥95% of the primary
  // records. The FMG name plane (names.json npcs/places) is a reference plane
  // marked `catalogue: false` and excluded from the denominator, the same way
  // the search-only magic.json spells already are.
  { kind: 'npc', field: 'description', min: 95, label: 'description (characters)' },
  { kind: 'region', field: 'descriptionLocation', min: 95, label: 'description + location (locations)' },
  // Task 151 §1 — the generated "X is a hostile creature encountered in …" line
  // is gone. The un-notable creatures the wiki has no prose for (Goat, Catapult,
  // Watling Stars…) now carry no description rather than an invented one, so the
  // enemy bar is the honest "most named foes are described" floor, not 95%.
  // Task 176 lowers it further: the cross-page descriptions that leaked another
  // page's prose onto a same-named enemy (a spell, a place, an item) are gone,
  // and an enemy the wiki has no page of its own for stays empty.
  { kind: 'enemy', field: 'descriptionLocation', min: 85, label: 'description + location (enemies)' },
]

function fieldsFor(kind: EntityKind, records: (EntityRecord | undefined)[]): Record<string, FieldCoverage> {
  const total = records.length
  const count = (test: (record: EntityRecord | undefined) => boolean) => records.filter(test).length
  const out: Record<string, FieldCoverage> = {
    description: field(count((r) => has(r, 'description')), total),
    location: field(count((r) => has(r, 'location')), total),
    region: field(count((r) => has(r, 'region')), total),
    map: field(count((r) => Boolean(r?.map)), total),
    image: field(count((r) => has(r, 'image')), total),
    stats: field(count((r) => Boolean(r?.stats && Object.keys(r.stats).length)), total),
    related: field(count((r) => Boolean(r?.related && r.related.length)), total),
  }
  switch (kind) {
    case 'boss':
    case 'enemy':
      out.hp = field(count((r) => stat(r, 'HP')), total)
      out.negation = field(count((r) => stat(r, 'Negation')), total)
      out.drops = field(count(drops), total)
      out.strategy = field(count((r) => has(r, 'strategy')), total)
      out.hpNegationLocation = field(count((r) => stat(r, 'HP') && stat(r, 'Negation') && has(r, 'location')), total)
      out.locationRegion = field(count((r) => has(r, 'location') && has(r, 'region')), total)
      break
    case 'weapon':
    case 'shield':
      out.requirements = field(count((r) => stat(r, 'Requirements')), total)
      out.scaling = field(count((r) => stat(r, 'Scaling')), total)
      out.baseDamage = field(count((r) => stat(r, 'Base damage')), total)
      out.weight = field(count((r) => stat(r, 'Weight')), total)
      out.requirementsScalingLocation = field(
        count((r) => stat(r, 'Requirements') && stat(r, 'Scaling') && has(r, 'location')),
        total,
      )
      break
    case 'armor':
      out.negations = field(count((r) => stat(r, 'Negation')), total)
      out.poise = field(count((r) => stat(r, 'Poise')), total)
      out.weight = field(count((r) => stat(r, 'Weight')), total)
      out.negationWeightLocation = field(
        count((r) => stat(r, 'Negation') && stat(r, 'Weight') && has(r, 'location')),
        total,
      )
      break
    case 'talisman':
      out.effect = field(count((r) => stat(r, 'Effect')), total)
      break
    default:
      break
  }
  if (['armor', 'talisman', 'spell', 'ash', 'spirit', 'item', 'material', 'npc', 'region', 'enemy'].includes(kind)) {
    out.descriptionLocation = field(count((r) => has(r, 'description') && has(r, 'location')), total)
  }
  return out
}

export function computeEntityCoverage(
  records: Record<string, EntityRecord> | Map<string, EntityRecord>,
): CoverageReport {
  const lookup = records instanceof Map ? records : new Map(Object.entries(records))
  const byKind = new Map<EntityKind, (EntityRecord | undefined)[]>()
  const seen = new Set<string>()

  // Task 122 §C / Task 123 §3: measure the *full* set. Catalogue kinds are the
  // Library catalogue records in the index; the rest walk the entity graph, with
  // any extra enrichment record the graph does not know (e.g. armor) appended.
  for (const entity of allEntities()) {
    if (CATALOGUE_KIND_SET.has(entity.kind)) continue
    // An alias id (a hunt id the roster files under an encounter) is not a page of its own.
    if (isAliasOnly(entity.id)) continue
    seen.add(entity.id)
    const list = byKind.get(entity.kind) ?? []
    list.push(lookup.get(entity.id))
    byKind.set(entity.kind, list)
  }
  for (const [id, record] of lookup) {
    if (seen.has(id)) continue
    const kind = record.kind as EntityKind
    // Catalogue kinds measure catalogue rows only. Other kinds (npc, region,
    // enemy) measure every real record, but the FMG name-plane reference rows
    // (`catalogue: false`) exist for search/peek only and are excluded, as the
    // search-only magic.json spells already are.
    if (CATALOGUE_KIND_SET.has(kind) ? !record.catalogue : record.catalogue === false) continue
    seen.add(id)
    const list = byKind.get(kind) ?? []
    list.push(record)
    byKind.set(kind, list)
  }

  const kinds: KindCoverage[] = [...byKind.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([kind, list]) => ({ kind, total: list.length, fields: fieldsFor(kind, list) }))

  const total = seen.size
  const all = [...lookup.values()]
  const withRecord = all.filter(Boolean)
  const overall: Record<string, FieldCoverage> = {}
  overall.records = field(withRecord.length, total)
  overall.description = field(withRecord.filter((r) => has(r, 'description')).length, total)
  overall.location = field(withRecord.filter((r) => has(r, 'location')).length, total)
  return { kinds, overall }
}

/** Does one record satisfy a named guard combo? Mirrors `fieldsFor`. */
function satisfies(field: string, record: EntityRecord | undefined): boolean {
  switch (field) {
    case 'hpNegationLocation':
      return stat(record, 'HP') && stat(record, 'Negation') && has(record, 'location')
    case 'locationRegion':
      return has(record, 'location') && has(record, 'region')
    case 'drops':
      return drops(record)
    case 'strategy':
      return has(record, 'strategy')
    case 'requirementsScalingLocation':
      return stat(record, 'Requirements') && stat(record, 'Scaling') && has(record, 'location')
    case 'negationWeightLocation':
      return stat(record, 'Negation') && stat(record, 'Weight') && has(record, 'location')
    case 'descriptionLocation':
      return has(record, 'description') && has(record, 'location')
    case 'map':
      return Boolean(record?.map)
    default:
      return false
  }
}

/**
 * Task 123 §3 — the entities that miss each guard, by name, for the doc's
 * "remaining misses" list. Uses the same grouping as `computeEntityCoverage`.
 */
export function guardMisses(
  records: Record<string, EntityRecord> | Map<string, EntityRecord>,
  guards = GUARD_MINIMUMS,
): { kind: EntityKind; label: string; field: string; missing: string[]; total: number }[] {
  const lookup = records instanceof Map ? records : new Map(Object.entries(records))
  const byKind = new Map<EntityKind, (EntityRecord | undefined)[]>()
  const seen = new Set<string>()
  for (const entity of allEntities()) {
    if (CATALOGUE_KIND_SET.has(entity.kind)) continue
    // An alias id (a hunt id the roster files under an encounter) is not a page of its own.
    if (isAliasOnly(entity.id)) continue
    seen.add(entity.id)
    byKind.set(entity.kind, [...(byKind.get(entity.kind) ?? []), lookup.get(entity.id)])
  }
  for (const [id, record] of lookup) {
    if (seen.has(id)) continue
    const kind = record.kind as EntityKind
    if (CATALOGUE_KIND_SET.has(kind) ? !record.catalogue : record.catalogue === false) continue
    seen.add(id)
    byKind.set(kind, [...(byKind.get(kind) ?? []), record])
  }
  const out: { kind: EntityKind; label: string; field: string; missing: string[]; total: number }[] = []
  for (const guard of guards) {
    const list = byKind.get(guard.kind)
    if (!list?.length) continue
    const missing = list
      .filter((record) => !satisfies(guard.field, record))
      .map((record) => record?.name ?? '(unresolved)')
    out.push({ kind: guard.kind, label: guard.label, field: guard.field, missing, total: list.length })
  }
  return out
}

/** True when a report satisfies every task minimum. */
export function violations(report: CoverageReport): string[] {
  const out: string[] = []
  for (const guard of GUARD_MINIMUMS) {
    const kind = report.kinds.find((k) => k.kind === guard.kind)
    if (!kind || kind.total === 0) continue
    const value = kind.fields[guard.field]
    if (!value) continue
    if (value.pct < guard.min) {
      out.push(`${guard.kind} ${guard.label}: ${value.pct}% < ${guard.min}%`)
    }
  }
  return out
}
