import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { askGideonRouter, isFastLookup } from './gideon'
import { emptyCharacter } from '../data/seed'
import { guideExcerpts, type Guides } from './guides'

const guides = guideExcerpts(
  JSON.parse(fs.readFileSync(new URL('../../public/sourced/open/guides-fextralife.json', import.meta.url), 'utf8')) as Guides,
)

describe('Gideon guides', () => {
  it('answers a how-to from a Fextralife excerpt', () => {
    const act = askGideonRouter('how do smithing stones work', emptyCharacter, {}, [], undefined, undefined, undefined, guides)
    expect(act.module).toBe('codex')
    expect(act.say.length).toBeGreaterThan(30)
  })

  it('keeps it deterministic', () => {
    expect(isFastLookup('how do upgrades work', {}, [], undefined, undefined, guides)).toBe(true)
  })
})
