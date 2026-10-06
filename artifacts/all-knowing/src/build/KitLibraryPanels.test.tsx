import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// The farm list renders EntityLink, which requires the workspace.
vi.mock('../state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state')>()
  const { emptyCharacter } = await import('../data/seed')
  const workspace = {
    character: emptyCharacter,
    setCharacter: () => {},
    openEntity: () => {},
    showLeftovers: false,
    toggleLeftovers: () => {},
    go: () => {},
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { emptyCharacter } from '../data/seed'
import { OpKitPanel, PvpBuildPanel, PvpMatchupPanel, PvpTechPanel } from './KitLibraryPanels'

const noop = () => {}
const level150 = { ...emptyCharacter, level: 150 }

describe('Task 116 Kit panels', () => {
  it('renders the OP level plan and route from buildHunt', () => {
    const html = renderToStaticMarkup(
      <OpKitPanel character={emptyCharacter} setCharacter={noop} coords={[]} />,
    )
    expect(html).toContain('Level plan')
    expect(html).toContain('Lv 40')
    expect(html).toContain('Lv 60')
    expect(html).toContain('Lv 100')
    expect(html).toContain('Lv 150')
    expect(html).toContain('Use this build')
    expect(html).toContain('Rivers of Blood')
  })

  it('renders PvP bracket + mode filters and the applied kit, farm route and matchups', () => {
    const html = renderToStaticMarkup(
      <PvpBuildPanel character={level150} setCharacter={noop} />,
    )
    for (const bracket of ['RL30-50', 'RL60-90', 'RL125', 'RL150']) expect(html).toContain(bracket)
    expect(html).toContain('My level · RL150')
    expect(html).toContain('All modes')
    expect(html).toContain('Invade')
    expect(html).toContain('Duel')
    expect(html).toContain('Colossal poise monster (RL150)')
    expect(html).toContain('Talismans')
    expect(html).toContain('Buff order')
    expect(html).toContain('Use this build')
    // Task 164 §5–7: applied kit, farm list and ranked matchups.
    expect(html).toContain('Gear applied to your character')
    expect(html).toContain('Farm the missing pieces')
    expect(html).toContain('Matchups for this build')
  })

  it('defaults the bracket to a low-level character instead of the top bracket', () => {
    const html = renderToStaticMarkup(
      <PvpBuildPanel character={emptyCharacter} setCharacter={noop} />,
    )
    expect(html).toContain('Poison/Bleed Wretch (RL30)')
    expect(html).not.toContain('Colossal poise monster (RL150)')
  })

  it('renders the matchup and tech panels', () => {
    const matchups = renderToStaticMarkup(<PvpMatchupPanel />)
    expect(matchups).toContain('Bleed / Rivers of Blood')
    expect(matchups).toContain('Gear swap')
    const tech = renderToStaticMarkup(<PvpTechPanel />)
    expect(tech).toContain('Backstab setups')
    expect(tech).toContain('Parry windows by tool class')
  })
})
