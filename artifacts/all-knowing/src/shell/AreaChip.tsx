import { useEffect, useMemo, useRef, useState } from 'react'
import { warpGraces, type WarpGrace } from '../knowledge/graces'
import { areaLabel, isAreaStale, type AreaSignal } from '../lib/areaContext'
import { regionMatches } from '../lib/areaHub'
import { applyFacts } from '../lib/infer'
import { currentRegion } from '../lib/leftovers'
import { allRecords } from '../lib/entityIndex'
import { ensureEntityIndex, useEntityIndex } from '../lib/entityEnrich'
import { useWorkspace } from '../state'

type Leg = { region: string; id: string; from: string; to: string; summary: string }

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

/**
 * One row per grace. Dedupe on BOTH keys: two rows can share a display name
 * (different warp ids) or share an id under two spellings, and either would
 * otherwise render the same grace twice in the picker.
 */
const UNIQUE_GRACES: WarpGrace[] = (() => {
  const seenId = new Set<string>()
  const seenName = new Set<string>()
  const out: WarpGrace[] = []
  for (const g of warpGraces) {
    const key = norm(g.name)
    if (seenId.has(g.id) || seenName.has(key)) continue
    seenId.add(g.id)
    seenName.add(key)
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
  // Task 132 §4 — the Area hub also surfaces the NPCs, locations and enemies the
  // enriched index places in the region.
  ensureEntityIndex()
  const { ready: indexReady } = useEntityIndex()
  const local = useMemo(() => {
    if (!region || !indexReady) return [] as { id: string; name: string; kind: string }[]
    const out: { id: string; name: string; kind: string }[] = []
    const seen = new Set<string>()
    for (const rec of allRecords()) {
      if (rec.kind !== 'npc' && rec.kind !== 'enemy' && rec.kind !== 'region') continue
      const where = rec.region || rec.location
      if (!where || !regionMatches(where, region)) continue
      if (seen.has(rec.id)) continue
      // A row that names a grace already offered as a chip would read as the
      // same thing twice; keep the pickable grace chip only.
      if (UNIQUE_GRACES.some((g) => norm(g.name) === norm(rec.name))) continue
      seen.add(rec.id)
      out.push({ id: rec.id, name: rec.name, kind: rec.kind })
      if (out.length >= 12) break
    }
    return out
  }, [region, indexReady])

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
    const pickedIds = new Set<string>()
    const pickedNames = new Set<string>()
    const push = (g: WarpGrace | undefined) => {
      if (!g) return
      const n = norm(g.name)
      if (pickedIds.has(g.id) || pickedNames.has(n)) return
      pickedIds.add(g.id)
      pickedNames.add(n)
      picked.push(g)
    }
    sortedAdjacent.forEach(push)
    sameRegion.filter((g) => !have.has(g.id)).forEach((g) => { if (picked.length < 6) push(g) })
    sameRegion.forEach((g) => { if (picked.length < 6) push(g) })
    const likely = picked.slice(0, 6)
    // Never show the same grace twice: a grace already suggested above is
    // dropped from the region list by id AND display name (Task 137 §1).
    const suggestedIds = new Set(likely.map((g) => g.id))
    const suggestedNames = new Set(likely.map((g) => norm(g.name)))
    const inRegion = sameRegion.filter((g) => !suggestedIds.has(g.id) && !suggestedNames.has(norm(g.name)))
    return { likely, inRegion }
  }, [legs, region, discovered])

  const results = useMemo(() => {
    const n = norm(q)
    if (n.length < 2) return []
    const seenId = new Set<string>()
    const seenName = new Set<string>()
    const out: WarpGrace[] = []
    for (const g of UNIQUE_GRACES) {
      if (!(norm(g.name).includes(n) || g.aliases.some((a) => norm(a).includes(n)))) continue
      if (seenId.has(g.id) || seenName.has(norm(g.name))) continue
      seenId.add(g.id)
      seenName.add(norm(g.name))
      out.push(g)
      if (out.length >= 8) break
    }
    return out
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
      {region && local.length > 0 && (
        <>
          <div className="kicker">People &amp; foes in {region}</div>
          <div className="opts">
            {local.map((r) => (
              <span key={r.id} className="chip" title={r.kind}>
                {r.name}
              </span>
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
