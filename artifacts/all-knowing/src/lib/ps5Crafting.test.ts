import { describe, expect, it } from 'vitest'
import { cookbooksForRecipe, craftableCookbookIndex, inferCookbooks, type Recipe } from './ps5Crafting'

const recipes: Recipe[] = [
  { id: 'r1', name: 'Bone Ballista Bolt', materials: [{ name: "Nomadic Warrior's Cookbook [13]", qty: 1 }, { name: 'Hefty Beast Bone', qty: 1 }] },
  { id: 'r2', name: 'Bone Arrow', materials: [{ name: 'Thin Beast Bones', qty: 3 }] },
  { id: 'r3', name: 'Lightningbone Bolt', materials: [{ name: "Ancient Dragon Apostle's Cookbook [1]", qty: 1 }, { name: 'Thin Beast Bones', qty: 2 }] },
]

describe('crafting → cookbooks', () => {
  it('names the cookbook a recipe requires', () => {
    expect(cookbooksForRecipe(recipes[0])).toEqual(["Nomadic Warrior's Cookbook [13]"])
    expect(cookbooksForRecipe(recipes[1])).toEqual([])
  })

  it('infers owned cookbooks only from recipes on the list', () => {
    const inferred = inferCookbooks(recipes, ['Bone Ballista Bolt', 'Bone Arrow'])
    expect(inferred).toEqual([{ cookbook: "Nomadic Warrior's Cookbook [13]", via: 'Bone Ballista Bolt' }])
  })

  it('indexes only recipes that name a cookbook', () => {
    const index = craftableCookbookIndex(recipes)
    expect([...index.keys()].sort()).toEqual(['Bone Ballista Bolt', 'Lightningbone Bolt'])
  })
})
