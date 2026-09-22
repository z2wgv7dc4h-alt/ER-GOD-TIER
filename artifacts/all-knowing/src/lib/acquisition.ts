/**
 * Item acquisition, ripped from the elden-ring-mcp wiki-snapshot DB
 * (`scripts/export-mcp-db.py`): how each item is obtained, where, the nearest
 * Site of Grace, prerequisites and whether it is missable. Source attribution
 * kept per doc.
 */
export type Acquisition = {
  id: string
  name: string
  method: string
  location: string
  near: string
  prereqs: string[]
  missable: boolean
  url: string
}
export type AcquisitionDoc = { source: string; rows: Acquisition[] }

let cache: AcquisitionDoc | null = null

export async function loadAcquisition(): Promise<AcquisitionDoc> {
  if (cache) return cache
  const r = await fetch('/sourced/open/acquisition.json')
  if (!r.ok) throw new Error('acquisition ' + r.status)
  cache = (await r.json()) as AcquisitionDoc
  return cache
}

export function matchAcquisition(query: string, rows: Acquisition[], limit = 6): Acquisition[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows.filter((r) => r.name.toLowerCase().includes(q)).slice(0, limit)
}
