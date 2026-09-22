import { dungeonGrace, dungeonPlan, dungeons, stepKnown, type DungeonStep } from './knowledge/dungeons'
import { applyFacts, clearFact } from './lib/infer'
import { factState, useWorkspace } from './state'

/**
 * Task 80: the dungeon checklist block. Ticking goes through the shared
 * `applyFacts` / `clearFact`; "Show on map" only renders when the beat's grace
 * slug actually exists in the authored graces.
 */
export function DungeonChecklist({ dungeonId }: { dungeonId?: string }) {
  const { character, setCharacter, setModule, setSelectedMarkerId } = useWorkspace()
  const dungeon = dungeons.find((d) => d.id === dungeonId) ?? dungeons[0]
  if (!dungeon) return null
  const plan = dungeonPlan(character, dungeon)

  function toggle(step: DungeonStep) {
    if (factState(character, step.factId) === 'true') {
      setCharacter(clearFact(character, step.factId))
    } else {
      setCharacter(applyFacts(character, [step.factId], 'answer', `dungeon: ${dungeon.name}`))
    }
  }

  return (
    <div className="dungeon-block">
      <h3 className="codex-head">
        {dungeon.name} · {plan.done.length}/{plan.total} — {dungeon.scope}
      </h3>
      <ul className="steps">
        {dungeon.steps.map((step) => {
          const grace = dungeonGrace(step)
          return (
            <li key={step.id} className={step.id === plan.current?.id ? 'step-linked' : undefined}>
              <input type="checkbox" checked={stepKnown(character, step)} onChange={() => toggle(step)} />
              <div>
                <div>
                  {step.do}
                  {step.id === plan.current?.id ? ' · now' : ''}
                </div>
                <div className="note">{step.detail}</div>
                {grace && (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setSelectedMarkerId(grace.id)
                      setModule('map')
                    }}
                  >
                    Show on map
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
