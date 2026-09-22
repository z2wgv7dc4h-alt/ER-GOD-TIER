import { useEffect, useMemo, useState } from 'react'
import { opBuilds } from './knowledge/builds'
import { nextCompletionId, planRoute } from './knowledge/endings'
import { pvpBuilds } from './knowledge/pvp'
import { allLines, stillAvailable } from './knowledge/storylines'
import { applyFacts } from './lib/infer'
import { askGideon, type GideonMemory } from './lib/gideon'
import { beatPin } from './lib/beatPins'
import { useCoords } from './lib/coords'
import { searchSync } from './lib/search'
import { medusaChapters } from './knowledge/medusa'
import { leftovers, toggleWatch, watchlistOf } from './lib/leftovers'
import { idleSuggestions } from './lib/suggestions'
import { gideonHeader } from './lib/gideonHeader'
import { lockoutWarningsFor, type LockWarning } from './lib/lockWarnings'
import { LockoutPrompt } from './LockoutPrompt'
import { packStatus } from './lib/sourcePack'
import { hasGideonKey } from './lib/muse'
import { useWorkspace } from './state'

export function Gideon({ onOpenArchive }: { onOpenArchive?: () => void } = {}) {
  const w = useWorkspace()
  const coords = useCoords()
  const savedGoal = typeof w.character.answers.gideonGoal === 'string' ? w.character.answers.gideonGoal : undefined
  const [q, setQ] = useState('')
  const [memory, setMemory] = useState<GideonMemory>({ goalId: savedGoal })
  const [offer, setOffer] = useState<{ label: string; prompt: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  // Muse is a reasoning model — a turn takes seconds, so show that it is working.
  const [busy, setBusy] = useState(false)
  const [lockPending, setLockPending] = useState<{ ids: string[]; warnings: LockWarning[]; after?: () => void } | null>(null)
  const [log, setLog] = useState<{ role: 'you' | 'gideon'; text: string }[]>([
    { role: 'gideon', text: 'Name a line, tap Blitz, or ask what is still available. Show it pins the atlas. I’m done ticks the beat.' },
  ])

  const line = allLines.find((e) => e.id === memory.goalId)
  const plan = useMemo(() => (line ? planRoute(w.character, line) : null), [line, w.character])
  // Real next actions for this character; recomputed only when the character
  // changes, never per keystroke, so the input stays responsive.
  const suggestions = useMemo(() => idleSuggestions(w.character, 3), [w.character])
  // Task 72: one sticky context bar (goal · beat · gate) above the log. Pure,
  // reuses planRoute / idleSuggestions / approachingGates — no router change.
  const header = useMemo(() => gideonHeader(w.character), [w.character])
  // Task 84: the Now panel is current beat + one gate + Show/Done + a counts
  // line into the Quests archive. Counts come from the same survey the room uses.
  const survey = useMemo(() => stillAvailable(w.character), [w.character])
  const openCount = survey.active.length + survey.open.length
  const lockedCount = survey.locked.length
  const showPin = header.factId ? beatPin(w.character, header.factId, coords) : null
  // A new character is a new context: let the strip offer again.
  useEffect(() => { setDismissed(false) }, [w.character])

  function persistGoal(id?: string) {
    if (!id || w.character.answers.gideonGoal === id) return
    w.setCharacter({ ...w.character, answers: { ...w.character.answers, gideonGoal: id } })
  }

  async function run(text: string) {
    setBusy(true)
    const act = await askGideon(text, w.character, memory).finally(() => setBusy(false))
    const nextMem: GideonMemory = {
      goalId: act.goal ?? memory.goalId,
      lastFact: act.factId ?? memory.lastFact,
      lastModule: act.module ?? memory.lastModule,
    }
    setMemory(nextMem)
    persistGoal(nextMem.goalId)
    if (act.module) w.setModule(act.module)
    if (act.factId && (act.navigateNow || act.module === 'map' || /show|take me|pin/i.test(text))) {
      w.setSelectedMarkerId(act.factId)
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
        setLockPending({ ids: act.markDone, warnings })
      } else {
        w.setCharacter(applyFacts(w.character, act.markDone, 'answer', `Gideon: ${text}`))
      }
    }
    setOffer(act.offer ?? null)
    setLog((rows) => [...rows, { role: 'you' as const, text }, { role: 'gideon' as const, text: act.say }].slice(-10))
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

  function doneNow() {
    if (!plan?.current) return
    const factId = nextCompletionId(w.character, plan.current)
    if (!factId) return
    const warnings = lockoutWarningsFor(w.character, [factId])
    if (warnings.length) {
      setLockPending({ ids: [factId], warnings, after: () => void run('what next') })
      return
    }
    w.setCharacter(applyFacts(w.character, [factId], 'answer', 'I’m done'))
    void run('what next')
  }

  function confirmLock() {
    if (!lockPending) return
    w.setCharacter(applyFacts(w.character, lockPending.ids, 'answer', 'Gideon: confirmed lockout'))
    const after = lockPending.after
    setLockPending(null)
    after?.()
  }

  return (
    <section className="gideon">
      <img className="guide-face" src="/art/guide.jpg" alt="" />
      <div className="kicker">Guide · {packStatus().hint}</div>
      <p className="note" style={{ opacity: 0.6 }}>
        {hasGideonKey() ? 'Muse 1.3 contributor (optional)' : 'router only'}
      </p>
      {header.beat ? (
        <div className="gideon-header gideon-now" role="status" aria-label="Current beat">
          <div className="kicker">Now{header.goal ? ` · ${header.goal}` : ''}</div>
          <h3>{header.beat}</h3>
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
                Show
              </button>
            )}
            {plan?.current && (
              <button type="button" className="chip" onClick={doneNow}>Done</button>
            )}
          </div>
        </div>
      ) : (
        <p className="note">No beat yet. Ask what is still available.</p>
      )}

      <button
        type="button"
        className="chip"
        style={{ marginTop: 8 }}
        onClick={() => (onOpenArchive ? onOpenArchive() : w.setModule('quests'))}
      >
        {openCount} open · {lockedCount} locked
      </button>

      {q.trim() === '' && !dismissed && suggestions.length > 0 && (
        <div className="gideon-suggest">
          <div className="kicker">
            Next, maybe
            <button
              type="button"
              className="gideon-suggest-x"
              aria-label="Dismiss suggestions"
              onClick={() => setDismissed(true)}
            >
              ×
            </button>
          </div>
          <div className="opts">
            {suggestions.map((s) => (
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
          </div>
        </div>
      )}

      {leftovers(w.character).length > 0 && (
        <div className="opts" style={{ marginBottom: 10 }}>
          {leftovers(w.character).slice(0, 3).map((e) => (
            <button
              key={e.id}
              type="button"
              className={watchlistOf(w.character).includes(e.id) ? 'chip on' : 'chip'}
              onClick={() => {
                if (e.grace) { w.setSelectedMarkerId(e.grace); w.setModule('map') }
                w.setCharacter(toggleWatch(w.character, e.id))
              }}
            >
              Nearby leftover · {e.name}
            </button>
          ))}
        </div>
      )}

      <div className="opts" style={{ marginBottom: 8 }}>
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
      </div>

      {offer && (
        <button type="button" className="chip on" onClick={() => run(offer.prompt)}>{offer.label}</button>
      )}

      <div className="gideon-log">
        {log.map((row, i) => (
          <p key={i} className={row.role === 'gideon' ? 'note' : ''}>
            <strong>{row.role === 'gideon' ? 'Gideon' : 'You'} · </strong>
            {row.text}
          </p>
        ))}
      </div>

      <div className="pickup-row">
        <input
          className="search"
          value={q}
          placeholder="Ask, or type a grace / item to log"
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
