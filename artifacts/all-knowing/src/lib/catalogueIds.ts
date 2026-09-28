import { facts } from '../knowledge/catalog'
import { normalizeName } from './fanImage'
import { canonicalEntityId, getEntity } from './entityGraph'

/**
 * Task 123 §2 — the one catalogue id authority.
 *
 * Both the Library builder (`library/catalog.ts`) and the build-time entity
 * index (`lib/entityIndexBuild.ts`) must name a catalogue row the same way, or
 * the peek card, the entity page and the enrichment record drift apart. This
 * module is the shared, pure rule: an authored catalog fact wins by name/alias,
 * otherwise the graph's canonical `prefix:slug` id.
 */

const factIdByName = new Map<string, string>()
for (const fact of facts) {
  const key = normalizeName(fact.name)
  if (key && !factIdByName.has(key)) factIdByName.set(key, fact.id)
  for (const alias of fact.aliases) {
    const aliasKey = normalizeName(alias)
    if (aliasKey && !factIdByName.has(aliasKey)) factIdByName.set(aliasKey, fact.id)
  }
}

function slug(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Kinds a catalogue prefix may legitimately resolve to by name. */
const ALLOWED_KINDS: Record<string, Set<string>> = {
  item: new Set(['item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material']),
  boss: new Set(['boss', 'enemy']),
  npc: new Set(['npc', 'merchant']),
  region: new Set(['region']),
}

/**
 * Canonical id for a catalogue row, shared by the Library and the index.
 *
 * A graph name hit only wins when it is the same *kind* of thing: the name
 * "Golden Seed" is an alias of the `mechanic:flask-charges` card, and the
 * Library's Golden Seed item must not be filed under it.
 */
export function catalogueIdFor(prefix: string, name: string): string {
  const known = factIdByName.get(normalizeName(name))
  if (known) return known
  const candidate = canonicalEntityId(`${prefix}:${slug(name)}`)
  const resolved = canonicalEntityId(candidate, name)
  if (resolved === candidate) return candidate
  const allowed = ALLOWED_KINDS[prefix]
  const kind = getEntity(resolved).kind
  return allowed && !allowed.has(kind) ? candidate : resolved
}
