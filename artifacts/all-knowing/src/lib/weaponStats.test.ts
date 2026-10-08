import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeRegulationData } from './ar'
import { baseWeaponRows, matchWeaponStats, scalingLetter, weaponStatusFor } from './weaponStats'

// Validate the formatter against the real vendored regulation table, so a
// schema drift fails here instead of quietly emptying the Codex section.
const raw = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
)
const rows = baseWeaponRows(decodeRegulationData(raw))

describe('weapon stats from regulation', () => {
  it('produces one preferred-affinity row per weapon', () => {
    expect(rows.length).toBeGreaterThan(400)
    expect(new Set(rows.map((r) => r.weaponName)).size).toBe(rows.length)
  })

  it('reads Dagger requirements, attack and scaling', () => {
    const dagger = rows.find((r) => r.weaponName === 'Dagger')!
    const reqs = dagger.requirements.map((r) => `${r.attr} ${r.value}`).sort()
    expect(reqs).toEqual(['Dex 9', 'Str 5'])
    expect(dagger.attack).toContainEqual({ label: 'Physical', value: 74 })
    expect(dagger.scaling.map((s) => `${s.attr} ${s.letter}`).sort()).toEqual(['Dex C', 'Str D'])
  })

  it('maps scaling values to tiers', () => {
    const tiers: [number, string][] = [
      [1.75, 'S'],
      [1.4, 'A'],
      [0.9, 'B'],
      [0.6, 'C'],
      [0.25, 'D'],
      [0.01, 'E'],
    ]
    expect(scalingLetter(tiers, 1.8)).toBe('S')
    expect(scalingLetter(tiers, 0.65)).toBe('C')
    expect(scalingLetter(tiers, 0)).toBe('–')
  })
})

describe('matchWeaponStats', () => {
  it('ignores short queries and matches by name', () => {
    expect(matchWeaponStats('da', rows)).toEqual([])
    expect(matchWeaponStats('dagger', rows).some((r) => r.weaponName === 'Dagger')).toBe(true)
  })
})

describe('weapon status build-up (Task 183 §3)', () => {
  it('splits status effects out of base damage', () => {
    const katana = rows.find((r) => r.weaponName === 'Uchigatana')!
    // Uchigatana's Bleed(45) lives in statusSpEffectParams, not base damage.
    expect(katana.status).toEqual([{ label: 'Bleed', value: 45 }])
    expect(katana.attack.some((a) => a.label === 'Physical')).toBe(true)
    expect(katana.attack.some((a) => a.label === 'Bleed')).toBe(false)
    // A plain weapon has no status at all.
    const greatsword = rows.find((r) => r.weaponName === 'Greatsword')!
    expect(greatsword.status).toEqual([])
  })

  it('resolves a page name to its status build-up', () => {
    expect(weaponStatusFor('Uchigatana', rows)).toEqual([{ label: 'Bleed', value: 45 }])
    expect(weaponStatusFor('Greatsword', rows)).toEqual([])
    expect(weaponStatusFor('', rows)).toEqual([])
  })
})
