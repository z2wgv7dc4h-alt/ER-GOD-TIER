import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { askGideonRouter } from './gideon'
import { emptyCharacter } from '../data/seed'
import { decodeRegulationData, type Weapon } from './ar'

const weapons: Weapon[] = decodeRegulationData(
  JSON.parse(
    fs.readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ),
)

/**
 * Eval harness (deterministic half). A fixture of questions with the answer the
 * router must produce — cheap regression net for prompt/routing changes. The
 * live model is exercised manually (it needs the key and network).
 */
const cases: { q: string; module?: string; say: RegExp }[] = [
  { q: 'what is still available on this run', module: 'quests', say: /Mid-run survey|still open/i },
  { q: 'i am stuck', say: /wall|summon|strike/i },
  { q: '100% completionist route', module: 'quests', say: /100%|catalog/i },
  { q: "what does the radahn remembrance give", module: 'codex', say: /Radahn|remembrance/i },
  { q: 'who sells smithing stones', say: /sell|stock|merchant/i },
  { q: 'what is on my list', say: /list/i },
  { q: 'where is blaidd', module: 'map', say: /Blaidd/ },
  { q: 'what did i miss in limgrave', say: /Limgrave|miss/i },
  { q: 'if i keep going what do i lock', say: /lock|gate|forge|continue/i },
  { q: 'what are good early weapons', module: 'build', say: /weapons|kit|stats/i },
]

describe('gideon eval fixtures', () => {
  for (const c of cases) {
    it(`"${c.q}"`, () => {
      const act = askGideonRouter(c.q, emptyCharacter, {}, [], undefined, undefined, undefined, undefined, weapons)
      if (c.module) expect(act.module).toBe(c.module)
      expect(act.say).toMatch(c.say)
    })
  }
})
