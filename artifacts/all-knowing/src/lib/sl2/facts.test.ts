/// <reference types="node" />
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { analyzeSave } from './analyze'
import { saveFacts, eventFlagOffset } from './facts'
import { parseSave } from './parse'
import { characterFromResult } from '../save'

const fixture = fileURLToPath(
  new URL('../../../.scratch/elden-ring-compass/packages/save-parser/test/fixtures/ER0000.sl2', import.meta.url),
)
const hasFixture = existsSync(fixture)

function fixtureBuffer() {
  const buf = readFileSync(fixture)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

function checksum(bytes: Uint8Array) {
  let h = 2166136261
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

describe('event flag addressing', () => {
  it('maps known flag ids to a byte/bit inside the bitfield', () => {
    expect(eventFlagOffset(10000800)).not.toBeNull()
    expect(eventFlagOffset(71000)).not.toBeNull()
    expect(eventFlagOffset(999999999)).toBeNull()
  })
})

describe.skipIf(!hasFixture)('save facts from the real ER0000.sl2 fixture', () => {
  it('produces non-demo stats, a class and real fact lists', () => {
    const result = analyzeSave(fixtureBuffer())
    expect(result.characterName).toBe('first')
    expect(result.level).toBe(105)
    expect(result.stats.vigor).toBe(40)
    expect(result.startingClass).toBe('vagabond')
    expect(result.slotCount).toBe(5)
    expect(result.facts.length).toBeGreaterThan(0)

    const character = characterFromResult(result, 'ER0000.sl2')
    expect(character.source).toBe('save')
    expect(character.platform).toBe('pc')
    expect(character.defeatedBosses.length).toBeGreaterThan(0)
    expect(character.discoveredGraces.length).toBeGreaterThan(0)
    expect(character.evidence.every((e) => e.source === 'save' || e.source === 'inference')).toBe(true)
  })

  it('does not touch the network while parsing', () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('network used during parse')
    })
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchSpy
    try {
      const result = analyzeSave(fixtureBuffer())
      characterFromResult(result, 'ER0000.sl2')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('never mutates the input buffer', () => {
    const buffer = fixtureBuffer()
    const before = checksum(new Uint8Array(buffer))
    parseSave(buffer)
    const after = checksum(new Uint8Array(buffer))
    expect(after).toBe(before)
  })

  it('finds at least one known boss/grace flag set on the fixture', () => {
    const parsed = parseSave(fixtureBuffer())
    const facts = saveFacts(parsed.slots[0]).facts
    expect(facts.some((f) => f.startsWith('boss:') || f.startsWith('grace:'))).toBe(true)
  })
})
