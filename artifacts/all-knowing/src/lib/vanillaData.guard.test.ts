import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The app describes the game a PS5 player runs: vanilla Elden Ring (+ Shadow of
 * the Erdtree). Part of its map/boss/loot data once came from
 * `VirusAlex/ERR-MapForGoblins-DLL` — the Map for Goblins build for Elden Ring
 * Reforged, a PC overhaul mod — which carried the mod's own bosses, places,
 * items and gathering assets. Those files are now extracted from the local,
 * unmodded install (`scripts/extract-vanilla-open.py`). This guard fails if any
 * confirmed mod-only name, asset or source comes back.
 */

// Every entry was checked: absent from the game's own text (FMG), the vanilla
// wiki snapshot and the vanilla map files, and documented on the ERR wiki.
const MOD_ONLY = [
  'Azash, Pride of the Redmanes',
  'Gnoster, the False Sky',
  'Thief-Taker Acacio',
  'Morion, Unbound Death',
  'Royal Guardian Helicos',
  'Fellthorn Spirit',
  'Crucible Knight Hirnan',
  'Grave Sentinel Wyngrant',
  'Demi-Human Queen Mairead',
  'Crucible Knight Rhyacis',
  'Crazed Duelist',
  'Gnarrl, Draconic Sentinel',
  'Blighted Avatar',
  'Hallowed Avatar',
  'Divine Beast Storm Warrior',
  'Fallen Cavalry',
  'Fulminating Runebear',
  'Flamelost Knights',
  'Equilibrious Beast',
  'Lamp Oil',
  'Starlight Token',
  'Withered Twig',
  'Suncatcher',
  'Medicinal Moss',
  'Archery Challenge',
  'Gilded Court',
  'Supplies Pledged',
  'SB_ERR_',
  'AEG099_821',
  'AEG099_822',
]

const SHIPPED = [
  'public/sourced/open/boss-list.json',
  'public/sourced/open/boss-xyz.json',
  'public/sourced/open/boss-pins.json',
  'public/sourced/open/world-lots.json',
  'public/sourced/open/place-names.json',
  'public/sourced/open/enemies.json',
  'public/sourced/open/msb-enemies.json',
  'public/sourced/open/gathering-nodes.json',
  'public/sourced/open/grace-xyz.json',
  'public/sourced/entity-index.json',
  'src/data/bosses.json',
  'src/data/hosted-bosses.json',
  'src/data/aliases.json',
  'src/knowledge/bossPins.ts',
]

describe('vanilla data guard (no Elden Ring Reforged content)', () => {
  for (const path of SHIPPED) {
    it(`${path} carries no mod-only boss, place, item or asset`, () => {
      expect(existsSync(path), path).toBe(true)
      const text = readFileSync(path, 'utf8')
      expect(MOD_ONLY.filter((name) => text.includes(name))).toEqual([])
    })
  }

  it('the ingest script never pulls the ERR Map for Goblins dataset', () => {
    const script = readFileSync('scripts/ingest-open.sh', 'utf8')
    expect(script).not.toMatch(/^\s*clone_sparse .*ERR-MapForGoblins/m)
    expect(script).not.toMatch(/goblins\/data/)
  })

  it('the boss table is the game’s own: unique kill flags, every fight named', () => {
    const rows = JSON.parse(readFileSync('public/sourced/open/boss-list.json', 'utf8')) as { killEventFlagId: number; vanillaPlaceName: string }[]
    expect(new Set(rows.map((r) => r.killEventFlagId)).size).toBe(rows.length)
    expect(rows.every((r) => r.vanillaPlaceName && !/^Boss arena/.test(r.vanillaPlaceName))).toBe(true)
  })
})
