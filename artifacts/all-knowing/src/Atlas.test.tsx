import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AtlasWorkspace } from './Atlas'

// Render the real Atlas workspace against a minimal fake of the one context it
// reads, so we can pin the phone control surface without a browser or a live
// engine. `useCoords` is left real: in a static render it starts empty (its
// effect never runs), which is exactly the offline phone case.
vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  const workspace = {
    character: emptyCharacter,
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
    engineStatus: 'offline',
    engineState: null,
    engineMarkers: [],
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

describe('AtlasWorkspace phone job controls', () => {
  const html = renderToStaticMarkup(<AtlasWorkspace />)

  // The brief's guard: these three controls must stay in the rendered tree even
  // though the desktop topbar `.toggles` is hidden by a media query. A future
  // change that drops them in JS (rather than CSS) fails here.
  it('always renders the three job controls under 700px', () => {
    expect(html).toContain('aria-label="Map job filters"')
    expect(html).toContain('>Missing only<')
    expect(html).toContain('>leftovers<')
    expect(html).toContain('>locks<')
  })

  it('keeps the seven pin kinds behind one layers overflow', () => {
    expect(html).toContain('>layers<')
    expect(html).toContain('aria-controls="atlas-layers"')
  })
})
