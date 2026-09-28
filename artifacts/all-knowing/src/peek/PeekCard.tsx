import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type FocusEvent as ReactFocusEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useWorkspaceOptional } from '../state'
import { useEnrichment, useEntityIndex } from '../lib/entityEnrich'
import { peekInfo, type PeekInfo } from './peekData'
import { closePeek, getPeek, openPeek, peekHost, subscribePeek, type PeekTarget } from './peekStore'
import './peek.css'

/**
 * Task 115 §1 — the peek card and its shared portal.
 *
 * `usePeek` owns the hover (300ms) / keyboard-focus / phone long-press (450ms)
 * behaviour and returns the handlers an `EntityLink` or `<Term>` spreads onto its
 * element. Only one card is ever mounted: `PeekLayer` renders it into the single
 * `peekHost()` portal when this element owns the active peek.
 */

const HOVER_DELAY = 300
const LONG_PRESS_DELAY = 450
const MOVE_TOLERANCE = 10

export type PeekHandlers = {
  onPointerEnter: (e: ReactPointerEvent) => void
  onPointerLeave: (e: ReactPointerEvent) => void
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerUp: (e: ReactPointerEvent) => void
  onPointerCancel: (e: ReactPointerEvent) => void
  onPointerMove: (e: ReactPointerEvent) => void
  onFocus: (e: ReactFocusEvent) => void
  onBlur: () => void
}

export type PeekController = {
  key: string
  isActive: boolean
  handlers: PeekHandlers
  /** True when the last interaction was a long-press, so the click should not navigate. */
  consumeLongPress: () => boolean
  closeNow: () => void
}

export function usePeek(id: string, anchorRef: RefObject<HTMLElement | null>): PeekController {
  const key = useId()
  const active = useSyncExternalStore(subscribePeek, getPeek, getPeek)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const longPressed = useRef(false)

  const clearHover = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
  }, [])
  const clearPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
    pressStart.current = null
  }, [])

  useEffect(() => () => {
    clearHover()
    clearPress()
  }, [clearHover, clearPress])

  const openNow = useCallback(() => {
    if (anchorRef.current) openPeek({ key, id, anchor: anchorRef.current })
  }, [key, id, anchorRef])
  const closeNow = useCallback(() => closePeek(key), [key])

  const handlers: PeekHandlers = {
    onPointerEnter: (e) => {
      if (e.pointerType !== 'mouse') return
      clearHover()
      hoverTimer.current = setTimeout(openNow, HOVER_DELAY)
    },
    onPointerLeave: (e) => {
      if (e.pointerType !== 'mouse') return
      clearHover()
      closeNow()
    },
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse') return
      longPressed.current = false
      pressStart.current = { x: e.clientX, y: e.clientY }
      clearPress()
      pressTimer.current = setTimeout(() => {
        longPressed.current = true
        openNow()
      }, LONG_PRESS_DELAY)
    },
    onPointerUp: () => clearPress(),
    onPointerCancel: () => clearPress(),
    onPointerMove: (e) => {
      const start = pressStart.current
      if (!start) return
      if (Math.abs(e.clientX - start.x) > MOVE_TOLERANCE || Math.abs(e.clientY - start.y) > MOVE_TOLERANCE) {
        clearPress()
      }
    },
    onFocus: (e) => {
      const target = e.target as HTMLElement
      // Only keyboard focus opens the card; a click/tap focus should not.
      if (typeof target.matches === 'function' && !target.matches(':focus-visible')) return
      openNow()
    },
    onBlur: () => closeNow(),
  }

  return {
    key,
    isActive: active?.key === key,
    handlers,
    consumeLongPress: () => {
      const wasLong = longPressed.current
      longPressed.current = false
      return wasLong
    },
    closeNow,
  }
}

/** Mounts the card into the one shared portal when this owner holds the peek. */
export function PeekLayer({ selfKey }: { selfKey: string }) {
  const active = useSyncExternalStore(subscribePeek, getPeek, getPeek)
  if (!active || active.key !== selfKey) return null
  return createPortal(<PeekCard target={active} onClose={() => closePeek(selfKey)} />, peekHost())
}

export function PeekCard({ target, onClose }: { target: PeekTarget; onClose: () => void }) {
  const w = useWorkspaceOptional()
  const record = useEnrichment(target.id)
  const { ready } = useEntityIndex()
  const info = useMemo(() => peekInfo(target.id, w?.character, record), [target.id, w?.character, record])
  const pending = !ready && info.facts.length === 0 && !info.summary
  const cardRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const place = useCallback(() => {
    const anchor = target.anchor
    const card = cardRef.current
    if (!anchor || !card) return
    const a = anchor.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top = a.bottom + margin
    if (top + c.height > vh - margin) {
      const above = a.top - margin - c.height
      top = above >= margin ? above : Math.max(margin, vh - margin - c.height)
    }
    const left = Math.max(margin, Math.min(a.left + a.width / 2 - c.width / 2, vw - margin - c.width))
    setPos({ top, left })
  }, [target.anchor])

  useLayoutEffect(() => {
    place()
  }, [place, info])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onScroll(e: Event) {
      if (cardRef.current && e.target instanceof Node && cardRef.current.contains(e.target)) return
      onClose()
    }
    function onResize() {
      place()
    }
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (cardRef.current?.contains(t)) return
      if (target.anchor.contains(t)) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [onClose, place, target.anchor])

  function open() {
    w?.openEntity(info.id)
    onClose()
  }

  function showOnMap() {
    w?.setSelectedMarkerId(info.id)
    w?.setModule('map')
    onClose()
  }

  const canMap = target.variant !== 'term' && w != null

  return (
    <div
      ref={cardRef}
      className="peek-card"
      role="dialog"
      aria-label={`${info.name} preview`}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: -9999, left: -9999 }}
      onPointerEnter={(e) => e.stopPropagation()}
    >
      <header className="peek-head">
        {info.icon && <img className="peek-icon" src={info.icon} alt="" loading="lazy" decoding="async" />}
        <div className="peek-title">
          <span className="peek-kind">{info.kindLabel}</span>
          <strong>{info.name}</strong>
        </div>
        <button type="button" className="peek-x" aria-label="Close preview" onClick={onClose}>
          ×
        </button>
      </header>

      <div className={`peek-status ${info.status.state}`} title={info.status.why}>
        {info.status.label}
        {info.status.why ? ` — ${info.status.why}` : ''}
      </div>

      {pending && (
        <div className="peek-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}

      {!pending && info.facts.length > 0 && (
        <dl className="peek-facts">
          {info.facts.map((f, i) => (
            <div key={`${f.label}-${i}`} className="peek-fact">
              {f.label && <dt>{f.label}</dt>}
              <dd className={f.ok === undefined ? undefined : f.ok ? 'ok' : 'unmet'}>
                {f.ok !== undefined && <span aria-hidden>{f.ok ? '✓' : '✗'}</span>} {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!pending && info.summary && <p className="peek-summary">{info.summary}</p>}

      <footer className="peek-actions">
        <button type="button" className="chip on" onClick={open}>
          Open
        </button>
        {canMap && (
          <button type="button" className="chip" onClick={showOnMap}>
            Show on map
          </button>
        )}
      </footer>
    </div>
  )
}

export type { PeekInfo }
