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
    selectedMarkerId: null,
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { DungeonChecklist } from './Dungeon'

describe('DungeonChecklist (Task 80)', () => {
  const html = renderToStaticMarkup(<DungeonChecklist />)

  it('shows the honest block title', () => {
    expect(html).toContain('Stormveil Castle')
    expect(html).toMatch(/not every corpse/i)
  })

  it('renders a Show on map control only for beats with an existing grace', () => {
    // Three authored Stormveil graces; those beats get the control, boss/item beats do not.
    const count = (html.match(/Show on map/g) || []).length
    expect(count).toBe(3)
  })

  it('lists every step with a checkbox', () => {
    const boxes = (html.match(/type="checkbox"/g) || []).length
    expect(boxes).toBe(8)
  })
})
