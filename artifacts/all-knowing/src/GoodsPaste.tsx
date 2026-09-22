import { useMemo, useState } from 'react'
import { ingestGoodsList } from './lib/goods'
import { useWorkspace } from './state'

/**
 * Task 89: paste a goods list. One confident hit marks; everything else stays
 * unknown. Plain text only — no OCR, no screenshot path.
 */
export function GoodsPaste() {
  const { character, setCharacter, setSelectedMarkerId } = useWorkspace()
  const [blob, setBlob] = useState('')
  const [result, setResult] = useState<{ marked: string[]; unknown: string[] } | null>(null)

  const preview = useMemo(() => (blob.trim() ? ingestGoodsList(character, blob) : null), [blob, character])

  function apply() {
    if (!blob.trim()) return
    const res = ingestGoodsList(character, blob)
    setCharacter(res.character)
    setResult({
      marked: res.marked.map((m) => m.name ?? (m.id as string)),
      unknown: res.unknown.map((u) => u.line),
    })
    if (res.marked[0]?.id) setSelectedMarkerId(res.marked[0].id)
    setBlob('')
  }

  return (
    <div className="goods-paste">
      <div className="kicker">Paste item names</div>
      <p className="note">
        One per line. A line is marked only when it is one confident hit; anything else stays unknown.
      </p>
      <textarea
        className="search"
        style={{ width: '100%', minHeight: 72, marginTop: 6, resize: 'vertical' }}
        aria-label="Paste item names"
        placeholder={'Fingerslayer Blade\nRivers of Blood'}
        value={blob}
        onChange={(e) => setBlob(e.target.value)}
      />
      {preview && (
        <p className="note" style={{ marginTop: 4 }}>
          {preview.marked.length} will mark · {preview.unknown.length} unknown
        </p>
      )}
      <div className="opts" style={{ marginTop: 6 }}>
        <button type="button" className="chip on" disabled={!blob.trim()} onClick={apply}>
          Mark them
        </button>
      </div>
      {result && (
        <p className="note" role="status" style={{ marginTop: 6 }}>
          Marked {result.marked.length}
          {result.marked.length ? `: ${result.marked.join(', ')}` : ''}.
          {result.unknown.length ? ` Unknown: ${result.unknown.join(', ')}.` : ''}
        </p>
      )}
    </div>
  )
}
