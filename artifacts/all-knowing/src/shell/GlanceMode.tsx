import { useEffect, useMemo, useRef } from 'react'
import { EntityLink } from '../EntityLink'
import { areaLabel } from '../lib/areaContext'
import { useCoords } from '../lib/coords'
import { gideonHeader } from '../lib/gideonHeader'
import { acquireWakeLock, glanceNearest, releaseWakeLock, type WakeLockLike } from '../lib/glance'
import { MAP_ENGINE_BASE } from '../lib/mapEngine'
import { useWorkspace } from '../state'

/**
 * Task 100 §2 — Glance mode (Usage model moment 15).
 *
 * Full-screen map for the current area with one bottom strip: the current goal
 * step, the nearest unfinished thing, and one big "+ Log". The screen wake lock
 * is requested while open and released on exit; both are guarded, so a browser
 * without the API (or a denied request) simply keeps the screen timeout.
 */
export function GlanceMode({ onLog }: { onLog: () => void }) {
  const w = useWorkspace()
  const coords = useCoords()
  const header = useMemo(() => gideonHeader(w.character), [w.character])
  const nearest = useMemo(
    () => glanceNearest(w.character, coords, w.currentArea),
    [w.character, coords, w.currentArea],
  )
  const lockRef = useRef<WakeLockLike | null>(null)

  useEffect(() => {
    let disposed = false
    void acquireWakeLock().then((lock) => {
      if (disposed) void releaseWakeLock(lock)
      else lockRef.current = lock
    })
    return () => {
      disposed = true
      void releaseWakeLock(lockRef.current)
      lockRef.current = null
    }
  }, [])

  return (
    <div className="glance-mode" role="dialog" aria-modal="true" aria-label="Glance mode">
      <iframe className="glance-frame" title="Glance map" src={`${MAP_ENGINE_BASE}/?embed=1`} />
      <button type="button" className="chip on glance-exit" onClick={() => w.setGlance(false)}>
        Exit
      </button>
      <div className="glance-strip">
        <div className="glance-where">{w.currentArea ? areaLabel(w.currentArea) : 'No area set'}</div>
        <div className="glance-goal">
          <span className="kicker">{header.goal ?? 'Main path'}</span>
          <strong>{header.beat ?? 'Ask Gideon what is next'}</strong>
        </div>
        {nearest && (
          <div className="glance-near">
            Nearest unfinished: <EntityLink id={nearest.id}>{nearest.name}</EntityLink>
          </div>
        )}
        <button type="button" className="glance-log" onClick={onLog} aria-label="Quick log">
          + Log
        </button>
      </div>
    </div>
  )
}
