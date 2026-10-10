import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * Task 194 §2 — the Library search screen must render each chip/control once.
 *
 * The screen used to mount both the desktop toolbar and the phone toolbar (a
 * CSS media query hid one), and it spelled ownership "All" next to the campaign
 * "All". The crawl reported both as duplicate chip labels. This renders the
 * search screen at desktop width (the node test env has no `window.matchMedia`,
 * so the component treats it as desktop) and fails on any label that appears
 * twice.
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

import { LibraryBrowser } from './LibraryBrowser'

/** Every `.chip` button's visible label, in document order. */
function chipLabels(html: string): string[] {
  const labels: string[] = []
  const re = /<button[^>]*class="[^"]*\bchip\b[^"]*"[^>]*>([\s\S]*?)<\/button>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const text = m[1]
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) labels.push(text)
  }
  return labels
}

describe('Library search screen › duplicate chips (Task 194)', () => {
  const html = renderToStaticMarkup(<LibraryBrowser />)
  const labels = chipLabels(html)

  it('renders the search screen with its facet chips', () => {
    expect(labels).toContain('Base')
    expect(labels).toContain('DLC')
    expect(labels).toContain('All types')
    expect(labels).toContain('Straight Sword')
    expect(labels).toContain('Physical')
    expect(labels).toContain('Any')
    expect(labels).toContain('Near me')
  })

  it('never renders a chip label twice', () => {
    const counts = new Map<string, number>()
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
    const duplicates = [...counts].filter(([, n]) => n > 1).map(([label, n]) => `${label} ×${n}`)
    expect(duplicates, `duplicate chip labels: ${duplicates.join(', ')}`).toEqual([])
  })

  it('mounts one toolbar, not both', () => {
    expect(html).toContain('class="lib-tools"')
    expect(html).not.toContain('lib-phone-tools')
  })

  it('mounts only the phone toolbar at the phone breakpoint', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    })
    try {
      const phoneHtml = renderToStaticMarkup(<LibraryBrowser />)
      expect(phoneHtml).toContain('lib-phone-tools')
      expect(phoneHtml).not.toContain('class="lib-tools"')
      expect(phoneHtml).toContain('Filters (0)')

      const phoneLabels = chipLabels(phoneHtml)
      const counts = new Map<string, number>()
      for (const label of phoneLabels) counts.set(label, (counts.get(label) ?? 0) + 1)
      const duplicates = [...counts].filter(([, n]) => n > 1).map(([label, n]) => `${label} ×${n}`)
      expect(duplicates, `duplicate phone chip labels: ${duplicates.join(', ')}`).toEqual([])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
