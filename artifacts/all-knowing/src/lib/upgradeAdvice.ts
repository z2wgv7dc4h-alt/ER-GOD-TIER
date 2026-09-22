import {
  displayAttackRating,
  getWeaponAttack,
  statsToAttributes,
  type Attribute,
  type Weapon,
} from './ar'
import type { Stats } from '../types'

/**
 * Deterministic weapon-upgrade advice, grounded in the vendored 1.17 regulation
 * data (`ar.ts`). No new data: it evaluates the same AR engine the Build lab uses
 * and reports what upgrading does for THIS character's stats.
 */
const ATTR: Record<string, string> = { str: 'Str', dex: 'Dex', int: 'Int', fai: 'Fai', arc: 'Arc' }
const OFFENSIVE: Attribute[] = ['str', 'dex', 'int', 'fai', 'arc']
const STAT_KEY: Record<Attribute, keyof Stats> = {
  str: 'strength', dex: 'dexterity', int: 'intelligence', fai: 'faith', arc: 'arcane',
}

/**
 * The offensive attributes a build actually invests in (highest first). Used to
 * keep weapon advice on-archetype: a Rivers of Blood player wants Dex/Arc
 * weapons, a Comet Azur player wants Int — not whatever has the biggest raw AR.
 */
export function dominantAttributes(stats: Stats, min = 18): Attribute[] {
  return OFFENSIVE
    .map((a) => ({ a, v: (stats[STAT_KEY[a]] as number) ?? 0 }))
    .filter((x) => x.v >= min)
    .sort((x, y) => y.v - x.v)
    .map((x) => x.a)
}

/** The attribute a weapon scales with most at base upgrade (its archetype). */
export function primaryScaling(weapon: Weapon): Attribute | null {
  const scaling = weapon.attributeScaling[0] ?? {}
  let best: Attribute | null = null
  let bestVal = 0
  for (const a of OFFENSIVE) {
    const v = scaling[a] ?? 0
    if (v > bestVal) {
      bestVal = v
      best = a
    }
  }
  return best
}

export type WeaponAdvice = {
  name: string
  upgradeMax: number
  arNow: number
  arMax: number
  twoHandedArNow: number
  meets: boolean
  insufficient: string[]
  /** Attribute the weapon scales with most (its archetype). */
  primary: Attribute | null
  scaling: { attr: string; from: number; to: number }[]
}

function pick(weapons: Weapon[], query: string): Weapon | undefined {
  const q = query.trim().toLowerCase()
  if (q.length < 3) return undefined
  const hits = weapons.filter((w) => {
    const n = w.name.toLowerCase()
    return q.includes(n) || n.includes(q)
  })
  if (!hits.length) return undefined
  // Most specific (longest) name wins, then standard affinity.
  hits.sort((a, b) => b.name.length - a.name.length || a.affinityId - b.affinityId)
  return hits[0]
}

export function weaponAdvice(weapons: Weapon[], query: string, stats: Stats, upgrade = 0): WeaponAdvice | null {
  const weapon = pick(weapons, query)
  if (!weapon) return null
  const attributes = statsToAttributes(stats)
  const max = Math.max(0, weapon.attack.length - 1)
  const up = Math.min(Math.max(0, upgrade), max)
  const ar = (level: number, two?: boolean) =>
    displayAttackRating(getWeaponAttack({ weapon, attributes, twoHanding: two, upgradeLevel: level }).attackPower)
  const top = weapon.attributeScaling[max] ?? {}
  const scaling = (Object.keys(top) as Attribute[])
    .filter((k) => (top[k] ?? 0) > 0)
    .map((k) => ({ attr: ATTR[k] ?? k, from: weapon.attributeScaling[0]?.[k] ?? 0, to: top[k] ?? 0 }))
  const insufficient = (Object.entries(weapon.requirements) as [Attribute, number][])
    .filter(([k, v]) => attributes[k] < (v ?? 0))
    .map(([k]) => ATTR[k] ?? k)
  return {
    name: weapon.name,
    upgradeMax: max,
    arNow: ar(up),
    arMax: ar(max),
    twoHandedArNow: ar(up, true),
    meets: insufficient.length === 0,
    insufficient,
    primary: primaryScaling(weapon),
    scaling,
  }
}

/** Strongest weapons the character can wield, optionally on a build's archetype. */
export function earlyWeaponRanking(
  weapons: Weapon[],
  stats: Stats,
  limit = 8,
  prefer: Attribute[] = [],
): { name: string; ar: number }[] {
  const attributes = statsToAttributes(stats)
  const byName = new Map<string, number>()
  for (const w of weapons) {
    if (w.affinityId !== 0) continue
    if (prefer.length) {
      const p = primaryScaling(w)
      if (!p || !prefer.includes(p)) continue
    }
    const meets = (Object.entries(w.requirements) as [Attribute, number][]).every(
      ([k, v]) => attributes[k] >= (v ?? 0),
    )
    if (!meets) continue
    const ar = displayAttackRating(getWeaponAttack({ weapon: w, attributes, upgradeLevel: 0 }).attackPower)
    if (!byName.has(w.name) || ar > byName.get(w.name)!) byName.set(w.name, ar)
  }
  return [...byName.entries()]
    .map(([name, ar]) => ({ name, ar }))
    .sort((a, b) => b.ar - a.ar)
    .slice(0, limit)
}
