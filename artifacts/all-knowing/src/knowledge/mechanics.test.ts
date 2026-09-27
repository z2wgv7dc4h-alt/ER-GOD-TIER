import { describe, expect, it } from 'vitest'
import { allEntities } from '../lib/entityGraph'
import { mechanicById, mechanicTerms, mechanics } from './mechanics'

function sentenceCount(body: string): number {
  return body.split(/(?<=[.!?])\s+/).filter(Boolean).length
}

describe('mechanics glossary (Task 106)', () => {
  it('ships 40+ cards', () => {
    expect(mechanics.length).toBeGreaterThanOrEqual(40)
  })

  it('has unique ids and a stable mechanic:<slug> shape', () => {
    const seen = new Set<string>()
    for (const m of mechanics) {
      expect(m.id, m.title).toBe(`mechanic:${m.slug}`)
      expect(seen.has(m.id), `duplicate ${m.id}`).toBe(false)
      seen.add(m.id)
    }
  })

  it('gives every card a title, 2–4 sentences and key numbers', () => {
    for (const m of mechanics) {
      expect(m.title.trim().length, m.id).toBeGreaterThan(0)
      const sentences = sentenceCount(m.body)
      expect(sentences, `${m.id} has ${sentences} sentences`).toBeGreaterThanOrEqual(2)
      expect(sentences, `${m.id} has ${sentences} sentences`).toBeLessThanOrEqual(4)
      expect(m.numbers.length, m.id).toBeGreaterThan(0)
      for (const n of m.numbers) expect(n.trim().length, m.id).toBeGreaterThan(0)
      expect(m.source.trim().length, m.id).toBeGreaterThan(0)
    }
  })

  it('resolves every related id through the entity graph', () => {
    const known = new Set(allEntities().map((e) => e.id))
    for (const m of mechanics) {
      for (const rel of m.related) {
        expect(known.has(rel), `${m.id} → ${rel}`).toBe(true)
      }
    }
  })

  it('covers the mechanics the brief names', () => {
    const slugs = new Set(mechanics.map((m) => m.slug))
    for (const slug of [
      'poise',
      'stance-break',
      'soft-cap-vigor',
      'equip-load',
      'flask-charges',
      'flask-potency',
      'great-runes',
      'rune-arc',
      'scadutree-blessing',
      'revered-spirit-ash',
      'affinities',
      'status-bleed',
      'hyperarmor',
      'critical-hits',
      'guard-counter',
      'two-handing',
      'rune-loss',
      'ng-plus',
      'summoning-pools',
    ]) {
      expect(slugs.has(slug), `missing ${slug}`).toBe(true)
    }
  })

  it('looks a card up by id and exposes autolink terms', () => {
    expect(mechanicById('mechanic:poise')?.title).toBe('Poise')
    expect(mechanicById('mechanic:nope')).toBeUndefined()
    const terms = mechanicTerms()
    expect(terms.some((t) => t.id === 'mechanic:rune-arc' && t.term === 'Rune Arc')).toBe(true)
    expect(terms.every((t) => t.term.trim().length > 0)).toBe(true)
  })
})
