import { useEffect, useMemo, useRef, useState } from 'react'
import { matchMany } from './knowledge/catalog'
import { groupHits, searchSync } from './lib/search'
import { matchWarp, nextGraces, warpGraces } from './knowledge/graces'
import { applyFacts, denyFacts } from './lib/infer'
import { labelOf, moduleFor } from './lib/links'
import { diffPacket, downloadPacket, fromPacket, mergePacket, type PacketDiff, type PacketDiffRow } from './lib/packet'
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
  const [pending, setPending] = useState<{ name: string; character: Character; diff: PacketDiff } | null>(null)

  async function stage(file: File) {
    try {
      const character = fromPacket(JSON.parse(await file.text()))
      setPending({ name: character.name || file.name, character, diff: diffPacket(w.character, character) })
    } catch (err) {
      alert((err as Error).message)
    }
  }

  function confirm() {
    if (!pending) return
    w.setCharacter(mergePacket(w.character, pending.character))
    setPending(null)
  }

  return (
    <div style={{ padding: '0 4px 10px' }}>
      <div className="opts">
        <button type="button" className="chip" disabled={!w.canUndo} onClick={() => w.undo()}>Undo</button>
        <button type="button" className="chip on" onClick={() => downloadPacket(w.character)}>Save file</button>
        <button type="button" className="chip" onClick={() => fileRef.current?.click()}>Load file</button>
      </div>
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
          if (file) await stage(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function CommandHits() {
  const w = useWorkspace()
  const q = w.query.trim().toLowerCase()
  const sections = useMemo(() => groupHits(searchSync(q)), [q])
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

