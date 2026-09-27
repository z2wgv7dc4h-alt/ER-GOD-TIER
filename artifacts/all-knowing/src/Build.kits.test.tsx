import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  const workspace = {
    character: emptyCharacter,
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

import { KitWorkspace } from './Build'
import { BuildWorkspace } from './Build'

describe('Kit sub-view (Task 91)', () => {
  const html = renderToStaticMarkup(<KitWorkspace />)

  it('surfaces the OP / PvP / matchup library as its own sub-view', () => {
    expect(html).toContain('Rivers of Blood')
    expect(html).toContain('Colossal poise monster')
    expect(html).toContain('OP kits')
    expect(html).toContain('PvP matchups')
  })

  it('includes the tech tips ("broken tricks")', () => {
    expect(html).toMatch(/Lion&#x27;s Claw|Lion's Claw/)
  })

  it('does not render the stat editor — that is library/builds', () => {
    expect(html).not.toContain('Stats drive every other pane')
  })
})

describe('Build sub-view (Task 91)', () => {
  const html = renderToStaticMarkup(<BuildWorkspace />)

  it('keeps the stat editor and attack rating first paint', () => {
    expect(html).toContain('Stats drive every other pane')
    expect(html).toContain('Attack rating')
    expect(html).toMatch(/Pick a kit/i)
  })

  it('points at Library → Kit instead of the old drawer', () => {
    expect(html).toContain('Library → Kit')
    expect(html).not.toMatch(/<details[^>]*kits-drawer/)
  })
})
