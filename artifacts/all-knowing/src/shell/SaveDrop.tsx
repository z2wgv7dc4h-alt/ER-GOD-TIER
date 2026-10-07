import { useRef, useState } from 'react'
import { demoCharacter } from '../data/seed'
import { ingestSave } from '../lib/save'
import { useWorkspace } from '../state'

/**
 * Task 165 §1 — extracted from the retired `MeUpdate` page (which `me/update`
 * already redirected away from). It is the PC `.sl2` loader, the only part of
 * that page still used: Tarnished › Setup renders it under "Other update
 * sources".
 */
export function SaveDrop() {
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
