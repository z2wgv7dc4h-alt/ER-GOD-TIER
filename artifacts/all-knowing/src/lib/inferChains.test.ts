import { describe, expect, it, vi } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { byId } from '../knowledge/catalog'
import { planRoute } from '../knowledge/endings'
import { chainsFor, explainInference, inferChains } from '../knowledge/inferChains'
import { allLines } from '../knowledge/storylines'
import type { Character } from '../types'
import { applyFacts, closeWorld, denyFacts } from './infer'
import { applyOcrRead } from './ocr'

// Wrap the real applyFacts so we can assert a low-confidence read never reaches it.
vi.mock('./infer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./infer')>()
  return { ...actual, applyFacts: vi.fn(actual.applyFacts) }
})

function known(c: Character, id: string): boolean {
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

function ranniLine() {
  const line = allLines.find((l) => l.id === 'ranni')
  if (!line) throw new Error('no ranni line')
  return line
}

describe('inference chain table', () => {
  it('references only fact ids that exist, and the required chains are present', () => {
    const required = [
      'item:fingerslayer',
      'item:godrick-great-rune',
      'item:radahn-great-rune',
      'item:rennala-great-rune',
      'item:black-knifeprint',
      'item:pureblood-medal',
      'item:mimic-tear-ashes',
      'item:black-whetblade',
      'item:twinned-armor',
      'item:haligtree-medallion-left',
      'item:haligtree-medallion-right',
    ]
    for (const id of required) {
      expect(byId.has(id), `whenFact ${id}`).toBe(true)
      expect(chainsFor(id).length, `chain for ${id}`).toBeGreaterThan(0)
    }
    for (const chain of inferChains) {
      expect(chain.whenFact).toBeTruthy()
      expect(chain.confidence).toBeGreaterThan(0)
      expect(chain.why.length).toBeGreaterThan(0)
      for (const id of chain.implies) {
        // Targets may be quest grants rather than catalog rows, but every target
        // must be a real in-repo id string, never a fabricated one.
        expect(id).toMatch(/^[a-z]+:[a-z0-9:-]+$/)
      }
    }
  })

  it('hotfix: whetblade does not imply Radahn, twinned does not imply D’s brother', () => {
    expect(
      inferChains.filter((c) => c.whenFact === 'item:black-whetblade' && c.implies.includes('boss:radahn')),
    ).toHaveLength(0)
    expect(
      inferChains.filter((c) => c.whenFact === 'item:twinned-armor' && c.implies.includes('quest:d:brother')),
    ).toHaveLength(0)
    expect(chainsFor('item:black-whetblade')[0].implies).toContain('grace:night-sacred-ground')
    expect(chainsFor('item:twinned-armor')[0].implies).toContain('quest:fia:dagger')
  })

  it('explains why a fact was inferred', () => {
    expect(chainsFor('item:fingerslayer')[0].implies).toContain('quest:ranni:nokron')
    expect(chainsFor('item:fingerslayer')[0].why).toMatch(/Nokron/i)
    expect(explainInference('item:fingerslayer', 'quest:ranni:nokron')).toMatch(/Nokron/i)
    // Catalog implies edges are explainable too, and unrelated pairs are not.
    expect(explainInference('item:godrick-great-rune', 'boss:godrick')).toBeTruthy()
    expect(explainInference('item:fingerslayer', 'boss:morgott')).toBeUndefined()
  })
})

describe('reuses closeWorld, not a second closer', () => {
  it('closes a chain through the existing closer', () => {
    const closed = closeWorld(['item:fingerslayer'])
    expect(closed).toContain('item:fingerslayer')
    expect(closed).toContain('quest:ranni:nokron')
  })
})

describe('Fingerslayer -> Ranni Nokron beat', () => {
  it('marks the Nokron beat and never falls back to "meet Ranni"', () => {
    const midRun = applyFacts(emptyCharacter, ['boss:radahn', 'quest:ranni:service'], 'answer', 'fixture')
    const after = applyFacts(midRun, ['item:fingerslayer'], 'screenshot', 'inventory shot')

    expect(after.completedQuestSteps).toContain('quest:ranni:nokron')
    const plan = planRoute(after, ranniLine())
    expect(plan.current).toBeTruthy()
    expect(plan.current!.id).not.toBe('s1')
    expect(plan.current!.do).not.toMatch(/Enter Ranni’s service/i)
  })
})

describe('Great Rune chains', () => {
  it('marks only the matching boss for Godrick’s Great Rune', () => {
    const after = applyFacts(emptyCharacter, ['item:godrick-great-rune'], 'screenshot', 'rune page')
    expect(after.defeatedBosses).toContain('boss:godrick')
    // No activated-rune or Leyndell bleed-through.
    expect(known(after, 'boss:morgott')).toBe(false)
    expect(after.deniedFacts).not.toContain('boss:morgott')
  })

  it('maps each Great Rune to its own shardbearer', () => {
    for (const [item, boss] of [
      ['item:radahn-great-rune', 'boss:radahn'],
      ['item:rennala-great-rune', 'boss:rennala'],
    ] as const) {
      const after = applyFacts(emptyCharacter, [item], 'screenshot', 'rune page')
      expect(after.defeatedBosses).toContain(boss)
    }
  })
})

describe('conflict: deny beats inference', () => {
  it('keeps the Radahn deny winning and records the losing inference', () => {
    let c = denyFacts(emptyCharacter, ['boss:radahn'], 'photographed absence')
    c = applyFacts(c, ['item:radahn-great-rune'], 'screenshot', 'rune page')

    expect(c.deniedFacts).toContain('boss:radahn')
    expect(c.defeatedBosses).not.toContain('boss:radahn')
    expect(c.evidence.some((e) => e.fact === 'boss:radahn' && e.claim === 'false')).toBe(true)
    expect(c.evidence.some((e) => e.fact === 'boss:radahn' && e.source === 'inference')).toBe(true)
  })
})

describe('Haligtree Secret Medallion halves', () => {
  it('does not grant the Haligtree gate from one half', () => {
    const right = applyFacts(emptyCharacter, ['item:haligtree-medallion-right'], 'screenshot', 'key items')
    expect(right.collectedItems).toContain('item:haligtree-medallion-right')
    expect(known(right, 'item:haligtree-secret-medallion')).toBe(false)
    expect(known(right, 'region:haligtree')).toBe(false)
  })

  it('grants the gate only once both halves are known', () => {
    const right = applyFacts(emptyCharacter, ['item:haligtree-medallion-right'], 'screenshot', 'key items')
    const both = applyFacts(right, ['item:haligtree-medallion-left'], 'screenshot', 'key items 2')
    expect(known(both, 'item:haligtree-secret-medallion')).toBe(true)
    expect(known(both, 'region:haligtree')).toBe(true)
  })

  it('fires when both halves arrive in one batch', () => {
    const both = applyFacts(
      emptyCharacter,
      ['item:haligtree-medallion-left', 'item:haligtree-medallion-right'],
      'screenshot',
      'key items',
    )
    expect(known(both, 'item:haligtree-secret-medallion')).toBe(true)
  })
})

describe('low-confidence OCR', () => {
  it('never calls applyFacts', () => {
    vi.mocked(applyFacts).mockClear()
    const outcome = applyOcrRead(emptyCharacter, { text: 'Fingerslayer Blade', confidence: 0.4 }, 'screenshot:inventory')
    expect(outcome.status).toBe('low-confidence')
    expect(vi.mocked(applyFacts)).not.toHaveBeenCalled()
    expect(outcome.alsoMarked).toHaveLength(0)
    expect(outcome.character).toBe(emptyCharacter)
  })

  it('reports freshly inferred extras as an also-marked list', () => {
    const outcome = applyOcrRead(emptyCharacter, { text: 'Fingerslayer Blade', confidence: 0.9 }, 'screenshot:inventory')
    expect(outcome.status).toBe('applied')
    // boss:radahn is only implied, never name-matched from the item text.
    expect(outcome.alsoMarked.some((m) => m.id === 'boss:radahn')).toBe(true)
    expect(outcome.alsoMarked.length).toBeGreaterThan(0)
    // The directly-read item is not repeated in the inferred list.
    expect(outcome.alsoMarked.some((m) => m.id === 'item:fingerslayer')).toBe(false)
  })
})
