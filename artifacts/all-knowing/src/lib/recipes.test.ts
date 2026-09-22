import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchRecipes, type RecipesDoc } from './recipes'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/recipes.json', import.meta.url), 'utf8'),
) as RecipesDoc

describe('recipes (from MCP DB)', () => {
  it('has recipes with materials', () => {
    expect(doc.recipes.length).toBeGreaterThan(80)
    const fire = doc.recipes.find((r) => r.name === 'Fire Pot')
    expect(fire?.materials.some((m) => /Mushroom/i.test(m.name))).toBe(true)
  })

  it('matches by name', () => {
    expect(matchRecipes('fi', doc.recipes)).toEqual([])
    expect(matchRecipes('fire pot', doc.recipes).some((r) => r.name === 'Fire Pot')).toBe(true)
  })
})
