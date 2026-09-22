import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchMedusa, medusaQuests, type MedusaRoute } from './medusaRoute'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/medusa-route.json', import.meta.url), 'utf8'),
) as MedusaRoute

describe('medusa route pack', () => {
  it('flattens acts/chapters into ordered steps', () => {
    const steps = medusaQuests(doc)
    expect(steps.length).toBeGreaterThan(300)
    expect(steps[0].actName).toBeTruthy()
    expect(steps[0].chapterName).toBeTruthy()
  })

  it('matches a step by title/summary text', () => {
    expect(matchMedusa('gr', medusaQuests(doc))).toEqual([])
    expect(matchMedusa('grafted scion', medusaQuests(doc)).length).toBeGreaterThan(0)
  })
})
