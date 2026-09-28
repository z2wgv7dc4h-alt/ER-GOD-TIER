import { useEffect, useMemo, useRef, useState } from 'react'
import { warpGraces, type WarpGrace } from '../knowledge/graces'
import { areaLabel, isAreaStale, type AreaSignal } from '../lib/areaContext'
import { regionMatches } from '../lib/areaHub'
import { applyFacts } from '../lib/infer'
import { currentRegion } from '../lib/leftovers'
import { useWorkspace } from '../state'

type Leg = { region: string; id: string; from: string; to: string; summary: string }

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

/** One row per grace name — the raw warp list carries a few duplicate names. */
const UNIQUE_GRACES: WarpGrace[] = (() => {
  const seen = new Set<string>()
  const out: WarpGrace[] = []
  for (const g of warpGraces) {
    const key = norm(g.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(g)
  }
  return out
})()

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

/**
 * The picker body, shared by the header chip (as a modal) and the Journey › Area
 * empty state (inline). One tap on a grace sets `currentArea` and marks it found.
 * The first six suggestions are the graces adjacent to the last known one along
 * the `legs.json` route, undiscovered first, then the rest of the current region.
 */
export function AreaPickerSheet({ onClose, inline = false }: { onClose: () => void; inline?: boolean }) {
  const w = useWorkspace()
  const [legs, setLegs] = useState<Leg[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetch('/sourced/guide/legs.json')
      .then((r) => r.json())
      .then((rows: Leg[]) => { if (!cancelled) setLegs(rows) })
      .catch(() => { /* no routes; region graces still show */ })
    return () => { cancelled = true }
  }, [])

  const region = w.currentArea?.region ?? currentRegion(w.character)
  const discovered = w.character.discoveredGraces

  const { likely, inRegion } = useMemo(() => {
    const have = new Set(discovered)
    const lastId = [...discovered].reverse().find((id) => UNIQUE_GRACES.some((g) => g.id === id))
    const lastName = UNIQUE_GRACES.find((g) => g.id === lastId)?.name
    const byName = new Map(UNIQUE_GRACES.map((g) => [norm(g.name), g]))

    const adjacent: WarpGrace[] = []
    if (lastName) {
      const seen = new Set<string>()
      for (const leg of legs) {
        const pairs: [string, string][] = [[leg.from, leg.to], [leg.to, leg.from]]
        for (const [from, to] of pairs) {
          if (norm(from) !== norm(lastName)) continue
          const g = byName.get(norm(to))
          if (g && !seen.has(g.id)) { seen.add(g.id); adjacent.push(g) }
        }
      }
    }
    const sortedAdjacent = [...adjacent].sort((a, b) => Number(have.has(a.id)) - Number(have.has(b.id)))
    const sameRegion = UNIQUE_GRACES.filter((g) => regionMatches(g.region, region))
    const picked: WarpGrace[] = []
    const pickedNames = new Set<string>()
    const push = (g: WarpGrace | undefined) => {
      if (!g) return
      const n = norm(g.name)
      if (pickedNames.has(n)) return
      pickedNames.add(n)
      picked.push(g)
    }
    sortedAdjacent.forEach(push)
    sameRegion.filter((g) => !have.has(g.id)).forEach((g) => { if (picked.length < 6) push(g) })
    sameRegion.forEach((g) => { if (picked.length < 6) push(g) })
    return { likely: picked.slice(0, 6), inRegion: sameRegion }
  }, [legs, region, discovered])

  const results = useMemo(() => {
    const n = norm(q)
    if (n.length < 2) return []
    return UNIQUE_GRACES
      .filter((g) => norm(g.name).includes(n) || g.aliases.some((a) => norm(a).includes(n)))
      .slice(0, 8)
  }, [q])

  function pick(g: WarpGrace) {
    w.setCharacter(applyFacts(w.character, [g.id], 'answer', 'Where are you?'))
    const signal: AreaSignal = { region: g.region, place: g.name, factId: g.id, source: 'map', at: Date.now() }
    w.setCurrentArea(signal)
    onClose()
  }

  return (
    <>
      {!inline && (
        <header className="area-picker-head">
          <div className="kicker">Where are you?</div>
          <button type="button" className="chip area-picker-close" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>
      )}
      <p className="note">One tap sets your area and marks the grace found.</p>
      <div className="opts area-picker-likely">
        {likely.map((g) => (
          <button key={g.id} type="button" className="chip" onClick={() => pick(g)}>
            {g.name}
          </button>
        ))}
      </div>
      {region && inRegion.length > 0 && (
        <>
          <div className="kicker">In {region}</div>
          <div className="opts">
            {inRegion.map((g) => (
              <button key={g.id} type="button" className="chip" onClick={() => pick(g)}>
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}
      <input
        className="search area-picker-search"
        placeholder="Search a grace…"
        aria-label="Search a grace"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {results.length > 0 && (
        <div className="opts">
          {results.map((g) => (
            <button key={g.id} type="button" className="chip" onClick={() => pick(g)}>
              {g.name} · {g.region}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

/**
 * Task 98 — the header location chip and the PS5 "Where are you?" picker.
 *
 * Task 107 §1 — it is a real modal: an opaque sheet over a dimming scrim, with a
 * close button, a focus trap and Escape to dismiss. It closes itself when the
 * section or sub changes so it can never hover over a page it was not opened on.
 */
export function AreaChip() {
  const w = useWorkspace()
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setOpen(false)
  }, [w.section, w.sub])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    sheetRef.current?.querySelector<HTMLInputElement>('input')?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        close()
        return
      }
      if (e.key !== 'Tab') return
      const root = sheetRef.current
      if (!root) return
      const list = Array.prototype.slice
        .call(root.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null)
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  const label = areaLabel(w.currentArea) || 'Set area'
  const stale = isAreaStale(w.currentArea)

  return (
    <div className="area-chip-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={stale ? 'area-chip stale' : 'area-chip'}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Where are you?"
        onClick={() => {
          window.dispatchEvent(new Event('allknowing:dismiss-toast'))
          setOpen((v) => !v)
        }}
      >
        <span aria-hidden>📍</span> {label}
      </button>
      {open && (
        <div className="area-picker" role="dialog" aria-modal="true" aria-label="Where are you?" onClick={close}>
          <div className="area-picker-sheet" ref={sheetRef} onClick={(e) => e.stopPropagation()}>
            <AreaPickerSheet onClose={close} />
          </div>
        </div>
      )}
    </div>
  )
}
