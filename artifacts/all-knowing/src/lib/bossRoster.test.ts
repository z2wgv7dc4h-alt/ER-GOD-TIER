import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  bossFactCount,
  bossFactIds,
  bossRoster,
  isRosterMajor,
  rosterGroups,
  TIER_LABEL,
  type BossTier,
} from './bossRoster'

/**
 * Task 130 §1/§2 — the canonical boss roster guard.
 *
 * The repo shipped 112 boss rows in Setup; the roster must cover the game's
 * encounters (base + Shadow of the Erdtree), every record must carry a location
 * and a region, and the entity index must know every fact id it names.
 */

const index = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url)), 'utf8'),
) as { records: Record<string, { id: string; kind: string; location?: string; region?: string }> }
const bossRecords = Object.values(index.records).filter((r) => r.kind === 'boss')

const TIERS = new Set(Object.keys(TIER_LABEL) as BossTier[])

describe('boss roster (Task 130)', () => {
  it('covers the whole game, not the old 112', () => {
    expect(bossRoster.length).toBeGreaterThan(207)
    expect(bossFactCount).toBeGreaterThan(150)
    expect(new Set(bossRoster.map((b) => b.campaign))).toEqual(new Set(['base', 'sote']))
  })

  it('is 100% location + region and every tier is known', () => {
    for (const row of bossRoster) {
      expect(row.location, `${row.id} location`).toBeTruthy()
      expect(row.region, `${row.id} region`).toBeTruthy()
      expect(TIERS.has(row.tier), `${row.id} tier ${row.tier}`).toBe(true)
    }
  })

  it('shares its fact ids with the entity graph and never exceeds the index', () => {
    const indexIds = new Set(bossRecords.map((r) => r.id))
    for (const id of bossFactIds) expect(indexIds.has(id), `${id} missing from index`).toBe(true)
    // Task 130 §2 coverage guard: bosses in the index ≥ roster fact ids.
    expect(bossRecords.length).toBeGreaterThanOrEqual(bossFactCount)
  })

  it('groups by region with the major fights split out first', () => {
    const groups = rosterGroups()
    expect(groups.length).toBeGreaterThan(5)
    for (const group of groups) {
      expect(group.region).toBeTruthy()
      for (const boss of group.rest) expect(isRosterMajor(boss.tier)).toBe(false)
      for (const boss of group.major) expect(isRosterMajor(boss.tier)).toBe(true)
    }
  })
})
