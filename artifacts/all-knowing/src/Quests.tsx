import { useState } from 'react'
import { quests } from './data/seed'
import { Thread } from './Thread'
import { useWorkspace } from './state'

export function QuestWorkspace() {
  const { character, setCharacter, query, selectedMarkerId, setSelectedMarkerId } = useWorkspace()
  const [activeId, setActiveId] = useState(quests[0]?.id)
  const active = quests.find((q) => q.id === activeId) ?? quests[0]
  const filtered = quests.filter((q) => `${q.npc} ${q.summary}`.toLowerCase().includes(query.trim().toLowerCase()))

  function toggleStep(id: string) {
    const has = character.completedQuestSteps.includes(id)
    const step = active.steps.find((s) => s.id === id)
    if (!has && step?.lockout) {
      const ok = confirm(`This can lock a line:\n\n${step.lockout}\n\nMark it done anyway?`)
      if (!ok) return
    }
    setCharacter({
      ...character,
      completedQuestSteps: has
        ? character.completedQuestSteps.filter((s) => s !== id)
        : [...character.completedQuestSteps, id],
    })
  }

  return (
    <div className="split">
      <section className="panel">
        <div className="kicker">Lines that can break</div>
        <div className="quest-list" style={{ marginTop: 14 }}>
          {filtered.map((q) => {
            const done = q.steps.filter((s) => character.completedQuestSteps.includes(s.id)).length
            return (
              <button key={q.id} className={q.id === activeId ? 'quest active' : 'quest'} onClick={() => setActiveId(q.id)}>
                <header>
                  <strong>{q.npc}</strong>
                  <span className="note">{done}/{q.steps.length}</span>
                </header>
                <div className="note" style={{ marginTop: 6 }}>{q.campaign}{q.ending ? ' · ending' : ''}</div>
              </button>
            )
          })}
        </div>
      </section>
      <section className="panel">
        <div className="kicker">{active.campaign}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0 8px' }}>{active.npc}</h3>
        <p className="note">{active.summary}</p>
        {selectedMarkerId && <Thread id={selectedMarkerId} onOpen={setSelectedMarkerId} />}
        <ul className="steps">
          {active.steps.map((step) => (
            <li key={step.id}>
              <input
                type="checkbox"
                checked={character.completedQuestSteps.includes(step.id)}
                onChange={() => toggleStep(step.id)}
              />
              <div>
                <div>{step.text}</div>
                {step.location && <div className="note">{step.location}</div>}
                {step.lockout && <div className="warn">{step.lockout}</div>}
                <button type="button" className="chip" onClick={() => setSelectedMarkerId(step.id)}>Thread</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
