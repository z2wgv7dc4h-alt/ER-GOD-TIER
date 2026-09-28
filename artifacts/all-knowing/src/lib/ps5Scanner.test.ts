import { describe, expect, it } from 'vitest'
import type { OcrWord } from './ps5Ocr'
import {
  analyzeFrame,
  extractScanObservation,
  InventoryStabilizer,
  kindAllowed,
  nameSimilarity,
  normalizeItemName,
  pickItemCandidate,
  type ScanObservation,
} from './ps5Scanner'
import { recipesForCookbook } from './ps5Crafting'

/** A word stream builder: each tuple is [text, x0, y0, confidence]. */
function words(rows: [string, number, number, number?][]): OcrWord[] {
  const lines = new Map<number, number>()
  return rows.map((row) => {
    const [text, x0, y0, confidence = 0.95] = row
    if (!lines.has(y0)) lines.set(y0, lines.size + 1)
    return { text, confidence, x0, y0, x1: x0 + 8 * text.length, y1: y0 + 30, line: lines.get(y0)! }
  })
}

const WIDTH = 1000

describe('normalizeItemName / nameSimilarity', () => {
  it('folds case, punctuation and bracket style', () => {
    expect(normalizeItemName('Grave Glovewort [1]')).toBe('grave glovewort 1')
    expect(normalizeItemName('Grave Glovewort (1)')).toBe('grave glovewort 1')
    expect(nameSimilarity('Ambush Shard', 'Ambush Shord')).toBeGreaterThan(0.8)
    expect(nameSimilarity('Ambush Shard', 'Blue Cipher Ring')).toBeLessThan(0.4)
  })
})

describe('kindAllowed / pickItemCandidate', () => {
  const candidates = [
    { id: 'item:putrid-corpse-ashes', name: 'Putrid Corpse Ashes', kind: 'spirit' },
    { id: 'item:grave-glovewort-1', name: 'Grave Glovewort [1]', kind: 'item' },
    { id: 'item:ambush-shard', name: 'Ambush Shard', kind: 'spell' },
    { id: 'item:blue-cipher-ring', name: 'Blue Cipher Ring', kind: 'item' },
  ]

  it('restricts resolution to the tab category', () => {
    expect(kindAllowed('spirit', 'spirit')).toBe(true)
    expect(kindAllowed('spell', 'spirit')).toBe(false)
    expect(kindAllowed('spell', 'sorcery')).toBe(true)
    expect(kindAllowed('item', 'key-item')).toBe(true)
    expect(kindAllowed('boss', undefined)).toBe(true)
  })

  it('picks exact then fuzzy matches, never the wrong kind', () => {
    expect(pickItemCandidate('Putrid Corpse Ashes', 'spirit', candidates)?.id).toBe('item:putrid-corpse-ashes')
    expect(pickItemCandidate('Grave Glovewort (1)', 'material', candidates)?.id).toBe('item:grave-glovewort-1')
    expect(pickItemCandidate('Ambush Shard', 'sorcery', candidates)?.id).toBe('item:ambush-shard')
    // "Ambush Shard" is a spell; asking on the spirit tab must not return it.
    expect(pickItemCandidate('Ambush Shard', 'spirit', candidates)).toBeUndefined()
  })
})

describe('extractScanObservation', () => {
  it('reads the highlighted name below the tab, not the cropped right title', () => {
    const stream = words([
      ['Inventory', 60, 10],
      ['Key', 70, 60],
      ['Items', 150, 60],
      ['Holy-Shrouding', 700, 60], // right-panel title, cropped
      ['Holy-Shrouding', 70, 140],
      ['Cracked', 260, 140],
      ['Tear', 400, 140],
      ['No.', 720, 300],
      ['Held', 780, 300],
    ])
    const obs = extractScanObservation(stream, WIDTH, 800)
    expect(obs.tab).toBe('Key Items')
    expect(obs.category).toBe('key-item')
    expect(obs.name).toBe('Holy-Shrouding Cracked Tear')
  })

  it('prefers the fuller list header over a truncated read on the tab row', () => {
    const stream = words([
      ['Ashes', 70, 60],
      ['Putrid', 150, 60],
      ['Corpse', 260, 60],
      ['As', 400, 60],
      ['Putrid', 70, 150],
      ['Corpse', 180, 150],
      ['Ashes', 300, 150],
    ])
    const obs = extractScanObservation(stream, WIDTH, 800)
    expect(obs.tab).toBe('Ashes')
    expect(obs.name).toBe('Putrid Corpse Ashes')
  })

  it('never mistakes footer control hints for an item', () => {
    const stream = words([
      ['Inventory', 60, 10],
      ['Tools', 70, 60],
      ['Blue', 70, 140],
      ['Cipher', 160, 140],
      ['Ring', 280, 140],
      ['Select', 60, 700],
      ['an', 130, 700],
      ['item', 180, 700],
      ['to', 240, 700],
      ['interact', 290, 700],
      ['with', 400, 700],
    ])
    expect(extractScanObservation(stream, WIDTH, 800).name).toBe('Blue Cipher Ring')
  })

  it('anchors the "No. Held" count', () => {
    const stream = words([
      ['Tools', 70, 60],
      ['Blue', 70, 140],
      ['Cipher', 160, 140],
      ['Ring', 280, 140],
      ['No.', 700, 200],
      ['Held', 760, 200],
      ['4', 840, 200],
    ])
    expect(extractScanObservation(stream, WIDTH, 800).held).toBe(4)
  })
})

describe('InventoryStabilizer', () => {
  const resolver = (name: string, category?: string) => pickItemCandidate(name, category, [
    { id: 'item:ambush-shard', name: 'Ambush Shard', kind: 'spell' },
    { id: 'item:blue-cipher-ring', name: 'Blue Cipher Ring', kind: 'item' },
    { id: 'item:grave-glovewort-1', name: 'Grave Glovewort [1]', kind: 'item' },
  ])

  const obs = (over: Partial<ScanObservation>): ScanObservation => ({ confidence: 0.9, ...over })

  it('confirms a name only after two agreeing reads and merges fuzzy variants', () => {
    const stab = new InventoryStabilizer({ resolve: resolver })
    stab.observe(obs({ name: 'Ambush Shard', category: 'sorcery', held: 3, confidence: 0.6 }))
    stab.observe(obs({ name: 'Ambush Shord', category: 'sorcery', held: 5, confidence: 0.8 }))
    const result = stab.result()
    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Ambush Shard')
    expect(result.items[0].held).toBe(5)
    expect(result.items[0].frames).toBe(2)
    expect(result.items[0].confirmed).toBe(true)
    expect(result.items[0].factId).toBe('item:ambush-shard')
  })

  it('keeps a single low-confidence read as pending, not confirmed', () => {
    const stab = new InventoryStabilizer({ resolve: resolver })
    stab.observe(obs({ name: 'Blue Cipher Ring', category: 'tool' }))
    const result = stab.result()
    expect(result.items).toHaveLength(0)
    expect(result.pending).toHaveLength(1)
    expect(result.pending[0].confirmed).toBe(false)
  })

  it('does not let a truncated read replace the full spelling', () => {
    const stab = new InventoryStabilizer({ resolve: resolver })
    stab.observe(obs({ name: 'Grave Glovewort', category: 'material' }))
    stab.observe(obs({ name: 'Grave Glovewort (1)', category: 'material' }))
    expect(stab.result().items[0].name).toBe('Grave Glovewort (1)')
  })

  it('dedupes by resolved fact id across different spellings', () => {
    const stab = new InventoryStabilizer({ resolve: resolver })
    stab.observe(obs({ name: 'Ambush Shard', category: 'sorcery' }))
    stab.observe(obs({ name: 'Blue Cipher Ring', category: 'tool' }))
    stab.observe(obs({ name: 'Ambush Shard', category: 'sorcery' }))
    const result = stab.result()
    expect(result.items.map((i) => i.factId)).toEqual(['item:ambush-shard'])
    expect(result.items[0].frames).toBe(2)
    // The single Blue Cipher Ring read is not confirmed yet.
    expect(result.pending.map((i) => i.factId)).toEqual(['item:blue-cipher-ring'])
  })

  it('merges the Character Status column across reads', () => {
    const stab = new InventoryStabilizer({ resolve: resolver })
    const status = (vigor: number): ScanObservation['status'] => ({
      fields: { level: { value: 87, confidence: 0.9 }, vigor: { value: vigor, confidence: 0.9 } },
    })
    stab.observe(obs({ name: 'Blue Cipher Ring', category: 'tool', status: status(59) }))
    stab.observe(obs({ name: 'Blue Cipher Ring', category: 'tool', status: status(64) }))
    expect(stab.result().status?.level).toBe(87)
    expect(stab.result().status?.displayedStats.vigor).toBe(59)
  })
})

describe('analyzeFrame', () => {
  it('returns one observation per variant × psm through the injected OCR', async () => {
    const frame = words([
      ['Tools', 70, 60],
      ['Blue', 70, 140],
      ['Cipher', 160, 140],
      ['Ring', 280, 140],
    ])
    const calls: string[] = []
    const ocr = async (_image: unknown, psm: string) => {
      calls.push(psm)
      return frame
    }
    const observations = await analyzeFrame([1, 2, 3], WIDTH, ocr)
    expect(observations).toHaveLength(6)
    expect(calls).toEqual(['6', '4', '6', '4', '6', '4'])
    expect(observations[0].name).toBe('Blue Cipher Ring')
  })
})

describe('recipesForCookbook', () => {
  it('finds every recipe a cookbook unlocks', () => {
    const recipes = [
      { id: 'recipe:1', name: 'Fire Pot', materials: [{ name: "Nomadic Warrior's Cookbook [1]", qty: 1 }, { name: 'Pot', qty: 1 }] },
      { id: 'recipe:2', name: 'Bright Pot', materials: [{ name: "Nomadic Warrior's Cookbook [1]", qty: 1 }] },
      { id: 'recipe:3', name: 'Crystal Dart', materials: [{ name: 'Crystal Bud', qty: 1 }] },
    ]
    expect(recipesForCookbook(recipes, "Nomadic Warrior's Cookbook [1]").map((r) => r.id)).toEqual(['recipe:1', 'recipe:2'])
    expect(recipesForCookbook(recipes, 'Missing Cookbook')).toEqual([])
  })
})
