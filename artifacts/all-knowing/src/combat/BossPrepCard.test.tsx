import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { emptyCharacter } from '../data/seed'

/**
 * Task 165 §2 — the boss page shows one copy of each combat block, so the
 * combat card must be able to render only the sections the entity panel does
 * not already have (spirit/co-op and the single recommended level).
 */
vi.mock('../lib/combat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/combat')>()
  const prep = {
    bossId: 'boss:test',
    name: 'Test Boss',
    region: 'Limgrave',
    hp: 1000,
    poise: 30,
    negation: { physical: 0, magic: 0, fire: 0, lightning: 0, holy: 0 },
    weakTo: ['fire'],
    resists: ['magic'],
    bestType: 'fire',
    status: [],
    weapons: [],
    bestWeapon: null,
    spirits: [{ name: 'Lone Wolf Ashes', match: ['lone wolf ashes'], tier: 'S', why: 'good' }],
    helpers: [{ name: 'Golden Vow', kind: 'buff', why: 'damage', tags: ['general'] }],
    level: { area: 'Limgrave', levelMin: 1, levelMax: 10, status: 'in' },
    summon: { name: 'Cooperator', factId: 'npc:x', available: true, note: 'grab a friend' },
    coop: true,
  }
  return { ...actual, bossPrep: () => prep as unknown as ReturnType<typeof actual.bossPrep> }
})

vi.mock('../lib/enemy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/enemy')>()
  return {
    ...actual,
    useBossCombat: () => ({ bosses: [{ factId: 'boss:test', name: 'Test Boss' }], error: null }),
  }
})

import { BossPrepCard } from './BossPrepCard'

describe('BossPrepCard section gating (Task 165 §2)', () => {
  it('renders only the requested sections', () => {
    const html = renderToStaticMarkup(
      <BossPrepCard bossId="boss:test" character={emptyCharacter} sections={['spirits', 'helpers', 'summon', 'level']} />,
    )
    expect(html).toContain('Spirit ashes you own')
    expect(html).toContain('Buffs')
    expect(html).toContain('Summon')
    expect(html).toContain('Recommended level')
    expect(html).not.toContain('Weak to / resists')
    expect(html).not.toContain('Your weapons vs this boss')
    expect(html).not.toContain('Status')
  })
})
