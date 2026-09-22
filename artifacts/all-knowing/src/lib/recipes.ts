/**
 * Crafting recipes, ripped from the elden-ring-mcp wiki-snapshot DB
 * (`scripts/export-mcp-db.py`): each craftable item and the materials it needs.
 */
export type Recipe = { id: string; name: string; materials: { name: string; qty: number }[]; url: string }
export type RecipesDoc = { source: string; recipes: Recipe[] }

let cache: RecipesDoc | null = null

export async function loadRecipes(): Promise<RecipesDoc> {
  if (cache) return cache
  const r = await fetch('/sourced/open/recipes.json')
  if (!r.ok) throw new Error('recipes ' + r.status)
  cache = (await r.json()) as RecipesDoc
  return cache
}

export function matchRecipes(query: string, rows: Recipe[], limit = 6): Recipe[] {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return []
  return rows.filter((r) => r.name.toLowerCase().includes(q)).slice(0, limit)
}
