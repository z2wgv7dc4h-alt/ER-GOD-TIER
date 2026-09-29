import { facts } from '../knowledge/catalog'
import { inferChains } from '../knowledge/inferChains'
import { gates } from '../knowledge/gates'
import { allLines } from '../knowledge/storylines'
import { remembrances } from '../knowledge/remembrances'
import { mechanics } from '../knowledge/mechanics'
import { loot } from '../knowledge/loot'
import { dungeonBosses, dungeons as dungeonIndex } from './dungeons'
import { resolveEntityId, allEntities, edges, type AnyEdgeRel, type EntityKind } from './entityGraph'
import { autolink } from './glossary'

/**
 * Task 138 §3 — the links audit surface.
 *
 * `dataIdRefs()` collects every id the data points at, `deadLinks()` resolves them
 * against the entity graph, `edgeCoverage()` measures the per-kind traversal the
 * Usage Model promises, and `linkableMentions()` counts names in prose that
 * `glossary.autolink` would turn into links (i.e. the links a renderer still owes).
 * `scripts/links-audit.mjs` renders the doc; the tests guard dead links and the
 * coverage minimums.
 */

export type IdRef = { id: string; source: string }

/** Facts that are link targets, not raw capture literals. */
const LINKABLE_PREFIXES = new Set([
  'boss', 'grace', 'item', 'quest', 'region', 'weapon', 'shield', 'armor',
  'talisman', 'spell', 'ash', 'spirit', 'material', 'npc', 'dungeon',
  'merchant', 'build', 'gate', 'ending', 'mechanic', 'line', 'invader',
  'hunt', 'point', 'bossflag', 'area', 'loot', 'damage',
])

function linkable(id: string): boolean {
  return LINKABLE_PREFIXES.has(id.split(':')[0])
}

export function dataIdRefs(): IdRef[] {
  const refs: IdRef[] = []
  const add = (id: string | undefined, source: string) => {
    if (id) refs.push({ id, source })
  }

  for (const f of facts) {
    add(f.id, 'catalog.row')
    for (const x of f.implies) add(x, 'catalog.implies')
    for (const x of f.drops ?? []) add(x, 'catalog.drops')
    for (const x of f.usedIn ?? []) add(x, 'catalog.usedIn')
  }
  for (const c of inferChains) {
    add(c.whenFact, 'chain.whenFact')
    for (const x of c.implies) add(x, 'chain.implies')
    for (const x of c.allOf ?? []) add(x, 'chain.allOf')
    for (const x of c.unless ?? []) add(x, 'chain.unless')
  }
  for (const g of gates) {
    add(g.id, 'gate.row')
    for (const x of g.triggerFacts) add(x, 'gate.trigger')
    for (const x of g.approachingWhen) add(x, 'gate.approaching')
    for (const l of g.locks) add(l.factId, 'gate.lock')
  }
  for (const line of allLines) {
    add(`line:${line.id}`, 'storyline.row')
    for (const step of line.steps) {
      add(step.factId, `storyline.${line.id}.factId`)
      for (const x of step.factIds ?? []) add(x, `storyline.${line.id}.factIds`)
      for (const x of step.grants ?? []) add(x, `storyline.${line.id}.grants`)
      for (const x of step.lockouts ?? []) add(x, `storyline.${line.id}.lockouts`)
      for (const x of step.requires ?? []) add(x, `storyline.${line.id}.requires`)
    }
  }
  for (const r of remembrances) {
    add(r.id, 'remembrance.row')
    add(r.bossFactId, 'remembrance.boss')
    for (const reward of r.rewards) add(reward.factId, 'remembrance.reward')
  }
  for (const m of mechanics) {
    add(m.id, 'mechanic.row')
    for (const x of m.related) add(x, 'mechanic.related')
  }
  for (const l of loot) add(l.id, 'loot.row')
  for (const b of dungeonBosses) add(b.id, 'dungeonBoss')
  for (const d of dungeonIndex) {
    add(`dungeon:${d.id}`, 'dungeon.row')
    for (const l of d.loot ?? []) add(l.id, 'dungeon.loot')
  }

  const seen = new Set<string>()
  return refs.filter((r) => {
    const key = `${r.source}|${r.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Data ids that name a link target but resolve to no entity record. */
export function deadLinks(): IdRef[] {
  const out: IdRef[] = []
  const seen = new Set<string>()
  for (const ref of dataIdRefs()) {
    if (!linkable(ref.id)) continue
    if (resolveEntityId(ref.id)) continue
    const key = `${ref.source}|${ref.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(ref)
  }
  return out
}

// ---------------------------------------------------------------------------
// Edge coverage
// ---------------------------------------------------------------------------

export type CoverageField =
  | 'drops'
  | 'location'
  | 'source'
  | 'quest'
  | 'region'
  | 'contents'
  | 'stock'
  | 'boss'
  | 'trades'

const hasRel = (id: string, rels: AnyEdgeRel[]) => edges(id).some((e) => rels.includes(e.rel))

type FieldDef = { field: CoverageField; rels: AnyEdgeRel[] }

const FIELD_DEFS: Partial<Record<EntityKind | 'remembrance', FieldDef[]>> = {
  boss: [
    { field: 'drops', rels: ['drops'] },
    { field: 'location', rels: ['foundIn'] },
  ],
  weapon: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  shield: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  armor: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  talisman: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  spell: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  ash: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  spirit: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  material: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  item: [{ field: 'source', rels: ['foundIn', 'soldBy', 'droppedBy'] }],
  npc: [
    { field: 'quest', rels: ['partOfQuest', 'containsBeat', 'nextBeat'] },
    { field: 'location', rels: ['foundIn'] },
  ],
  grace: [{ field: 'region', rels: ['foundIn'] }],
  region: [{ field: 'contents', rels: ['contains'] }],
  dungeon: [{ field: 'contents', rels: ['contains'] }],
  merchant: [{ field: 'stock', rels: ['sells'] }],
  quest: [{ field: 'location', rels: ['foundIn'] }],
}

export type FieldCoverage = { have: number; pct: number }
export type KindCoverage = {
  kind: string
  total: number
  fields: Record<string, FieldCoverage>
}

export function edgeCoverage(): KindCoverage[] {
  const buckets = new Map<string, { ids: Set<string>; have: Map<CoverageField, Set<string>> }>()
  const ensure = (kind: string) => {
    let b = buckets.get(kind)
    if (!b) {
      b = { ids: new Set(), have: new Map() }
      buckets.set(kind, b)
    }
    return b
  }
  const count = (kind: string, id: string, fields: { field: CoverageField; rels: AnyEdgeRel[] }[]) => {
    const b = ensure(kind)
    b.ids.add(id)
    for (const def of fields) {
      if (hasRel(id, def.rels)) {
        const set = b.have.get(def.field) ?? new Set<string>()
        set.add(id)
        b.have.set(def.field, set)
      }
    }
  }

  for (const entity of allEntities()) {
    const defs = FIELD_DEFS[entity.kind]
    if (!defs) continue
    count(entity.kind, entity.id, defs)
  }

  // Remembrances are `item` entities; measure them as their own kind.
  for (const r of remembrances) {
    count('remembrance', r.id, [
      { field: 'boss', rels: ['droppedBy'] },
      { field: 'trades', rels: ['tradedFor'] },
    ])
  }

  return [...buckets.entries()]
    .map(([kind, b]) => {
      const total = b.ids.size
      const fields: Record<string, FieldCoverage> = {}
      for (const [field, set] of b.have) {
        fields[field] = { have: set.size, pct: total ? Math.round((set.size / total) * 1000) / 10 : 0 }
      }
      return { kind, total, fields }
    })
    .sort((a, b) => a.kind.localeCompare(b.kind))
}

export type CoverageGuard = { kind: string; field: CoverageField; label: string; min: number }

/**
 * Minimums at the level the data actually supports (Task 138). Every entry must
 * be met by the committed data; they are a regression tripwire, not a wish list.
 */
export const GUARD_MINIMUMS: CoverageGuard[] = [
  { kind: 'grace', field: 'region', label: 'region', min: 90 },
  { kind: 'boss', field: 'location', label: 'location', min: 90 },
  // Unmatched drop names are the rest, never invented. Lowered 85 -> 80 when bosses
  // fought in several places became one record per encounter: 23 encounters have
  // no per-location drop in any source (Bell Bearing Hunter, Putrid Avatar,
  // Ghostflame Dragon…), and the pooled all-copies list they used to show was wrong.
  { kind: 'boss', field: 'drops', label: 'drops', min: 80 },
  { kind: 'remembrance', field: 'boss', label: 'boss', min: 90 },
  { kind: 'remembrance', field: 'trades', label: 'Enia trades', min: 90 },
  // Many of the 312 region records are sub-areas with no tracked entity inside.
  { kind: 'region', field: 'contents', label: 'contents', min: 30 },
  { kind: 'material', field: 'source', label: 'source', min: 90 },
  { kind: 'talisman', field: 'source', label: 'source', min: 90 },
  // 96% of weapons carry location text; only the ones naming a tracked place match.
  { kind: 'weapon', field: 'source', label: 'source', min: 85 },
  { kind: 'spell', field: 'source', label: 'source', min: 90 },
  // 70% of NPC records carry a location and only some name a tracked region/grace.
  { kind: 'npc', field: 'location', label: 'location', min: 65 },
]

export function coverageViolations(report: KindCoverage[], guards = GUARD_MINIMUMS): string[] {
  const out: string[] = []
  for (const guard of guards) {
    const kind = report.find((k) => k.kind === guard.kind)
    if (!kind || kind.total === 0) continue
    const value = kind.fields[guard.field]
    const pct = value ? value.pct : 0
    if (pct < guard.min) out.push(`${guard.kind}.${guard.label}: ${pct}% < ${guard.min}%`)
  }
  return out
}

// ---------------------------------------------------------------------------
// Unlinked mentions
// ---------------------------------------------------------------------------

/** Entity/mechanic names in `text` that `autolink` would turn into links. */
export function linkableMentions(text: string): number {
  if (!text) return 0
  return autolink(text).filter((s) => s.id).length
}

/** Authored mechanics card bodies, as prose surfaces to measure. */
export function mechanicsBodies(limit = 400): string[] {
  return mechanics.slice(0, limit).map((m) => m.body)
}

/** Authored storyline step text (`do` + `detail`), as rendered in Journey › Quests. */
export function storylineStepTexts(): string[] {
  const out: string[] = []
  for (const line of allLines) {
    for (const step of line.steps) out.push(`${step.do}. ${step.detail ?? ''}`)
  }
  return out
}

export type Surface = { name: string; samples: string[]; linked: boolean }

export type UnlinkedReport = { name: string; samples: number; linkable: number; unlinked: number }

/** Count the linkable mentions per surface (one sample per text block). */
export function unlinkedMentions(surfaces: Surface[]): UnlinkedReport[] {
  return surfaces.map((s) => {
    const linkable = s.samples.reduce((n, text) => n + linkableMentions(text), 0)
    return { name: s.name, samples: s.samples.length, linkable, unlinked: s.linked ? 0 : linkable }
  })
}
