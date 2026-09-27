import { findWeapon, type Weapon } from '../lib/ar'
import { lootForName } from '../lib/advisor'
import { byId } from '../knowledge/catalog'
import { findSellers } from '../knowledge/merchants'
import { loot, type Loot } from '../knowledge/loot'
import { lootPin } from '../lib/leftoverPins'
import type { CoordPin } from '../lib/coords'
import type { Character, LoadoutSlot, MapMarker } from '../types'

/**
 * Task 110 §4 — the smithing-stone tracker.
 *
 * For an owned armament, work out which stones take it from its current upgrade
 * to a chosen +N. Regular armaments go to +25 on Smithing Stones [1..8] plus an
 * Ancient Dragon Smithing Stone; somber armaments go to +10 on Somber Smithing
 * Stones [1..9] plus a Somber Ancient Dragon Smithing Stone. The counts per
 * level are the game's fixed progression (2/4/6 of each tier; 1 per somber
 * level). Every location is reused from `loot.ts` / `merchants.ts` — nothing is
 * invented, and a stone with no located source simply has no pin.
 */

export type UpgradeKind = 'smithing' | 'somber'

/** Regular armaments cap at +25 (26 attack rows); somber at +10 (11 rows). */
export function upgradeKind(weapon: Weapon): UpgradeKind {
  return weapon.attack.length <= 11 ? 'somber' : 'smithing'
}

export function maxUpgrade(weapon: Weapon): number {
  return Math.max(0, weapon.attack.length - 1)
}

function add(map: Map<string, number>, name: string, count: number) {
  map.set(name, (map.get(name) ?? 0) + count)
}

/** Stones (and counts) required to go from `from` to `to` on the given track. */
export function stonesForUpgrade(kind: UpgradeKind, from: number, to: number): { name: string; count: number }[] {
  const out = new Map<string, number>()
  const start = Math.max(0, Math.floor(from))
  const end = Math.max(start, Math.floor(to))
  for (let u = start + 1; u <= end; u++) {
    if (kind === 'somber') {
      if (u >= 10) add(out, 'Somber Ancient Dragon Smithing Stone', 1)
      else add(out, `Somber Smithing Stone [${u}]`, 1)
    } else if (u >= 25) {
      add(out, 'Ancient Dragon Smithing Stone', 1)
    } else {
      const tier = Math.ceil(u / 3)
      const count = [2, 4, 6][(u - 1) % 3]
      add(out, `Smithing Stone [${tier}]`, count)
    }
  }
  return [...out.entries()].map(([name, count]) => ({ name, count }))
}

export type StoneNeed = {
  name: string
  count: number
  /** Owned count when the inventory is known, otherwise null. */
  have: number | null
  sellers: string[]
  farm?: string
  loot?: string
  pin: MapMarker | null
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function lootFor(stone: string): Loot | undefined {
  return lootForName(stone)
}

function sellersFor(stone: string): string[] {
  const out: string[] = []
  for (const hit of findSellers(stone)) {
    if (!out.includes(hit.vendor)) out.push(hit.vendor)
  }
  return out
}

function stoneNeed(name: string, count: number, coords: CoordPin[], owned?: Record<string, number>): StoneNeed {
  const lootRow = lootFor(name)
  const fact = lootRow ? undefined : byId.get(`item:${slug(name)}`)
  const have = owned ? Math.max(0, Math.floor(owned[name] ?? 0)) : null
  return {
    name,
    count,
    have,
    sellers: sellersFor(name),
    farm: lootRow?.how ?? (fact?.region ? `Found around ${fact.region}.` : undefined),
    loot: lootRow?.id ?? fact?.id,
    pin: lootRow ? lootPin(lootRow, coords) : null,
  }
}

export type WeaponUpgrade = {
  slotId: string
  name: string
  weaponName: string
  current: number
  target: number
  max: number
  kind: UpgradeKind
  needs: StoneNeed[]
  complete: boolean
}

export type SmithingOptions = {
  /** Desired +N. Clamped per weapon to its own cap. Default: each weapon's cap. */
  target?: number
  coords?: CoordPin[]
  /** Known stone counts, keyed by stone name. Omit when unknown. */
  owned?: Record<string, number>
}

/** The owned, equippable armaments a tracker should show. */
export function ownedArmaments(character: Character): LoadoutSlot[] {
  const out: LoadoutSlot[] = character.loadout.filter(
    (s) => s.kind === 'armament' || s.kind === 'catalyst' || s.kind === 'shield',
  )
  const seen = new Set(out.map((s) => s.name.toLowerCase()))
  for (const row of loot) {
    if (row.kind !== 'weapon') continue
    if (!character.collectedItems.includes(row.id)) continue
    const key = row.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: row.id, name: row.name, kind: 'armament' })
  }
  return out
}

export function smithingTracker(
  character: Character,
  weapons: Weapon[] | null | undefined,
  opts: SmithingOptions = {},
): WeaponUpgrade[] {
  if (!weapons?.length) return []
  const coords = opts.coords ?? []
  const out: WeaponUpgrade[] = []
  for (const slot of ownedArmaments(character)) {
    const weapon = findWeapon(weapons, slot)
    if (!weapon) continue
    const max = maxUpgrade(weapon)
    const kind = upgradeKind(weapon)
    const current = Math.max(0, Math.min(slot.upgrade ?? 0, max))
    const wanted = opts.target == null ? max : opts.target
    const target = Math.max(current, Math.min(wanted, max))
    out.push({
      slotId: slot.id,
      name: slot.name,
      weaponName: weapon.weaponName,
      current,
      target,
      max,
      kind,
      needs: stonesForUpgrade(kind, current, target).map((s) => stoneNeed(s.name, s.count, coords, opts.owned)),
      complete: current >= target,
    })
  }
  return out
}
