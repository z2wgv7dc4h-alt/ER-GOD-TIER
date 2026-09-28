/**
 * Task 134 §5 — Item Crafting page.
 *
 * The crafting list only shows recipes the player has unlocked, so each craftable
 * item maps back to the cookbook(s) that taught it. Reading the list (via icon
 * matching restricted to craftable items) therefore lets the app infer which
 * cookbooks the player owns — a real fact, from a screenshot, with a reason.
 */

export type RecipeMaterial = { name: string; qty: number }
export type Recipe = { id: string; name: string; materials: RecipeMaterial[] }

/** Cookbook materials named by a recipe, e.g. "Nomadic Warrior's Cookbook [13]". */
export function cookbooksForRecipe(recipe: Recipe): string[] {
  return recipe.materials.map((m) => m.name).filter((name) => /cookbook/i.test(name))
}

/** Every read recipe name → the cookbook(s) that unlock it. */
export function craftableCookbookIndex(recipes: Recipe[]): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const recipe of recipes) {
    const books = cookbooksForRecipe(recipe)
    if (books.length) index.set(recipe.name, books)
  }
  return index
}

/**
 * Given the craftable item names visible in a crafting screenshot, return the
 * cookbook facts they imply and the recipe each came from.
 */
export function inferCookbooks(recipes: Recipe[], craftedItems: string[]): { cookbook: string; via: string }[] {
  const wanted = new Set(craftedItems.map((s) => s.toLowerCase()))
  const out: { cookbook: string; via: string }[] = []
  const seen = new Set<string>()
  for (const recipe of recipes) {
    if (!wanted.has(recipe.name.toLowerCase())) continue
    for (const book of cookbooksForRecipe(recipe)) {
      const key = `${book}|${recipe.name}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ cookbook: book, via: recipe.name })
    }
  }
  return out
}
