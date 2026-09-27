import { useMemo, useState } from 'react'
import { nextCompletionId, planRoute } from '../knowledge/endings'
import { allLines, stillAvailable } from '../knowledge/storylines'
import { applyFacts } from '../lib/infer'
import { beatPin } from '../lib/beatPins'
import { useCoords } from '../lib/coords'
import { gideonHeader } from '../lib/gideonHeader'
import { leftoverPins } from '../lib/leftoverPins'
import { labelOf } from '../lib/links'
import { lockoutWarningsFor, type LockWarning } from '../lib/lockWarnings'
import { targetModule } from '../lib/related'
import { BeforeYouGoCard } from '../BeforeYouGoCard'
import { LockoutPrompt } from '../LockoutPrompt'
import { MedusaRoute } from '../MedusaRoute'
import { RelatedCollapsible } from '../Related'
import { NextMoves } from '../Thread'
import { useWorkspace } from '../state'
import { WorldRibbon } from './WorldRibbon'
import { RecommendedCard } from './RecommendedCard'

/**
 * Task 91 `journey/now`: the "working towards" dashboard that used to sit on top
 * of the Gideon chat. Same data sources — `gideonHeader`, `planRoute`,
 * `stillAvailable`, `beatPin`, `lockoutWarningsFor` — moved, not rewritten.
 */
export function JourneyNow() {
  const w = useWorkspace()
  const coords = useCoords()
  const header = useMemo(() => gideonHeader(w.character), [w.character])
  const goalLine = useMemo(
    () => (typeof w.character.answers.gideonGoal === 'string'
      ? allLines.find((l) => l.id === w.character.answers.gideonGoal)
      : undefined),
    [w.character.answers.gideonGoal],
  )
  const plan = useMemo(() => (goalLine ? planRoute(w.character, goalLine) : null), [goalLine, w.character])
  const survey = useMemo(() => stillAvailable(w.character), [w.character])
  const openCount = survey.active.length + survey.open.length
  const lockedCount = survey.locked.length
  const showPin = header.factId ? beatPin(w.character, header.factId, coords) : null
  const blitzLine = useMemo(() => allLines.find((l) => l.kind === 'blitz'), [])
  const nextSteps = useMemo(() => (plan ? plan.available.slice(1, 4) : []), [plan])
  // Task 92 row 3: the same leftover pins the Atlas draws, counted here so the
  // player can see how much is still outstanding before opening the map.
  const outstanding = useMemo(() => leftoverPins(w.character, coords), [w.character, coords])
  const [lockPending, setLockPending] = useState<{ ids: string[]; warnings: LockWarning[] } | null>(null)

  function persistGoal(id?: string) {
    if (!id || w.character.answers.gideonGoal === id) return
    w.setCharacter({ ...w.character, answers: { ...w.character.answers, gideonGoal: id } })
  }

  function doneNow() {
    if (!plan?.current) return
    const factId = nextCompletionId(w.character, plan.current)
    if (!factId) return
    const warnings = lockoutWarningsFor(w.character, [factId])
    if (warnings.length) {
      setLockPending({ ids: [factId], warnings })
      return
    }
    w.setCharacter(applyFacts(w.character, [factId], 'answer', 'I’m done'))
  }

  function confirmLock() {
    if (!lockPending) return
    w.setCharacter(applyFacts(w.character, lockPending.ids, 'answer', 'Gideon: confirmed lockout'))
    setLockPending(null)
  }

  return (
    <div className="now-page">
      <WorldRibbon />
      <div className="now-cards">
        <section className="panel now-lead">
          <div className="kicker">Working towards{header.goal ? ` · ${header.goal}` : ''}</div>
          {header.beat ? (
            <>
              <div className="kicker" style={{ marginTop: 6 }}>Now</div>
              <h3 className="now-beat" aria-label="Current beat">{header.beat}</h3>
              {header.gate && <p className="note" style={{ margin: '4px 0 0' }}>Gate ahead: {header.gate}</p>}
              <div className="opts" style={{ marginTop: 10 }}>
                {showPin && (
                  <button
                    type="button"
                    className="chip on"
                    onClick={() => {
                      w.setSelectedMarkerId(showPin.id)
                      w.setModule('map')
                    }}
                  >
                    Show on map
                  </button>
                )}
                {plan?.current && (
                  <button type="button" className="chip" onClick={doneNow}>Done</button>
                )}
                {blitzLine && (
                  <button
                    type="button"
                    className={goalLine?.kind === 'blitz' ? 'chip on' : 'chip'}
                    title="Chase the shortest Lord route"
                    onClick={() => persistGoal(blitzLine.id)}
                  >
                    Blitz
                  </button>
                )}
                <button type="button" className="chip" onClick={() => w.go('gideon')}>Ask Gideon</button>
                {header.factId && (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      w.setSelectedMarkerId(header.factId!)
                      w.setModule(targetModule(header.factId!))
                    }}
                  >
                    Open {labelOf(header.factId)}
                  </button>
                )}
              </div>

              {nextSteps.length > 0 && (
                <div className="now-steps">
                  <div className="kicker">Next</div>
                  {nextSteps.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="quest"
                      onClick={() => {
                        if (!s.factId) return
                        w.setSelectedMarkerId(s.factId)
                        w.setModule(s.module ?? 'map')
                      }}
                    >
                      <strong>{s.do}</strong>
                      <div className="note">{s.detail}</div>
                    </button>
                  ))}
                </div>
              )}

              {header.factId && <RelatedCollapsible id={header.factId} />}
            </>
          ) : (
            <p className="note">No beat yet. Ask what is still available.</p>
          )}

          <button
            type="button"
            className="chip"
            style={{ marginTop: 8 }}
            onClick={() => w.go('journey', 'quests')}
          >
            {openCount} open · {lockedCount} locked
          </button>
        </section>
        <RecommendedCard />

        <section className="panel">
          <div className="kicker">Next moves</div>
          <p className="note">
            Every item links into the map or the quest graph — nothing here changes your run on its own.
          </p>
          <NextMoves
            onOpen={(id) => {
              w.setSelectedMarkerId(id)
              w.setModule('map')
            }}
          />
          <div className="opts" style={{ marginTop: 12 }}>
            <button type="button" className="chip" onClick={() => w.go('journey', 'map')}>Open the map</button>
            <button type="button" className="chip" onClick={() => w.go('journey', 'quests')}>Open Quests</button>
          </div>
        </section>

        <section className="panel leftover-card">
          <div className="kicker">Leftovers nearby</div>
          <h3 className="now-beat" aria-label="Leftover count">
            {outstanding.length} still outstanding here
          </h3>
          <p className="note">
            Same layer as the Atlas. Nothing is marked until you collect it.
          </p>
          <div className="opts" style={{ marginTop: 10 }}>
            <button
              type="button"
              className={w.showLeftovers ? 'chip on' : 'chip'}
              aria-pressed={w.showLeftovers}
              onClick={() => {
                if (!w.showLeftovers) w.toggleLeftovers()
                w.go('journey', 'map')
              }}
            >
              Show on map
            </button>
            <button type="button" className="chip" onClick={() => w.go('journey', 'map')}>Open the map</button>
          </div>
        </section>

        <BeforeYouGoCard />

        <MedusaRoute compact />
      </div>

      {lockPending && (
        <LockoutPrompt
          warnings={lockPending.warnings}
          onCancel={() => setLockPending(null)}
          onConfirm={confirmLock}
        />
      )}
    </div>
  )
}
