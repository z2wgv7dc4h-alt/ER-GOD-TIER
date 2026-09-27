import { weaknessLine, type CombatStats } from './lib/enemy'

/**
 * Task 92 row 8: "Weak to / resists" is present on every boss/enemy result, even
 * when the combat table has no row for it yet or is still loading. The label is
 * always rendered; a caller never has to hide it.
 */
export function CombatWeakness({ target, name }: { target?: CombatStats; name?: string }) {
  return (
    <p className="note combat-weakness">
      <strong>Weak to / resists:</strong>{' '}
      {target ? weaknessLine(target) : `no combat row for ${name ?? 'this entity'} yet`}
    </p>
  )
}
