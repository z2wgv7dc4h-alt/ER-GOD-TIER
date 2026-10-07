import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

/**
 * Task 92 acceptance: walk the coverage table, render each feature's home
 * section, and assert the entry point is present. Same mock pattern the other
 * shell tests use: `useWorkspace` is stubbed, the rest of `state.tsx` is real.
 */
const ws = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('../state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state')>()
  return { ...actual, useWorkspace: () => ws.current }
})

// MeSetup imports the Setup wizard; its camera/OCR handlers never run under SSR.
vi.mock('../Reckon', () => ({ ReckonWorkspace: () => null }))

import { demoCharacter, emptyCharacter } from '../data/seed'
import { applyFacts } from '../lib/infer'
import { withSetupStep } from '../lib/setupWizard'
import type { Character, ModuleId, Section, Sub } from '../types'
import { BuildWorkspace, BuildKits, BuildCalculator, PvpWorkspace } from '../Build'
import { Guides } from '../library/Guides'
import { Gideon } from '../Gideon'
import { QuestWorkspace } from '../Quests'
import { JourneyNow } from './JourneyNow'
import { MeOverview } from './MeOverview'
import { MeProfiles } from './MeProfiles'
import { MeSetup } from './MeSetup'

function workspace(overrides: {
  character?: Character
  selectedMarkerId?: string | null
  query?: string
  section?: Section
  sub?: Sub | null
  currentArea?: { region: string; source: 'map'; at: number } | null
}) {
  const character = overrides.character ?? demoCharacter
  const profile = {
    id: 'p1',
    label: character.name,
    updatedAt: 0,
    character,
    ui: {
      module: 'reckon' as ModuleId,
      section: 'me' as Section,
      sub: 'overview' as Sub | null,
      missingOnly: false,
      selectedMarkerId: overrides.selectedMarkerId ?? null,
    },
  }
  return {
    module: 'map' as ModuleId,
    setModule: () => {},
    section: overrides.section ?? ('me' as Section),
    sub: overrides.sub ?? ('overview' as Sub | null),
    currentArea: overrides.currentArea ?? null,
    go: () => {},
    character,
    setCharacter: () => {},
    selectedMarkerId: overrides.selectedMarkerId ?? null,
    setSelectedMarkerId: () => {},
    layers: { grace: true, boss: true, item: true, npc: true, fragment: true, 'spirit-ash': true, dungeon: true },
    toggleLayer: () => {},
    showLeftovers: false,
    toggleLeftovers: () => {},
    showGates: false,
    toggleGates: () => {},
    missingOnly: false,
    setMissingOnly: () => {},
    query: overrides.query ?? '',
    setQuery: () => {},
    engineStatus: 'offline',
    setEngineStatus: () => {},
    engineState: null,
    setEngineState: () => {},
    engineMarkers: [],
    setEngineMarkers: () => {},
    undo: () => {},
    canUndo: false,
    helpOpen: false,
    setHelpOpen: () => {},
    dockOpen: false,
    toggleDock: () => {},
    recentFacts: [],
    vault: { version: 1, activeId: 'p1', profiles: [profile] },
    profile,
    newProfile: () => {},
    loadProfile: () => {},
    removeProfile: () => {},
    renameProfile: () => {},
  }
}

function render(node: ReactElement, overrides: Parameters<typeof workspace>[0] = {}) {
  ws.current = workspace(overrides)
  return renderToStaticMarkup(node)
}

describe('Task 92 coverage: every feature has a home', () => {
  it('row 1 — Medusa 100% route on Journey › Quests and Journey › Now', () => {
    expect(render(<QuestWorkspace />, { section: 'journey', sub: 'quests' })).toContain('100% route')
    expect(render(<JourneyNow />, { section: 'journey', sub: 'now' })).toContain('100% route')
  })

  it('row 2 — "Before you leave this area" card shows only with an area and real missables', () => {
    // No area set: the card must not render unrelated questline steps.
    expect(render(<JourneyNow />, { section: 'journey', sub: 'now' })).not.toContain('Before you leave this area')
    // An area with authored missables (Leyndell: Bolt of Gransax) does render it.
    const html = render(<JourneyNow />, {
      section: 'journey',
      sub: 'now',
      currentArea: { region: 'Leyndell', source: 'map', at: Date.now() },
    })
    expect(html).toContain('Before you leave this area')
    expect(html).toContain('Bolt of Gransax')
  })

  it('row 3 — leftover count + show on map on Journey › Now', () => {
    // A character standing at a Limgrave grace has real outstanding loot there.
    const character = applyFacts(emptyCharacter, ['grace:first-step'], 'answer', 'coverage')
    const html = render(<JourneyNow />, { section: 'journey', sub: 'now', character })
    expect(html).toContain('Missed nearby')
    expect(html).toContain('Show on map')
  })

  it('row 4 — completion meters on Tarnished › Overview', () => {
    const html = render(<MeOverview />, { section: 'me', sub: 'overview' })
    for (const label of ['Graces', 'Bosses', 'Items found', 'Fragments', 'Field hunts']) {
      expect(html, label).toContain(label)
    }
  })

  it('row 4b — progression tracking meters live on Tarnished › Overview, not Guides', () => {
    const overview = render(<MeOverview />, { section: 'me', sub: 'overview' })
    for (const title of ['Blessing meters', 'Achievement sets', 'Dungeon checklist', 'Fragments &amp; flasks']) {
      expect(overview, title).toContain(title)
    }
    const guides = render(<Guides />, { section: 'library', sub: 'guides' })
    expect(guides).not.toContain('Blessing meters')
    expect(guides).not.toContain('Achievement sets')
  })

  it('row 5 — respec, upgrade advice and build hunt are visible panels in Library › Builds', () => {
    const html = render(<BuildWorkspace />, { section: 'library', sub: 'builds' })
    expect(html).toContain('Respec advisor')
    expect(html).toContain('Upgrade advice')
    expect(html).toContain('Build hunt')
  })

  it('row 6 — Kits/Compare owns the kits and compare; Calculator owns the damage calc; PvP owns builds and tech', () => {
    const builds = render(<BuildKits />, { section: 'library', sub: 'builds' })
    for (const group of ['OP kits', 'Weapon compare']) {
      expect(builds, group).toContain(group)
    }
    const calc = render(<BuildCalculator />, { section: 'library', sub: 'builds' })
    expect(calc).toContain('Damage calculator')
    const pvp = render(<PvpWorkspace />, { section: 'library', sub: 'pvp' })
    for (const group of ['PvP builds', 'PvP matchups', 'Tech &amp; cheese']) {
      expect(pvp, group).toContain(group)
    }
  })

  it('row 7 — browse chips for every Guides corpus on the empty state', () => {
    const html = render(<Guides />, { section: 'library', sub: 'guides' })
    expect(html).toContain('Guides &amp; mechanics')
    for (const corpus of ['Guides', 'Recipes', 'Secrets', 'Dialogue', 'Wiki']) {
      expect(html, corpus).toContain(corpus)
    }
  })

  it('row 8 — Weak to / resists in the Builds matchup', () => {
    const calc = render(<BuildCalculator />, { section: 'library', sub: 'builds' })
    expect(calc).toContain('Weak to / resists')
  })

  it('row 9 — every screenshot shot type is listed on Tarnished › Setup', () => {
    const html = render(<MeSetup />, { section: 'me', sub: 'setup' })
    for (const shot of ['Warp / grace list', 'World map', 'Inventory / Great Runes', 'Equipment screen', 'Item pickup banner', 'Boss remembrance / arena']) {
      expect(html, shot).toContain(shot)
    }
  })

  it('row 10 — goods paste, packets/QR and build codes each have a card on Tarnished › Setup', () => {
    const html = render(<MeSetup />, {
      section: 'me',
      sub: 'setup',
      character: withSetupStep(demoCharacter, 'inventory'),
    })
    expect(html).toContain('Paste item list')
    expect(html).toContain('Share / import')
    expect(html).toContain('Build codes')
  })

  it('row 11 — profiles shows whether Gideon\x27s LLM key is configured', () => {
    const html = render(<MeProfiles />, { section: 'me', sub: 'profiles' })
    expect(html).toContain('LLM:')
    expect(html).toMatch(/router only|key configured/)
  })

  it('row 12 — the Gideon quick chips are visible when the input is empty', () => {
    const html = render(<Gideon />, { section: 'gideon', sub: null })
    for (const chip of ['Still available', 'Stuck', '100% spine', 'Before I go', 'Missed here', 'Secrets', 'Upgrade advice']) {
      expect(html, chip).toContain(chip)
    }
  })
})
