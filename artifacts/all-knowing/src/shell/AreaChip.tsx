import { useEffect, useMemo, useState } from 'react'
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

/**
 * Task 98 — the header location chip and the PS5 "Where are you?" picker.
 *
 * One tap on a grace sets `currentArea`, marks the grace discovered (which runs
 * the usual inference), and closes. The first six suggestions are the graces
 * adjacent to the last known one along the `legs.json` route, undiscovered first,
 * then the rest of the current region.
 */
export function AreaChip() {
  const w = useWorkspace()
  const [open, setOpen] = useState(false)
  const [legs, setLegs] = useState<Leg[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!open || legs.length) return
    let cancelled = false
    void fetch('/sourced/guide/legs.json')
      .then((r) => r.json())
      .then((rows: Leg[]) => { if (!cancelled) setLegs(rows) })
      .catch(() => { /* no routes; region graces still show */ })
    return () => { cancelled = true }
  }, [open, legs.length])

  const region = w.currentArea?.region ?? currentRegion(w.character)
  const discovered = w.character.discoveredGraces

  const { likely, inRegion } = useMemo(() => {
    const have = new Set(discovered)
    const lastId = [...discovered].reverse().find((id) => warpGraces.some((g) => g.id === id))
    const lastName = warpGraces.find((g) => g.id === lastId)?.name
    const byName = new Map(warpGraces.map((g) => [norm(g.name), g]))

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
    const sameRegion = warpGraces.filter((g) => regionMatches(g.region, region))
    const picked: WarpGrace[] = []
    const push = (g: WarpGrace | undefined) => {
      if (g && !picked.some((x) => x.id === g.id)) picked.push(g)
    }
    sortedAdjacent.forEach(push)
    sameRegion.filter((g) => !have.has(g.id)).forEach((g) => { if (picked.length < 6) push(g) })
    sameRegion.forEach((g) => { if (picked.length < 6) push(g) })
    return { likely: picked.slice(0, 6), inRegion: sameRegion }
  }, [legs, region, discovered])

  const results = useMemo(() => {
    const n = norm(q)
    if (n.length < 2) return []
    return warpGraces
      .filter((g) => norm(g.name).includes(n) || g.aliases.some((a) => norm(a).includes(n)))
      .slice(0, 8)
  }, [q])

  function pick(g: WarpGrace) {
    w.setCharacter(applyFacts(w.character, [g.id], 'answer', 'Where are you?'))
    const signal: AreaSignal = { region: g.region, place: g.name, factId: g.id, source: 'map', at: Date.now() }
    w.setCurrentArea(signal)
    setOpen(false)
    setQ('')
  }

  const label = areaLabel(w.currentArea) || 'Set area'
  const stale = isAreaStale(w.currentArea)

  return (
    <div className="area-chip-wrap">
      <button
        type="button"
        className={stale ? 'area-chip stale' : 'area-chip'}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Where are you?"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>📍</span> {label}
      </button>
      {open && (
        <div className="area-picker panel" role="dialog" aria-label="Where are you?">
          <div className="kicker">Where are you?</div>
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
          <button type="button" className="chip" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}
