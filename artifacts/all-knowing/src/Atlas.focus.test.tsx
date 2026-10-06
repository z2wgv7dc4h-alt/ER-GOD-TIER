import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AtlasWorkspace } from './Atlas'
import { emptyCharacter } from './data/seed'

/**
 * Task 158 component test: rendering the map with a focus target must change the
 * view (static plate) and must drive the live engine iframe (the map the player
 * actually sees). Not a pure-function test — it renders AtlasWorkspace.
 */
const ws = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  return { ...actual, useWorkspace: () => ws.current }
})

function workspace(overrides: { engineStatus?: 'offline' | 'live'; mapFocus?: { id: string; at: number } | null } = {}) {
  return {
    character: emptyCharacter,
    setCharacter: () => {},
    selectedMarkerId: null,
    setSelectedMarkerId: () => {},
    layers: { grace: true, boss: true, item: true, npc: true, fragment: true, 'spirit-ash': true, dungeon: true },
    toggleLayer: () => {},
    showLeftovers: false,
    toggleLeftovers: () => {},
    showGates: false,
    toggleGates: () => {},
    missingOnly: false,
    setMissingOnly: () => {},
    query: '',
    follow: false,
    toggleFollow: () => {},
    showHeat: false,
    toggleHeat: () => {},
    showWatch: false,
    toggleWatch: () => {},
    currentArea: null,
    engineStatus: overrides.engineStatus ?? 'offline',
    engineState: null,
    engineMarkers: [],
    mapFocus: overrides.mapFocus ?? null,
    focusOnMap: () => {},
  }
}

function render(overrides: Parameters<typeof workspace>[0] = {}) {
  ws.current = workspace(overrides)
  return renderToStaticMarkup(<AtlasWorkspace />)
}

const focus = { id: 'grace:first-step', at: 1_000 }

describe('AtlasWorkspace focus (Task 158)', () => {
  it('zooms the static plate off the whole-map view for a focus target', () => {
    const html = render({ mapFocus: focus })
    const viewBox = html.match(/viewBox="([^"]+)"/)?.[1] ?? ''
    // Overworld plate is 4096x3880; the whole-map view is exactly that.
    expect(viewBox).not.toBe('0 0 4096 3880')
    const [x, y, w, h] = viewBox.split(' ').map(Number)
    expect(w).toBeLessThan(4096)
    expect(h).toBeLessThan(3880)
    // Centred on the grace (35.05%, 70.05%), not the map origin.
    expect(x).toBeGreaterThan(0)
    expect(y).toBeGreaterThan(0)
  })

  it('marks the static plate as focused', () => {
    expect(render({ mapFocus: focus })).toContain('class="atlas-focus"')
    expect(render({ mapFocus: null })).not.toContain('class="atlas-focus"')
  })

  it('sends the focus to the live engine iframe with the engine master and id', () => {
    const html = render({ engineStatus: 'live', mapFocus: focus })
    expect(html).toContain('engine-frame')
    expect(html).toContain('data-focus="M00:grace:first-step"')
  })

  it('does not set an engine focus when nothing asked to show on the map', () => {
    const html = render({ engineStatus: 'live', mapFocus: null })
    expect(html).not.toContain('data-focus=')
  })
})
