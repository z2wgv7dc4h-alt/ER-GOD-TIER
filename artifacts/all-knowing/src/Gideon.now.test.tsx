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

  it('renders the one-line questline availability link', () => {
    expect(html).toMatch(/\d+ questlines available · \d+ closed off/)
  })

  it('gives the current goal card one primary Show on map action', () => {
    const lead = html.slice(html.indexOf('now-lead'), html.indexOf('</section>', html.indexOf('now-lead')))
    expect(lead).toContain('Show on map')
  })
})
