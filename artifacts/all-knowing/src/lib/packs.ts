/**
 * Data from the user's local Nexus packs, ingested by `scripts/ingest-packs.py`.
 *
 * - `open/eldenringmap.json` — EldenRingMap V1.2 marker positions in the engine
 *   mosaic frame (`px / 10496 * 100`), the same frame `graces.ts` pins already
 *   use: graces, dungeons, merchants, night bosses and collectibles.
 * - `open/ercl-items.json` — ER Checklist item ids/names (1.16, base + SotE),
 *   which are broader than the base-game FanAPI lists for some categories.
 *
 * Both are third-party packs; each row keeps its pack source. Pure matchers are
 * separated from the fetch so they are unit-tested without the network.
 */
export type ErmLocation = { name: string; region: string; world: string; kind: string }
export type ErclItem = { category: string; name: string; id?: string }

type ErmRow = { name: string; region: string; world: string; x: number; y: number }
export type EldenringMap = {
  source: string
  frame: string
  graces: ErmRow[]
  dungeons: ErmRow[]
  merchants: ErmRow[]
  nightBosses: { category: string; x: number; y: number; id?: number }[]
  collectibles: Record<string, { id: string; name: string; world: string; x: number; y: number; note?: string }[]>
}
export type Ercl = {
  source: string
  version?: string
  categories: Record<string, { display_name: string; items: { id?: string; name: string }[] }>
}

let ermCache: EldenringMap | null = null
let erclCache: Ercl | null = null

export async function loadEldenringMap(): Promise<EldenringMap> {
  if (ermCache) return ermCache
  const r = await fetch('/sourced/open/eldenringmap.json')
  if (!r.ok) throw new Error(`eldenringmap ${r.status}`)
  ermCache = (await r.json()) as EldenringMap
  return ermCache
}

export async function loadErcl(): Promise<Ercl> {
  if (erclCache) return erclCache
  const r = await fetch('/sourced/open/ercl-items.json')
  if (!r.ok) throw new Error(`ercl items ${r.status}`)
  erclCache = (await r.json()) as Ercl
  return erclCache
}

export function ermLocations(doc: EldenringMap): ErmLocation[] {
  const out: ErmLocation[] = []
  for (const kind of ['graces', 'dungeons', 'merchants'] as const) {
    for (const r of doc[kind]) out.push({ name: r.name, region: r.region, world: r.world, kind })
  }
  return out
}

export function matchErm(query: string, rows: ErmLocation[], limit = 15): ErmLocation[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows.filter((r) => `${r.name} ${r.region}`.toLowerCase().includes(q)).slice(0, limit)
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
