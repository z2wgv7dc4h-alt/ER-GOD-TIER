import { STAT_KEYS, levelFromStats } from '../lib/level'
import { SOFT_CAPS, softCapLabel } from '../lib/softCaps'
import type { Character, Stats } from '../types'

/**
 * Task 197 §4 — one stats editor, owned by "Your build". The Plan tab reuses the
 * same component read-only, so there is never a second editable copy of the eight
 * numbers. Labels are the short forms the rest of the build UI uses.
 */
const LABELS: Record<keyof Stats, string> = {
  vigor: 'Vig',
  mind: 'Mind',
  endurance: 'End',
  strength: 'Str',
  dexterity: 'Dex',
  intelligence: 'Int',
  faith: 'Fai',
  arcane: 'Arc',
}

export function StatsEditor({
  character,
  setCharacter,
  readOnly = false,
}: {
  character: Character
  setCharacter?: (c: Character) => void
  readOnly?: boolean
}) {
  function patchStat(key: keyof Stats, value: number) {
    if (!setCharacter) return
    const stats = { ...character.stats, [key]: Math.max(1, Math.min(99, value || 1)) }
    setCharacter({ ...character, stats, level: levelFromStats(stats) })
  }

  return (
    <div className={readOnly ? 'stat-grid read-only' : 'stat-grid'}>
      {STAT_KEYS.map((key) => {
        const value = character.stats[key]
        const label = softCapLabel(key, value)
        return (
          <div className="stat" key={key}>
            <div className="stat-head">
              {readOnly ? (
                <span className="stat-name">{LABELS[key]}</span>
              ) : (
                <label htmlFor={key}>{LABELS[key]}</label>
              )}
              <span
                className={label ? 'soft-cap hit' : 'soft-cap'}
                title={label ? `Soft cap reached: ${label}` : 'Below the first soft cap'}
              >
                {SOFT_CAPS[key].map((cap) => (
                  <i key={cap} className={value >= cap ? 'on' : ''} aria-hidden />
                ))}
              </span>
            </div>
            {readOnly ? (
              <span className="stat-value">{value}</span>
            ) : (
              <input
                id={key}
                type="number"
                min={1}
                max={99}
                value={value}
                onChange={(e) => patchStat(key, Number(e.target.value))}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
