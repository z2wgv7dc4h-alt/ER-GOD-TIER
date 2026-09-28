import { useMemo, useState } from 'react'
import { nextCompletionId, planRoute } from '../knowledge/endings'
import { allLines, stillAvailable } from '../knowledge/storylines'
import { applyFacts } from '../lib/infer'
import { beatPin } from '../lib/beatPins'
import { useCoords } from '../lib/coords'
import { gideonHeader } from '../lib/gideonHeader'
import { leftoverPins } from '../lib/leftoverPins'
import { leftovers as missedLoot } from '../lib/leftovers'
import { lockoutWarningsFor, type LockWarning } from '../lib/lockWarnings'
import { suggestedNextArea } from '../lib/worldState'
import { BeforeYouGoCard } from '../BeforeYouGoCard'
import { LockoutPrompt } from '../LockoutPrompt'
import { MedusaRoute } from '../MedusaRoute'
import { RelatedCollapsible } from '../Related'
import { useWorkspace } from '../state'
import { WatchlistCard } from '../watch/WatchlistCard'
import { AreaPrompt } from './AreaPrompt'
import { ResumeCard } from './ResumeCard'
import { SeeAllButton, useRowReveal } from './rows'
import { RecommendedCard, hasUnsetStats } from './RecommendedCard'
import { Button, ListRow } from '../ui'

/**
 * Task 91 `journey/now`: the "working towards" dashboard. Task 126 reordered it
 * around a single current-goal card (one primary action, one overflow), then
 * Recommended, Before you leave, Missed nearby, Watchlist and the collapsed
 * 100% route — each rendered only when it has something to say.
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
  const outstanding = useMemo(() => leftoverPins(w.character, coords, {}), [w.character, coords])
  // "Missed nearby" combines the resolved map pins with any still-missable loot
  // the data knows about, deduped by id, so the card is only shown when there is
  // genuinely something to list.
  const missed = useMemo(() => {
    const rows = outstanding.map((o) => ({
      id: o.id,
      name: o.name,
      sub: `${o.kind}${o.region ? ` · ${o.region}` : ''}`,
      target: o.id,
    }))
    const seen = new Set(rows.map((r) => r.id))
    for (const e of missedLoot(w.character)) {
      if (seen.has(e.id)) continue
      seen.add(e.id)
      rows.push({
        id: e.id,
        name: e.name,
        sub: `${e.kind}${e.region ? ` · ${e.region}` : ''}`,
        target: e.grace ?? e.id,
      })
    }
    return rows
  }, [outstanding, w.character])
  const leftovers = useRowReveal(missed.length)
  const [lockPending, setLockPending] = useState<{ ids: string[]; warnings: LockWarning[] } | null>(null)
  const unset = hasUnsetStats(w.character)
  const suggested = useMemo(() => suggestedNextArea(w.character), [w.character])
  // "Mark done" works from the explicit goal plan when there is one, and from
  // the header beat's fact otherwise — so it sits next to "Show on map" instead
  // of disappearing whenever no goal is pinned.
  const doneFact = plan?.current ? (nextCompletionId(w.character, plan.current) ?? null) : (header.factId ?? null)

  function persistGoal(id?: string) {
    if (!id || w.character.answers.gideonGoal === id) return
    w.setCharacter({ ...w.character, answers: { ...w.character.answers, gideonGoal: id } })
  }

  function doneNow() {
    if (!doneFact) return
    const warnings = lockoutWarningsFor(w.character, [doneFact])
    if (warnings.length) {
      setLockPending({ ids: [doneFact], warnings })
      return
    }
    w.setCharacter(applyFacts(w.character, [doneFact], 'answer', 'I’m done'))
  }

  function confirmLock() {
    if (!lockPending) return
    w.setCharacter(applyFacts(w.character, lockPending.ids, 'answer', 'Gideon: confirmed lockout'))
    setLockPending(null)
  }

  return (
    <div className="now-page">
      <ResumeCard />
      <div className="now-cards">
        <AreaPrompt className="panel area-prompt" />

        <section className="panel now-lead">
          <div className="kicker">
            {header.goal ? `Working towards · ${header.goal}` : 'Main path'}
          </div>
          {header.beat ? (
            <>
              <h3 className="now-beat" aria-label="Current step">{header.beat}</h3>
              {header.gate && <p className="note" style={{ margin: '4px 0 0' }}>Gate ahead: {header.gate}</p>}
              <div className="opts lead-actions" style={{ marginTop: 10 }}>
                {header.factId && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      w.setSelectedMarkerId(showPin?.id ?? header.factId!)
                      w.setModule('map')
                    }}
                  >
                    Show on map
                  </Button>
                )}
                {doneFact && <Button variant="secondary" onClick={doneNow}>Mark done</Button>}
                <NowMore blitzLineId={blitzLine?.id} goalLineKind={goalLine?.kind} onPersistGoal={persistGoal} factId={header.factId} />
              </div>

              {suggested && (
                <p className="note suggested-area" style={{ margin: '10px 0 0' }}>
                  Suggested next area: <strong>{suggested}</strong>
                </p>
              )}

              {nextSteps.length > 0 && (
                <div className="now-steps">
                  <div className="kicker" style={{ marginTop: 12 }}>Next steps</div>
                  {nextSteps.map((s) => (
                    <ListRow
                      key={s.id}
                      title={s.do}
                      subtitle={s.detail}
                      chevron
                      onClick={() => {
                        if (!s.factId) return
                        w.setSelectedMarkerId(s.factId)
                        w.setModule(s.module ?? 'map')
                      }}
                    />
                  ))}
                  <SeeAllButton total={nextTotal} expanded={nextReveal.expanded} onToggle={nextReveal.toggle} />
                </div>
              )}
            </>
          ) : (
            <p className="note">No step yet. Ask what is still available.</p>
          )}

          <Button
            variant="ghost"
            small
            style={{ marginTop: 8 }}
            onClick={() => w.go('journey', 'quests')}
          >
            {openCount} questlines available · {lockedCount} closed off
          </Button>
        </section>

        {unset ? (
          <section className="panel">
            <ListRow
              title="Set up your character"
              subtitle="Recommended weapons and to-dos need your stats and gear."
              chevron
              onClick={() => w.go('me', 'setup')}
            />
          </section>
        ) : (
          <RecommendedCard />
        )}

        <BeforeYouGoCard />

        {missed.length > 0 && (
          <section className="panel leftover-card">
            <div className="kicker">Missed nearby</div>
            {missed.slice(0, leftovers.visible).map((o) => (
              <ListRow
                key={o.id}
                title={o.name}
                subtitle={o.sub}
                chevron
                onClick={() => {
                  w.setSelectedMarkerId(o.target)
                  w.setModule('map')
                }}
              />
            ))}
            <SeeAllButton total={missed.length} expanded={leftovers.expanded} onToggle={leftovers.toggle} />
            <Button
              variant="ghost"
              small
              style={{ marginTop: 8 }}
              onClick={() => {
                if (!w.showLeftovers) w.toggleLeftovers()
                w.go('journey', 'map')
              }}
            >
              Show all on map
            </Button>
          </section>
        )}

        <WatchlistCard />

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

/** The goal card overflow: Fastest route · Ask Gideon · Connections. */
function NowMore({
  blitzLineId,
  goalLineKind,
  onPersistGoal,
  factId,
}: {
  blitzLineId?: string
  goalLineKind?: string
  onPersistGoal: (id?: string) => void
  factId: string | null | undefined
}) {
  const w = useWorkspace()
  const [open, setOpen] = useState(false)
  return (
    <div className="now-more">
      <Button
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More goal actions"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </Button>
      {open && (
        <div className="now-more-menu panel" role="menu">
          {blitzLineId && (
            <button
              type="button"
              role="menuitem"
              className={goalLineKind === 'blitz' ? 'chip on' : 'chip'}
              onClick={() => { onPersistGoal(blitzLineId); setOpen(false) }}
            >
              Fastest route
            </button>
          )}
          <button type="button" role="menuitem" className="chip" onClick={() => { w.go('gideon'); setOpen(false) }}>
            Ask Gideon
          </button>
          {factId && <RelatedCollapsible id={factId} title="Connections" />}
        </div>
      )}
    </div>
  )
}
