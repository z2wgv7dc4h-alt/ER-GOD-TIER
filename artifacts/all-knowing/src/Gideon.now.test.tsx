import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  const { applyFacts } = await import('./lib/infer')
  const character = applyFacts(
    emptyCharacter,
    [
      'boss:margit',
      'boss:godrick',
      'boss:rennala',
      'boss:radahn',
      'quest:ranni:service',
      'item:black-knifeprint',
      'quest:rogier:knifeprint',
      'quest:varre:met',
      'quest:fia:met',
      'quest:fia:dagger',
      'invader:ensha',
      'quest:thops:met',
    ],
    'answer',
    'Task 84 fixture',
  )
  const workspace = {
    character,
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

import { JourneyNow } from './shell/JourneyNow'

describe('Journey → Now panel (Task 84/91)', () => {
  const html = renderToStaticMarkup(<JourneyNow />)

  it("names the current beat (Fingerslayer) and never lists Alexander's line", () => {
    expect(html).toMatch(/Fingerslayer/)
    expect(html).not.toMatch(/Iron Fist Alexander/)
  })

  it('renders the one-line open / locked archive link', () => {
    expect(html).toMatch(/\d+ open · \d+ locked/)
  })

  it('hides Show on map on the current beat when it has no existing pin', () => {
    // item:fingerslayer has no loot row / grace coord, so the beat itself gets no
    // Show control. The Task 92 leftovers card is a separate section, excluded here.
    const lead = html.slice(html.indexOf('now-lead'), html.indexOf('</section>', html.indexOf('now-lead')))
    expect(lead).not.toContain('Show on map')
  })
})
