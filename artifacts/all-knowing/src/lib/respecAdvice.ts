import { statsToAttributes, type Attribute, type Weapon } from './ar'
import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import { primaryScaling } from './upgradeAdvice'
import type { Stats } from '../types'

/**
 * Respec advice. Given a named build or a weapon the player wants to use, map
 * the current stats onto the target and say where the points should go — from
 * the authored build stats and the weapon's real requirements/scaling. No
 * invented numbers; "how to redistribute" is the delta between the two.
 */
const ATTR: Record<string, string> = { str: 'Str', dex: 'Dex', int: 'Int', fai: 'Fai', arc: 'Arc' }
const STATKEY: Record<Attribute, keyof Stats> = {
  str: 'strength', dex: 'dexterity', int: 'intelligence', fai: 'faith', arc: 'arcane',
}
const OFF: Attribute[] = ['str', 'dex', 'int', 'fai', 'arc']

export type RespecAdvice = {
  name: string
  kind: 'build' | 'weapon'
  /** Attribute deltas current -> target (positive = add points). */
  deltas: { attr: string; from: number; to: number }[]
  /** Unmet requirements, for a weapon target. */
  unmet: string[]
  note: string
}

export function respecAdvice(weapons: Weapon[], target: string, stats: Stats): RespecAdvice | null {
  const q = target.trim().toLowerCase()
  const attrs = statsToAttributes(stats)
  const allBuilds = [...opBuilds, ...pvpBuilds]

  const build = allBuilds.find((b) => b.id === target || b.name.toLowerCase().includes(q))
  if (build) {
    const deltas = OFF.map((a) => ({ attr: ATTR[a], from: attrs[a], to: (build.stats[STATKEY[a]] as number) || 0 }))
      .filter((d) => d.from !== d.to)
    const add = deltas.filter((d) => d.to > d.from).map((d) => d.attr).join('/') || 'nothing'
    return {
      name: build.name,
      kind: 'build',
      deltas,
      unmet: [],
      note: `Respec to ${build.name}: raise ${add}; lower ${deltas.filter((d) => d.to < d.from).map((d) => d.attr).join('/') || 'nothing'}.`,
    }
  }

  const w = weapons
    .filter((x) => x.name.toLowerCase().includes(q) || q.includes(x.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0]
  if (!w) return null

  const unmet = (Object.entries(w.requirements) as [Attribute, number][]).filter(([k, v]) => attrs[k] < v)
  const primary = primaryScaling(w)
  const deltas = OFF.map((a) => ({ attr: ATTR[a], from: attrs[a], to: Math.max(attrs[a], w.requirements[a] ?? 0) }))
    .filter((d) => d.from !== d.to)
  const note = unmet.length
    ? `To wield ${w.name}, first meet ${unmet.map(([k, v]) => `${ATTR[k]} ${v}`).join(', ')}; then put the rest into ${primary ? ATTR[primary] : 'its best stat'}.`
    : `Stat requirements met for ${w.name}. It scales with ${primary ? ATTR[primary] : 'its best stat'} — pump that.`
  return { name: w.name, kind: 'weapon', deltas, unmet: unmet.map(([k, v]) => `${ATTR[k]} ${v}`), note }
}
