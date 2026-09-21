import { useWorkspace } from './state'

const sits = [
  {
    id: 'ps5-fresh',
    title: 'PS5 · just started',
    text: 'Three questions. No screenshots yet.',
    apply: true,
    platform: 'ps5' as const,
    module: 'reckon' as const,
  },
  {
    id: 'ps5-mid',
    title: 'PS5 · mid run',
    text: 'Last grace + who is dead. Then leftovers.',
    apply: true,
    platform: 'ps5' as const,
    module: 'reckon' as const,
  },
  {
    id: 'pc-save',
    title: 'PC · I have a save',
    text: 'Drop ER0000.sl2 — parsed locally into stats, bosses, and graces. Nothing is uploaded.',
    apply: false,
    platform: 'pc' as const,
    module: 'map' as const,
  },
]

export function FirstSit() {
  const w = useWorkspace()
  const spent = w.character.source !== 'empty' || w.character.discoveredGraces.length > 0 || w.character.answers.platform
  if (spent) return null

  return (
    <div className="first-sit">
      <p className="kicker">Sit down</p>
      <h2>How do you want to bind this Tarnished?</h2>
      <p className="note">One character. Map, lines, and Gideon all read it. Nothing leaves this device.</p>
      <div className="sit-choices">
        {sits.map((s) => (
          <button
            key={s.id}
            type="button"
            className="card sit-choice"
            onClick={() => {
              w.setCharacter({
                ...w.character,
                platform: s.platform,
                answers: { ...w.character.answers, platform: s.platform, sit: s.id },
              })
              w.setModule(s.module)
            }}
          >
            <h3>{s.title}</h3>
            <p className="note">{s.text}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
