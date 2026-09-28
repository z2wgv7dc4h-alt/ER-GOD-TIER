import { useMemo, useState } from 'react'
import type { Character } from '../types'
import type { CoordPin } from '../lib/coords'
import { STAT_KEYS } from '../lib/level'
import { buildHunt } from '../lib/buildHunt'
import { levelPlansFor, opBuilds } from '../knowledge/builds'
import { pvpBuilds, pvpMatchups, type PvpBracket, type PvpBuild } from '../knowledge/pvp'
import { pvpTech } from '../knowledge/pvpTech'

/**
 * Task 116 §4–5 — the Kit PvP / OP render components. The Build.tsx container
 * owns the tabs; these panels own the content: bracket filter chips, collapsed
 * build cards that expand to the full loadout, a one-tap "level plan" per OP kit
 * (reusing `buildHunt` for the route) and the PvP tech / matchup lists.
 */

type SetCharacter = (c: Character) => void

const BRACKETS: PvpBracket[] = ['RL30-50', 'RL60-90', 'RL125', 'RL150']

function planLine(stats: Record<string, number>): string {
  return STAT_KEYS.map((k) => `${k.slice(0, 3)} ${stats[k]}`).join(' · ')
}

/**
 * OP kits: each card is collapsed to its name, then expands to a level plan at
 * 40/60/100/150 (one tap applies the spread) and the missing-piece route from
 * `buildHunt`.
 */
export function OpKitPanel({
  character,
  setCharacter,
  coords,
  onShowOnMap,
}: {
  character: Character
  setCharacter: SetCharacter
  coords: CoordPin[]
  onShowOnMap?: (factId: string) => void
}) {
  return (
    <div className="kit-cards">
      {opBuilds.map((b) => {
        const hunt = buildHunt(character, b, coords)
        const plans = levelPlansFor(b)
        return (
          <details key={b.id} className="kit-card">
            <summary>
              <strong>{b.name}</strong>{' '}
              <em className="dim">{b.tag} · Lv {b.level}</em>
              <span className="kit-pitch note">{b.why}</span>
            </summary>
            <div className="kit-detail">
              <div className="kicker">Stats</div>
              <p className="note">{planLine(b.stats as unknown as Record<string, number>)}</p>
              <div className="kicker">Gear</div>
              <ul className="list">
                {b.kit.slice(0, 8).map((slot) => (
                  <li key={slot.id} style={{ cursor: 'default' }}>
                    <span>{slot.kind}</span>
                    <span>{slot.name}{slot.upgrade ? ` +${slot.upgrade}` : ''}</span>
                  </li>
                ))}
              </ul>
              <div className="kicker">Level plan</div>
              <div className="opts">
                {plans.map((p) => (
                  <button
                    key={p.level}
                    type="button"
                    className="chip"
                    title={planLine(p.stats)}
                    onClick={() =>
                      setCharacter({
                        ...character,
                        stats: p.stats,
                        level: p.level,
                        answers: { ...character.answers, buildKit: b.id },
                      })
                    }
                  >
                    Lv {p.level} · {planLine(p.stats)}
                  </button>
                ))}
              </div>
              <p className="note">
                A plan is this kit projected to a checkpoint level — the points always add up to that level.
                Applying one changes stats only; the loadout is set separately.
              </p>
              <div className="kicker">Route</div>
              {hunt.missing.length === 0 ? (
                <p className="note">Every seeded piece is already logged on this character.</p>
              ) : (
                <ul className="list">
                  {hunt.missing.slice(0, 8).map((p) => (
                    <li key={p.factId} style={{ cursor: 'default' }}>
                      <span>{p.name}</span>
                      {p.pin && onShowOnMap ? (
                        <button type="button" className="chip" aria-label={`Show ${p.name} on map`} onClick={() => onShowOnMap(p.factId)}>
                          Show on map
                        </button>
                      ) : (
                        <span className="note">{p.pin ? 'pinned' : 'no known pin'}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {hunt.unresolved.length > 0 && (
                <p className="note">
                  No row yet for {hunt.unresolved.length} id{hunt.unresolved.length === 1 ? '' : 's'} —
                  listed, not dropped.
                </p>
              )}
              <button
                type="button"
                className="chip gold"
                onClick={() =>
                  setCharacter({
                    ...character,
                    stats: b.stats,
                    level: b.level,
                    loadout: b.kit,
                    answers: { ...character.answers, buildKit: b.id },
                  })
                }
              >
                Use this build
              </button>
            </div>
          </details>
        )
      })}
    </div>
  )
}

function PvpLoadoutBlock({ build }: { build: PvpBuild }) {
  const l = build.loadout
  return (
    <div className="kit-detail">
      <div className="kicker">Stats</div>
      <p className="note">{planLine(build.stats as unknown as Record<string, number>)}</p>
      <div className="kicker">Gear</div>
      <ul className="list">
        <li style={{ cursor: 'default' }}><span>Right hand</span><span>{l.weapons.join(', ')}</span></li>
        <li style={{ cursor: 'default' }}><span>Left hand</span><span>{l.offhand.join(', ') || '—'}</span></li>
        <li style={{ cursor: 'default' }}><span>Armour</span><span>{l.armor.join(', ')}</span></li>
        <li style={{ cursor: 'default' }}><span>Talismans</span><span>{l.talismans.join(', ')}</span></li>
        <li style={{ cursor: 'default' }}><span>Spells</span><span>{l.spells.join(', ')}</span></li>
        <li style={{ cursor: 'default' }}><span>Consumables</span><span>{l.consumables.join(', ')}</span></li>
      </ul>
      <div className="kicker">How to play</div>
      <p className="note">{build.playstyle}</p>
      <div className="kicker">Combos</div>
      <ul className="list">
        {build.combos.map((c) => (
          <li key={c} style={{ cursor: 'default' }}>{c}</li>
        ))}
      </ul>
      <div className="kicker">Buff order</div>
      <ol className="list">
        {build.buffOrder.map((step) => (
          <li key={step} style={{ cursor: 'default' }}>{step}</li>
        ))}
      </ol>
      <div className="kicker">Beats / Loses to</div>
      <p className="note"><strong>Beats.</strong> {build.beats}</p>
      <p className="note"><strong>Loses to.</strong> {build.losesTo}</p>
      <p className="note">
        Patch {build.patch ?? 'unknown'} · source: {build.source}
      </p>
    </div>
  )
}

/** PvP builds with bracket filter chips; each card expands to the full loadout. */
export function PvpBuildPanel({
  character,
  setCharacter,
}: {
  character: Character
  setCharacter: SetCharacter
}) {
  const [bracket, setBracket] = useState<PvpBracket | 'all'>('all')
  const shown = useMemo(
    () => (bracket === 'all' ? pvpBuilds : pvpBuilds.filter((b) => b.bracket === bracket)),
    [bracket],
  )
  return (
    <div>
      <div className="opts">
        <button
          type="button"
          className={bracket === 'all' ? 'chip on' : 'chip'}
          onClick={() => setBracket('all')}
        >
          All
        </button>
        {BRACKETS.map((b) => (
          <button
            key={b}
            type="button"
            className={bracket === b ? 'chip on' : 'chip'}
            onClick={() => setBracket(b)}
          >
            {b} · {pvpBuilds.filter((x) => x.bracket === b).length}
          </button>
        ))}
      </div>
      <div className="kit-cards">
        {shown.map((b) => (
          <details key={b.id} className="kit-card">
            <summary>
              <strong>{b.name}</strong>{' '}
              <em className="dim">{b.bracket} · {b.mode} · {b.tag}</em>
              <span className="kit-pitch note">{b.why}</span>
            </summary>
            <PvpLoadoutBlock build={b} />
            <button
              type="button"
              className="chip gold"
              onClick={() =>
                setCharacter({
                  ...character,
                  stats: b.stats,
                  level: b.level,
                  loadout: b.kit,
                  answers: { ...character.answers, buildKit: b.id },
                })
              }
            >
              Use this build
            </button>
          </details>
        ))}
      </div>
    </div>
  )
}

/** PvP matchups: tell → counters → gear swap. */
export function PvpMatchupPanel() {
  return (
    <ul className="list" style={{ marginTop: 8 }}>
      {pvpMatchups.map((m) => (
        <li key={m.id} style={{ cursor: 'default', display: 'block' }}>
          <span>{m.threat}</span>
          <p className="note" style={{ margin: '4px 0 0' }}>{m.tell}</p>
          <ul className="list">
            {m.counters.map((c) => (
              <li key={c} style={{ cursor: 'default' }}>{c}</li>
            ))}
          </ul>
          <p className="note" style={{ margin: '4px 0 0' }}>
            <strong>Gear swap.</strong> {m.gearSwap} {m.note}
          </p>
        </li>
      ))}
    </ul>
  )
}

/** PvP tech: the how-to list. */
export function PvpTechPanel() {
  return (
    <ul className="list" style={{ marginTop: 8 }}>
      {pvpTech.map((t) => (
        <li key={t.id} style={{ cursor: 'default', display: 'block' }}>
          <span>{t.name} <em className="dim">{t.category}</em></span>
          <p className="note" style={{ margin: '4px 0 0' }}>{t.what} {t.how}</p>
        </li>
      ))}
    </ul>
  )
}
