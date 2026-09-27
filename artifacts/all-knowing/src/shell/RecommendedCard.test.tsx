import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'

let workspace = {
  character: emptyCharacter as Character,
  setCharacter: () => {},
  setModule: () => {},
  setSelectedMarkerId: () => {},
  showLeftovers: false,
  toggleLeftovers: () => {},
  go: () => {},
}

vi.mock('../state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state')>()
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { hasUnsetStats, RecommendedCard } from './RecommendedCard'

describe('Journey › Now recommended card (Task 96 / Task 100)', () => {
  it('shows the setup CTA for a default/unset character', () => {
    workspace = { ...workspace, character: emptyCharacter }
    const html = renderToStaticMarkup(<RecommendedCard />)
    expect(html).toContain('Set up your Tarnished')
    expect(html).not.toContain('Strength')
  })

  it('shows the detected build once stats are real', () => {
    workspace = {
      ...workspace,
      character: {
        ...emptyCharacter,
        source: 'reckon',
        stats: { ...emptyCharacter.stats, strength: 40, dexterity: 14 },
      },
    }
    const html = renderToStaticMarkup(<RecommendedCard />)
    expect(html).toContain('Strength')
    expect(html).toMatch(/>See all</)
    expect(html).not.toContain('Set up your Tarnished')
  })

  it('treats all-10s stats as unset', () => {
    expect(hasUnsetStats(emptyCharacter)).toBe(true)
    expect(
      hasUnsetStats({ ...emptyCharacter, source: 'reckon', stats: { ...emptyCharacter.stats, vigor: 31 } }),
    ).toBe(false)
  })
})
