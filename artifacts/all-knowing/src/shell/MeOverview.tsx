import { useMemo, useState, type ReactNode } from 'react'
import { flaskUpgrades, mapFragments, scadutreeFragments } from '../knowledge/collectibles'
import { canonicalHunts } from '../knowledge/completion'
import { allLines } from '../knowledge/storylines'
import { completionCategories } from '../lib/completionView'
import { achievementProgress } from '../lib/achievements'
import { blessingLine, blessingProgress } from '../lib/blessings'
import { conditionalUnlocks, stockForVendor } from '../knowledge/merchantConditions'
import { applyFacts } from '../lib/infer'
import { useGuide } from '../lib/guide'
import { DungeonChecklist } from '../Dungeon'
import { EntityLink } from '../EntityLink'
import { sourceLabel } from '../lib/sourceLabel'
import { activityLine, progressMeters, SOURCE_LABEL } from '../lib/progressStats'
import { useEntityIndex } from '../lib/entityIndex'
import { Recents, softCapMark } from '../QoL'
import { factState, useWorkspace } from '../state'
import { Button, Card, EmptyState, Kicker } from '../ui'
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

/** A collapsed reference block, matching the guides page pattern. */
function Collapsed({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <details className="codex-section">
      <summary className="codex-head codex-summary">
        {title}
        {count != null ? ` · ${count}` : ''}
      </summary>
      {children}
    </details>
  )
}

/**
 * Task 165 §12 — the progression "Mark" meters (blessings, achievements, the
 * dungeon checklist, merchant conditionals and fragment/flask pickups) moved off
 * Guides to sit next to completion on Tarnished › Overview. These write facts
 * through `applyFacts`; they are tracking tools, not reference reading.
 */
function ProgressTracking() {
  const { character, setCharacter } = useWorkspace()
  const guide = useGuide()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const blessings = useMemo(
    () => blessingProgress(guide.items, character.collectedItems),
    [guide.items, character.collectedItems],
  )
  const achievements = useMemo(
    () => achievementProgress(guide.items, character.collectedItems),
    [guide.items, character.collectedItems],
  )
  const conditionals = useMemo(
    () => conditionalUnlocks.map((u) => ({ ...u, items: stockForVendor(u.vendor) })),
    [],
  )
  const frags = [...scadutreeFragments, ...mapFragments, ...flaskUpgrades].slice(0, 6)

  return (
    <>
      <Collapsed title="Blessing meters" count={blessings.length}>
        {blessings.map((p) => {
          const left = p.remaining
          const open = expanded[p.id]
          const shown = open ? left : left.slice(0, 6)
          const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
          return (
            <div key={p.id}>
              <div className="meter" style={{ padding: '0 20px', maxWidth: 460 }}>
                <label>
                  <span>{blessingLine(p)}</span>
                  <span>{pct}%</span>
                </label>
                <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                <p className="note" style={{ marginTop: 6 }}>
                  {p.note}{' '}
                  {p.incomplete ? `List incomplete in-repo (${p.listCount}/${p.total} rows). ` : ''}
                  Reference: {p.source}
                </p>
              </div>
              <div className="codex-grid">
                {shown.map((r) => (
                  <article className="card" key={r.id}>
                    <div className="kicker">{p.name}{r.dlc ? ' · DLC' : ''}</div>
                    <h3>{r.name}</h3>
                    <p className="note">{r.how}</p>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => setCharacter(applyFacts(character, [r.id], 'answer', `${p.name} meter`))}
                    >
                      Mark
                    </button>
                  </article>
                ))}
              </div>
              {left.length > 6 && (
                <button
                  type="button"
                  className="chip"
                  style={{ margin: '0 20px' }}
                  onClick={() => setExpanded((cur) => ({ ...cur, [p.id]: !open }))}
                >
                  {open ? 'Show fewer' : `Show all ${left.length} left`}
                </button>
              )}
            </div>
          )
        })}
      </Collapsed>

      <Collapsed title="Achievement sets" count={achievements.length}>
        {achievements.map((set) => {
          const left = set.remaining
          const open = expanded[set.id]
          const shown = open ? left : left.slice(0, 6)
          return (
            <div key={set.id}>
              <div className="kicker" style={{ padding: '0 20px' }}>
                {set.name} · {set.done}/{set.total} · {set.remaining.length} left — {set.note}
              </div>
              <div className="codex-grid">
                {shown.map((r) => (
                  <article className="card" key={r.id}>
                    <div className="kicker">
                      {set.name}{r.dlc ? ' · DLC' : ''}{r.missable ? ` · missable: ${r.missable}` : ''}
                    </div>
                    <h3>{r.name}</h3>
                    <p className="note">{r.how}</p>
                    <button
                      type="button"
                      className="chip"
                      onClick={() => setCharacter(applyFacts(character, [r.id], 'answer', `${set.name} set`))}
                    >
                      Mark
                    </button>
                  </article>
                ))}
              </div>
              {left.length > 6 && (
                <button
                  type="button"
                  className="chip"
                  style={{ margin: '0 20px' }}
                  onClick={() => setExpanded((cur) => ({ ...cur, [set.id]: !open }))}
                >
                  {open ? 'Show fewer' : `Show all ${left.length} left`}
                </button>
              )}
            </div>
          )
        })}
      </Collapsed>

      <Collapsed title="Dungeon checklist">
        <DungeonChecklist />
      </Collapsed>

      <Collapsed title="Merchant conditionals" count={conditionals.length}>
        <div className="codex-grid">
          {conditionals.slice(0, 6).map((u) => (
            <article className="card" key={u.vendor}>
              <div className="kicker">{u.soldBy} · conditional</div>
              <h3>{u.trigger}</h3>
              <p className="note">{u.items.join(', ') || 'Stock row missing.'}</p>
              <p className="note">{u.note}</p>
              {u.triggerId && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => setCharacter(applyFacts(character, [u.triggerId as string], 'answer', 'merchant condition'))}
                >
                  Log trigger
                </button>
              )}
            </article>
          ))}
        </div>
      </Collapsed>

      <Collapsed title="Fragments &amp; flasks" count={frags.length}>
        <div className="codex-grid">
          {frags.map((e) => (
            <article className="card" key={e.id}>
              <div className="kicker">{e.campaign} · {e.region}</div>
              <h3>{e.name}</h3>
              <p className="note">{e.note}</p>
              <button
                type="button"
                className="chip"
                onClick={() => setCharacter(applyFacts(character, [e.id], 'answer', 'collectible'))}
              >
                Mark
              </button>
            </article>
          ))}
        </div>
      </Collapsed>
    </>
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
          <EmptyState image="/brand/empty-progress.webp" line="Nothing logged yet." />
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
      <ProgressTracking />
    </div>
  )
}
