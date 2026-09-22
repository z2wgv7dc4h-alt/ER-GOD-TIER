import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { askGideonRouter, isFastLookup } from './gideon'
import { emptyCharacter } from '../data/seed'
import { medusaQuests, type MedusaRoute } from './medusaRoute'

const steps = medusaQuests(
  JSON.parse(fs.readFileSync(new URL('../../public/sourced/open/medusa-route.json', import.meta.url), 'utf8')) as MedusaRoute,
)

describe('Gideon Medusa route', () => {
  it('answers a named route step', () => {
    const act = askGideonRouter('medusa route for grafted scion', emptyCharacter, {}, [], undefined, undefined, steps)
    expect(act.say.toLowerCase()).toContain('grafted scion')
    expect(act.module).toBe('codex')
  })

  it('keeps the route step deterministic', () => {
    expect(isFastLookup('medusa route for grafted scion', {}, [], undefined, steps)).toBe(true)
  })
})
