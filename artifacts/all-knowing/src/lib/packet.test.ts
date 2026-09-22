import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import type { Character, Evidence, EvidenceClaim, EvidenceSource } from '../types'
import { reconcileFacts } from './infer'
import {
  QR_MAX_BYTES,
  diffPacket,
  mergeEvidence,
  mergePacket,
  packetFileName,
  packetJson,
  type PacketDiffRow,
} from './packet'

function claim(fact: string, source: EvidenceSource, polarity: EvidenceClaim, at: number): Evidence {
  return { id: `${source}:${fact}:${at}`, fact, source, confidence: 0.9, claim: polarity, at }
}

function characterWith(evidence: Evidence[], facts: string[]): Character {
  return reconcileFacts({ ...emptyCharacter, evidence }, facts)
}

function rowFor(rows: PacketDiffRow[], fact: string) {
  return rows.find((r) => r.fact === fact)
}

describe('packet share payload (Task 57)', () => {
  it('exports compact JSON with no screenshot blobs', () => {
    const c: Character = {
      ...emptyCharacter,
      shots: [{ id: 's', kind: 'map', name: 'x', url: 'blob:http://local/x', notes: '', hits: [] }],
    }
    const json = packetJson(c)
    expect(json).not.toContain('blob:')
    expect(json).toContain('"kind":"all-knowing.packet"')
    expect((JSON.parse(json) as { character: { shots: unknown[] } }).character.shots).toEqual([])
  })

  it('names the file from the character', () => {
    expect(packetFileName({ ...emptyCharacter, name: 'Tarnished One' })).toBe('tarnished-one.all-knowing.json')
    expect(packetFileName({ ...emptyCharacter, name: '' })).toBe('tarnished.all-knowing.json')
  })

  it('is larger than a QR can hold for a realistic run, so the handoff is hash-only', () => {
    const c: Character = {
      ...emptyCharacter,
      collectedItems: Array.from({ length: 40 }, (_, i) => `item:x${i}`),
      evidence: Array.from({ length: 40 }, (_, i) => ({
        id: `e${i}`,
        fact: `item:x${i}`,
        source: 'answer' as const,
        confidence: 0.9,
        at: i,
        detail: 'seed',
      })),
    }
    expect(new Blob([packetJson(c)]).size).toBeGreaterThan(QR_MAX_BYTES)
  })
})

describe('mergeEvidence', () => {
  it('pools both sides and keeps one entry per id', () => {
    const a = claim('boss:margit', 'screenshot', 'true', 1_000)
    const b = claim('boss:margit', 'answer', 'false', 2_000)
    const merged = mergeEvidence([a], [a, b])
    expect(merged).toHaveLength(2)
    expect(merged.some((e) => e.id === a.id)).toBe(true)
    expect(merged.some((e) => e.id === b.id)).toBe(true)
  })
})

describe('diffPacket — new facts', () => {
  it('reports a fact the local character did not know as added', () => {
    const incoming = characterWith([claim('boss:margit', 'answer', 'true', 1_000)], ['boss:margit'])
    const diff = diffPacket(emptyCharacter, incoming)
    const row = rowFor(diff.added, 'boss:margit')
    expect(row).toBeDefined()
    expect(row?.before).toBe('unknown')
    expect(row?.after).toBe('true')
    expect(row?.incoming).toBe('true')
    expect(diff.flipped).toHaveLength(0)
  })
})

describe('diffPacket — conflicts decided by Task 24 authority', () => {
  it('flips a local answer when the packet carries a trusted save flag', () => {
    const local = characterWith([claim('boss:margit', 'answer', 'true', 1_000)], ['boss:margit'])
    const incoming = characterWith([claim('boss:margit', 'save', 'false', 2_000)], ['boss:margit'])

    const diff = diffPacket(local, incoming, { trustedSave: true })
    const row = rowFor(diff.flipped, 'boss:margit')
    expect(row).toBeDefined()
    expect(row?.before).toBe('true')
    expect(row?.after).toBe('false')
    expect(row?.winner).toBe('save')
    expect(row?.importedWins).toBe(true)
    expect(diff.added).toHaveLength(0)
  })

  it('reports the packet as losing when a local screenshot outranks its answer', () => {
    const local = characterWith([claim('boss:margit', 'screenshot', 'true', 1_000)], ['boss:margit'])
    const incoming = characterWith([claim('boss:margit', 'answer', 'false', 2_000)], ['boss:margit'])

    const diff = diffPacket(local, incoming)
    const row = rowFor(diff.lost, 'boss:margit')
    expect(row).toBeDefined()
    expect(row?.before).toBe('true')
    expect(row?.after).toBe('true')
    expect(row?.incoming).toBe('false')
    expect(row?.winner).toBe('screenshot')
    expect(row?.importedWins).toBe(false)
    expect(diff.flipped).toHaveLength(0)
    expect(diff.added).toHaveLength(0)
  })

  it('an untrusted save cannot flip a local answer', () => {
    const local = characterWith([claim('boss:margit', 'answer', 'true', 1_000)], ['boss:margit'])
    const incoming = characterWith([claim('boss:margit', 'save', 'false', 2_000)], ['boss:margit'])

    const diff = diffPacket(local, incoming, { trustedSave: false })
    expect(diff.flipped).toHaveLength(0)
    const row = rowFor(diff.lost, 'boss:margit')
    expect(row?.after).toBe('true')
    expect(row?.winner).toBe('answer')
  })
})

describe('mergePacket', () => {
  it('merges evidence and keeps both sides without a silent overwrite', () => {
    const local = characterWith([claim('boss:godrick', 'screenshot', 'true', 1_000)], ['boss:godrick'])
    const incoming = characterWith([claim('boss:margit', 'save', 'true', 2_000)], ['boss:margit'])

    const merged = mergePacket(local, incoming)
    expect(merged.defeatedBosses).toContain('boss:godrick')
    expect(merged.defeatedBosses).toContain('boss:margit')
    expect(merged.evidence).toHaveLength(2)
  })

  it('resolves a conflict in favour of the higher-authority evidence, keeping the loser', () => {
    const local = characterWith([claim('boss:margit', 'answer', 'true', 1_000)], ['boss:margit'])
    const incoming = characterWith([claim('boss:margit', 'save', 'false', 2_000)], ['boss:margit'])

    const merged = mergePacket(local, incoming, { trustedSave: true })
    expect(merged.defeatedBosses).not.toContain('boss:margit')
    expect(merged.deniedFacts).toContain('boss:margit')
    expect(merged.evidence.some((e) => e.source === 'save' && e.claim === 'false')).toBe(true)
    expect(merged.evidence.some((e) => e.source === 'answer' && e.claim === 'true')).toBe(true)
  })

  it('does not lose local facts the packet has never heard of', () => {
    const local = characterWith([claim('grace:elleh', 'answer', 'true', 1_000)], ['grace:elleh'])
    const incoming = characterWith([claim('boss:margit', 'answer', 'true', 2_000)], ['boss:margit'])

    const merged = mergePacket(local, incoming)
    expect(merged.discoveredGraces).toContain('grace:elleh')
    expect(merged.defeatedBosses).toContain('boss:margit')
  })
})
