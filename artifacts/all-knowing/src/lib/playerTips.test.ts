import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { playerTips, regionTipsFor, tipsByKind, tipsFor, type PlayerTipKind } from './playerTips'

/**
 * Task 195 §1/§3 — guards for the curated player-tip file: schema, placement
 * coverage, text hygiene (no URL, no username) and the rule that no tip merely
 * restates a sentence the entity page already carries.
 */

type Record_ = {
  description?: string
  strategy?: string
  location?: string
  sections?: { heading: string; text: string }[]
}

const index = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url)), 'utf8'),
) as { records: Record<string, Record_> }

const KINDS: PlayerTipKind[] = ['boss', 'item', 'pvp', 'mechanic', 'region', 'general']
const URL_RE = /https?:\/\//i
const USERNAME = /(?<![A-Za-z0-9])u\/[A-Za-z0-9_-]{2,}/i

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const sentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40)

describe('Task 195 §1 — player-tips schema', () => {
  it('ships the reviewed set', () => {
    expect(playerTips.length).toBeGreaterThan(20)
  })

  it('gives every tip a unique id, a resolved entity, kind, text, patch and score', () => {
    const seen = new Set<string>()
    for (const tip of playerTips) {
      expect(tip.id).toMatch(/^tip:[0-9a-f]{10}$/)
      expect(seen.has(tip.id)).toBe(false)
      seen.add(tip.id)
      expect(KINDS).toContain(tip.kind)
      expect(typeof tip.entityId).toBe('string')
      expect(index.records[tip.entityId], tip.entityId).toBeTruthy()
      expect(typeof tip.text).toBe('string')
      expect(tip.text.trim().length).toBeGreaterThan(0)
      expect(tip.text.length).toBeLessThanOrEqual(400)
      expect(tip.patch).toMatch(/^\d/)
      expect(typeof tip.score).toBe('number')
    }
  })

  it('covers every placement kind', () => {
    for (const kind of KINDS) expect(tipsByKind(kind).length, kind).toBeGreaterThan(0)
  })

  it('maps a region to its region tips', () => {
    expect(tipsFor('region:limgrave', 'region')).toHaveLength(1)
    expect(regionTipsFor('Limgrave').map((t) => t.entityId)).toContain('region:limgrave')
  })
})

describe('Task 195 §1/§3 — text hygiene', () => {
  it('renders no URL', () => {
    expect(playerTips.filter((t) => URL_RE.test(t.text)).map((t) => t.id)).toEqual([])
  })

  it('renders no username', () => {
    expect(playerTips.filter((t) => USERNAME.test(t.text)).map((t) => t.id)).toEqual([])
  })
})

describe('Task 195 §1 — no tip duplicates an existing page sentence', () => {
  it('does not restate its entity page', () => {
    const offenders: [string, string][] = []
    for (const tip of playerTips) {
      const record = index.records[tip.entityId]
      const page = [
        record.description,
        record.strategy,
        record.location,
        ...(record.sections ?? []).map((s) => s.text),
      ]
        .filter(Boolean)
        .join(' ')
      const tipNorm = norm(tip.text)
      for (const sentence of sentences(page)) {
        const s = norm(sentence)
        if (!s) continue
        if (tipNorm.includes(s) || s.includes(tipNorm)) {
          offenders.push([tip.id, sentence])
          break
        }
      }
    }
    expect(offenders.slice(0, 3)).toEqual([])
  })
})
