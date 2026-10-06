import { useEffect, useMemo, useRef, useState } from 'react'
import { matchMany } from './knowledge/catalog'
import { groupHits, searchSync, type SearchHit } from './lib/search'
import { flattenHits, moveActive, resolvePaletteKey } from './lib/palette'
import { searchWiki, wikiSnippet, type WikiSearchHit } from './lib/wikiSearch'
import { classify, type OmniboxCommand, type OmniboxTarget } from './lib/omnibox'
import { EntityLink } from './EntityLink'
import { WikiText } from './WikiText'
import type { GideonAct } from './lib/gideon'
import { matchWarp, nextGraces, warpGraces } from './knowledge/graces'
import { applyFacts, denyFacts } from './lib/infer'
import { labelOf, moduleFor } from './lib/links'
import {
  copyPacket,
  diffPacket,
  downloadPacket,
  fromPacket,
  mergePacket,
  packetFileName,
  packetHash,
  packetJson,
  type PacketDiff,
  type PacketDiffRow,
} from './lib/packet'
import { packetQr, type PacketQr } from './lib/packetQr'
import { markHelpSeen, resolveHotkey } from './lib/shortcuts'
import { levelFromStats, statsTotal } from './lib/level'
import type { Character, Stats } from './types'
import { useWorkspace } from './state'

export function useHotkeys() {
  const w = useWorkspace()
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      const hit = resolveHotkey(e, { typing, helpOpen: w.helpOpen })
      if (!hit) return
      switch (hit.type) {
        case 'search':
          e.preventDefault()
          document.querySelector<HTMLInputElement>('.search')?.focus()
          break
        case 'packet':
          e.preventDefault()
          downloadPacket(w.character)
          break
        case 'undo':
          e.preventDefault()
          w.undo()
          break
        case 'section':
          w.go(hit.section)
          break
        case 'dock':
          e.preventDefault()
          w.toggleDock()
          break
        case 'help':
          e.preventDefault()
          markHelpSeen()
          w.setHelpOpen(!w.helpOpen)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [w])
}

const STATE_LABEL: Record<string, string> = { true: 'have', false: 'no', unknown: '?' }

function DiffSection({ title, rows, tone }: { title: string; rows: PacketDiffRow[]; tone: string }) {
  if (!rows.length) return null
  return (
    <div className={`packet-diff-section ${tone}`}>
      <div className="kicker">{title} · {rows.length}</div>
      {rows.slice(0, 40).map((r) => (
        <div className="packet-diff-row" key={r.fact}>
          <span className="packet-diff-name">{labelOf(r.fact)}</span>
          <span className="note">{r.kind} · {STATE_LABEL[r.before]} → {STATE_LABEL[r.after]} · {r.reason}</span>
        </div>
      ))}
      {rows.length > 40 && <div className="note">+{rows.length - 40} more</div>}
    </div>
  )
}

export function PacketBar() {
  const w = useWorkspace()
  const fileRef = useRef<HTMLInputElement>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const [pending, setPending] = useState<{ name: string; character: Character; diff: PacketDiff } | null>(null)
  const [notice, setNotice] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [hash, setHash] = useState('')
  const [qr, setQr] = useState<PacketQr | null>(null)
  const [qrLarge, setQrLarge] = useState(false)

  const json = useMemo(() => packetJson(w.character), [w.character])
  const fileName = useMemo(() => packetFileName(w.character), [w.character])
  const bytes = useMemo(() => new Blob([json]).size, [json])

  useEffect(() => {
    let cancelled = false
    void packetHash(w.character).then((h) => { if (!cancelled) setHash(h) })
    return () => { cancelled = true }
  }, [json, w.character])

  // The scannable QR: the real packet when it fits, else the handoff card.
  useEffect(() => {
    let cancelled = false
    setQr(null)
    void packetQr(w.character).then((next) => { if (!cancelled) setQr(next) })
    return () => { cancelled = true }
  }, [json, w.character])

  useEffect(() => () => { if (noticeTimer.current) window.clearTimeout(noticeTimer.current) }, [])

  function showNotice(text: string) {
    setNotice(text)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 5000)
  }

  /** Stage a packet for diff-before-import. Nothing is merged until Confirm. */
  function stageText(text: string, name: string) {
    try {
      const character = fromPacket(JSON.parse(text))
      setPending({ name: character.name || name, character, diff: diffPacket(w.character, character) })
      setPasteOpen(false)
      setPasteText('')
    } catch (err) {
      showNotice(`Not an All-Knowing packet: ${(err as Error).message}`)
    }
  }

  function confirm() {
    if (!pending) return
    const merged = pending.diff.added.length + pending.diff.flipped.length
    w.setCharacter(mergePacket(w.character, pending.character))
    setPending(null)
    showNotice(`Merged ${merged} fact${merged === 1 ? '' : 's'}.`)
  }

  async function onCopy() {
    const ok = await copyPacket(w.character)
    showNotice(ok ? 'All-Knowing packet copied to clipboard.' : 'Copy was blocked — use Save file instead.')
  }

  return (
    <div
      style={{ padding: '0 4px 10px' }}
      onDragOver={(e) => { if (Array.from(e.dataTransfer?.types ?? []).includes('Files')) e.preventDefault() }}
      onDrop={(e) => {
        const file = e.dataTransfer?.files?.[0]
        if (!file) return
        e.preventDefault()
        void file.text().then((text) => stageText(text, file.name))
      }}
    >
      <div className="opts">
        <button type="button" className="chip" disabled={!w.canUndo} onClick={() => w.undo()}>Undo</button>
        <button
          type="button"
          className="chip on"
          title="Copy the All-Knowing packet JSON"
          onClick={() => void onCopy()}
        >
          Copy packet
        </button>
        <button type="button" className="chip" onClick={() => { downloadPacket(w.character); showNotice(`Saved ${fileName}.`) }}>
          Save file
        </button>
        <button type="button" className="chip" onClick={() => fileRef.current?.click()}>Load file</button>
        <button type="button" className={pasteOpen ? 'chip on' : 'chip'} onClick={() => setPasteOpen((v) => !v)}>
          Paste
        </button>
      </div>

      <p className="note" style={{ margin: '6px 0 0' }}>
        {bytes} bytes · {fileName}
        {hash ? ` · SHA-256 ${hash.slice(0, 12)}…` : ' · hash needs a secure context'}
      </p>
      {qr && (
        <div className="packet-qr">
          <button
            type="button"
            className="packet-qr-btn"
            onClick={() => setQrLarge(true)}
            title="Tap to enlarge"
            aria-label="Enlarge packet QR"
          >
            <span className="packet-qr-svg" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          </button>
          <p className="note" style={{ margin: 0 }}>
            {qr.mode === 'packet'
              ? `Scan = full packet (${qr.bytes} bytes)`
              : 'Scan = filename + SHA-256 only. Copy/Save for the JSON.'}
          </p>
        </div>
      )}

      {qrLarge && qr && (
        <div
          className="qr-overlay"
          role="dialog"
          aria-label="Packet QR, enlarged"
          onClick={() => setQrLarge(false)}
        >
          <div className="qr-large" dangerouslySetInnerHTML={{ __html: qr.svg }} />
          <p className="note">
            {qr.mode === 'packet' ? `Full packet · ${qr.bytes} bytes` : 'Handoff card · Copy/Save for the JSON'}
          </p>
        </div>
      )}

      {pasteOpen && (
        <div style={{ marginTop: 8 }}>
          <textarea
            className="search"
            style={{ width: '100%', minHeight: 72, resize: 'vertical' }}
            placeholder="Paste an All-Knowing packet JSON here"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="opts" style={{ marginTop: 6 }}>
            <button
              type="button"
              className="chip on"
              disabled={!pasteText.trim()}
              onClick={() => stageText(pasteText, 'pasted packet')}
            >
              Read pasted packet
            </button>
            <button
              type="button"
              className="chip"
              disabled={!navigator.clipboard?.readText}
              onClick={() => { void navigator.clipboard?.readText?.().then((t) => { if (t) setPasteText(t) }) }}
            >
              Paste from clipboard
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p className="note" role="status" style={{ marginTop: 8, color: 'var(--ok)' }}>{notice}</p>
      )}

      {pending && (
        <div className="packet-diff">
          <div className="kicker">Importing {pending.name}</div>
          <p className="note">
            {pending.diff.added.length} new · {pending.diff.flipped.length} flip ·{' '}
            {pending.diff.lost.length} lose · {pending.diff.same} unchanged
          </p>
          <DiffSection title="New facts" rows={pending.diff.added} tone="on" />
          <DiffSection title="Would flip" rows={pending.diff.flipped} tone="warn" />
          <DiffSection title="Packet loses to local" rows={pending.diff.lost} tone="muted" />
          <div className="opts" style={{ marginTop: 8 }}>
            <button type="button" className="chip on" onClick={confirm}>Merge into {w.character.name}</button>
            <button type="button" className="chip" onClick={() => setPending(null)}>Discard</button>
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) stageText(await file.text(), file.name)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/**
 * A value that settles `delay` ms after the last change. Used so the command
 * palette runs `searchSync` on the pause, not on every keystroke — typing stays
 * smooth and the results still update live.
 */
function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return settled
}

/** Minimum typed length before the palette searches. `searchSync` itself floors at 2. */
export const LIVE_SEARCH_MIN = 2

type PaletteRow =
  | { kind: 'log'; verb: string; targets: OmniboxTarget[]; factIds: string[] }
  | { kind: 'command'; command: OmniboxCommand }
  | { kind: 'entity'; hit: SearchHit }
  | { kind: 'wiki'; hit: WikiSearchHit }

/**
 * Task 99 — the omnibox results. The classifier decides the shape, then the rows
 * render grouped as Do (log/command) · Things (entity search) · Ask (Gideon).
 * Questions get a deterministic router answer inline (loaded lazily so the
 * shell bundle does not pull in all of Gideon), with a Continue in Gideon link.
 */
export function CommandHits({
  onLog,
  onCloseSearch,
}: { onLog?: (ids: string[]) => void; onCloseSearch?: () => void } = {}) {
  const w = useWorkspace()
  const debounced = useDebounced(w.query, 175)
  const q = debounced.trim()
  const result = useMemo(() => classify(q), [q])
  // Live entity hits, debounced, from the existing `searchSync`/`groupHits`.
  const sections = useMemo(() => (q.length >= LIVE_SEARCH_MIN ? groupHits(searchSync(q)) : []), [q])
  // Task 133 §3 — full-text wiki section hits, the same engine the Library uses.
  const [wikiHits, setWikiHits] = useState<WikiSearchHit[]>([])
  useEffect(() => {
    if (q.length < 3) {
      setWikiHits([])
      return
    }
    let cancelled = false
    void searchWiki(q, 5)
      .then((found) => { if (!cancelled) setWikiHits(found) })
      .catch(() => { if (!cancelled) setWikiHits([]) })
    return () => { cancelled = true }
  }, [q])
  const rows = useMemo<PaletteRow[]>(() => {
    const out: PaletteRow[] = []
    if (result.kind === 'log') out.push({ kind: 'log', verb: result.verb, targets: result.targets, factIds: result.factIds })
    if (result.kind === 'command') out.push({ kind: 'command', command: result.command })
    for (const hit of flattenHits(sections)) out.push({ kind: 'entity', hit })
    for (const hit of wikiHits) out.push({ kind: 'wiki', hit })
    return out
  }, [result, sections, wikiHits])

  const question = result.kind === 'question' ? result.text : ''
  const [answer, setAnswer] = useState<GideonAct | null>(null)
  const [asking, setAsking] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // A question gets the deterministic router answer inline, on the pause.
  useEffect(() => {
    if (!question) {
      setAnswer(null)
      setAsking(false)
      return
    }
    let cancelled = false
    setAsking(true)
    void import('./lib/gideon')
      .then(({ askGideonRouter }) => {
        if (cancelled) return
        setAnswer(askGideonRouter(question, w.character))
        setAsking(false)
      })
      .catch(() => { if (!cancelled) setAsking(false) })
    return () => { cancelled = true }
  }, [question, w.character])

  // New query → start at the top; a shrunken list clamps the stale index.
  useEffect(() => setActive(0), [q])
  useEffect(() => {
    setActive((i) => (rows.length ? Math.min(Math.max(i, 0), rows.length - 1) : 0))
  }, [rows])

  /** The one select action, shared by click and Enter (no duplicate handler). */
  function choose(row: PaletteRow | undefined) {
    if (!row) return
    if (row.kind === 'log') {
      onLog?.(row.factIds)
      w.setQuery('')
      onCloseSearch?.()
      return
    }
    if (row.kind === 'command') {
      w.setQuery('')
      onCloseSearch?.()
      // Task 100 §2: the "glance" omnibox command opens the chrome-free map.
      if (row.command.glance) {
        w.go(row.command.section, row.command.sub ?? undefined)
        w.setGlance(true)
        return
      }
      w.go(row.command.section, row.command.sub ?? undefined)
      return
    }
    if (row.kind === 'wiki') {
      // Task 133 §3 — a wiki section hit opens its entity (or wiki-only page).
      w.openEntity(row.hit.entityId)
      w.setQuery('')
      onCloseSearch?.()
      return
    }
    // Task 97: a real entity hit opens the universal panel overlay.
    w.openEntity(row.hit.id)
    w.setQuery('')
    onCloseSearch?.()
  }

  useEffect(() => {
    if (!rows.length) return
    function onKey(e: KeyboardEvent) {
      const input = document.getElementById('command-search')
      const inputFocused = input != null && document.activeElement === input
      const key = resolvePaletteKey(e, { inputFocused, resultsOpen: rows.length > 0 })
      if (!key) return
      e.preventDefault()
      if (key === 'next') setActive((i) => moveActive(i, 1, rows.length))
      else if (key === 'prev') setActive((i) => moveActive(i, -1, rows.length))
      else if (key === 'select') choose(rows[active])
      else if (key === 'close') {
        w.setQuery('')
        onCloseSearch?.()
        if (input instanceof HTMLElement) input.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rows, active, w, onLog, onCloseSearch])

  // Keep the highlighted row in view as it moves.
  useEffect(() => {
    listRef.current?.querySelector('.palette-active')?.scrollIntoView({ block: 'nearest' })
  }, [active, rows])

  if (!rows.length && !question) return null

  function keyOf(row: PaletteRow): string {
    // The same entity can arrive from two sources (the curated catalog and the
    // boss-pin data), so the source keeps the row key unique even if the id is not.
    if (row.kind === 'entity') return `e:${row.hit.source}:${row.hit.id}`
    if (row.kind === 'command') return `c:${row.command.id}`
    if (row.kind === 'wiki') return `w:${row.hit.pageId}:${row.hit.heading}`
    return 'do:log'
  }
  const activeKey = rows[active] ? keyOf(rows[active]) : ''

  function renderRow(row: PaletteRow) {
    const isActive = keyOf(row) === activeKey
    const cls = isActive ? 'quest palette-active' : 'quest'
    if (row.kind === 'entity') {
      return (
        <EntityLink
          key={`e:${row.hit.source}:${row.hit.id}`}
          id={row.hit.id}
          className={cls}
          onClick={() => {
            w.setQuery('')
            onCloseSearch?.()
          }}
        >
          <header>
            <strong>{row.hit.name}</strong>
            <span className="note">{row.hit.source}</span>
          </header>
          <div className="note">{row.hit.detail}</div>
        </EntityLink>
      )
    }
    if (row.kind === 'wiki') {
      return (
        <button
          key={`w:${row.hit.pageId}:${row.hit.heading}`}
          type="button"
          className={cls}
          aria-current={isActive ? 'true' : undefined}
          onClick={() => choose(row)}
        >
          <header>
            <strong>{row.hit.title}</strong>
            <span className="note">{row.hit.heading ? ` · ${row.hit.heading}` : ' · wiki'}</span>
          </header>
          <div className="note">{wikiSnippet(row.hit.markdown, q)}</div>
        </button>
      )
    }
    if (row.kind === 'command') {
      return (
        <button
          key={`c:${row.command.id}`}
          type="button"
          className={cls}
          aria-current={isActive ? 'true' : undefined}
          onClick={() => choose(row)}
        >
          <header>
            <strong>Go to {row.command.label}</strong>
            <span className="note">command</span>
          </header>
        </button>
      )
    }
    return (
      <div key="do:log" className={cls}>
        <header>
          <strong>Log {row.verb}</strong>
          <span className="note">quick log</span>
        </header>
        <div className="note command-linkrow">
          {row.targets.map((t, i) => (
            <span key={t.id}>{i > 0 ? ', ' : null}<EntityLink id={t.id} /></span>
          ))}
        </div>
        <button type="button" className="chip on" onClick={() => choose(row)}>Log</button>
      </div>
    )
  }

  // Task 108 §6: the three top-level groups are always labelled Do · Things ·
  // Ask; entity hits live under Things, grouped by kind inside.
  const doRows = rows.filter((r) => r.kind !== 'entity' && r.kind !== 'wiki')
  const wikiRows = rows.filter((r) => r.kind === 'wiki')
  const entityCount = sections.reduce((n, s) => n + s.hits.length, 0)
  return (
    <div className="command-hits" ref={listRef}>
      <section className="command-group command-do">
        <div className="kicker">Do · {doRows.length}</div>
        {doRows.length > 0 ? (
          doRows.map(renderRow)
        ) : (
          <p className="note">Log something you just did, e.g. “killed Margit”.</p>
        )}
      </section>
      <section className="command-group command-things">
        <div className="kicker">Things · {entityCount}</div>
        {entityCount > 0 ? (
          sections.map((section) => (
            <div className="command-subgroup" key={section.group}>
              <div className="command-subhead">{section.group}</div>
              {section.hits.map((hit) => renderRow({ kind: 'entity', hit }))}
            </div>
          ))
        ) : (
          <p className="note">No matching things.</p>
        )}
      </section>
      {wikiRows.length > 0 && (
        <section className="command-group command-wiki">
          <div className="kicker">Wiki · {wikiRows.length}</div>
          {wikiRows.map(renderRow)}
        </section>
      )}
      <section className="command-group command-ask">
        <div className="kicker">Ask · Gideon</div>
        {question ? (
          <>
            <div className="command-answer">
              {asking ? <span className="note">Thinking…</span> : answer ? <WikiText text={answer.say} /> : null}
            </div>
            <button
              type="button"
              className="chip"
              onClick={() => {
                w.setCharacter({ ...w.character, answers: { ...w.character.answers, gideonAsk: question } })
                w.setQuery('')
                onCloseSearch?.()
                w.go('gideon')
              }}
            >
              Continue in Gideon
            </button>
          </>
        ) : (
          <p className="note">Ask a question — where, how, what next.</p>
        )}
      </section>
    </div>
  )
}

export function RegionMeter() {
  const { character } = useWorkspace()
  const known = new Set([
    ...character.discoveredGraces,
    ...character.defeatedBosses,
  ])
  const groups = new Map<string, { have: number; total: number }>()
  for (const g of warpGraces) {
    const row = groups.get(g.region) || { have: 0, total: 0 }
    row.total += 1
    if (known.has(g.id)) row.have += 1
    groups.set(g.region, row)
  }
  const rows = [...groups.entries()].filter(([, v]) => v.total >= 2).slice(0, 8)
  return (
    <div className="meters" style={{ padding: '0 4px 8px' }}>
      {rows.map(([region, v]) => (
        <div className="meter" key={region}>
          <label>
            <span>{region}</span>
            <span>{v.have}/{v.total}</span>
          </label>
          <div className="bar"><span style={{ width: `${Math.round((v.have / v.total) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

export function PickupBar() {
  const { character, setCharacter, setSelectedMarkerId } = useWorkspace()
  const [text, setText] = useState('')
  const [echo, setEcho] = useState('')
  function submit() {
    const ids = [...new Set([...matchMany(text).map((f) => f.id), ...matchWarp(text).map((g) => g.id)])]
    if (!ids.length) {
      setEcho('No match. Use the warp or item name as printed.')
      return
    }
    setCharacter(applyFacts(character, ids, 'answer', 'pickup field'))
    setSelectedMarkerId(ids[0])
    setEcho(`Logged ${ids.length}: ${ids.map(labelOf).join(', ')}`)
    setText('')
  }
  return (
    <div className="pickup">
      <label className="note">I just found / sat at</label>
      <div className="pickup-row">
        <input
          className="search"
          value={text}
          placeholder="Godrick’s Great Rune, Church of Elleh…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
        <button type="button" className="chip on" onClick={submit}>Log</button>
      </div>
      {echo && <p className="note">{echo}</p>}
    </div>
  )
}

export function Recents() {
  const { recentFacts, setSelectedMarkerId, setModule, focusOnMap } = useWorkspace()
  if (!recentFacts.length) return null
  return (
    <section className="recent-panel">
      <div className="kicker">Recently viewed</div>
      <ul className="recent-list">
        {recentFacts.map((id) => (
          <li key={id}>
            <button
              type="button"
              className="recent-item"
              onClick={() => {
                const mod = moduleFor(id)
                if (mod === 'map') {
                  focusOnMap(id)
                  return
                }
                setSelectedMarkerId(id)
                setModule(mod)
              }}
            >
              <span>{labelOf(id)}</span>
              <span className="dim">{moduleFor(id)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SpoilerToggle() {
  const { character, setCharacter } = useWorkspace()
  const spoil = character.answers.spoil !== '0'
  return (
    <button
      type="button"
      className={spoil ? 'chip on' : 'chip'}
      onClick={() => setCharacter({ ...character, answers: { ...character.answers, spoil: spoil ? '0' : '1' } })}
    >
      {spoil ? 'Spoilers on' : 'No spoilers'}
    </button>
  )
}

// One soft-cap table lives in `src/lib/softCaps.ts`; re-exported here so the
// existing `App.tsx` import keeps working (no duplicate table — Task 44).
export { softCapMark } from './lib/softCaps'

export function useClipboardShots() {
  const { character, setCharacter, setModule } = useWorkspace()
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      const shots = [...character.shots]
      let added = 0
      for (const item of items) {
        if (!item.type.startsWith('image/')) continue
        const file = item.getAsFile()
        if (!file) continue
        shots.unshift({
          id: `paste:${file.size}:${Date.now()}`,
          kind: 'unknown',
          name: file.name || 'clipboard.png',
          url: URL.createObjectURL(file),
          notes: 'clipboard',
          hits: [],
        })
        added += 1
      }
      if (!added) return
      e.preventDefault()
      setCharacter({ ...character, shots, source: character.source === 'save' ? character.source : 'reckon' })
      setModule('reckon')
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [character, setCharacter, setModule])
}

const statKeys: (keyof Stats)[] = ['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane']

export function StatEdit() {
  const { character, setCharacter } = useWorkspace()
  // Task 93: collapsed by default so eight inputs don't stack into a wall; the
  // read-only grid in the character card stays visible.
  const [open, setOpen] = useState(false)
  // Task 107 §4: the level is derived from the stat sum (sum − 79 for every
  // class). Editing a stat moves the level with it; a hand-typed level that
  // disagrees is kept but flagged rather than silently contradicting the stats.
  // Task 134: the Status screen prints stats with talisman/helm bonuses included,
  // so the check runs against the stored *base* spread (falling back to `stats`)
  // and the bonus is named instead of raising a false mismatch.
  const baseStats = character.baseStats ?? character.stats
  const derived = levelFromStats(baseStats)
  const mismatched = character.level !== derived
  const bonusSource = character.statBonus?.source
  function setStat(key: keyof Stats, raw: string) {
    const n = Math.max(1, Math.min(99, Number(raw) || 1))
    const nextBase = { ...(character.baseStats ?? character.stats), [key]: n }
    setCharacter({ ...character, stats: nextBase, baseStats: nextBase, level: levelFromStats(nextBase) })
  }
  function setLevel(raw: string) {
    const n = Math.max(1, Math.min(713, Number(raw) || 1))
    setCharacter({ ...character, level: n })
  }
  return (
    <div className={open ? 'stat-edit open' : 'stat-edit'}>
      <button
        type="button"
        className={open ? 'chip on' : 'chip'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide stats' : 'Edit stats'}
      </button>
      {open && (
        <>
          <div className="kicker" style={{ marginTop: 8 }}>Type the numbers from the status screen</div>
          <label className="stat-level">
            <span>Level</span>
            <input
              id="character-level"
              inputMode="numeric"
              aria-label="Level"
              value={character.level}
              onChange={(e) => setLevel(e.target.value)}
            />
          </label>
          {mismatched && (
            <p className="warn stat-level-warn" role="status">
              Stats sum to {statsTotal(baseStats)} — that is Lv {derived}. The level field says{' '}
              {character.level}; change a stat or fix the level.
            </p>
          )}
          {bonusSource && (
            <p className="note" role="status">
              Showing base stats — your Status screen included bonuses from {bonusSource}.
            </p>
          )}
          <div className="stats">
            {statKeys.map((key) => (
              <label key={key}>
                <span>{key.slice(0, 3)}</span>
                <input
                  inputMode="numeric"
                  value={character.stats[key]}
                  onChange={(e) => setStat(key, e.target.value)}
                />
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function WhisperGrace() {
  const { character, focusOnMap } = useWorkspace()
  const last = typeof character.answers.lastGrace === 'string' ? character.answers.lastGrace : undefined
  const have = new Set(character.discoveredGraces)
  const next = nextGraces(have, last)
  if (!next.length) return null
  return (
    <div className="thread-block" style={{ padding: '0 4px 8px' }}>
      <div className="kicker">Nearby warps still dark</div>
      <div className="opts">
        {next.map((g) => (
          <button
            key={g.id}
            type="button"
            className="chip"
            onClick={() => focusOnMap(g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RegionSeal() {
  const { character, setCharacter } = useWorkspace()
  const last = typeof character.answers.lastGrace === 'string'
    ? warpGraces.find((g) => g.id === character.answers.lastGrace)
    : undefined
  const region = last?.region
  if (!region) return null
  const peers = warpGraces.filter((g) => g.region === region)
  const missing = peers.filter((g) => !character.discoveredGraces.includes(g.id))
  if (!missing.length) return (
    <p className="note" style={{ padding: '0 4px' }}>{region} warp list looks complete.</p>
  )
  return (
    <button
      type="button"
      className="chip"
      style={{ margin: '0 4px 8px' }}
      onClick={() => {
        if (!confirm(`${missing.length} ${region} warps are not on your list. Mark them unknown-not-found? That means you opened this region's list and they were absent.`)) return
        setCharacter(denyFacts(character, missing.map((g) => g.id), `complete ${region} warp list`))
      }}
    >
      {region} list is complete
    </button>
  )
}

