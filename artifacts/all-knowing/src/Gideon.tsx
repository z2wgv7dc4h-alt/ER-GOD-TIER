import { useMemo, useState } from 'react'
import { opBuilds } from './knowledge/builds'
import { endings, planRoute } from './knowledge/endings'
import { allLines, blitz, storylines } from './knowledge/storylines'
import { applyFacts } from './lib/infer'
import { askGideon, type GideonMemory } from './lib/gideon'
import { art } from './art'
import { searchSync } from './lib/search'
import { medusaChapters } from './knowledge/medusa'
import { leftovers, toggleWatch, watchlistOf } from './lib/leftovers'
import { packStatus } from './lib/sourcePack'
import { useWorkspace } from './state'

export function Gideon() {
  const w = useWorkspace()
  const savedGoal = typeof w.character.answers.gideonGoal === 'string' ? w.character.answers.gideonGoal : undefined
  const [q, setQ] = useState('')
  const [memory, setMemory] = useState<GideonMemory>({ goalId: savedGoal })
  const [offer, setOffer] = useState<{ label: string; prompt: string } | null>(null)
  const [log, setLog] = useState<{ role: 'you' | 'gideon'; text: string }[]>([
    { role: 'gideon', text: 'Name a line, tap Blitz, or ask what is still available. Show it pins the atlas. I’m done ticks the beat.' },
  ])

  const line = allLines.find((e) => e.id === memory.goalId)
  const plan = useMemo(() => (line ? planRoute(w.character, line) : null), [line, w.character])

  function persistGoal(id?: string) {
    if (!id || w.character.answers.gideonGoal === id) return
    w.setCharacter({ ...w.character, answers: { ...w.character.answers, gideonGoal: id } })
  }

  function run(text: string) {
    const act = askGideon(text, w.character, memory)
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
    if (act.buildId) {
      const b = opBuilds.find((x) => x.id === act.buildId)
      if (b) w.setCharacter({ ...w.character, stats: b.stats, level: b.level, loadout: b.kit })
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
    run(text)
    setQ('')
  }

  function showNow() {
    if (!plan?.current) return
    w.setModule(plan.current.module || 'map')
    if (plan.current.factId) w.setSelectedMarkerId(plan.current.factId)
    setMemory((m) => ({ ...m, lastFact: plan.current?.factId, lastModule: plan.current?.module }))
  }

  function doneNow() {
    if (!plan?.current?.factId) return
    w.setCharacter(applyFacts(w.character, [plan.current.factId], 'answer', 'I’m done'))
    run('what next')
  }

  return (
    <section className="gideon">
      <img className="guide-face" src="/art/guide.jpg" alt="" />
      <div className="kicker">Guide · {packStatus().hint}</div>
      {plan?.current ? (
        <div className="gideon-now">
          <div className="kicker">Now · {line?.name}</div>
          <h3>{plan.current.do}</h3>
          <p className="note">{plan.current.detail}</p>
          {plan.detours[0] && <p className="note">{plan.detours[0]}</p>}
          <div className="opts" style={{ marginTop: 10 }}>
            <button type="button" className="chip on" onClick={showNow}>Show on map</button>
            <button type="button" className="chip" onClick={doneNow}>I’m done</button>
          </div>
          {plan.todo.slice(1, 4).length > 0 && (
            <p className="note" style={{ marginTop: 10 }}>
              Tonight: {plan.todo.slice(1, 4).map((s) => s.do).join(' · ')}
            </p>
          )}
        </div>
      ) : (
        <p className="note">No beat yet. Pick a line below or ask what is still available.</p>
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
        {blitz.map((e) => (
          <button key={e.id} type="button" className={memory.goalId === e.id ? 'chip on' : 'chip'} onClick={() => run(`Blitz: ${e.name}. What do I do next?`)}>
            <img className="seal-chip" src={art.ending[e.id] || art.kind.helm} alt="" />
            {e.name}
          </button>
        ))}
        {endings.map((e) => (
          <button key={e.id} type="button" className={memory.goalId === e.id ? 'chip on' : 'chip'} onClick={() => run(`I want the ${e.name} ending. What do I do next?`)}>
            <img className="seal-chip" src={art.ending[e.id] || art.sigil} alt="" />
            {e.name}
          </button>
        ))}
        {storylines.map((e) => (
          <button key={e.id} type="button" className={memory.goalId === e.id ? 'chip on' : 'chip'} onClick={() => run(`I want to continue ${e.name}. What do I do next?`)}>
            <img className="seal-chip" src={art.kind.grace} alt="" />
            {e.name}
          </button>
        ))}
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
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
        <button type="button" className="chip on" onClick={submit}>Go</button>
      </div>
    </section>
  )
}
