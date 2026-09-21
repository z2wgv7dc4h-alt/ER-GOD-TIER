/**
 * Boss combat stats — real `NpcParam` data extracted from the local game install's
 * `regulation.bin` (see DATA.md and THIRD_PARTY_NOTICES.md for source, licence, method).
 *
 * This is *combat* data: per-damage-type negation (absorb), defence, status resistances and
 * poise. It is deliberately separate from `src/knowledge/npc-display.ts` (Task 15), which is
 * cosmetic player-model level/stat allocation and must not be used for damage maths.
 *
 * Data: `public/sourced/npc-combat.json`.
 */
import { useEffect, useState } from 'react'
import { AttackPowerType } from './ar'

export type DamageType = 'physical' | 'magic' | 'fire' | 'lightning' | 'holy'

export const damageTypes: DamageType[] = ['physical', 'magic', 'fire', 'lightning', 'holy']

export const damageTypeLabels: Record<DamageType, string> = {
  physical: 'Physical',
  magic: 'Magic',
  fire: 'Fire',
  lightning: 'Lightning',
  holy: 'Holy',
}

/** Attack-power category (ar.ts) that each negation row applies to. */
export const damageTypeToAttackPower: Record<DamageType, AttackPowerType> = {
  physical: AttackPowerType.PHYSICAL,
  magic: AttackPowerType.MAGIC,
  fire: AttackPowerType.FIRE,
  lightning: AttackPowerType.LIGHTNING,
  holy: AttackPowerType.HOLY,
}

export type BossCombat = {
  factId: string
  name: string
  /** NpcParam row id this was read from, for provenance. */
  npcRow: number
  /** Row name from the Paramdex Names dump (may differ from the in-game name). */
  paramName: string
  /** Raw NpcParam base HP, before the game's area/NG scaling. Not the HP bar. */
  baseHp: number
  poise: number | null
  /** Damage negation in percent. Negative means the boss is weak (takes extra). */
  negation: Record<DamageType, number>
  /** Base status resistance from NpcParam (higher = more resistant). */
  resist: {
    poison: number
    scarletRot: number
    bleed: number
    sleep: number
    madness: number
    curse: number
  }
}

let cache: BossCombat[] | null = null

export async function loadBossCombat(): Promise<BossCombat[]> {
  if (cache) return cache
  const res = await fetch('/sourced/npc-combat.json')
  if (!res.ok) throw new Error(`boss combat data unavailable (${res.status})`)
  cache = (await res.json()) as BossCombat[]
  return cache
}

export function useBossCombat(): { bosses: BossCombat[]; error: string | null } {
  const [bosses, setBosses] = useState<BossCombat[]>(cache ?? [])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (cache) return
    let cancelled = false
    void loadBossCombat()
      .then((rows) => {
        if (!cancelled) setBosses(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])
  return { bosses, error }
}

export function bossCombatFor(bosses: BossCombat[], factId: string | undefined): BossCombat | undefined {
  if (!factId) return undefined
  return bosses.find((b) => b.factId === factId)
}

/**
 * Synchronous view of the loaded combat table. The router is deterministic and
 * synchronous, so it reads the cache the UI's `useBossCombat` (or `askGideon`)
 * already warmed; an empty array means "not loaded yet", never "no data".
 */
export function cachedBossCombat(): BossCombat[] {
  return cache ?? []
}

/** The damage type the boss is weakest to (highest negation). */
export function bestDamageType(boss: BossCombat): DamageType {
  return damageTypes.reduce((best, type) => (boss.negation[type] > boss.negation[best] ? type : best), damageTypes[0])
}

/** Human-readable negation, where negative means the boss takes extra damage. */
export function negationText(value: number): string {
  if (value > 0) return `${value}% resist`
  if (value < 0) return `${-value}% weak`
  return 'neutral'
}

export function resistSummary(boss: BossCombat): string {
  const r = boss.resist
  return `poison ${r.poison} · rot ${r.scarletRot} · bleed ${r.bleed} · sleep ${r.sleep} · madness ${r.madness} · curse ${r.curse}`
}

export type EffectiveDamage = {
  total: number
  byType: Partial<Record<AttackPowerType, number>>
}

/**
 * Apply the boss's per-type negation to an attack-rating breakdown. This is the raw
 * "what should I hit this with" comparison — it does not model defence, motion values
 * or scaling beyond what `getWeaponAttack` already produced.
 */
export function effectiveDamage(
  attackPower: Partial<Record<AttackPowerType, number>>,
  boss: BossCombat,
): EffectiveDamage {
  const byType: Partial<Record<AttackPowerType, number>> = {}
  let total = 0
  for (const type of damageTypes) {
    const ap = attackPower[damageTypeToAttackPower[type]] ?? 0
    if (ap === 0) continue
    const dealt = ap * (1 - boss.negation[type] / 100)
    byType[damageTypeToAttackPower[type]] = dealt
    total += dealt
  }
  return { total, byType }
}
