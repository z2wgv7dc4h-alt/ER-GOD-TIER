/// <reference types="node" />
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { parseSave } from './parse'
import { SaveMagicError } from './reader'

const fixture = fileURLToPath(
  new URL('../../../.scratch/elden-ring-compass/packages/save-parser/test/fixtures/ER0000.sl2', import.meta.url),
)
const oraclePath = fileURLToPath(
  new URL('../../../.scratch/elden-ring-compass/packages/save-parser/test/fixtures/oracle.er0000.json', import.meta.url),
)

const hasFixture = existsSync(fixture)

describe.skipIf(!hasFixture)('parseSave vs real ER0000.sl2 fixture', () => {
  // hasFixture only skips the it()s below, not this callback's own body -
  // the fixture read must happen in beforeAll so it never runs when absent.
  let oracle: any
  let parsed: ReturnType<typeof parseSave>

  beforeAll(() => {
    const buf = readFileSync(fixture)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    oracle = JSON.parse(readFileSync(oraclePath, 'utf8'))
    parsed = parseSave(ab)
  })

  it('reads the global steam id and the same active slots', () => {
    expect(parsed.globalSteamId).toBe(oracle.global_steam_id)
    expect(parsed.slots.length).toBe(oracle.slots.length)
  })

  it('matches each slot name/level/stats against the frozen oracle', () => {
    for (let i = 0; i < oracle.slots.length; i++) {
      const o = oracle.slots[i]
      const p = parsed.slots[i]
      expect(p.steamId).toBe(o.steam_id)
      expect(p.characterName).toBe(o.player_game_data.character_name)
      expect(p.level).toBe(o.player_game_data.level)
      expect(p.stats.vigor).toBe(o.player_game_data.vigor)
      expect(p.stats.mind).toBe(o.player_game_data.mind)
      expect(p.stats.endurance).toBe(o.player_game_data.endurance)
      expect(p.stats.strength).toBe(o.player_game_data.strength)
      expect(p.stats.dexterity).toBe(o.player_game_data.dexterity)
      expect(p.stats.intelligence).toBe(o.player_game_data.intelligence)
      expect(p.stats.faith).toBe(o.player_game_data.faith)
      expect(p.stats.arcane).toBe(o.player_game_data.arcane)
      expect(p.archetype).toBe(o.player_game_data.arche_type)
      expect(p.regions.length).toBe(o.regions.unlocked_regions_count)
      expect(p.eventFlags.length).toBe(o.event_flags.flags_length)
    }
  })
})

describe('parseSave rejects non-saves', () => {
  it('throws on a buffer without the BND4 magic', () => {
    const small = new Uint8Array(0x400).buffer
    expect(() => parseSave(small)).toThrow(SaveMagicError)
  })
})
