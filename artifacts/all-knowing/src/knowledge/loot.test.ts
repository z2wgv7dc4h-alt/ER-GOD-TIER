import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loot } from './loot'
import { warpGraces } from './graces'
import { facts } from './catalog'
import { generatedAliases } from '../lib/aliases'
import { opBuilds } from './builds'
import { pvpBuilds } from './pvp'
import { buildHunt, resolveBuildId } from '../lib/buildHunt'
import { emptyCharacter } from '../data/seed'

/**
 * Task 70 fixes to the loot table's two dangling rows, plus the ground truth for
 * every added English name: it must exist in the param dump, not be invented.
 */
const namesPath = fileURLToPath(new URL('../../public/sourced/open/names.json', import.meta.url))
const names = JSON.parse(readFileSync(namesPath, 'utf8')) as { name: string }[]
const nameSet = new Set(names.map((n) => n.name))

/** Every real grace slug: authored graces, catalog graces, and the alias plane. */
const graceSlugs = new Set([
  ...warpGraces.map((g) => g.id),
  ...facts.filter((f) => f.kind === 'grace').map((f) => f.id),
  ...generatedAliases.filter((a) => a.kind === 'grace').map((a) => a.slug),
])

const allBuilds = [...opBuilds, ...pvpBuilds]

describe('loot table grounding (Task 70)', () => {
  it('Golden Vow carries no typo grace slug', () => {
    const vow = loot.find((l) => l.id === 'loot:golden-vow')
    expect(vow, 'Golden Vow row').toBeTruthy()
    expect(vow!.name).toBe('Golden Vow')
    expect(vow!.grace ?? '').not.toMatch(/ergtree/i)
  })

  it('every loot grace slug already exists in graces / catalog / aliases', () => {
    for (const row of loot) {
      if (!row.grace) continue
      expect(graceSlugs.has(row.grace), `${row.id} → ${row.grace}`).toBe(true)
    }
  })

  it('no loot row names two weapons', () => {
    for (const row of loot) {
      expect(row.name, row.id).not.toContain('/')
    }
  })

  it('splits the old two-weapon poleblade row into two grounded weapons', () => {
    for (const name of ["Rellana's Twin Blades", "Loretta's War Sickle"]) {
      expect(loot.some((l) => l.name === name), name).toBe(true)
      expect(nameSet.has(name), `${name} in names.json`).toBe(true)
    }
    expect(loot.some((l) => l.id === 'loot:lorettas-war-sickle')).toBe(true)
    expect(loot.some((l) => l.id === 'loot:rellanas-twin-blades')).toBe(true)
  })

  it('resolves at least three formerly-unresolved kit ids whose names are in names.json', () => {
    const cases: [string, string, string][] = [
      ['lusat', "Lusat's Glintstone Staff", 'loot:lusats-staff'],
      ['loss', 'Staff of Loss', 'loot:staff-of-loss'],
      ['warhawk-talon', "Warhawk's Talon", 'loot:warhawks-talon'],
      ['okina', 'Okina Mask', 'loot:okina-mask'],
    ]
    for (const [id, name, factId] of cases) {
      expect(nameSet.has(name), `${name} in names.json`).toBe(true)
      expect(resolveBuildId(id, name)?.factId, id).toBe(factId)
    }
  })

  it('leaves no need[] / kit id unresolved across the whole OP + PvP library', () => {
    const unresolved = allBuilds.flatMap((b) =>
      buildHunt(emptyCharacter, b).unresolved.map((u) => `${b.id}:${u.id}`),
    )
    expect(unresolved, JSON.stringify(unresolved)).toEqual([])
  })
})
