import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { askGideonRouter } from './gideon'
import { emptyCharacter } from '../data/seed'
import type { RegionLevel } from './regionLevels'

const areas = (
  JSON.parse(fs.readFileSync(new URL('../../public/sourced/open/region-levels.json', import.meta.url), 'utf8')) as {
    areas: RegionLevel[]
  }
).areas

describe('Gideon level + to-do intents', () => {
  it('answers a level/zone question deterministically', () => {
    const act = askGideonRouter(
      'what level should i be in limgrave',
      { ...emptyCharacter, level: 11 },
      {}, [], undefined, undefined, undefined, undefined, undefined, areas,
    )
    expect(act.module).toBe('map')
    expect(act.say).toMatch(/Lv \d+/)
  })

  it('reports an empty to-do list', () => {
    const act = askGideonRouter('what is on my list', emptyCharacter, {})
    expect(act.say.toLowerCase()).toContain('list')
  })
})
