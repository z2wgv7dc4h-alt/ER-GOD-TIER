import { useState } from 'react'
import { isStepDone, planRoute, type PlanStep } from './knowledge/endings'
import { npcLocate } from './knowledge/npcLocations'
import { allLines, type Line } from './knowledge/storylines'
import { LockoutPrompt } from './LockoutPrompt'
import { MedusaRoute } from './MedusaRoute'
import { EntityLink } from './EntityLink'
import { Related } from './Related'
import { Thread } from './Thread'
import { WikiText } from './WikiText'
import { applyFacts, clearFact } from './lib/infer'
import { beatPin } from './lib/beatPins'
import { useCoords } from './lib/coords'
import { lockoutWarnings, type LockWarning } from './lib/lockWarnings'
import { factState, useWorkspace } from './state'
import type { Character } from './types'

/**
 * The Quest graph renders `allLines()` — the same one graph Gideon, `planRoute`
 * and `lockoutWarnings` use. There is no second quest list: a beat's done state
 * is the character's known facts on the beat's `factId`, and ticking a beat runs
 * `applyFacts` / `clearFact` on that fact id (never a seed step id).
 *
 * Task 126 §3 — the page is three groups: **In progress** (started questlines
 * with their next step), **Available** (not started, collapsed count) and
 * **Endings** (the five endings as a compact requirements/locks list). The 100%
 * route is its own collapsed card with a real progress bar.
 */

/** The catalog fact a beat reads and writes. `factIds` is the fallback marker. */
export function stepFact(step: PlanStep): string | null {
  return step.factId ?? step.factIds?.[0] ?? null
}

/** The current beat for a line, from the same planner Gideon uses. */
export function currentStepId(character: Character, line: Line): string | null {
  return planRoute(character, line).current?.id ?? null
}

function doneCount(character: Character, line: Line): number {
  return line.steps.filter((s) => isStepDone(character, s)).length
}

export function QuestWorkspace() {
  const { character, setCharacter, setModule, query, selectedMarkerId, setSelectedMarkerId } = useWorkspace()
  const coords = useCoords()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingLock, setPendingLock] = useState<{ factId: string; warnings: LockWarning[] } | null>(null)

  // A link from elsewhere (item/boss/Atlas) selects a step's fact id; land on its line.
  const linkedLine = selectedMarkerId
    ? allLines.find((l) => l.steps.some((s) => stepFact(s) === selectedMarkerId))
    : undefined
  const active = linkedLine ?? (activeId ? allLines.find((l) => l.id === activeId) : undefined)

  function commit(factId: string) {
    setCharacter(applyFacts(character, [factId], 'answer', `quests: ${active?.name ?? factId}`))
  }

  function toggle(step: PlanStep) {
    const factId = stepFact(step)
    if (!factId) return
    if (isStepDone(character, step) || factState(character, factId) === 'true') {
      setCharacter(clearFact(character, factId))
      return
    }
    const warnings = lockoutWarnings(character, factId)
    if (warnings.length) {
      setPendingLock({ factId, warnings })
      return
    }
    commit(factId)
  }

  function pickLine(id: string) {
    setSelectedMarkerId(null)
    setActiveId((cur) => (cur === id && !linkedLine ? null : id))
  }

  const q = query.trim().toLowerCase()
  const matches = (l: Line) => `${l.name} ${l.aliases.join(' ')}`.toLowerCase().includes(q)
  const storyLines = allLines.filter((l) => l.kind === 'story' && matches(l))
  const endingLines = allLines.filter((l) => l.kind === 'ending' && matches(l))
  const inProgress = storyLines.filter((l) => {
    const d = doneCount(character, l)
    return d > 0 && d < l.steps.length
  })
  const available = storyLines.filter((l) => doneCount(character, l) === 0)
  const completed = storyLines.filter((l) => {
    const d = doneCount(character, l)
    return d > 0 && d === l.steps.length
  })

  function LineCard({ l }: { l: Line }) {
    const done = doneCount(character, l)
    const lineCurrentId = currentStepId(character, l)
    const step = l.steps.find((s) => s.id === lineCurrentId)
    const pct = l.steps.length ? Math.round((done / l.steps.length) * 100) : 0
    const expanded = active?.id === l.id
    const currentPin = step && stepFact(step) ? beatPin(character, stepFact(step)!, coords) : null
    const npcLoc = npcLocate(character, l.id)
    const canBreak = l.steps.some((s) => s.lockout)
    const linkedStep = linkedLine?.id === l.id ? selectedMarkerId : null
    return (
      <li className={expanded ? 'quest-line open' : 'quest-line'}>
        <button type="button" className="quest-line-head" aria-expanded={expanded} onClick={() => pickLine(l.id)}>
          <span className="quest-line-top">
            <strong>{l.name}</strong>
            <span className="note">{done}/{l.steps.length}</span>
          </span>
          <span className="note quest-line-step">{step ? step.do : 'All beats done'}</span>
          {canBreak && <span className="chip warn">Can break</span>}
          <span className="quest-line-bar" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </span>
        </button>
        {expanded && (
          <div className="quest-line-body">
            <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0 8px' }}>
              <EntityLink id={`line:${l.id}`}>{l.name}</EntityLink>
            </h3>
            {npcLoc && (
              <p className="note" style={{ marginBottom: 8 }}>
                {npcLoc.name} is at {npcLoc.graceName}.
              </p>
            )}
            {selectedMarkerId && !linkedStep && <Thread id={selectedMarkerId} />}
            <ul className="steps">
              {l.steps.map((s) => {
                const factId = stepFact(s)
                return (
                  <li key={s.id} className={factId === linkedStep || s.id === lineCurrentId ? 'step-linked' : undefined}>
                    <input
                      type="checkbox"
                      checked={isStepDone(character, s)}
                      disabled={!factId}
                      onChange={() => toggle(s)}
                    />
                    <div>
                      <div>
                        <WikiText text={s.do} />
                        {s.id === lineCurrentId ? ' · now' : ''}
                      </div>
                      <WikiText className="note" text={s.detail} />
                      {s.obtain && <div className="note">Reward: {s.obtain}</div>}
                      {s.lockout && <div className="warn">{s.lockout}</div>}
                      {factId && (
                        <button type="button" className="chip" onClick={() => setSelectedMarkerId(factId)}>
                          Thread
                        </button>
                      )}
                      {s.id === lineCurrentId && currentPin && factId && (
                        <button
                          type="button"
                          className="chip"
                          onClick={() => {
                            setSelectedMarkerId(factId)
                            setModule('map')
                          }}
                        >
                          Show on map
                        </button>
                      )}
                      <Related id={factId ?? s.id} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="quests-page">
      <section className="panel quest-route-card">
        <MedusaRoute compact collapsedByDefault />
      </section>

      <section className="panel">
        <div className="kicker">In progress</div>
        {inProgress.length === 0 ? (
          <p className="note">No questline started yet.</p>
        ) : (
          <ul className="quest-accordion">
            {inProgress.map((l) => <LineCard key={l.id} l={l} />)}
          </ul>
        )}

        {available.length > 0 && (
          <details className="quest-group">
            <summary className="kicker">Available · {available.length} not started</summary>
            <ul className="quest-accordion">
              {available.map((l) => <LineCard key={l.id} l={l} />)}
            </ul>
          </details>
        )}

        {completed.length > 0 && (
          <details className="quest-group">
            <summary className="kicker">Completed · {completed.length}</summary>
            <ul className="quest-accordion">
              {completed.map((l) => <LineCard key={l.id} l={l} />)}
            </ul>
          </details>
        )}
      </section>

      {endingLines.length > 0 && (
        <section className="panel">
          <div className="kicker">Endings</div>
          <ul className="ending-list">
            {endingLines.map((l) => {
              const plan = planRoute(character, l)
              const done = l.steps.length - plan.remain
              const blocked = plan.blocked[0]
              return (
                <li key={l.id}>
                  <EntityLink id={`line:${l.id}`}>{l.name}</EntityLink>
                  <span className="note">{done}/{l.steps.length}</span>
                  {plan.locked ? (
                    <span className="warn">{plan.locked}</span>
                  ) : blocked ? (
                    <span className="note">Needs {blocked.do}</span>
                  ) : plan.current ? (
                    <span className="note">{plan.current.do}</span>
                  ) : (
                    <span className="note">Ready</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {pendingLock && (
        <LockoutPrompt
          warnings={pendingLock.warnings}
          onCancel={() => setPendingLock(null)}
          onConfirm={() => {
            const factId = pendingLock.factId
            setPendingLock(null)
            commit(factId)
          }}
        />
      )}
    </div>
  )
}
