import { useMemo, useState } from 'react'
import { scadutreeFragments } from '../knowledge/collectibles'
import { canonicalHunts } from '../knowledge/completion'
import { allLines } from '../knowledge/storylines'
import { completionCategories } from '../lib/completionView'
import { EntityLink } from '../EntityLink'
import { sourceLabel } from '../lib/sourceLabel'
import { activityLine, progressMeters, SOURCE_LABEL } from '../lib/progressStats'
import { useEntityIndex } from '../lib/entityIndex'
import { Recents, softCapMark } from '../QoL'
import { factState, useWorkspace } from '../state'
import { Button, Card, Kicker } from '../ui'
import { AreaPrompt } from './AreaPrompt'

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

/** Character card: name, level, class, stats grid, and one Edit ghost action. */
function CharacterCard() {
  const { character, go } = useWorkspace()
  const s = character.stats
  return (
    <Card
      kicker={sourceLabel(character)}
      title={character.name}
      subtitle={
        <>
          Lv. {character.level} ·{' '}
          {character.startingClass && character.startingClass !== 'unknown' ? (
            character.startingClass.replace(/-/g, ' ')
          ) : (
            <button type="button" className="chip" onClick={() => go('me', 'setup')}>
              Class not set
            </button>
          )}
          {typeof character.answers.gideonGoal === 'string' && (
            <> · {allLines.find((l) => l.id === character.answers.gideonGoal)?.name ?? character.answers.gideonGoal}</>
          )}
        </>
      }
      actions={
        <Button variant="ghost" small onClick={() => go('me', 'setup')}>
          Edit
        </Button>
      }
    >
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
    </Card>
  )
}

/**
 * Completion "Missing" drill-down (usage model moment 16). Collapsed so it never
 * crowds the first paint; each row links into the universal entity page.
 */
function MissingDrilldown() {
  const { character, setMissingOnly, setModule, focusOnMap } = useWorkspace()
  const categories = useMemo(() => completionCategories(character), [character])
  const [open, setOpen] = useState<string | null>(null)

  if (categories.length === 0) return null
  return (
    <details className="panel completion-missing">
      <summary className="kicker">Missing · {categories.length} categories</summary>
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
                      const target = c.missing[0]?.id
                      if (target) focusOnMap(target)
                      else setModule('map')
                    }}
                  >
                    Show all on map
                  </button>
                )}
              </div>
              {expanded &&
                (c.missing.length === 0 ? (
                  <p className="note">Nothing missing.</p>
                ) : (
                  <ul className="completion-rows">
                    {c.missing.slice(0, 60).map((m) => (
                      <li key={m.id}><EntityLink id={m.id}>{m.name}</EntityLink></li>
                    ))}
                    {c.missing.length > 60 && <li className="note">+{c.missing.length - 60} more</li>}
                  </ul>
                ))}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

export function MeOverview() {
  const { character, go } = useWorkspace()
  const firstRun =
    character.source === 'empty' &&
    character.level <= 1 &&
    character.loadout.length === 0 &&
    character.defeatedBosses.length === 0 &&
    character.discoveredGraces.length === 0 &&
    character.collectedItems.length === 0
  const { version: indexVersion } = useEntityIndex()
  const progress = useMemo(() => progressMeters(character), [character, indexVersion])
  const fragmentIds = scadutreeFragments.map((f) => f.id)
  const fragmentsHave = fragmentIds.filter((id) => character.collectedItems.includes(id)).length
  const huntIds = [...new Set(canonicalHunts.map((h) => h.id))]
  const huntsHave = huntIds.filter((id) => factState(character, id) === 'true').length
  const recent = [...character.evidence].slice(-5).reverse()

  if (firstRun) {
    return (
      <div className="me-overview">
        <Card
          kicker="New Tarnished"
          title="Set up your character"
          subtitle="Answer a few questions and the app infers the rest. About five minutes."
          footer={
            <Button variant="primary" onClick={() => go('me', 'setup')}>
              Start setup
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="me-overview">
      <AreaPrompt className="panel area-prompt" />
      <CharacterCard />
      <Card
        kicker="Progress"
        title="Completion"
        footer={
          <Button variant="ghost" small onClick={() => go('journey', 'map')}>
            Open the map
          </Button>
        }
      >
        <div className="meters">
          {progress.map((m) => (
            <Meter key={m.id} label={m.label} have={m.have} total={m.total} />
          ))}
          <Meter label="Fragments" have={fragmentsHave} total={fragmentIds.length} />
          <Meter label="Field hunts" have={huntsHave} total={huntIds.length} />
        </div>
      </Card>
      <section className="panel recent-panel">
        <Kicker>Recent activity</Kicker>
        {recent.length === 0 ? (
          <p className="note">Nothing logged yet.</p>
        ) : (
          <ul className="list" style={{ marginTop: 6 }}>
            {recent.map((e) => {
              const line = activityLine(e)
              return (
                <li key={e.id} style={{ cursor: 'default' }}>
                  <span>
                    {line.verb}{' '}
                    <EntityLink id={line.factId}>{line.name}</EntityLink>
                    {line.from ? <> from {line.from}</> : null}
                  </span>
                  <span className="note">{SOURCE_LABEL[e.source] ?? e.source}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <Recents />
      <MissingDrilldown />
    </div>
  )
}
