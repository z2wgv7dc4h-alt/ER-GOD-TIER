/**
 * Save-id reference (`scripts/scrape-save-editor.mjs`): the Elden Ring Save
 * Editor's name↔hex-ID tables, so inventory/flag ids can be mapped by name.
 */
export type SaveIds = {
  source: string
  ids: Record<string, Record<string, string>>
  raw: Record<string, unknown>
}

let cache: SaveIds | null = null

export async function loadSaveIds(): Promise<SaveIds> {
  if (cache) return cache
  const r = await fetch('/sourced/open/save-ids.json')
  if (!r.ok) throw new Error('save ids ' + r.status)
  cache = (await r.json()) as SaveIds
  return cache
}

/** The hex inventory id for a named item in a category (weapons/armor/…), or undefined. */
export function hexFor(doc: SaveIds, category: string, name: string): string | undefined {
  return doc.ids[category]?.[name]
}
