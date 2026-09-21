/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { canonicalFactId } from '../lib/aliases'
import { eventFlagOffset, saveFacts } from '../lib/sl2/facts'
import type { ParsedSlot } from '../lib/sl2/parse'
import { fieldHunts } from './completion'

/**
 * The canonical dump is read straight off disk here, not imported from
 * completion.ts, so this is a real drift guard: if the two ever disagree the
 * test fails instead of both sides moving together.
 */
const hunts = JSON.parse(
  readFileSync(new URL('../../public/sourced/checklists/hunts.json', import.meta.url), 'utf8'),
) as { id: string; name: string; place: string; region: string; flag: number; campaign: string }[]

describe('fieldHunts is derived from the canonical hunts.json dump', () => {
  it('points every curated hunt at a real canonical row', () => {
    for (const hunt of fieldHunts) {
      const row = hunts.find((r) => r.id === hunt.id && r.place === hunt.place)
      expect(row, `${hunt.id} @ ${hunt.place} missing from hunts.json`).toBeDefined()
    }
  })

  it('takes id, name, region and campaign from the canonical row, not authored labels', () => {
    for (const hunt of fieldHunts) {
      const row = hunts.find((r) => r.id === hunt.id && r.place === hunt.place)!
      expect(hunt.name).toBe(row.name)
      expect(hunt.region).toBe(row.region)
      expect(hunt.campaign).toBe(row.campaign)
    }
  })

  it('has no duplicate ids (two curated names cannot split one canonical fact)', () => {
    expect(new Set(fieldHunts.map((h) => h.id)).size).toBe(fieldHunts.length)
  })

  it('no longer carries the old divergent ids that split fact identity', () => {
    const ids = new Set(fieldHunts.map((h) => h.id))
    for (const stale of ['hunt:agheel', 'hunt:smarag', 'hunt:tibia', 'hunt:tree-sentinel-limgrave', 'hunt:fingerstone-beast']) {
      expect(ids.has(stale), `${stale} should have been replaced by its canonical id`).toBe(false)
    }
  })
})

describe('the save parser reads hunt facts under the same canonical ids', () => {
  it('can address every canonical hunt flag in the bitfield', () => {
    for (const row of hunts) {
      expect(eventFlagOffset(row.flag), `${row.id} flag ${row.flag}`).not.toBeNull()
    }
  })

  it('turns a set canonical hunt flag into the canonical hunt fact', () => {
    const row = hunts.find((r) => r.id === 'hunt:soldier-of-godrick')!
    const [byte, bit] = eventFlagOffset(row.flag)!
    const eventFlags = new Uint8Array(byte + 1)
    eventFlags[byte] = 1 << bit
    const slot: ParsedSlot = {
      index: 0,
      version: 0,
      steamId: '0',
      secondsPlayed: 0,
      characterName: 'Test',
      level: 1,
      stats: { vigor: 0, mind: 0, endurance: 0, strength: 0, dexterity: 0, intelligence: 0, faith: 0, arcane: 0 },
      archetype: 0,
      hp: 0,
      maxHp: 0,
      fp: 0,
      maxFp: 0,
      stamina: 0,
      maxStamina: 0,
      runes: 0,
      deaths: 0,
      gender: 0,
      mapId: [0, 0, 0, 0],
      regions: [],
      lastRestedGrace: 0,
      eventFlags,
      dlc: { shadowOfErdtree: false, preorderTheRing: false, preorderRingOfMiquella: false },
    }

    const { facts } = saveFacts(slot)
    expect(facts).toContain(canonicalFactId(row.id))
    expect(canonicalFactId(row.id)).toBe('hunt:soldier-of-godrick')
  })
})
