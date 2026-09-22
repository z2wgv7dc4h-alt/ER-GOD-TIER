import { describe, expect, it } from 'vitest'
import {
  BUILD_CODE_PREFIX,
  decodeBuildCode,
  encodeBuildCode,
  tryDecodeBuildCode,
  type BuildPayload,
} from './buildCode'

const build: BuildPayload = {
  level: 150,
  stats: {
    vigor: 50,
    mind: 20,
    endurance: 25,
    strength: 12,
    dexterity: 40,
    intelligence: 9,
    faith: 8,
    arcane: 45,
  },
  loadout: [
    { id: 'rob', name: 'Rivers of Blood', kind: 'armament', upgrade: 10 },
    { id: 'uchi', name: 'Uchigatana', kind: 'armament', affinity: 'Blood', upgrade: 25 },
    { id: 'exult', name: "Lord of Blood's Exultation", kind: 'talisman' },
  ],
}

describe('build codes (Task 47)', () => {
  it('round-trips stats, level and loadout identically', () => {
    const code = encodeBuildCode(build)
    expect(code.startsWith(BUILD_CODE_PREFIX)).toBe(true)
    const decoded = decodeBuildCode(code)
    expect(decoded.level).toBe(build.level)
    expect(decoded.stats).toEqual(build.stats)
    expect(decoded.loadout).toEqual(build.loadout)
  })

  it('carries an optional build label, never a character name', () => {
    expect(decodeBuildCode(encodeBuildCode({ ...build, name: 'Rivers PvP' })).name).toBe('Rivers PvP')
    expect(decodeBuildCode(encodeBuildCode(build)).name).toBeUndefined()
  })

  it('is compact', () => {
    expect(encodeBuildCode(build).length).toBeLessThan(300)
  })

  it('rejects garbage cleanly instead of throwing through the UI path', () => {
    for (const bad of ['', '   ', 'hello world', 'akb1.', 'akb1.!!!!', 'packet:abc', `akb1.${btoa('not json')}`]) {
      expect(() => decodeBuildCode(bad), JSON.stringify(bad)).toThrow()
      const res = tryDecodeBuildCode(bad)
      expect(res.ok, JSON.stringify(bad)).toBe(false)
      if (!res.ok) expect(res.error.length).toBeGreaterThan(0)
    }
  })

  it('rejects a tampered payload with out-of-range stats', () => {
    const badJson = JSON.stringify({ l: 150, s: [0, 20, 25, 12, 40, 9, 8, 45], k: [] })
    const body = Buffer.from(badJson, 'utf8').toString('base64url')
    const res = tryDecodeBuildCode(`${BUILD_CODE_PREFIX}${body}`)
    expect(res.ok).toBe(false)
  })
})
