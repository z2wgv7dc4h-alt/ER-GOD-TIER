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

import { RecommendedCard } from './RecommendedCard'

describe('Journey › Now recommended card (Task 96)', () => {
  const html = renderToStaticMarkup(<RecommendedCard />)

  it('renders top to-dos and upgrades with a See-all hand-off', () => {
    expect(html).toContain('Recommended for you')
    expect(html).toContain('To do next')
    expect(html).toContain('Upgrades')
    expect(html).toMatch(/>See all</)
  })

  it('names the detected build', () => {
    expect(html).toContain('Strength')
  })
})
