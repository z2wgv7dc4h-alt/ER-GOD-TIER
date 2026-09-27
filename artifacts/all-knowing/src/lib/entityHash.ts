/**
 * Task 97 — the entity-overlay hash.
 *
 * The workspace location stays `#/section/sub`; the universal entity panel adds
 * one query param, `?e=<factId>`. Keeping it a plain query means the existing
 * `hashToLocation` parser ignores it and the browser Back button closes the
 * panel by restoring the previous hash.
 */

const ENTITY_PARAM = 'e'

/** The entity id in `#/journey/map?e=boss%3Agodrick`, or null. */
export function parseEntityHash(hash: string): string | null {
  const q = hash.indexOf('?')
  if (q === -1) return null
  const value = new URLSearchParams(hash.slice(q + 1)).get(ENTITY_PARAM)
  return value || null
}

/** Add (or clear) the `?e=` param on a location hash. */
export function buildEntityHash(locationHash: string, factId: string | null): string {
  const base = locationHash.split('?')[0]
  if (!factId) return base
  return `${base}?${new URLSearchParams({ [ENTITY_PARAM]: factId }).toString()}`
}
