import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// Render the real QuestWorkspace against a minimal workspace whose selected
// marker lands on the Alexander line, so the Task 79 one-liner should show.
vi.mock('./state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./state')>()
  const { emptyCharacter } = await import('./data/seed')
  const workspace = {
    character: emptyCharacter,
    setCharacter: () => {},
    setModule: () => {},
    setSelectedMarkerId: () => {},
    selectedMarkerId: 'quest:alexander:met',
    query: '',
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

import { QuestWorkspace } from './Quests'

describe('QuestWorkspace NPC locator (Task 79)', () => {
  it('shows a one-line companion location when the locator hits', () => {
    const html = renderToStaticMarkup(<QuestWorkspace />)
    expect(html).toContain('Iron Fist Alexander is at')
  })
})
