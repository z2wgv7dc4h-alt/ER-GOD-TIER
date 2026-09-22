import { useState } from 'react'
import { isStepDone, planRoute, type PlanStep } from './knowledge/endings'
import { npcLocate } from './knowledge/npcLocations'
import { allLines, type Line } from './knowledge/storylines'
import { LockoutPrompt } from './LockoutPrompt'
import { Related } from './Related'
import { Thread } from './Thread'
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
 */

/** The catalog fact a beat reads and writes. `factIds` is the fallback marker. */
export function stepFact(step: PlanStep): string | null {
  return step.factId ?? step.factIds?.[0] ?? null
}

/** The current beat for a line, from the same planner Gideon uses. */
export function currentStepId(character: Character, line: Line): string | null {
  return planRoute(character, line).current?.id ?? null
}

export function QuestWorkspace() {
  const { character, setCharacter, setModule, query, selectedMarkerId, setSelectedMarkerId } = useWorkspace()
  const coords = useCoords()
  const [activeId, setActiveId] = useState(allLines[0]?.id)
  const [pendingLock, setPendingLock] = useState<{ factId: string; warnings: LockWarning[] } | null>(null)

  // A link from elsewhere (item/boss/Atlas) selects a step's fact id; land on its line.
  const linkedLine = selectedMarkerId
    ? allLines.find((l) => l.steps.some((s) => stepFact(s) === selectedMarkerId))
    : undefined
  const active = linkedLine ?? allLines.find((l) => l.id === activeId) ?? allLines[0]
  const q = query.trim().toLowerCase()
  const filtered = allLines.filter((l) => `${l.name} ${l.aliases.join(' ')}`.toLowerCase().includes(q))
  const linkedStep = linkedLine && linkedLine.id === active?.id ? selectedMarkerId : null
  const currentId = active ? currentStepId(character, active) : null
  // Task 78: the current beat gets Show on map only if a pin already exists.
  const currentStep = active?.steps.find((s) => s.id === currentId)
  const currentFact = currentStep ? stepFact(currentStep) : null
  const currentPin = currentFact ? beatPin(character, currentFact, coords) : null
  // Task 79: a one-line "where is the companion" when the locator has a pin.
  const npcLoc = active ? npcLocate(character, active.id) : null

  function commit(factId: string) {
    setCharacter(applyFacts(character, [factId], 'answer', `quests: ${active?.name ?? factId}`))
  }

  function toggle(step: PlanStep) {
    const factId = stepFact(step)
    if (!factId) return
    // Un-ticking never locks anything.
    if (isStepDone(character, step) || factState(character, factId) === 'true') {
      setCharacter(clearFact(character, factId))
      return
    }
    // Real DAG lockouts first; the confirm modal is keyed to the fact id.
    const warnings = lockoutWarnings(character, factId)
    if (warnings.length) {
      setPendingLock({ factId, warnings })
      return
    }
    commit(factId)
  }

  function pickLine(id: string) {
    setSelectedMarkerId(null)
    setActiveId(id)
  }

  if (!active) return null

  return (
    <div className="split">
      <section className="panel">
        <div className="kicker">Lines that can break</div>
        <div className="quest-list" style={{ marginTop: 14 }}>
          {filtered.map((l) => {
            const done = l.steps.filter((s) => isStepDone(character, s)).length
            return (
              <button
                key={l.id}
                className={l.id === active.id ? 'quest active' : 'quest'}
                onClick={() => pickLine(l.id)}
              >
                <header>
                  <strong>{l.name}</strong>
                  <span className="note">{done}/{l.steps.length}</span>
                </header>
                <div className="note" style={{ marginTop: 6 }}>{l.kind}</div>
              </button>
            )
          })}
        </div>
      </section>
      <section className="panel">
        <div className="kicker">{active.kind}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0 8px' }}>{active.name}</h3>
        {npcLoc && (
          <p className="note" style={{ marginBottom: 8 }}>
            {npcLoc.name} is at {npcLoc.graceName}.
          </p>
        )}
        {selectedMarkerId && !linkedStep && <Thread id={selectedMarkerId} />}
        <ul className="steps">
          {active.steps.map((step) => {
            const factId = stepFact(step)
            return (
              <li
                key={step.id}
                className={factId === linkedStep || step.id === currentId ? 'step-linked' : undefined}
              >
                <input
                  type="checkbox"
                  checked={isStepDone(character, step)}
                  disabled={!factId}
                  onChange={() => toggle(step)}
                />
                <div>
                  <div>
                    {step.do}
                    {step.id === currentId ? ' · now' : ''}
                  </div>
                  <div className="note">{step.detail}</div>
                  {step.obtain && <div className="note">Reward: {step.obtain}</div>}
                  {step.lockout && <div className="warn">{step.lockout}</div>}
                  {factId && (
                    <button type="button" className="chip" onClick={() => setSelectedMarkerId(factId)}>
                      Thread
                    </button>
                  )}
                  {step.id === currentId && currentPin && factId && (
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
                  <Related id={factId ?? step.id} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
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
