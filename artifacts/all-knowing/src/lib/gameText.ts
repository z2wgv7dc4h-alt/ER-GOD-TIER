/**
 * Full game-text corpus (Task: "everything" data pass).
 *
 * The `scripts/extract-game-text.py` dump of every English FMG table from the
 * local install, base + DLC, lives under `public/sourced/open/text/` — one JSON
 * file per table plus a manifest. This module lazy-loads a table by name and
 * caches it, so only the tables a view actually needs are fetched.
 *
 * `TalkMsg` is the verbatim NPC dialogue (9,818 lines); `EventTextForTalk` and
 * `GR_Dialogues` are the talk-condition / menu-dialogue tables. Item lore lives
 * in the `*Caption` / `*Info` tables (WeaponCaption, GoodsInfo, …), names in
 * the `*Name` tables. Nothing here is authored or paraphrased — it is the
 * game's own text, exactly as names.json already ships item strings.
 */
export type GameTextManifest = {
  locale: string
  tableCount: number
  stringCount: number
  tables: { table: string; count: number; sources: string[] }[]
}

const BASE = '/sourced/open/text'

let manifestCache: GameTextManifest | null = null
const tableCache = new Map<string, Record<string, string>>()

export async function loadGameTextManifest(): Promise<GameTextManifest> {
  if (manifestCache) return manifestCache
  const r = await fetch(`${BASE}/manifest.json`)
  if (!r.ok) throw new Error(`game text manifest ${r.status}`)
  manifestCache = (await r.json()) as GameTextManifest
  return manifestCache
}

export async function loadGameTextTable(table: string): Promise<Record<string, string>> {
  const hit = tableCache.get(table)
  if (hit) return hit
  const r = await fetch(`${BASE}/${table}.json`)
  if (!r.ok) throw new Error(`game text table ${table}: ${r.status}`)
  const rows = (await r.json()) as Record<string, string>
  tableCache.set(table, rows)
  return rows
}

/** Spoken/queued dialogue tables, in display order. */
export const DIALOGUE_TABLES = ['TalkMsg', 'EventTextForTalk', 'GR_Dialogues'] as const

export type TextHit = { table: string; id: string; text: string }

/**
 * Substring search across already-loaded tables. Pure, so it is unit-tested
 * without fetch. Case-insensitive; caps results so a two-letter query cannot
 * dump the whole corpus.
 */
export function searchGameText(
  tables: Record<string, Record<string, string>>,
  query: string,
  limit = 50,
): TextHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  const out: TextHit[] = []
  for (const [table, rows] of Object.entries(tables)) {
    for (const [id, text] of Object.entries(rows)) {
      if (text.toLowerCase().includes(q)) {
        out.push({ table, id, text })
        if (out.length >= limit) return out
      }
    }
  }
  return out
}
