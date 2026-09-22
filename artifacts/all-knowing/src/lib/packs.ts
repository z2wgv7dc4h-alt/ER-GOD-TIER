/**
 * ER Checklist pack (`scripts/ingest-packs.py`) — item ids/names (1.16 base +
 * SotE), broader than the base-game FanAPI lists for some categories.
 *
 * The map-marker side of the old "EldenRingMap" pack was removed: it is the same
 * project as the vendored engine, which already carries those markers in full,
 * so the app reads the engine's own data (`src/lib/engineMarkers.ts`) instead.
 */
export type ErclItem = { category: string; name: string; id?: string }
export type Ercl = {
  source: string
  version?: string
  categories: Record<string, { display_name: string; items: { id?: string; name: string }[] }>
}

let cache: Ercl | null = null

export async function loadErcl(): Promise<Ercl> {
  if (cache) return cache
  const r = await fetch('/sourced/open/ercl-items.json')
  if (!r.ok) throw new Error(`ercl items ${r.status}`)
  cache = (await r.json()) as Ercl
  return cache
}

export function erclItems(doc: Ercl): ErclItem[] {
  const out: ErclItem[] = []
  for (const [key, cat] of Object.entries(doc.categories)) {
    const label = cat.display_name || key
    for (const it of cat.items) out.push({ category: label, name: it.name, id: it.id })
  }
  return out
}

export function matchErcl(query: string, rows: ErclItem[], limit = 15): ErclItem[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows.filter((r) => r.name.toLowerCase().includes(q)).slice(0, limit)
}
