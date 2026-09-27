import { lazy, Suspense, useRef, useState } from 'react'
import { BuildCodeCard } from '../BuildCodeCard'
import { demoCharacter } from '../data/seed'
import { ingestSave } from '../lib/save'
import { shotKinds } from '../lib/shotKinds'
import { GoodsPaste } from '../GoodsPaste'
import { PacketBar } from '../QoL'
import { useWorkspace } from '../state'

// Screenshot source: the Reckon workspace, lazy like every other room.
const ReckonWorkspace = lazy(() => import('../Reckon').then((m) => ({ default: m.ReckonWorkspace })))

function SaveDrop() {
  const { setCharacter, setModule } = useWorkspace()
  const inputRef = useRef<HTMLInputElement>(null)
  const [hot, setHot] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file?: File) {
    if (!file) return
    setError(null)
    try {
      const character = await ingestSave(file)
      setCharacter(character)
      setModule('map')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read save')
    }
  }

  return (
    <div
      className={hot ? 'drop hot' : 'drop'}
      onDragOver={(e) => { e.preventDefault(); setHot(true) }}
      onDragLeave={() => setHot(false)}
      onDrop={(e) => {
        e.preventDefault()
        setHot(false)
        void onFile(e.dataTransfer.files[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".sl2,.co2"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <div>
        Drop a PC <code>ER0000.sl2</code> to read it locally — stats, bosses, graces. It is parsed
        in your browser and never uploaded. PS5: use Reckoning — questions + screenshots.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
        <button className="ghost" type="button" onClick={() => inputRef.current?.click()}>Open save (.sl2)</button>
        <button
          className="ghost gold"
          type="button"
          onClick={() => {
            setCharacter(demoCharacter)
            setModule('map')
          }}
        >
          Load demo
        </button>
      </div>
      {error && <div className="warn" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  )
}

/** `me/update`: one page, four labelled sources for updating the Tarnished. */
export function MeUpdate() {
  return (
    <div className="me-update">
      <h2 className="shell-page-title">Update your Tarnished</h2>
      <div className="me-cards">
        <section className="me-card">
          <div className="kicker">Save file</div>
          <p className="note">A PC <code>.sl2</code> is the richest source: stats, bosses, graces, items.</p>
          <SaveDrop />
        </section>
        <section className="me-card">
          <div className="kicker">Screenshot</div>
          <p className="note">PS5-first: throw captures at Reckoning and it reads them on-device.</p>
          {/* Task 92 row 9: what each shot type reads, from the shared catalogue. */}
          <div className="kicker" style={{ marginTop: 10 }}>What each shot reads</div>
          <ul className="list shot-reads">
            {shotKinds.map((s) => (
              <li key={s.id} style={{ cursor: 'default' }}>
                <span>{s.label}</span>
                <span className="note">{s.ask}</span>
              </li>
            ))}
          </ul>
          <Suspense fallback={<p className="note">Loading Reckoning…</p>}>
            <ReckonWorkspace />
          </Suspense>
        </section>
        <section className="me-card">
          <div className="kicker">Paste item list</div>
          <GoodsPaste />
        </section>
        <section className="me-card">
          <div className="kicker">Share / import</div>
          <p className="note">Copy, save, load or scan a packet. QR included.</p>
          <PacketBar />
        </section>
        <section className="me-card">
          <div className="kicker">Build codes</div>
          <BuildCodeCard />
        </section>
      </div>
    </div>
  )
}
