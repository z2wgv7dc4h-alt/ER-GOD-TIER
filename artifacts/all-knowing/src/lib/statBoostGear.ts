import type { Stats } from '../types'
import type { OcrWord } from './ps5Ocr'

/**
 * Task 134 §1 — stat-boost gear and the base-stat correction.
 *
 * The PS5 Status screen prints the attributes *including* bonuses from talismans,
 * helmets and activated Great Runes. Level, however, is always the base-stat sum
 * minus 79, so a photograph of a character wearing Radagon's Soreseal looks
 * "impossible": the eight numbers sum to Lv 107 while the Level row reads 87.
 *
 * This table is the real stat-boost gear. Names are grounded in the game's own
 * `AccessoryName` / `ProtectorName` FMG and the stat each helm raises is what its
 * description says (e.g. Imp Head (Cat) "holds trace amounts of feline
 * intelligence"); the deltas are the game's known values. The `priority` breaks
 * ties when two pieces produce the same total — Radagon's Soreseal is by far the
 * most common reason a mid-level Tarnished is 20 points over level.
 */
export type StatBoostGear = {
  id: string
  name: string
  kind: 'talisman' | 'helm' | 'great-rune'
  deltas: Partial<Stats>
  /** Lower wins a tie; the ubiquitous soreseal is first. */
  priority: number
  note?: string
}

const five = (s: (keyof Stats)[]): Partial<Stats> => Object.fromEntries(s.map((k) => [k, 5]))
const three = (s: (keyof Stats)[]): Partial<Stats> => Object.fromEntries(s.map((k) => [k, 3]))

export const statBoostGear: StatBoostGear[] = [
  { id: 'talisman:radagon-soreseal', name: "Radagon's Soreseal", kind: 'talisman', deltas: five(['vigor', 'endurance', 'strength', 'dexterity']), priority: 0 },
  { id: 'talisman:marika-soreseal', name: "Marika's Soreseal", kind: 'talisman', deltas: five(['mind', 'intelligence', 'faith', 'arcane']), priority: 20 },
  { id: 'talisman:radagon-scarseal', name: "Radagon's Scarseal", kind: 'talisman', deltas: three(['vigor', 'endurance', 'strength', 'dexterity']), priority: 30 },
  { id: 'talisman:marika-scarseal', name: "Marika's Scarseal", kind: 'talisman', deltas: three(['mind', 'intelligence', 'faith', 'arcane']), priority: 40 },
  { id: 'talisman:starscourge-heirloom', name: 'Starscourge Heirloom', kind: 'talisman', deltas: { strength: 5 }, priority: 10 },
  { id: 'talisman:stargazer-heirloom', name: 'Stargazer Heirloom', kind: 'talisman', deltas: { intelligence: 5 }, priority: 10 },
  { id: 'talisman:prosthesis-wearer-heirloom', name: 'Prosthesis-Wearer Heirloom', kind: 'talisman', deltas: { dexterity: 5 }, priority: 12 },
  { id: 'talisman:two-fingers-heirloom', name: 'Two Fingers Heirloom', kind: 'talisman', deltas: { faith: 5 }, priority: 12 },
  { id: 'talisman:millicents-prosthesis', name: "Millicent's Prosthesis", kind: 'talisman', deltas: { dexterity: 5 }, priority: 15 },
  { id: 'helm:silver-tear-mask', name: 'Silver Tear Mask', kind: 'helm', deltas: { arcane: 8 }, priority: 10 },
  { id: 'helm:mask-of-confidence', name: 'Mask of Confidence', kind: 'helm', deltas: { arcane: 3 }, priority: 25 },
  { id: 'helm:imp-head-cat', name: 'Imp Head (Cat)', kind: 'helm', deltas: { intelligence: 2 }, priority: 50 },
  { id: 'helm:imp-head-fanged', name: 'Imp Head (Fanged)', kind: 'helm', deltas: { strength: 2 }, priority: 50 },
  { id: 'helm:imp-head-long-tongued', name: 'Imp Head (Long-Tongued)', kind: 'helm', deltas: { dexterity: 2 }, priority: 50 },
  { id: 'helm:imp-head-corpse', name: 'Imp Head (Corpse)', kind: 'helm', deltas: { faith: 2 }, priority: 50 },
  { id: 'helm:imp-head-wolf', name: 'Imp Head (Wolf)', kind: 'helm', deltas: { endurance: 2 }, priority: 50 },
  { id: 'helm:imp-head-elder', name: 'Imp Head (Elder)', kind: 'helm', deltas: { arcane: 2 }, priority: 50 },
  { id: 'helm:twinsage-crown', name: 'Twinsage Glintstone Crown', kind: 'helm', deltas: { intelligence: 6 }, priority: 45 },
  { id: 'helm:queens-crescent-crown', name: "Queen's Crescent Crown", kind: 'helm', deltas: { intelligence: 3 }, priority: 45 },
  { id: 'rune:godrick', name: "Godrick's Great Rune", kind: 'great-rune', deltas: five(['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane']), priority: 60, note: 'Only while activated.' },
]

export function boostTotal(deltas: Partial<Stats>): number {
  let sum = 0
  for (const v of Object.values(deltas)) sum += v ?? 0
  return sum
}

/** Subtract a gear bonus from displayed stats to recover the base spread. */
export function withoutBoost(displayed: Stats, deltas: Partial<Stats>): Stats {
  const out = { ...displayed }
  for (const key of Object.keys(deltas) as (keyof Stats)[]) out[key] = Math.max(1, displayed[key] - (deltas[key] ?? 0))
  return out
}

function addDeltas(a: Partial<Stats>, b: Partial<Stats>): Partial<Stats> {
  const out: Partial<Stats> = { ...a }
  for (const key of Object.keys(b) as (keyof Stats)[]) out[key] = (out[key] ?? 0) + (b[key] ?? 0)
  return out
}

export type StatBonusMatch = {
  /** Total points the screen adds over base. */
  deltaTotal: number
  /** Best single/pair explanation, if the total can be accounted for. */
  gear?: StatBoostGear[]
  deltas?: Partial<Stats>
  /** True when the total is real but no known gear accounts for it. */
  unexplained?: boolean
}

/**
 * Match the "over level" points against the stat-boost table. Tries one piece,
 * then two (talismans + helm + an activated rune can stack), preferring the
 * fewest pieces and then the most common gear.
 */
export function matchStatBonus(deltaTotal: number, displayed: Stats): StatBonusMatch {
  if (deltaTotal <= 0) return { deltaTotal }
  const pool = statBoostGear
  const candidates: { gear: StatBoostGear[]; deltas: Partial<Stats> }[] = []
  for (const g of pool) {
    if (boostTotal(g.deltas) === deltaTotal) candidates.push({ gear: [g], deltas: g.deltas })
  }
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const deltas = addDeltas(pool[i].deltas, pool[j].deltas)
      if (boostTotal(deltas) !== deltaTotal) continue
      candidates.push({ gear: [pool[i], pool[j]], deltas })
    }
  }
  const valid = candidates.filter((c) => {
    const base = withoutBoost(displayed, c.deltas)
    return (Object.keys(c.deltas) as (keyof Stats)[]).every((k) => displayed[k] - (c.deltas[k] ?? 0) >= 1 && base[k] >= 1)
  })
  valid.sort((a, b) => {
    const pa = a.gear.reduce((n, g) => n + g.priority, 0) + (a.gear.length - 1) * 100
    const pb = b.gear.reduce((n, g) => n + g.priority, 0) + (b.gear.length - 1) * 100
    return pa - pb
  })
  const best = valid[0]
  if (!best) return { deltaTotal, unexplained: true }
  return { deltaTotal, gear: best.gear, deltas: best.deltas }
}

/** Human phrase for the "showing base stats" banner. */
export function bonusExplanation(match: StatBonusMatch): string | undefined {
  if (!match.gear?.length || !match.deltas) return undefined
  const names = match.gear.map((g) => g.name).join(' + ')
  const parts = (Object.entries(match.deltas) as [keyof Stats, number][])
    .map(([key, n]) => `+${n} ${key.slice(0, 3).replace(/^./, (c) => c.toUpperCase())}`)
  return `your Status screen includes ${parts.join('/')} from ${names}`
}

// Kept here so the module has no import cycle with the OCR pipeline.
export type { OcrWord }
