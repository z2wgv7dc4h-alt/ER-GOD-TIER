/**
 * Secrets: illusory/hidden walls and what is behind them, ripped from the
 * elden-ring-mcp wiki-snapshot DB (`scripts/export-mcp-db.py`). Small and
 * high-signal; each entry names the area it belongs to.
 */
export type WallSecret = { id: string; area: string; heading: string; text: string; url: string }
export type SecretsDoc = { source: string; walls: WallSecret[] }

let cache: SecretsDoc | null = null

export async function loadSecrets(): Promise<SecretsDoc> {
  if (cache) return cache
  const r = await fetch('/sourced/open/secrets.json')
  if (!r.ok) throw new Error('secrets ' + r.status)
  cache = (await r.json()) as SecretsDoc
  return cache
}

export function matchSecrets(query: string, walls: WallSecret[], limit = 8): WallSecret[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return walls.filter((w) => `${w.area} ${w.heading} ${w.text}`.toLowerCase().includes(q)).slice(0, limit)
}
