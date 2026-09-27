import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { OpKitPanel, PvpBuildPanel, PvpMatchupPanel, PvpTechPanel } from './KitLibraryPanels'

const noop = () => {}

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

  it('renders PvP bracket filter chips and expandable loadouts', () => {
    const html = renderToStaticMarkup(
      <PvpBuildPanel character={emptyCharacter} setCharacter={noop} />,
    )
    expect(html).toContain('RL30-50')
    expect(html).toContain('RL60-90')
    expect(html).toContain('RL125')
    expect(html).toContain('RL150')
    expect(html).toContain('Colossal poise monster (RL150)')
    expect(html).toContain('Talismans')
    expect(html).toContain('Buff order')
    expect(html).toContain('Use this build')
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
