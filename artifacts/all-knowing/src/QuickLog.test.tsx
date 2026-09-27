import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  return {
    ...actual,
    useWorkspace: () =>
      ({
        character: emptyCharacter,
        recentFacts: ['boss:margit'],
        setCharacter: () => {},
        undo: () => {},
        go: () => {},
        openEntity: () => {},
        setQuery: () => {},
      }) as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { LockoutPrompt } from './LockoutPrompt'
import { QuickLog } from './QuickLog'

describe('quick log UI (Task 99)', () => {
  it('opens a sheet with near-me and recent suggestions, all entity-linked', () => {
    const html = renderToStaticMarkup(
      <QuickLog open seed={[]} currentArea="Limgrave" onOpen={() => {}} onClose={() => {}} />,
    )
    expect(html).toContain('Quick log')
    expect(html).toContain('Near me — not done')
    expect(html).toContain('Recent')
    expect(html).toContain('Margit, the Fell Omen')
    expect(html).toContain('entity-link')
  })

  it('renders the existing lockout prompt with the foreclosed line', () => {
    const html = renderToStaticMarkup(
      <LockoutPrompt
        warnings={[
          {
            lineId: 'millicent',
            lineName: 'Millicent',
            steps: [{ id: 'm7', do: 'Challenge Millicent at Elphael (red sign)' }],
            started: true,
          },
        ]}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(html).toContain('This can lock a line')
    expect(html).toContain('Millicent')
    expect(html).toContain('Challenge Millicent at Elphael (red sign)')
  })
})
