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

// MeUpdate lazy-loads Reckon; the screenshot/receipts UI is not under test here.
vi.mock('../Reckon', () => ({ ReckonWorkspace: () => null }))

import { demoCharacter } from '../data/seed'
import type { Character, ModuleId, Section, Sub } from '../types'
import { BuildWorkspace, KitWorkspace } from '../Build'
import { CodexWorkspace } from '../Codex'
import { Gideon } from '../Gideon'
import { QuestWorkspace } from '../Quests'
import { JourneyNow } from './JourneyNow'
import { MeOverview } from './MeOverview'
import { MeProfiles } from './MeProfiles'
import { MeUpdate } from './MeUpdate'

function workspace(overrides: {
  character?: Character
  selectedMarkerId?: string | null
  query?: string
  section?: Section
  sub?: Sub | null
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

  it('row 2 — "Before you leave this area" card on Journey › Now', () => {
    expect(render(<JourneyNow />, { section: 'journey', sub: 'now' })).toContain('Before you leave this area')
  })

  it('row 3 — leftover count + show on map on Journey › Now', () => {
    const html = render(<JourneyNow />, { section: 'journey', sub: 'now' })
    expect(html).toContain('Leftovers nearby')
    expect(html).toContain('Show on map')
  })

  it('row 4 — completion meters on Tarnished › Overview', () => {
    const html = render(<MeOverview />, { section: 'me', sub: 'overview' })
    for (const label of ['Graces', 'Bosses', 'Items found', 'Fragments', 'Field hunts']) {
      expect(html, label).toContain(label)
    }
  })

  it('row 5 — respec, upgrade advice and build hunt are visible panels in Library › Builds', () => {
    const html = render(<BuildWorkspace />, { section: 'library', sub: 'builds' })
    expect(html).toContain('Respec advisor')
    expect(html).toContain('Upgrade advice')
    expect(html).toContain('Build hunt')
  })

  it('row 6 — the four labelled Kit groups in Library › Kit', () => {
    const html = render(<KitWorkspace />, { section: 'library', sub: 'kit' })
    for (const group of ['OP kits', 'PvP', 'Weapon compare', 'Tech &amp; cheese']) {
      expect(html, group).toContain(group)
    }
  })

  it('row 7 — browse chips for every Search corpus on the empty state', () => {
    const html = render(<CodexWorkspace />, { section: 'library', sub: 'search' })
    expect(html).toContain('Browse a corpus')
    for (const corpus of ['Recipes', 'Secrets', 'Guides', 'Community builds', 'Dialogue', 'Wiki prose', 'Boss strategy']) {
      expect(html, corpus).toContain(corpus)
    }
  })

  it('row 8 — Weak to / resists on a Search entity page and in the Build matchup', () => {
    const codex = render(<CodexWorkspace />, { section: 'library', sub: 'search', selectedMarkerId: 'boss:margit' })
    expect(codex).toContain('Weak to / resists')
    const kit = render(<KitWorkspace />, { section: 'library', sub: 'kit' })
    expect(kit).toContain('Weak to / resists')
  })

  it('row 9 — every screenshot shot type is listed on Tarnished › Update', () => {
    const html = render(<MeUpdate />, { section: 'me', sub: 'update' })
    for (const shot of ['Warp / grace list', 'World map', 'Inventory / Great Runes', 'Equipment screen', 'Item pickup banner', 'Boss remembrance / arena']) {
      expect(html, shot).toContain(shot)
    }
  })

  it('row 10 — goods paste, packets/QR and build codes each have a card on Tarnished › Update', () => {
    const html = render(<MeUpdate />, { section: 'me', sub: 'update' })
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
