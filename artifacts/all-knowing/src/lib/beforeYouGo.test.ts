import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bandFor, type RegionLevels } from './regionLevels'
import { beforeYouGo } from './beforeYouGo'
import { emptyCharacter } from '../data/seed'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/region-levels.json', import.meta.url), 'utf8'),
) as RegionLevels

describe('region levels', () => {
  it('has progress-route bands', () => {
    expect(doc.areas.length).toBeGreaterThan(5)
    expect(doc.areas.every((a) => a.levelMin <= a.levelMax)).toBe(true)
  })

  it('matches a region label to a band', () => {
    const band = bandFor(doc.areas, 'Limgrave')
    expect(band).toBeTruthy()
    expect(band!.levelMin).toBeGreaterThan(0)
  })
})

describe('beforeYouGo', () => {
  it('reports the level band and open items for a region', () => {
    const char = { ...emptyCharacter, level: 11 }
    const by = beforeYouGo(char, 'what should i do in limgrave before i leave', doc.areas)
    expect(by.band).toBeTruthy()
    expect(by.advice).toMatch(/Lv \d+/)
  })
})
