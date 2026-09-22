import type { OpBuild } from '../knowledge/builds'
import { byId, facts, type Fact } from '../knowledge/catalog'
import { loot, type Loot } from '../knowledge/loot'
import { generatedAliases } from './aliases'
import { lootPin } from './leftoverPins'
import type { CoordPin } from './coords'
import type { Character, MapMarker } from '../types'

/**
 * Build hunt (Task 64): given a character and an OP/PvP build, split the build's
 * `need[]` + kit slots into what the character already has and what is still
 * missing, and attach a plate pin to any missing piece that a **loot row** can
 * place.
 *
 * Resolution rules, in order (nothing is invented):
 *   1. the single display-slug table below (`rob` → `loot:rivers`);
 *   2. an exact loot-row id;
 *   3. an exact catalog fact id;
 *   4. an exact name in `loot.ts`, then in the catalog, then in the generated
 *      alias plane.
 * An id that resolves nowhere is returned in `unresolved` — listed, never
 * dropped. Kit ids resolve **by name too**, because the same display slug can be
 * different gear in different builds (`winged` is the base insignia in Rivers
 * and the Rotten one in the frost-bleed kit).
 *
 * Pins reuse the Task 33 leftover layer (`lootPin`) — no third pin system, no
 * invented coordinates. `buildHunt` is pure: it never marks a build's gear as
 * collected. Applying a kit's stats/loadout is the caller's job.
 */

/**
 * The one place a short display slug (or a dangling `need` id) is mapped to a
 * real fact. Only grounded rows: every value exists in `loot.ts`, the catalog,
 * or the alias plane. Everything else stays unresolved on purpose.
 */
export const BUILD_FACT_IDS: Record<string, string> = {
  // Kit display slugs → real rows.
  rob: 'loot:rivers',
  exult: 'loot:lord-blood-exul',
  alex: 'loot:shard-alexander',
  gransax: 'loot:bolt-gransax',
  leo: 'loot:leontiel-gs',
  idus: 'loot:idus-sword',
  millicent: 'item:millicent-prosthesis',
  moonveil: 'loot:moonveil',
  nc: 'loot:night-comet',
  'carian-slicer': 'loot:carian-slicer',
  icon: 'loot:radagon-icon',
  'radagon-icon': 'loot:radagon-icon',
  'godfrey-icon': 'loot:godfrey-icon',
  blasphemous: 'loot:blasphemous',
  bb: 'loot:blasphemous',
  fgms: 'loot:flame-grant',
  vow: 'loot:golden-vow',
  anvil: 'loot:anvil-hammer',
  crag: 'loot:cragblade',
  azur: 'loot:comet-azur',
  // `need[]` ids that name a real row under a different id (same item).
  'loot:dark-moon': 'loot:dark-moon-gs',
  'loot:millicent-prosthesis': 'item:millicent-prosthesis',
}

export type HuntPiece = {
  factId: string
  name: string
  /** Where the requirement came from. */
  source: 'kit' | 'need'
  /** Loadout kind (kit) or catalog fact kind (need). */
  kind?: string
  /** Existing plate position, or null when there is no grounded pin. */
  pin: MapMarker | null
}

export type HuntUnresolved = {
  id: string
  name?: string
  source: 'kit' | 'need'
}

export type BuildHunt = {
  buildId: string
  buildName: string
  have: HuntPiece[]
  /** Missing pieces, in the kit's Task 90 route order when it has one. */
  missing: HuntPiece[]
  pins: MapMarker[]
  /** The first missing piece that already has a plate pin — the Show target. */
  pinTarget: HuntPiece | null
  unresolved: HuntUnresolved[]
}

// Apostrophes/quotes are dropped, not spaced: "Lion's Claw" must normalize to
// "lions claw" so it matches an alias like `lions claw`.
const norm = (s: string) => s.toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9+]+/g, ' ').trim()

const lootById = new Map<string, Loot>(loot.map((l) => [l.id, l]))
const lootByNorm = new Map<string, Loot>()
for (const l of loot) {
  for (const key of [l.name, ...l.aliases]) {
    const n = norm(key)
    if (n && !lootByNorm.has(n)) lootByNorm.set(n, l)
  }
}

const factByNorm = new Map<string, Fact>()
for (const f of facts) {
  const n = norm(f.name)
  if (n && !factByNorm.has(n)) factByNorm.set(n, f)
}

const aliasByNorm = new Map<string, string>()
for (const a of generatedAliases) {
  const n = norm(a.fmgName)
  if (n && !aliasByNorm.has(n)) aliasByNorm.set(n, a.slug)
}

type Resolved = { factId: string; loot?: Loot; fact?: Fact }

/** Resolve one id (with an optional display name) to a real fact, or null. */
export function resolveBuildId(id: string, name?: string): Resolved | null {
  const key = id.toLowerCase()
  const canonical = BUILD_FACT_IDS[key] ?? id

  const l = lootById.get(canonical)
  if (l) return { factId: l.id, loot: l }
  const f = byId.get(canonical)
  if (f) return { factId: f.id, fact: f }

  if (name) {
    const n = norm(name)
    const byLootName = lootByNorm.get(n)
    if (byLootName) return { factId: byLootName.id, loot: byLootName }
    const byFactName = factByNorm.get(n)
    if (byFactName) return { factId: byFactName.id, fact: byFactName }
    const slug = aliasByNorm.get(n)
    if (slug) return { factId: slug, fact: byId.get(slug) }
  }

  const tail = canonical.split(':')[1]
  if (tail) {
    const slug = aliasByNorm.get(norm(tail))
    if (slug) return { factId: slug, fact: byId.get(slug) }
  }
  return null
}

/** Mirrors `leftovers.ts` `known()`: the four Character lists, no mutation. */
function known(c: Character, id: string) {
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

export function buildHunt(
  character: Character,
  build: OpBuild,
  coords: CoordPin[] = [],
): BuildHunt {
  const seen = new Set<string>()
  const have: HuntPiece[] = []
  const missing: HuntPiece[] = []
  const pins: MapMarker[] = []
  const unresolved: HuntUnresolved[] = []

  const tokens: { id: string; name?: string; source: 'kit' | 'need'; kind?: string }[] = [
    ...build.kit.map((slot) => ({ id: slot.id, name: slot.name, source: 'kit' as const, kind: slot.kind })),
    ...build.need.map((id) => ({ id, source: 'need' as const })),
  ]

  for (const token of tokens) {
    const res = resolveBuildId(token.id, token.name)
    if (!res) {
      if (!unresolved.some((u) => u.id === token.id)) {
        unresolved.push({ id: token.id, name: token.name, source: token.source })
      }
      continue
    }
    if (seen.has(res.factId)) continue
    seen.add(res.factId)

    const pin = res.loot ? lootPin(res.loot, coords) : null
    const piece: HuntPiece = {
      factId: res.factId,
      name: res.loot?.name ?? res.fact?.name ?? token.name ?? res.factId,
      source: token.source,
      kind: token.kind ?? res.fact?.kind,
      pin,
    }
    if (known(character, res.factId)) {
      have.push(piece)
    } else {
      missing.push(piece)
    }
  }

  // Task 90: a kit with an authored route orders its missing pieces along it,
  // and "Show on map" targets the first missing piece that actually has a pin.
  if (build.route?.length) {
    const rank = new Map(build.route.map((id, i) => [id, i]))
    missing.sort((a, b) => (rank.get(a.factId) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.factId) ?? Number.MAX_SAFE_INTEGER))
  }
  for (const m of missing) if (m.pin) pins.push(m.pin)
  const pinTarget = missing.find((m) => m.pin) ?? null

  return { buildId: build.id, buildName: build.name, have, missing, pins, pinTarget, unresolved }
}
