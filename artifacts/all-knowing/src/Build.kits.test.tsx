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
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { BuildWorkspace } from './Build'

describe('Kit first paint (Task 85)', () => {
  const html = renderToStaticMarkup(<BuildWorkspace />)

  it('keeps the library chips behind a closed Kits… disclosure', () => {
    const start = html.indexOf('<details')
    expect(start, 'a Kits… disclosure exists').toBeGreaterThan(-1)
    const end = html.indexOf('</details>', start)
    expect(end).toBeGreaterThan(start)
    const above = html.slice(0, start)
    const drawer = html.slice(start, end)

    // First paint must not show the kit library.
    expect(above).not.toContain('Rivers of Blood')
    expect(drawer).toContain('Rivers of Blood')
    expect(drawer).toContain('Colossal poise monster')
    expect(html).toContain('Kits…')
    // Closed by default.
    expect(/<details[^>]*\sopen\b/.test(html)).toBe(false)
  })

  it('shows stats and a Pick a kit prompt on first paint', () => {
    const above = html.slice(0, html.indexOf('<details'))
    expect(above).toContain('Stats drive every other pane')
    expect(above).toMatch(/Pick a kit/i)
    expect(above).toContain('Attack rating')
  })

  it('does not put blessing meters in the Kit room', () => {
    expect(html).not.toMatch(/Scadutree Blessing Lv|Revered Spirit Ash Blessing Lv/i)
  })
})
