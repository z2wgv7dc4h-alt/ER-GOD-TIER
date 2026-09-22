import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decodeRegulationData, type Weapon } from './ar'
import { respecAdvice } from './respecAdvice'
import { emptyCharacter } from '../data/seed'

const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)

describe('respecAdvice', () => {
  it('maps current stats onto a named build', () => {
    const adv = respecAdvice(weapons, 'rivers of blood', emptyCharacter.stats)
    expect(adv?.kind).toBe('build')
    expect(adv!.deltas.length).toBeGreaterThan(0)
    expect(adv!.note).toMatch(/Respec to Rivers of Blood|raise/i)
  })

  it('reports unmet requirements for a weapon target', () => {
    // Academy Glintstone Staff needs high Int; a fresh character is short.
    const adv = respecAdvice(weapons, 'academy glintstone staff', emptyCharacter.stats)
    expect(adv?.kind).toBe('weapon')
    expect(adv!.note).toMatch(/Int|meet|scales/i)
  })

  it('returns null for an unknown target', () => {
    expect(respecAdvice(weapons, 'zzzznotathing', emptyCharacter.stats)).toBeNull()
  })
})
