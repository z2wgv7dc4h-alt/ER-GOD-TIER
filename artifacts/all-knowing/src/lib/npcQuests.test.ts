import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { findQuest, type NpcQuestsDoc } from './npcQuests'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/npc-quests.json', import.meta.url), 'utf8'),
) as NpcQuestsDoc

describe('npc quests (from MCP DB)', () => {
  it('has ordered steps per NPC', () => {
    expect(doc.quests.length).toBeGreaterThan(40)
    const alex = doc.quests.find((q) => /alexander/i.test(q.npc))
    expect(alex?.steps.length).toBeGreaterThan(1)
    expect(alex!.steps[0].order).toBeLessThanOrEqual(alex!.steps[1].order)
  })

  it('finds a quest by NPC name', () => {
    expect(findQuest('where is blaidd', doc.quests)?.npc).toMatch(/blaidd/i)
  })
})
