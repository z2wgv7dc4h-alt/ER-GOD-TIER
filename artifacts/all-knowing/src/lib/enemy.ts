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

/**
 * The combat shape shared by boss (`npc-combat.json`) and regular-enemy
 * (`enemy-combat.json`) rows. Both are read from the same `NpcParam` table with
 * the same field mapping, so the Build lab can treat them through one interface
 * (`CombatTarget`) instead of two incompatible ones.
 */
export type CombatStats = {
  factId: string
  name: string
  /** NpcParam row id this was read from, for provenance. */
  npcRow: number
  /** Row name from the Paramdex Names dump (may differ from the in-game name). */
  paramName: string
  /** Raw NpcParam base HP, before the game's area/NG scaling. Not the HP bar. */
  baseHp: number
  poise: number | null
  /** Damage negation in percent. Negative means the target is weak (takes extra). */
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

/** A named boss row from `npc-combat.json` (Task 17). */
export type BossCombat = CombatStats

/**
 * A regular (non-boss) field-enemy row from `enemy-combat.json` (Task 22).
 * `model` is the character model (`cXXXX`); `placements`/`maps` come from the
 * MSB enemy placements in `msb-enemies.json`.
 */
export type EnemyCombat = CombatStats & {
  model: string
  placements: number
  maps: string[]
}

/** Boss and regular-enemy rows, tagged so one renderer can show either. */
export type CombatTarget = CombatStats & {
  kind: 'boss' | 'enemy'
  model?: string
  placements?: number
  maps?: string[]
}

export function bossTarget(boss: BossCombat): CombatTarget {
  return { ...boss, kind: 'boss' }
}

export function enemyTarget(enemy: EnemyCombat): CombatTarget {
  return { ...enemy, kind: 'enemy' }
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

let enemyCache: EnemyCombat[] | null = null

export async function loadEnemyCombat(): Promise<EnemyCombat[]> {
  if (enemyCache) return enemyCache
  const res = await fetch('/sourced/enemy-combat.json')
  if (!res.ok) throw new Error(`enemy combat data unavailable (${res.status})`)
  enemyCache = (await res.json()) as EnemyCombat[]
  return enemyCache
}

export function useEnemyCombat(): { enemies: EnemyCombat[]; error: string | null } {
  const [enemies, setEnemies] = useState<EnemyCombat[]>(enemyCache ?? [])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (enemyCache) return
    let cancelled = false
    void loadEnemyCombat()
      .then((rows) => {
        if (!cancelled) setEnemies(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [])
  return { enemies, error }
}

/** Synchronous view of the loaded regular-enemy table (see `cachedBossCombat`). */
export function cachedEnemyCombat(): EnemyCombat[] {
  return enemyCache ?? []
}

export function enemyCombatFor(enemies: EnemyCombat[], factId: string | undefined): EnemyCombat | undefined {
  if (!factId) return undefined
  return enemies.find((e) => e.factId === factId)
}

/**
 * Boss and regular-enemy rows in one list, so the Build lab's target picker and
 * damage rendering have a single code path.
 */
export function useCombatTargets(): { targets: CombatTarget[]; error: string | null } {
  const { bosses, error: bossError } = useBossCombat()
  const { enemies, error: enemyError } = useEnemyCombat()
  const targets = [
    ...bosses.map(bossTarget),
    ...enemies.map(enemyTarget),
  ]
  return { targets, error: bossError ?? enemyError }
}

export function combatTargetFor(targets: CombatTarget[], factId: string | undefined): CombatTarget | undefined {
  if (!factId) return undefined
  return targets.find((t) => t.factId === factId)
}

/**
 * Distinct regular-enemy names for the Build lab picker, with the row that has
 * the most placements winning a name (so "Giant Crab" resolves to the common
 * variant rather than an obscure one). Names carrying a location/phase variant
 * in parentheses collapse to their base name.
 */
export function enemyTargetNames(enemies: { name: string; placements?: number }[]): string[] {
  const byName = new Map<string, { name: string; placements?: number }>()
  for (const e of enemies) {
    if (e.name.includes('(Boss)')) continue
    const key = e.name.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
    const current = byName.get(key)
    if (!current || (e.placements ?? 0) > (current.placements ?? 0)) byName.set(key, e)
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)).map((e) => e.name)
}

/**
 * Synchronous view of the loaded combat table. The router is deterministic and
 * synchronous, so it reads the cache the UI's `useBossCombat` (or `askGideon`)
 * already warmed; an empty array means "not loaded yet", never "no data".
 */
export function cachedBossCombat(): BossCombat[] {
  return cache ?? []
}

/** The damage type the target is weakest to (highest negation). */
export function bestDamageType(target: CombatStats): DamageType {
  return damageTypes.reduce((best, type) => (target.negation[type] > target.negation[best] ? type : best), damageTypes[0])
}

/** Human-readable negation, where negative means the target takes extra damage. */
export function negationText(value: number): string {
  if (value > 0) return `${value}% resist`
  if (value < 0) return `${-value}% weak`
  return 'neutral'
}

export function resistSummary(target: CombatStats): string {
  const r = target.resist
  return `poison ${r.poison} · rot ${r.scarletRot} · bleed ${r.bleed} · sleep ${r.sleep} · madness ${r.madness} · curse ${r.curse}`
}

export type EffectiveDamage = {
  total: number
  byType: Partial<Record<AttackPowerType, number>>
}

/**
 * Apply the target's per-type negation to an attack-rating breakdown. This is the raw
 * "what should I hit this with" comparison — it does not model defence, motion values
 * or scaling beyond what `getWeaponAttack` already produced. Works for bosses and
 * regular enemies alike (`CombatStats`).
 */
export function effectiveDamage(
  attackPower: Partial<Record<AttackPowerType, number>>,
  target: CombatStats,
): EffectiveDamage {
  const byType: Partial<Record<AttackPowerType, number>> = {}
  let total = 0
  for (const type of damageTypes) {
    const ap = attackPower[damageTypeToAttackPower[type]] ?? 0
    if (ap === 0) continue
    const dealt = ap * (1 - target.negation[type] / 100)
    byType[damageTypeToAttackPower[type]] = dealt
    total += dealt
  }
  return { total, byType }
}
