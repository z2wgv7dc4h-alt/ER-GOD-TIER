import { useMemo, useState } from 'react'
import type { Character } from '../types'
import type { CoordPin } from '../lib/coords'
import { STAT_KEYS } from '../lib/level'
import { buildHunt } from '../lib/buildHunt'
import { EntityLink } from '../EntityLink'
import { levelPlansFor, opBuilds } from '../knowledge/builds'
import {
  PVP_BRACKETS,
  bracketForLevel,
  matchupsForBuild,
  modeMatches,
  pvpBuilds,
  pvpMatchups,
  type PvpBracket,
  type PvpBuild,
  type PvpMode,
  type PvpModeFilter,
} from '../knowledge/pvp'
import { pvpTech } from '../knowledge/pvpTech'
import { tipsByKind } from '../lib/playerTips'
import { PlayerTips } from '../PlayerTip'

/**
 * Task 116 §4–5 — the Kit PvP / OP render components. The Build.tsx container
 * owns the tabs; these panels own the content: bracket filter chips, collapsed
 * build cards that expand to the full loadout, a one-tap "level plan" per OP kit
 * (reusing `buildHunt` for the route) and the PvP tech / matchup lists.
 */

type SetCharacter = (c: Character) => void

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

/**
 * The reference loadout is prose: the gear/spells the build's source describes.
 * It is *not* what "Use this build" equips — that is the resolvable `kit`, shown
 * by `PvpAppliedKit` first, so the displayed and applied gear always agree.
 */
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

/** The resolvable gear "Use this build" actually equips (Task 164 §6). */
function PvpAppliedKit({ build }: { build: PvpBuild }) {
  return (
    <div className="kit-detail">
      <div className="kicker">Gear applied to your character</div>
      <ul className="list">
        {build.kit.map((slot) => (
          <li key={slot.id} style={{ cursor: 'default' }}>
            <span>{slot.kind}</span>
            <span>
              {slot.name}
              {slot.upgrade ? ` +${slot.upgrade}` : ''}
              {slot.affinity ? ` · ${slot.affinity}` : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="note">"Use this build" sets these pieces, the stat spread and the level.</p>
      <p className="note">The reference gear below is what the source describes; it is not equipped.</p>
    </div>
  )
}

/**
 * Task 164 §5 — the build's `kit` + `need` run through `buildHunt`, so the
 * missing pieces get an item page and, where a `loot.ts` row pins it, a
 * Show-on-map link. Free-text loadout entries stay text and are never invented.
 */
function PvpFarmBlock({
  character,
  build,
  coords,
  onShowOnMap,
}: {
  character: Character
  build: PvpBuild
  coords: CoordPin[]
  onShowOnMap?: (factId: string) => void
}) {
  const hunt = useMemo(() => buildHunt(character, build, coords), [character, build, coords])
  return (
    <div className="kit-detail">
      <div className="kicker">Farm the missing pieces</div>
      {hunt.missing.length === 0 ? (
        <p className="note">Every seeded piece of this build is already logged on this character.</p>
      ) : (
        <>
          <p className="note">
            {hunt.missing.length} missing · {hunt.pins.length} with a map pin. Tap a name to open its page.
          </p>
          <ul className="list">
            {hunt.missing.map((p) => (
              <li key={p.factId} style={{ display: 'block', cursor: 'default' }}>
                <EntityLink id={p.factId}>{p.name}</EntityLink>
                <div className="opts" style={{ marginTop: 4 }}>
                  {p.pin && onShowOnMap ? (
                    <button type="button" className="chip" onClick={() => onShowOnMap(p.factId)}>
                      Show on map
                    </button>
                  ) : (
                    <span className="note">{p.pin ? 'pinned' : 'no known pin'}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {hunt.unresolved.length > 0 && (
        <p className="note">
          No row yet for {hunt.unresolved.length} id{hunt.unresolved.length === 1 ? '' : 's'} — listed, not dropped.
        </p>
      )}
    </div>
  )
}

/** Task 164 §7 — the matchup corpus ranked for this build's keywords. */
function PvpBuildMatchups({ build }: { build: PvpBuild }) {
  const ranked = useMemo(() => matchupsForBuild(build), [build])
  return (
    <div className="kit-detail">
      <div className="kicker">Matchups for this build</div>
      {ranked.length === 0 ? (
        <p className="note">No matchup in the corpus shares this build's keywords.</p>
      ) : (
        <>
          <p className="note">Ranked by how many of this build's keywords each threat matches.</p>
          <ul className="list">
            {ranked.map(({ matchup, score }) => (
              <li key={matchup.id} style={{ display: 'block', cursor: 'default' }}>
                <span>
                  {matchup.threat} <em className="dim">{score} match{score === 1 ? '' : 'es'}</em>
                </span>
                <p className="note" style={{ margin: '4px 0 0' }}>{matchup.tell}</p>
                <p className="note" style={{ margin: '4px 0 0' }}>
                  <strong>Gear swap.</strong> {matchup.gearSwap}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

const MODE_LABELS: Record<PvpMode, string> = { invade: 'Invade', duel: 'Duel', both: 'Both' }

/**
 * Task 164 §4–7 — PvP builds with a mode filter, a bracket filter that defaults
 * to the character's own level, the applied kit and its farm route, the reference
 * loadout, and the matchups ranked for this build.
 */
export function PvpBuildPanel({
  character,
  setCharacter,
  coords = [],
  onShowOnMap,
}: {
  character: Character
  setCharacter: SetCharacter
  coords?: CoordPin[]
  onShowOnMap?: (factId: string) => void
}) {
  const myBracket = bracketForLevel(character.level)
  const [bracket, setBracket] = useState<PvpBracket | 'all'>(myBracket)
  const [mode, setMode] = useState<PvpModeFilter>('all')
  const shown = useMemo(
    () =>
      pvpBuilds.filter(
        (b) => (bracket === 'all' || b.bracket === bracket) && modeMatches(b.mode, mode),
      ),
    [bracket, mode],
  )
  return (
    <div>
      <div className="opts">
        <button
          type="button"
          className={bracket === 'all' ? 'chip on' : 'chip'}
          onClick={() => setBracket('all')}
        >
          All levels
        </button>
        {PVP_BRACKETS.map((b) => (
          <button
            key={b}
            type="button"
            className={bracket === b ? 'chip on' : 'chip'}
            onClick={() => setBracket(b)}
          >
            {b} · {pvpBuilds.filter((x) => x.bracket === b).length}
          </button>
        ))}
        <button
          type="button"
          className={bracket === myBracket ? 'chip on' : 'chip'}
          onClick={() => setBracket(myBracket)}
        >
          My level · RL{character.level}
        </button>
      </div>
      <div className="opts">
        <button
          type="button"
          className={mode === 'all' ? 'chip on' : 'chip'}
          onClick={() => setMode('all')}
        >
          All modes
        </button>
        {(Object.keys(MODE_LABELS) as PvpMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={mode === m ? 'chip on' : 'chip'}
            onClick={() => setMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
      <p className="note">
        Showing {shown.length} of {pvpBuilds.length} builds. Default bracket is your level ({myBracket}).
      </p>
      <div className="kit-cards">
        {shown.map((b) => (
          <details key={b.id} className="kit-card">
            <summary>
              <strong>{b.name}</strong>{' '}
              <em className="dim">{b.bracket} · {b.mode} · {b.tag}</em>
              <span className="kit-pitch note">{b.why}</span>
            </summary>
            <PvpAppliedKit build={b} />
            <PvpFarmBlock character={character} build={b} coords={coords} onShowOnMap={onShowOnMap} />
            <PvpLoadoutBlock build={b} />
            <PvpBuildMatchups build={b} />
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

/** PvP tech: the how-to list, plus the curated community PvP tips. */
export function PvpTechPanel() {
  return (
    <>
      <ul className="list" style={{ marginTop: 8 }}>
        {pvpTech.map((t) => (
          <li key={t.id} style={{ cursor: 'default', display: 'block' }}>
            <span>{t.name} <em className="dim">{t.category}</em></span>
            <p className="note" style={{ margin: '4px 0 0' }}>{t.what} {t.how}</p>
          </li>
        ))}
      </ul>
      <PlayerTips tips={tipsByKind('pvp')} />
    </>
  )
}
