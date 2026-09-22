import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AtlasWorkspace } from './Atlas'

// Engine-live render: the one projection per view (Task 09 Part C). With the
// engine up, only the iframe path draws, and the shared detail panel must name
// an engine marker — not a static plate pin that is not on screen.
vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  const workspace = {
    character: { ...emptyCharacter, platform: 'pc' as const },
    setCharacter: () => {},
    selectedMarkerId: null,
    setSelectedMarkerId: () => {},
    layers: {
      grace: true,
      boss: true,
      item: true,
      npc: true,
      fragment: true,
      'spirit-ash': true,
      dungeon: true,
    },
    toggleLayer: () => {},
    showLeftovers: false,
    toggleLeftovers: () => {},
    showGates: false,
    toggleGates: () => {},
    missingOnly: false,
    setMissingOnly: () => {},
    query: '',
    engineStatus: 'live',
    engineState: null,
    engineMarkers: [{ id: 'grace:engine-1', category: 'grace', names: { en: 'Engine Grace One' } }],
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

describe('AtlasWorkspace engine-live projection', () => {
  const html = renderToStaticMarkup(<AtlasWorkspace />)

  it('renders the live engine iframe and never the static plate', () => {
    expect(html).toContain('engine-frame')
    expect(html).not.toContain('atlas-plate')
  })

  it('defaults the detail panel to an engine marker, not a plate pin', () => {
    expect(html).toContain('<h3>Engine Grace One</h3>')
    expect(html).not.toContain('<h3>The First Step</h3>')
  })
})
