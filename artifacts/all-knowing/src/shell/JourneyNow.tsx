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
import { AreaPrompt } from './AreaPrompt'
import { ResumeCard } from './ResumeCard'
import { SeeAllButton, useRowReveal } from './rows'
import { WorldRibbon } from './WorldRibbon'
import { RecommendedCard } from './RecommendedCard'

/**
 * Task 91 `journey/now`: the "working towards" dashboard that used to sit on top
 * of the Gideon chat, reordered by the Task 100 playtest fix: lead, Recommended,
 * Before you leave, Leftovers, Next moves, then the 100% route collapsed last.
 * Every list caps at three rows behind a "See all (N)" control.
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
  const nextTotal = plan ? Math.max(0, plan.available.length - 1) : 0
  const nextReveal = useRowReveal(nextTotal)
  const nextSteps = plan ? plan.available.slice(1, 1 + nextReveal.visible) : []
  // Task 92 row 3: the same leftover pins the Atlas draws, counted here so the
  // player can see how much is still outstanding before opening the map.
  const [near, setNear] = useState(false)
  const outstanding = useMemo(
    () => leftoverPins(w.character, coords, near && w.currentArea ? { region: w.currentArea.region } : {}),
    [w.character, coords, near, w.currentArea],
  )
  const leftovers = useRowReveal(outstanding.length)
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
      <ResumeCard />
      <div className="now-cards">
        <AreaPrompt className="panel area-prompt" />
        <section className="panel now-lead">
          <div className="kicker">
            {header.goal ? `Working towards · ${header.goal}` : 'Main path'}
          </div>
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
                  <SeeAllButton total={nextTotal} expanded={nextReveal.expanded} onToggle={nextReveal.toggle} />
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

        <BeforeYouGoCard />

        <section className="panel leftover-card">
          <div className="kicker">Leftovers nearby</div>
          <h3 className="now-beat" aria-label="Leftover count">
            {outstanding.length} still outstanding here
          </h3>
          {outstanding.length > 0 && (
            <ul className="now-rows">
              {outstanding.slice(0, leftovers.visible).map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="quest"
                    onClick={() => {
                      w.setSelectedMarkerId(o.id)
                      w.setModule('map')
                    }}
                  >
                    <strong>{o.name}</strong>
                    <div className="note">{o.kind}{o.region ? ` · ${o.region}` : ''}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <SeeAllButton total={outstanding.length} expanded={leftovers.expanded} onToggle={leftovers.toggle} />
          <p className="note">
            Same layer as the Atlas. Nothing is marked until you collect it.
          </p>
          <div className="opts" style={{ marginTop: 10 }}>
            <button
              type="button"
              className={near ? 'chip on' : 'chip'}
              aria-pressed={near}
              disabled={!w.currentArea}
              onClick={() => setNear((v) => !v)}
            >
              Near me
            </button>
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
          </div>
        </section>

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

        <MedusaRoute compact collapsedByDefault />
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
