import { useMemo, useRef, useState } from 'react'
import { interview } from './knowledge/catalog'
import { aliasStatus } from './lib/aliases'
import { applyOcrRead, hintForShot, matchBulkLines, readImage, type OcrLineResult, type OcrOutcome } from './lib/ocr'
import { applyAnswers, clearFact, summarize } from './lib/infer'
import { labelOf } from './lib/links'
import { NextMoves, Thread } from './Thread'
import { useWorkspace } from './state'
import type { Character, Shot, ShotKind } from './types'

const shotKinds: { id: ShotKind; label: string; ask: string }[] = [
  { id: 'warp-list', label: 'Warp / grace list', ask: 'Map menu → a Site of Grace list. Best single shot a PS5 player can give.' },
  { id: 'map', label: 'World map', ask: 'Opened map with gold grace icons. Fog still matters — only visible pins count.' },
  { id: 'inventory', label: 'Inventory / Great Runes', ask: 'Key items and Great Runes reconstruct shardbearers and quests.' },
  { id: 'equipment', label: 'Equipment screen', ask: 'Weapons and armor currently worn.' },
  { id: 'pickup', label: 'Item pickup banner', ask: 'The name plate after you pick something up.' },
  { id: 'boss', label: 'Boss remembrance / arena', ask: 'A remembrance or the “legend felled” banner.' },
]

/** Per-line verdicts for a pasted/recognized list: every line gets a match or a miss. */
function LineResults({ lines }: { lines: OcrLineResult[] }) {
  if (!lines.length) return null
  const hit = lines.filter((l) => l.matches.length).length
  return (
    <div style={{ marginTop: 8 }}>
      <p className="note" style={{ margin: 0 }}>
        {hit}/{lines.length} lines matched
      </p>
      <ul className="warp-lines">
        {lines.map((l, i) => (
          <li key={`${i}:${l.line}`} className={l.matches.length ? 'ok' : 'miss'}>
            <span className="line-text">{l.line}</span>
            <span className="line-hit">
              {l.matches.length ? l.matches.map((m) => m.name).join(' · ') : 'no match'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ReckonWorkspace() {
  const { character, setCharacter, selectedMarkerId, setSelectedMarkerId } = useWorkspace()
  const fileRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<ShotKind>('warp-list')
  const [blob, setBlob] = useState('')
  const [outcome, setOutcome] = useState<OcrOutcome | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const totals = summarize(character)

  function setAnswer(id: string, value: string | string[]) {
    const answers = { ...character.answers, [id]: value }
    setCharacter(applyAnswers({ ...character, answers }))
  }

  /** Add the images as reference shots, then OCR each one and apply whatever is trusted. */
  async function onFiles(files: FileList | File[] | null) {
    if (!files?.length) return
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (!images.length) return
    const shots: Shot[] = images.map((file) => ({
      id: `${file.name}:${file.size}:${file.lastModified}`,
      kind,
      name: file.name,
      url: URL.createObjectURL(file),
      notes: '',
      hits: [],
    }))
    let next: Character = {
      ...character,
      source: character.source === 'save' ? character.source : 'reckon',
      shots: [...shots, ...character.shots],
    }
    setCharacter(next)

    for (let i = 0; i < images.length; i++) {
      setBusy(true)
      setError('')
      try {
        const read = await readImage(images[i])
        const result = applyOcrRead(next, read, `screenshot:${shots[i].kind}`)
        setOutcome(result)
        if (result.status === 'applied') {
          next = result.character
          setCharacter(next)
          if (result.matches[0]) setSelectedMarkerId(result.matches[0].id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not read that image.')
      } finally {
        setBusy(false)
      }
    }
  }

  function scanText(text: string, detail: string) {
    const result = applyOcrRead(character, { text, confidence: 1 }, detail)
    setOutcome(result)
    if (result.status === 'applied') {
      setCharacter(result.character)
      if (result.matches[0]) setSelectedMarkerId(result.matches[0].id)
    }
    setBlob('')
  }

  /** Undo inferred extras from the last read without touching the names actually sent. */
  function undoInferred(ids: string[]) {
    let next = character
    for (const id of ids) next = clearFact(next, id)
    setCharacter(next)
    setOutcome((prev) => (prev ? { ...prev, alsoMarked: prev.alsoMarked.filter((a) => !ids.includes(a.id)) } : prev))
  }

  const nextQuestion = useMemo(() => {
    return interview.find((q) => {
      const v = character.answers[q.id]
      if (v == null || v === '') return true
      if (Array.isArray(v) && v.length === 0) return true
      return false
    })
  }, [character.answers])

  /** Live per-line verdicts while a list is typed/pasted, before anything is committed. */
  const preview = useMemo(() => (blob.trim() ? matchBulkLines(blob) : []), [blob])

  return (
    <div className="split reckon">
      <section className="panel">
        <div className="kicker">PS5 first · PC still welcome</div>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0 10px' }}>Reckon the run</h3>
        <p className="note">
          A PlayStation save cannot be dropped here. Sit down and answer a few things,
          then throw screenshots at the page — warp list, map, Great Runes, pickups.
          Warp-list paste matches {aliasStatus().hosted} official grace names (Paramdex),
          {aliasStatus().linked} linked to seed slugs. Boss dumps match {aliasStatus().bossHosted} named bosses,
          {aliasStatus().bossLinked} linked to authored boss facts — so dump flags and this sheet share ids.
        </p>

        <div className="tally">
          <span>{totals.graces} graces</span>
          <span>{totals.bosses} bosses</span>
          <span>{totals.items} items</span>
          <span>{totals.quests} quest beats</span>
          <span className="dim">{totals.evidence} receipts / {totals.known} known facts</span>
        </div>

        {interview.map((q) => {
          const current = character.answers[q.id]
          const multi = 'multi' in q && q.multi
          return (
            <fieldset key={q.id} className={nextQuestion?.id === q.id ? 'ask hot' : 'ask'}>
              <legend>{q.prompt}</legend>
              <p className="note">{q.hint}</p>
              <div className="opts">
                {q.options.map((opt) => {
                  const on = multi
                    ? Array.isArray(current) && current.includes(opt.value)
                    : current === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      onClick={() => {
                        if (multi) {
                          const list = Array.isArray(current) ? [...current] : []
                          const next = list.includes(opt.value)
                            ? list.filter((x) => x !== opt.value)
                            : [...list, opt.value]
                          setAnswer(q.id, next)
                        } else {
                          setAnswer(q.id, opt.value)
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
      </section>

      <section
        className="panel"
        onPaste={(e) => {
          const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
          if (files.length) {
            e.preventDefault()
            onFiles(files)
          }
        }}
      >
        <div className="kicker">Screenshots do the heavy lifting</div>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '6px 0 10px' }}>What are you sending?</h3>
        <div className="opts">
          {shotKinds.map((s) => (
            <button key={s.id} type="button" className={kind === s.id ? 'chip on' : 'chip'} onClick={() => setKind(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="note">{shotKinds.find((s) => s.id === kind)?.ask} {hintForShot(kind)}</p>

        <div
          className="drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            onFiles(e.dataTransfer.files)
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onFiles(e.target.files)}
          />
          <div>Drop or paste PS5 captures here. They stay in this tab.</div>
          <div className="note" style={{ marginTop: 4 }}>
            Read on-device with Tesseract OCR — nothing is uploaded. Blurry or low-confidence reads
            are surfaced but never turned into facts.
          </div>
          <button
            className="ghost gold"
            type="button"
            style={{ marginTop: 8 }}
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? 'Reading screenshot…' : 'Open screenshots'}
          </button>
        </div>

        {error && (
          <p className="note" style={{ marginTop: 10, color: 'var(--danger, #c66)' }}>
            OCR failed: {error}
          </p>
        )}

        {outcome && (
          <div style={{ marginTop: 10 }}>
            <p className="note" style={{ margin: 0 }}>
              {outcome.status === 'applied' ? 'Read: ' : ''}
              {outcome.message}
            </p>
            {outcome.text && (
              <details style={{ marginTop: 4 }}>
                <summary className="note" style={{ cursor: 'pointer' }}>
                  Recognized text ({Math.round(outcome.confidence * 100)}% confidence)
                </summary>
                <pre className="note" style={{ whiteSpace: 'pre-wrap', margin: '6px 0 0', maxHeight: 160, overflow: 'auto' }}>
                  {outcome.text}
                </pre>
              </details>
            )}
            <LineResults lines={outcome.lines} />
            {outcome.alsoMarked.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p className="note" style={{ margin: 0 }}>
                  Also marked by inference ({outcome.alsoMarked.length}):
                </p>
                <ul className="list">
                  {outcome.alsoMarked.map((a) => (
                    <li key={a.id}>
                      <span>{a.name}</span>
                      <button type="button" className="chip" onClick={() => undoInferred([a.id])}>
                        undo
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <label className="note" style={{ display: 'block', marginTop: 16 }}>
          Type or paste names you can read on the shot (one per line is fine).
        </label>
        <textarea
          className="search"
          style={{ width: '100%', minHeight: 88, marginTop: 6, resize: 'vertical' }}
          placeholder={'The First Step\nGodrick’s Great Rune\nScadutree Fragment'}
          value={blob}
          onChange={(e) => setBlob(e.target.value)}
        />
        <LineResults lines={preview} />
        <button
          className="ghost gold"
          type="button"
          style={{ marginTop: 8 }}
          disabled={!blob.trim()}
          onClick={() => scanText(blob, kind === 'warp-list' ? 'screenshot:warp-list' : `screenshot:${kind}`)}
        >
          Read these names
        </button>

        <ul className="shots">
          {character.shots.map((s) => (
            <li key={s.id}>
              <img src={s.url} alt={s.name} />
              <div>
                <strong>{s.kind}</strong>
                <div className="note">{s.name}</div>
              </div>
            </li>
          ))}
        </ul>

        {selectedMarkerId && (
          <div style={{ marginTop: 18 }}>
            <Thread id={selectedMarkerId} />
          </div>
        )}

        <NextMoves onOpen={setSelectedMarkerId} />

        <h3 style={{ fontFamily: 'var(--font-display)', margin: '22px 0 8px', fontSize: 16 }}>Receipts</h3>
        <ul className="list">
          {character.evidence.slice().reverse().slice(0, 24).map((e) => (
            <li key={e.id + e.at} onClick={() => setSelectedMarkerId(e.fact)}>
              <span>{labelOf(e.fact)}</span>
              <span>{e.source}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
