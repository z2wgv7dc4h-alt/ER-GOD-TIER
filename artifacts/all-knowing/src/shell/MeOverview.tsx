import { useMemo, useState } from 'react'
import { markers } from '../data/seed'
import { scadutreeFragments } from '../knowledge/collectibles'
import { canonicalHunts } from '../knowledge/completion'
import { warpGraces } from '../knowledge/graces'
import { allLines } from '../knowledge/storylines'
import { completionCategories } from '../lib/completionView'
import { summarize } from '../lib/infer'
import { EntityLink } from '../EntityLink'
import { setupSteps, weakestStep } from '../lib/setupWizard'
import { sourceLabel } from '../lib/sourceLabel'
import { Recents, StatEdit, softCapMark } from '../QoL'
import { Journal } from '../settings/JournalPanel'
import { factState, useWorkspace } from '../state'
import { AreaPrompt } from './AreaPrompt'
import { WorldRibbon } from './WorldRibbon'

function Meter({ label, have, total }: { label: string; have: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((have / total) * 100)) : 0
  return (
    <div className="meter">
      <label>
        <span>{label}</span>
        <span>{have}/{total}</span>
      </label>
      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function CharacterCard() {
  const { character, go, setSelectedMarkerId, setModule } = useWorkspace()
  const s = character.stats
  const tot = summarize(character)
  const recent = [...character.evidence].slice(-3).reverse()
  return (
    <section className="char-card">
      <div className="char-card-head">
        <div className="label">{sourceLabel(character)}</div>
        <button
          type="button"
          className="chip"
          title="Guided setup"
          onClick={() => go('me', 'setup')}
        >
          Set up
        </button>
      </div>
      <h2>{character.name}</h2>
      <div className="meta">
        Lv. {character.level} · {character.startingClass.replace('-', ' ')}
        {typeof character.answers.gideonGoal === 'string' && (
          <> · {allLines.find((l) => l.id === character.answers.gideonGoal)?.name ?? character.answers.gideonGoal}</>
        )}
      </div>
      <div className="stats">
        <div><span>Vig</span> <strong>{s.vigor}{softCapMark('vigor', s.vigor)}</strong></div>
        <div><span>Mnd</span> <strong>{s.mind}{softCapMark('mind', s.mind)}</strong></div>
        <div><span>End</span> <strong>{s.endurance}{softCapMark('endurance', s.endurance)}</strong></div>
        <div><span>Str</span> <strong>{s.strength}{softCapMark('strength', s.strength)}</strong></div>
        <div><span>Dex</span> <strong>{s.dexterity}{softCapMark('dexterity', s.dexterity)}</strong></div>
        <div><span>Int</span> <strong>{s.intelligence}{softCapMark('intelligence', s.intelligence)}</strong></div>
        <div><span>Fth</span> <strong>{s.faith}{softCapMark('faith', s.faith)}</strong></div>
        <div><span>Arc</span> <strong>{s.arcane}{softCapMark('arcane', s.arcane)}</strong></div>
      </div>
      <div className="tally">
        <span>{tot.graces} graces</span>
        <span>{tot.bosses} bosses</span>
        <span>{tot.items} items</span>
      </div>
      {recent.map((e) => (
        <button
          key={e.id}
          type="button"
          className="chip"
          style={{ marginTop: 4 }}
          onClick={() => { setSelectedMarkerId(e.fact); setModule('map') }}
        >
          {e.fact.replace(/^[a-z]+:/, '')}
        </button>
      ))}
    </section>
  )
}

/**
 * Task 100 §5 — the completion "Missing" drill-down (Usage model moment 16):
 * one row per category with have/total, expandable to the missing rows, each
 * linking into the universal entity page, with Show all on map where the rows
 * are real Atlas pins.
 */
function MissingDrilldown() {
  const { character, setMissingOnly, setSelectedMarkerId, setModule } = useWorkspace()
  const categories = useMemo(() => completionCategories(character), [character])
  const [open, setOpen] = useState<string | null>(null)

  return (
    <section className="panel completion-missing">
      <div className="kicker">Missing</div>
      <ul className="completion-cats">
        {categories.map((c) => {
          const expanded = open === c.id
          return (
            <li key={c.id}>
              <div className="completion-cat-head">
                <button
                  type="button"
                  className={expanded ? 'chip on' : 'chip'}
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : c.id)}
                >
                  {c.label} · {c.have}/{c.total}
                </button>
                {c.pinned && (
                  <button
                    type="button"
                    className="chip"
                    disabled={c.missing.length === 0}
                    onClick={() => {
                      setMissingOnly(true)
                      setSelectedMarkerId(c.missing[0]?.id ?? null)
                      setModule('map')
                    }}
                  >
                    Show all on map
                  </button>
                )}
              </div>
              {expanded && (
                c.missing.length === 0 ? (
                  <p className="note">Nothing missing.</p>
                ) : (
                  <ul className="completion-rows">
                    {c.missing.slice(0, 60).map((m) => (
                      <li key={m.id}><EntityLink id={m.id}>{m.name}</EntityLink></li>
                    ))}
                    {c.missing.length > 60 && <li className="note">+{c.missing.length - 60} more</li>}
                  </ul>
                )
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function MeOverview() {
  const { character, go, setSelectedMarkerId, setModule } = useWorkspace()
  const firstRun =
    character.source === 'empty' &&
    character.level <= 1 &&
    character.loadout.length === 0 &&
    character.defeatedBosses.length === 0 &&
    character.discoveredGraces.length === 0 &&
    character.collectedItems.length === 0
  const weak = weakestStep(character)
  const weakLabel = setupSteps.find((s) => s.id === weak)?.label ?? 'Setup'
  const graces = new Set(character.discoveredGraces)
  const bosses = new Set(character.defeatedBosses)
  const items = new Set(character.collectedItems)
  const totalBosses = markers.filter((m) => m.kind === 'boss').length
  const totalItems = markers.filter((m) => m.kind === 'item').length
  // Task 92 row 4: the full completion picture — graces, bosses, items,
  // fragments and field hunts — from the same collections the rest of the app
  // uses. Field hunts are the canonical `hunts.json` ids (deduped across spawns).
  const fragmentIds = scadutreeFragments.map((f) => f.id)
  const fragmentsHave = fragmentIds.filter((id) => character.collectedItems.includes(id)).length
  const huntIds = [...new Set(canonicalHunts.map((h) => h.id))]
  const huntsHave = huntIds.filter((id) => factState(character, id) === 'true').length
  return (
    <div className="me-overview">
      <WorldRibbon />
      <AreaPrompt className="panel area-prompt" />
      {firstRun && (
        <section className="panel setup-cta">
          <div className="kicker">New Tarnished</div>
          <h3 style={{ fontFamily: 'var(--font-display)', margin: '4px 0 6px' }}>Set up your Tarnished</h3>
          <p className="note">A PS5 player with no save file: answer, photograph, and the app infers the rest. About five minutes.</p>
          <button type="button" className="chip on" onClick={() => go('me', 'setup')}>
            Start the guided setup
          </button>
        </section>
      )}
      <CharacterCard />
      <StatEdit />
      <section className="panel">
        <div className="kicker">Progress</div>
        <div className="meters">
          <Meter label="Graces" have={graces.size} total={warpGraces.length} />
          <Meter label="Bosses" have={bosses.size} total={totalBosses} />
          <Meter label="Items found" have={items.size} total={totalItems} />
          <Meter label="Fragments" have={fragmentsHave} total={fragmentIds.length} />
          <Meter label="Field hunts" have={huntsHave} total={huntIds.length} />
        </div>
        <div className="opts" style={{ marginTop: 12 }}>
          <button type="button" className="chip" onClick={() => { setSelectedMarkerId(null); setModule('map') }}>
            Open the map
          </button>
          <button type="button" className="chip on" title={`Completeness is weakest on ${weakLabel}`} onClick={() => go('me', 'setup')}>
            Fill the weakest step: {weakLabel}
          </button>
        </div>
      </section>
      <MissingDrilldown />
      <Journal />
      <Recents />
    </div>
  )
}
