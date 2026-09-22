import { useEffect, useMemo, useRef, useState } from 'react'
import { matchMany } from './knowledge/catalog'
import { groupHits, searchSync } from './lib/search'
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
        case 'module':
          w.setModule(hit.id)
          break
        case 'sit':
          w.setSitMode(!w.sitMode)
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

export function CommandHits() {
  const w = useWorkspace()
  const debounced = useDebounced(w.query, 175)
  const q = debounced.trim().toLowerCase()
  // Live, debounced, and only from `searchSync`/`groupHits` — no new matcher.
  const sections = useMemo(() => (q.length >= LIVE_SEARCH_MIN ? groupHits(searchSync(q)) : []), [q])
  if (!sections.length) return null
  return (
    <div className="command-hits">
      {sections.map((section) => (
        <section className="command-group" key={section.group}>
          <div className="kicker">{section.group} · {section.hits.length}</div>
          {section.hits.map((f) => (
            <button
              key={f.source + f.id}
              type="button"
              className="quest"
              onClick={() => {
                w.setSelectedMarkerId(f.id)
                w.setModule(f.module)
                w.setQuery('')
              }}
            >
              <header>
                <strong>{f.name}</strong>
                <span className="note">{f.source}</span>
              </header>
              <div className="note">{f.detail}</div>
            </button>
          ))}
        </section>
      ))}
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
  const { recentFacts, setSelectedMarkerId, setModule } = useWorkspace()
  if (!recentFacts.length) return null
  return (
    <div className="opts" style={{ padding: '0 4px 8px' }}>
      {recentFacts.map((id) => (
        <button
          key={id}
          type="button"
          className="chip"
          onClick={() => {
            setSelectedMarkerId(id)
            setModule(moduleFor(id))
          }}
        >
          {labelOf(id)}
        </button>
      ))}
    </div>
  )
}

export function SitToggle() {
  const { sitMode, setSitMode, character, setCharacter } = useWorkspace()
  const spoil = character.answers.spoil !== '0'
  return (
    <>
      <button type="button" className={sitMode ? 'chip on' : 'chip'} onClick={() => setSitMode(!sitMode)}>
        {sitMode ? 'Sit mode on' : 'Sit mode'}
      </button>
      <button
        type="button"
        className={spoil ? 'chip on' : 'chip'}
        onClick={() => setCharacter({ ...character, answers: { ...character.answers, spoil: spoil ? '0' : '1' } })}
      >
        {spoil ? 'Spoilers on' : 'No spoilers'}
      </button>
    </>
  )
}

const SOFT: Record<string, number[]> = {
  vigor: [40, 60],
  mind: [40, 60],
  endurance: [30, 50],
  strength: [20, 55, 80],
  dexterity: [20, 55, 80],
  intelligence: [20, 55, 80],
  faith: [20, 55, 80],
  arcane: [20, 55, 80],
}

export function softCapMark(stat: keyof typeof SOFT, value: number) {
  const caps = SOFT[stat]
  const hit = caps.filter((c) => value >= c).length
  return hit ? `${'·'.repeat(hit)}` : ''
}

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
  function setStat(key: keyof Stats, raw: string) {
    const n = Math.max(1, Math.min(99, Number(raw) || 1))
    setCharacter({ ...character, stats: { ...character.stats, [key]: n } })
  }
  return (
    <div className="stat-edit">
      <div className="kicker">Type the numbers from the status screen</div>
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
    </div>
  )
}

export function WhisperGrace() {
  const { character, setSelectedMarkerId, setModule } = useWorkspace()
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
            onClick={() => {
              setSelectedMarkerId(g.id)
              setModule('map')
            }}
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

