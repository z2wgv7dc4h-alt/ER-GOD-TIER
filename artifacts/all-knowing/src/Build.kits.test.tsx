import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  const workspace = {
    // PvP defaults its bracket to the character level, so use a late-game
    // Tarnished to keep the RL150 cards under test.
    character: { ...emptyCharacter, level: 150 },
    setCharacter: () => {},
    setModule: () => {},
    setSelectedMarkerId: () => {},
    showLeftovers: false,
    toggleLeftovers: () => {},
    go: () => {},
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { BuildWorkspace, BuildKits, BuildCalculator, PvpWorkspace } from './Build'

describe('Builds sub-view (Task 117)', () => {
  const html = renderToStaticMarkup(<BuildWorkspace />)

  it('keeps the stat editor and attack rating first paint', () => {
    expect(html).toContain('Stats drive every other pane')
    expect(html).toContain('Attack rating')
    expect(html).toMatch(/Pick a kit/i)
  })

  it('points at Library → PvP for the PvP lists', () => {
    expect(html).toContain('Library → PvP')
    expect(html).not.toContain('Library → Kit')
  })
})

describe('Builds kit tools (Task 117)', () => {
  const html = renderToStaticMarkup(<BuildKits />)

  it('surfaces the OP PvE kits and weapon compare', () => {
    expect(html).toContain('Rivers of Blood')
    expect(html).toContain('OP kits')
    expect(html).toContain('Weapon compare')
  })

  it('does not render the stat editor — that is the Builds planner', () => {
    expect(html).not.toContain('Stats drive every other pane')
  })

  it('does not render PvP builds, matchups or tech', () => {
    expect(html).not.toContain('PvP matchups')
    expect(html).not.toContain('Colossal poise monster')
  })
})

describe('Builds calculator tools (Task 164 §9)', () => {
  const html = renderToStaticMarkup(<BuildCalculator />)

  it('owns the damage calculator, attack rating and matchup tools', () => {
    expect(html).toContain('Damage calculator')
    expect(html).toContain('Attack rating detail')
    expect(html).toContain('Weak to / resists')
  })

  it('owns the stat, level and smithing calculators that left the planner', () => {
    expect(html).toContain('Stat planner')
    expect(html).toContain('Level-up calculator')
    expect(html).toContain('Smithing tracker')
    expect(html).toContain('Loadout presets')
  })
})

describe('PvP sub-view (Task 117)', () => {
  const html = renderToStaticMarkup(<PvpWorkspace />)

  it('surfaces PvP builds, matchups and tech from the PvP data', () => {
    expect(html).toContain('PvP builds')
    expect(html).toContain('PvP matchups')
    expect(html).toContain('Colossal poise monster')
    expect(html).toMatch(/Lion&#x27;s Claw|Lion's Claw/)
  })

  it('does not render the OP PvE kit list', () => {
    expect(html).not.toContain('OP kits')
  })
})
