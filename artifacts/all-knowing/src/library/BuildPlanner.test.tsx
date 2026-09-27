import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state')>()
  const { emptyCharacter } = await import('../data/seed')
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

import { BuildPlanner } from './BuildPlanner'

describe('Library › Builds planner (Task 96)', () => {
  const html = renderToStaticMarkup(<BuildPlanner />)

  it('renders the four planner sections', () => {
    expect(html).toContain('Your build')
    expect(html).toContain('Stronger for your build')
    expect(html).toContain('Gear picks')
    expect(html).toContain('Change build')
  })

  it('shows the detected archetype and stat bars', () => {
    expect(html).toContain('Strength')
    expect(html).toMatch(/confidence/)
    expect(html).toContain('Vig')
  })

  it('offers the OP kits, PvP builds and a custom target', () => {
    expect(html).toContain('Rivers of Blood')
    expect(html).toContain('Custom stats')
  })
})
