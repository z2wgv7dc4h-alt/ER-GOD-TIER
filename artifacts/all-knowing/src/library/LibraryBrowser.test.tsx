import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * Task 194 §2 / Task 196 §2 — the Library search screen must render each
 * control once, and every filter must stay reachable.
 *
 * Task 196 replaced the wall of toolbar chips with one row (search + type
 * dropdown + Filters) and moved the rest into a labelled Filters panel. This
 * renders the search screen (node has no `window.matchMedia`, so it is the
 * single unified toolbar) and the panel body directly, and checks that no
 * filter was dropped and no chip label appears twice.
 */

const { weapons } = vi.hoisted(() => ({
  weapons: [
    {
      id: 'weapons:uchigatana',
      factId: 'item:uchigatana',
      name: 'Uchigatana',
      category: 'weapons' as const,
      subtype: 'Katana',
      attack: [
        { label: 'Physical', value: 100 },
        { label: 'Slash', value: 50 },
      ],
      scaling: { dex: 'B' },
    },
    {
      id: 'weapons:longsword',
      factId: 'item:longsword',
      name: 'Longsword',
      category: 'weapons' as const,
      subtype: 'Straight Sword',
      attack: [{ label: 'Physical', value: 110 }],
      scaling: { str: 'C' },
    },
  ],
}))

vi.mock('../state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state')>()
  const { emptyCharacter } = await import('../data/seed')
  const workspace = {
    character: emptyCharacter,
    setCharacter: () => {},
    setModule: () => {},
    setSelectedMarkerId: () => {},
    setQuery: () => {},
    setCurrentArea: () => {},
    focusOnMap: () => {},
    openEntity: () => {},
    go: () => {},
  }
  return {
    ...actual,
    useWorkspace: () => workspace as unknown as ReturnType<typeof actual.useWorkspace>,
  }
})

vi.mock('./catalog', () => ({
  useLibraryCatalog: () => ({
    entities: weapons,
    byCategory: { weapons },
    weaponByName: new Map(),
    pending: new Set(),
    loading: false,
  }),
}))

vi.mock('../lib/entityEnrich', () => ({ useEnrichment: () => undefined }))

import { FilterPanelBody, LibraryBrowser } from './LibraryBrowser'
import { defaultFilter } from './model'

const noop = () => {}

/** Every `.chip` button's visible label, in document order. */
function chipLabels(html: string): string[] {
  const labels: string[] = []
  const re = /<button[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (!m[1].split(/\s+/).includes('chip')) continue
    const text = m[2]
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) labels.push(text)
  }
  return labels
}

describe('Library search screen › one toolbar (Task 196 §2)', () => {
  const html = renderToStaticMarkup(<LibraryBrowser />)

  it('renders the single toolbar row', () => {
    expect(html).toContain('class="lib-toolbar-row"')
    expect(html).toContain('class="lib-search"')
    expect(html).toContain('lib-type-select')
    expect(html).not.toContain('lib-tools')
    expect(html).not.toContain('lib-phone-tools')
  })

  it('exposes the category type filter as a dropdown', () => {
    expect(html).toContain('Straight Sword')
    expect(html).toContain('Katana')
    expect(html).toContain('All types')
  })

  it('has a Filters button to open the rest', () => {
    expect(html).toContain('>Filters</button>')
  })

  it('never renders a chip label twice', () => {
    const labels = chipLabels(html)
    const counts = new Map<string, number>()
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
    const duplicates = [...counts].filter(([, n]) => n > 1).map(([label, n]) => `${label} ×${n}`)
    expect(duplicates, `duplicate chip labels: ${duplicates.join(', ')}`).toEqual([])
  })
})

describe('Library filters panel › every filter reachable (Task 196 §2)', () => {
  const html = renderToStaticMarkup(
    <FilterPanelBody
      filter={defaultFilter()}
      subtypes={['Katana', 'Straight Sword']}
      damageOptions={['Physical', 'Slash']}
      hasScaling
      near
      hasArea
      sort="name"
      sortDir="asc"
      view="grid"
      updateFilter={noop}
      onNear={noop}
      onSort={noop}
      onSortDir={noop}
      onView={noop}
    />,
  )

  it('keeps the ownership filter reachable', () => {
    expect(html).toContain('Any')
    expect(html).toContain('Owned')
    expect(html).toContain('Not owned')
  })

  it('keeps the requirement and near filters reachable', () => {
    expect(html).toContain('I meet requirements')
    expect(html).toContain('Near me')
  })

  it('keeps every type reachable', () => {
    expect(html).toContain('All types')
    expect(html).toContain('Katana')
    expect(html).toContain('Straight Sword')
  })

  it('keeps the damage types reachable', () => {
    expect(html).toContain('All damage')
    expect(html).toContain('Physical')
    expect(html).toContain('Slash')
  })

  it('keeps the DLC campaign filter reachable', () => {
    expect(html).toContain('Base')
    expect(html).toContain('DLC')
  })

  it('keeps the scaling filter reachable', () => {
    for (const letter of ['S', 'A', 'B', 'C', 'D']) expect(html).toContain(`>${letter}</button>`)
  })

  it('keeps sort reachable', () => {
    expect(html).toContain('AR at my stats')
    expect(html).toContain('Requirement')
    expect(html).toContain('Asc ↑')
  })

  it('keeps the view switch reachable', () => {
    expect(html).toContain('Grid')
    expect(html).toContain('Table')
  })
})
