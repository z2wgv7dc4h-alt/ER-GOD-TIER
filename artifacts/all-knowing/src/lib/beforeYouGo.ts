import type { Character } from '../types'
import { regionLeftovers } from './regionLeftovers'
import { bandFor, type RegionLevel } from './regionLevels'

/**
 * Level-aware "before I leave here / am I over-levelled" advice. Deterministic:
 * it scopes what is still open in the current (or named) region via
 * `regionLeftovers`, then places the character's level against the area's band
 * from the Fextralife Progress Route. No invented ranges.
 */
export type BeforeYouGo = {
  region: string | null
  level: number
  band: RegionLevel | null
  status: 'under' | 'in' | 'over' | 'unknown'
  open: { name: string; source: string }[]
  advice: string
}

export function beforeYouGo(character: Character, query: string, areas: RegionLevel[], cap = 6): BeforeYouGo {
  const scoped = regionLeftovers(character, query, cap)
  const region = scoped.region
  const band = bandFor(areas, region)
  const level = character.level
  const status: BeforeYouGo['status'] = !band ? 'unknown' : level < band.levelMin ? 'under' : level > band.levelMax ? 'over' : 'in'
  const open = scoped.items.map((i) => ({ name: i.name, source: i.source }))

  let advice: string
  if (!band) {
    advice = open.length
      ? `I do not have a level band for ${region ?? 'this spot'}. Still open here: ${open.map((o) => o.name).join(', ')}.`
      : `I do not have a level band for ${region ?? 'this spot'} yet, and nothing in the data is still open here.`
  } else if (status === 'under') {
    advice = `${region} is a Lv ${band.levelMin}-${band.levelMax} area (weapons +${band.upgradeMin ?? '?'}-+${band.upgradeMax ?? '?'}); you are Lv ${level}, so you are under-levelled — do the open items first: ${open.map((o) => o.name).join(', ') || 'nothing tracked'}.`
  } else if (status === 'over') {
    advice = `You are Lv ${level}; ${region} is Lv ${band.levelMin}-${band.levelMax}, so you have out-levelled it. Bosses here will be trivial — do them anyway for the drops/quests, then move on.`
  } else {
    advice = `You are Lv ${level}, right on ${region}'s band (Lv ${band.levelMin}-${band.levelMax}). Finish what is still open before you leave: ${open.map((o) => o.name).join(', ') || 'nothing tracked'}.`
  }
  if (band?.steps) advice += ` Progress route here: ${band.steps.slice(0, 180)}`

  return { region, level, band, status, open, advice }
}
