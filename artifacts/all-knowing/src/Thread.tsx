import { labelOf, moduleFor, nextMoves, statusOf, thread, whyKnown } from './lib/links'
import { searchSync } from './lib/search'
import { Related } from './Related'
import { useWorkspace } from './state'

export function Thread({ id }: { id: string }) {
  const { character, setSelectedMarkerId, setModule } = useWorkspace()
  const t = thread(id)
  if (!t.node) {
    const hit = searchSync(id.replace(/^[a-z]+:/, '').replace(/-/g, ' '))[0] || searchSync(id)[0]
    return (
      <div className="thread">
        <div className="kicker">Open index</div>
        <h3>{hit?.name || id}</h3>
        <p className="note">{hit?.detail || 'No seed thread. Logged from warp / shop / boss dump.'}</p>
        {hit && (
          <button type="button" className="chip" onClick={() => { setModule(hit.module); setSelectedMarkerId(hit.id) }}>
            Open {hit.source}
          </button>
        )}
        <Related id={id} />
      </div>
    )
  }
  const receipts = whyKnown(character, id)
  const known = statusOf(character, id) === 'known'

  return (
    <div className="thread">
      <div className="kicker">{t.node.kind} · {t.node.region} · {t.node.campaign}</div>
      <h3>{t.node.name}</h3>
      <p className="note">{known ? 'On this character.' : 'Not evidenced on this character yet.'}</p>
      {t.node.note && <p className="note">{t.node.note}</p>}

      <Related id={id} />

      <div className="opts" style={{ marginTop: 10 }}>
        <button type="button" className="ghost gold" onClick={() => {
          setSelectedMarkerId(id)
          setModule(moduleFor(id))
        }}>Follow into workspace</button>
      </div>
      {receipts.length > 0 && (
        <div className="thread-block">
          <div className="kicker">Receipts</div>
          {receipts.map((e) => (
            <p key={e.id + e.at} className="note">{e.source} · {e.detail}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export function NextMoves({ onOpen }: { onOpen: (id: string) => void }) {
  const { character } = useWorkspace()
  const moves = nextMoves(character)
  if (!moves.length) return null
  return (
    <div className="thread-block">
      <div className="kicker">Ask or photograph next</div>
      {moves.map((m) => (
        <button key={m.id} type="button" className="quest" onClick={() => onOpen(m.id)}>
          <strong>{labelOf(m.id)}</strong>
          <div className="note">{m.reason}</div>
        </button>
      ))}
    </div>
  )
}
