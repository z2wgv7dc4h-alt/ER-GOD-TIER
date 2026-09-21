import { useMemo, useRef, useState } from 'react'
import { interview, matchMany } from './knowledge/catalog'
import { aliasStatus, matchAllWarps } from './lib/aliases'
import { hintForShot } from './lib/ocr'
import { searchSync } from './lib/search'
import { applyAnswers, applyFacts, summarize } from './lib/infer'
import { labelOf } from './lib/links'
import { NextMoves, Thread } from './Thread'
import { useWorkspace } from './state'
import type { Shot, ShotKind } from './types'

const shotKinds: { id: ShotKind; label: string; ask: string }[] = [
  { id: 'warp-list', label: 'Warp / grace list', ask: 'Map menu → a Site of Grace list. Best single shot a PS5 player can give.' },
  { id: 'map', label: 'World map', ask: 'Opened map with gold grace icons. Fog still matters — only visible pins count.' },
  { id: 'inventory', label: 'Inventory / Great Runes', ask: 'Key items and Great Runes reconstruct shardbearers and quests.' },
  { id: 'equipment', label: 'Equipment screen', ask: 'Weapons and armor currently worn.' },
  { id: 'pickup', label: 'Item pickup banner', ask: 'The name plate after you pick something up.' },
  { id: 'boss', label: 'Boss remembrance / arena', ask: 'A remembrance or the “legend felled” banner.' },
]

export function ReckonWorkspace() {
  const { character, setCharacter, selectedMarkerId, setSelectedMarkerId } = useWorkspace()
  const fileRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<ShotKind>('warp-list')
  const [blob, setBlob] = useState('')
  const [pendingHits, setPendingHits] = useState(matchMany(''))

  const totals = summarize(character)

  function setAnswer(id: string, value: string | string[]) {
    const answers = { ...character.answers, [id]: value }
    setCharacter(applyAnswers({ ...character, answers }))
  }

  function commitHits(ids: string[], sourceDetail: string) {
    setCharacter(applyFacts(character, ids, sourceDetail.startsWith('shot') ? 'screenshot' : 'answer', sourceDetail))
    if (ids[0]) setSelectedMarkerId(ids[0])
  }

  function onFiles(files: FileList | null) {
    if (!files?.length) return
    const shots: Shot[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      shots.push({
        id: `${file.name}:${file.size}:${file.lastModified}`,
        kind,
        name: file.name,
        url: URL.createObjectURL(file),
        notes: '',
        hits: [],
      })
    }
    if (!shots.length) return
    setCharacter({
      ...character,
      source: character.source === 'save' ? character.source : 'reckon',
      shots: [...shots, ...character.shots],
    })
  }

  function scanText(text: string, detail: string) {
    const hits = matchMany(text)
    const warps = matchAllWarps(text)
    const extra = searchSync(text)
    const ids = [...new Set([
      ...hits.map((h) => h.id),
      ...warps.map((h) => h.id),
      ...extra.map((h) => h.id),
    ])]
    setPendingHits(hits)
    if (ids.length) commitHits(ids, detail)
    setBlob('')
  }

  const nextQuestion = useMemo(() => {
    return interview.find((q) => {
      const v = character.answers[q.id]
      if (v == null || v === '') return true
      if (Array.isArray(v) && v.length === 0) return true
      return false
    })
  }, [character.answers])

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

      <section className="panel">
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
          <div>Drop PS5 captures here as reference. They stay in this tab.</div>
          <div className="note" style={{ marginTop: 4 }}>
            Automatic image reading (OCR) is not available yet — type or paste the names below.
          </div>
          <button className="ghost gold" type="button" style={{ marginTop: 8 }} onClick={() => fileRef.current?.click()}>
            Open screenshots
          </button>
        </div>

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
        <button
          className="ghost gold"
          type="button"
          style={{ marginTop: 8 }}
          onClick={() => scanText(blob, kind === 'warp-list' ? 'screenshot:warp-list' : `screenshot:${kind}`)}
        >
          Read these names
        </button>

        {pendingHits.length > 0 && (
          <p className="note" style={{ marginTop: 10 }}>
            Last read: {pendingHits.map((h) => h.name).join(' · ')}
          </p>
        )}

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
            <Thread id={selectedMarkerId} onOpen={setSelectedMarkerId} />
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
