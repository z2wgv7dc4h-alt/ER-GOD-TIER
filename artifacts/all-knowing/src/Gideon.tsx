import { useEffect, useMemo, useRef, useState } from 'react'
import { opBuilds } from './knowledge/builds'
import { pvpBuilds } from './knowledge/pvp'
import { applyFacts } from './lib/infer'
import { askGideon, type GideonAction, type GideonMemory, type GideonSource } from './lib/gideon'
import { actionIds, applyFollowUp, applyGideonActions, isCharacterAction } from './lib/gideonAct'
import { searchSync } from './lib/search'
import { medusaChapters } from './knowledge/medusa'
import { leftovers, toggleWatch, watchlistOf } from './lib/leftovers'
import { idleSuggestions } from './lib/suggestions'
import { lockoutWarningsFor, type LockWarning } from './lib/lockWarnings'
import { LockoutPrompt } from './LockoutPrompt'
import { type ChatMessage } from './lib/muse'
import { labelOf } from './lib/links'
import { GideonAnswer, GideonSay } from './GideonAnswer'
import { RelatedCollapsible } from './Related'
import { WikiText } from './WikiText'
import { useWorkspace } from './state'

type LogRow = {
  role: 'you' | 'gideon'
  text: string
  factId?: string
  links?: string[]
  actions?: GideonAction[]
  sources?: GideonSource[]
}

type Pending =
  | { kind: 'mark'; ids: string[]; warnings: LockWarning[] }
  | { kind: 'actions'; actions: GideonAction[]; text: string; includeNav: boolean; warnings: LockWarning[] }

export function Gideon() {
  const w = useWorkspace()
  const savedGoal = typeof w.character.answers.gideonGoal === 'string' ? w.character.answers.gideonGoal : undefined
  const [q, setQ] = useState('')
  const [memory, setMemory] = useState<GideonMemory>({ goalId: savedGoal })
  const [offer, setOffer] = useState<{ label: string; prompt: string; factId?: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [skipped, setSkipped] = useState<number[]>([])
  // Muse is a reasoning model — a turn takes seconds, so show that it is working.
  const [busy, setBusy] = useState(false)
  const [lockPending, setLockPending] = useState<Pending | null>(null)
  const [log, setLog] = useState<LogRow[]>([
    { role: 'gideon', text: 'Ask me anything — where an item is, what to do next, how to beat a boss. Or tell me what you just did.' },
  ])

  // Real next actions for this character; recomputed only when the character
  // changes, never per keystroke, so the input stays responsive.
  const suggestions = useMemo(() => idleSuggestions(w.character, 3), [w.character])
  // The latest Gideon answer gets an explicit link + its real graph edges.
  const lastGideonIdx = log.reduce((acc, r, i) => (r.role === 'gideon' ? i : acc), -1)
  // Keep the newest turn in view as the conversation grows.
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])
  // A new character is a new context: let the strip offer again.
  useEffect(() => { setDismissed(false) }, [w.character])

  // Task 92: an entity's "Ask Gideon" action drops a one-shot question into the
  // character's answers, then lands here. Consume it exactly once (StrictMode
  // double-invokes effects, so guard on the question text).
  const handledAsk = useRef('')
  const pendingAsk = typeof w.character.answers.gideonAsk === 'string' ? w.character.answers.gideonAsk : ''
  useEffect(() => {
    if (!pendingAsk || handledAsk.current === pendingAsk) return
    handledAsk.current = pendingAsk
    w.setCharacter({ ...w.character, answers: { ...w.character.answers, gideonAsk: '' } })
    void run(pendingAsk)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAsk])

  function persistGoal(id?: string) {
    if (!id || w.character.answers.gideonGoal === id) return
    w.setCharacter({ ...w.character, answers: { ...w.character.answers, gideonGoal: id } })
  }

  async function run(text: string) {
    setBusy(true)
    // Keep one open session: prior turns go to the model so follow-ups have
    // context. The router still answers deterministically first.
    const history: ChatMessage[] = log
      .slice(1)
      .map((r) => ({ role: r.role === 'you' ? 'user' : 'assistant', content: r.text }))
    const act = await askGideon(text, w.character, memory, history, w.currentArea).finally(() => setBusy(false))
    const nextMem: GideonMemory = {
      goalId: act.goal ?? memory.goalId,
      lastFact: act.factId ?? memory.lastFact,
      lastModule: act.module ?? memory.lastModule,
    }
    setMemory(nextMem)
    persistGoal(nextMem.goalId)
    // Task 107 §7: on a phone (or a desktop without the dock) an answer must
    // never move the player off it. Section/map moves become buttons under the
    // log entry. A desktop with the dock open may keep the old auto-nav.
    const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches
    const autoNav = !isPhone && w.dockOpen && w.section !== 'gideon'
    const navActions: GideonAction[] = []
    if (autoNav) {
      if (act.factId && act.module === 'map') {
        w.focusOnMap(act.factId)
      } else {
        if (act.module) w.setModule(act.module)
        if (act.factId && (act.navigateNow || /show|take me|pin/i.test(text))) {
          w.setSelectedMarkerId(act.factId)
        }
      }
    } else if (act.factId && act.module === 'map') {
      navActions.push({ type: 'showOnMap', id: act.factId })
    } else if (act.factId && act.module) {
      navActions.push({ type: 'open', id: act.factId })
    }
    const mergedActions = [...(act.actions ?? [])]
    for (const a of navActions) {
      const dup = mergedActions.some((x) => x.type === a.type && 'id' in x && 'id' in a && x.id === a.id)
      if (!dup) mergedActions.push(a)
    }
    // One commit for build stats/loadout + hunt watchlist: two setCharacter
    // calls in the same tick would each start from the stale render value.
    let next = w.character
    let changed = false
    if (act.buildId) {
      const b = [...opBuilds, ...pvpBuilds].find((x) => x.id === act.buildId)
      if (b) {
        next = { ...next, stats: b.stats, level: b.level, loadout: b.kit, answers: { ...next.answers, buildKit: b.id } }
        changed = true
      }
    }
    if (act.watch?.length) {
      // Build-hunt pins: add the missing loot to the existing watchlist layer.
      const wl = watchlistOf(next)
      const add = act.watch.filter((id) => !wl.includes(id))
      if (add.length) {
        next = { ...next, answers: { ...next.answers, watch: [...wl, ...add].join(',') } }
        changed = true
      }
      if (!w.showLeftovers) w.toggleLeftovers()
    }
    if (changed) w.setCharacter(next)
    if (act.markDone?.length) {
      // Confirm-before-tick: only mutate once a lockout warning is acknowledged.
      const warnings = lockoutWarningsFor(w.character, act.markDone)
      if (warnings.length) {
        setLockPending({ kind: 'mark', ids: act.markDone, warnings })
      } else {
        w.setCharacter(applyFacts(w.character, act.markDone, 'answer', `Gideon: ${text}`))
      }
    }
    setOffer(act.offer ?? null)
    // Task 101 actions are never auto-applied: they render as confirm chips
    // (character changes) or plain navigation buttons under the answer. Task 107
    // §7 folds the suppressed phone navigation in as "Show on map" buttons.
    setLog((rows) => [
      ...rows,
      { role: 'you' as const, text },
      {
        role: 'gideon' as const,
        text: act.say,
        factId: act.factId,
        links: act.links,
        actions: mergedActions.length ? mergedActions : undefined,
        sources: act.sources,
      },
    ].slice(-10))
  }

  /** Run a navigation-only action immediately (no confirm needed). */
  function runNav(action: GideonAction) {
    if (action.type === 'showOnMap') {
      w.focusOnMap(action.id)
    } else if (action.type === 'open') {
      w.openEntity(action.id)
    } else if (action.type === 'showPlan') {
      w.go('journey', 'now')
    }
  }

  /** Commit character actions + (optionally) navigation, then post the follow-up. */
  function commitActions(actions: GideonAction[], text: string, includeNav: boolean) {
    const charActions = actions.filter(isCharacterAction)
    const result = applyGideonActions(w.character, charActions, `Gideon: ${text}`)
    if (charActions.length) w.setCharacter(result.character)
    if (includeNav) actions.filter((a) => !isCharacterAction(a)).forEach(runNav)
    const follow = applyFollowUp(result)
    if (follow) setLog((rows) => [...rows, { role: 'gideon' as const, text: follow }].slice(-10))
  }

  /** Apply proposed actions, stopping for the lockout prompt when a gate trips. */
  function runActions(actions: GideonAction[], text: string, includeNav: boolean) {
    const ids = actions.filter(isCharacterAction).flatMap(actionIds)
    const warnings = ids.length ? lockoutWarningsFor(w.character, ids) : []
    if (warnings.length) {
      setLockPending({ kind: 'actions', actions, text, includeNav, warnings })
      return
    }
    commitActions(actions, text, includeNav)
  }

  function submit() {
    const text = q.trim()
    if (!text) return
    const lootish = searchSync(text)
    const asking = /\b(what|where|how|want|ending|blitz|available|next|show|yes|who)\b/i.test(text)
    if (lootish.length && !asking) {
      w.setCharacter(applyFacts(w.character, lootish.map((x) => x.id), 'answer', 'guide field'))
      w.setSelectedMarkerId(lootish[0].id)
      if (lootish[0].module) w.setModule(lootish[0].module)
      setLog((rows) => [...rows, { role: 'you' as const, text }, { role: 'gideon' as const, text: `Logged ${lootish[0].id}.` }].slice(-10))
      setQ('')
      return
    }
    void run(text)
    setQ('')
  }

  function confirmLock() {
    if (!lockPending) return
    const pending = lockPending
    setLockPending(null)
    if (pending.kind === 'mark') {
      w.setCharacter(applyFacts(w.character, pending.ids, 'answer', 'Gideon: confirmed lockout'))
    } else {
      commitActions(pending.actions, pending.text, pending.includeNav)
    }
  }

  // Task 108 §5: a navigation offer names its target ("Show Gael Tunnel on map")
  // instead of a bare "Show it".
  const offerLabel = offer
    ? offer.factId && /^show/i.test(offer.label)
      ? `Show ${labelOf(offer.factId)} on map`
      : offer.label
    : ''
  const idle = q.trim() === ''
  const nearby = leftovers(w.character)
  const watch = watchlistOf(w.character)
  const hasChips = Boolean(offer) || idle

  return (
    <section className="gideon">
      {/* Task 109 §3: a small 40px avatar and the name. Engine/AI status and
          icon-pack details live on Tarnished › Profiles, never here. */}
      <div className="gideon-head">
        <img className="guide-face" src="/art/guide.jpg" alt="" />
        <div className="gideon-head-text">
          <h2 className="gideon-name">Gideon Ofnir</h2>
          <p className="note gideon-tagline">Ask about an item, a boss, or what to do next.</p>
        </div>
      </div>

      <div className="gideon-log" ref={logRef}>
        {log.map((row, i) => {
          const isLast = row.role === 'gideon' && i === lastGideonIdx
          const showActions = isLast && !skipped.includes(i)
          return (
            <div key={i}>
              <p className={row.role === 'gideon' ? 'note' : ''}>
                <strong>{row.role === 'gideon' ? 'Gideon' : 'You'} · </strong>
                {row.role === 'gideon' ? <GideonSay text={row.text} /> : <WikiText text={row.text} />}
              </p>
              {isLast && (
                <GideonAnswer
                  text={row.text}
                  links={row.links}
                  actions={row.actions}
                  sources={row.sources}
                  showActions={showActions}
                  onApply={() => runActions(row.actions ?? [], row.text, false)}
                  onApplyAll={() => runActions(row.actions ?? [], row.text, true)}
                  onNav={runNav}
                  onSkip={() => setSkipped((s) => [...s, i])}
                />
              )}
              {isLast && row.factId && (
                <RelatedCollapsible id={row.factId} />
              )}
            </div>
          )
        })}
      </div>

      {/* Task 108 §3: every quick ask — the standing offer, the next-step
          suggestions, nearby leftovers and the guided prompts — is one
          horizontally scrollable row above the input, never a stack. */}
      {hasChips && (
        <div className="gideon-chips" role="group" aria-label="Quick asks">
          {offer && (
            <button type="button" className="chip on gideon-offer" onClick={() => run(offer.prompt)}>
              {offerLabel}
            </button>
          )}
          {idle && !dismissed && suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip"
              title={s.prompt}
              onClick={() => {
                setDismissed(true)
                void run(s.prompt)
              }}
            >
              {s.label}
            </button>
          ))}
          {idle && !dismissed && suggestions.length > 0 && (
            <button
              type="button"
              className="gideon-suggest-x"
              aria-label="Dismiss suggestions"
              onClick={() => setDismissed(true)}
            >
              ×
            </button>
          )}
          {idle && nearby.slice(0, 3).map((e) => (
            <button
              key={e.id}
              type="button"
              className={watch.includes(e.id) ? 'chip on' : 'chip'}
              onClick={() => {
                if (e.grace) w.focusOnMap(e.grace)
                w.setCharacter(toggleWatch(w.character, e.id))
              }}
            >
              Nearby leftover · {e.name}
            </button>
          ))}
          {idle && (
            <>
              <button type="button" className="chip" onClick={() => run('What is still available on this run?')}>Still available</button>
              <button type="button" className="chip" onClick={() => run('I am stuck. Help with this wall.')}>Stuck</button>
              <button type="button" className="chip" onClick={() => run('100% completionist route')}>100% spine</button>
              <button
                type="button"
                className="chip"
                onClick={() => run(`100% route: ${medusaChapters[0].name}. ${medusaChapters[0].goal} Then ${medusaChapters[1].name}.`)}
              >
                100% · {medusaChapters[0].name}
              </button>
              <button type="button" className="chip" onClick={() => run('I am here, before I go on, what should I do so I do not outlevel it')}>Before I go</button>
              <button type="button" className="chip" onClick={() => run('What did I miss here?')}>Missed here</button>
              <button type="button" className="chip" onClick={() => run('Where are the illusory walls here?')}>Secrets</button>
              <button type="button" className="chip" onClick={() => run('What are good early weapons?')}>Upgrade advice</button>
              <button type="button" className="chip" onClick={() => run('What is on my list?')}>My list</button>
              <button
                type="button"
                className="chip"
                title="Clear the conversation"
                onClick={() => setLog((rows) => rows.slice(0, 1))}
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}

      <div className="pickup-row">
        <input
          className="search"
          value={q}
          placeholder="Ask anything, or type a grace / item to log"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !busy) submit() }}
        />
        <button type="button" className="chip on" disabled={busy} onClick={submit}>
          {busy ? 'Thinking…' : 'Go'}
        </button>
      </div>
      {busy && (
        <p className="note" role="status" style={{ marginTop: 6 }}>
          Gideon is thinking…
        </p>
      )}

      {lockPending && (
        <LockoutPrompt
          warnings={lockPending.warnings}
          onCancel={() => setLockPending(null)}
          onConfirm={confirmLock}
        />
      )}
    </section>
  )
}
