import { warpGraces, type AtlasWorld } from '../knowledge/graces'
import type { AreaSignal } from '../lib/areaContext'
import type { EngineState } from '../lib/mapEngine'

/**
 * Task 111 §3 — follow mode.
 *
 * Resolves the point the plate should stay centred on: the live player position
 * when the engine has one (PC with the memory reader), else the current area's
 * grace. `focusViewBox` turns a point into an SVG viewBox that centres it at a
 * fixed zoom, so the static plate follows without any pan state to manage.
 */
export type Focus = { x: number; y: number; world: AtlasWorld }

const MOSAIC = 10496
const WORLD_BY_MASTER: Record<string, AtlasWorld> = { M00: 'overworld', M01: 'underground', M10: 'shadow' }

export function graceFocus(factId: string | null | undefined): Focus | null {
  if (!factId) return null
  const g = warpGraces.find((x) => x.id === factId)
  if (!g) return null
  return { x: g.x, y: g.y, world: g.world }
}

/** The live save/live-memory position, on the mosaic frame. */
export function liveFocus(engine: EngineState | null | undefined): Focus | null {
  if (!engine?.characters?.length) return null
  const active =
    engine.characters.find((c) => c.slot === engine.activeSlot) ??
    engine.characters.find((c) => c.mapPixel) ??
    engine.characters[0]
  const mp = active?.mapPixel
  if (!mp || typeof mp.px !== 'number' || typeof mp.py !== 'number') return null
  return {
    x: (mp.px / MOSAIC) * 100,
    y: (mp.py / MOSAIC) * 100,
    world: WORLD_BY_MASTER[mp.master ?? 'M00'] ?? 'overworld',
  }
}

/** Live dot first (PC), then the current-area grace. */
export function followFocus(opts: {
  currentArea: AreaSignal | null | undefined
  engine?: EngineState | null
}): Focus | null {
  return liveFocus(opts.engine ?? null) ?? graceFocus(opts.currentArea?.factId)
}

/** A viewBox centred on `focus` at `zoom`, clamped so it never leaves the plate. */
export function focusViewBox(focus: Focus, vw: number, vh: number, zoom = 2.4): string {
  const width = vw / zoom
  const height = vh / zoom
  const cx = (focus.x / 100) * vw
  const cy = (focus.y / 100) * vh
  const x = Math.min(Math.max(cx - width / 2, 0), Math.max(0, vw - width))
  const y = Math.min(Math.max(cy - height / 2, 0), Math.max(0, vh - height))
  return `${x} ${y} ${width} ${height}`
}

/**
 * Task 156 — a viewBox that contains every point of a multi-spawn source (an
 * enemy drop with many placements), with a margin so the outermost pin is not on
 * the edge. Falls back to a single-point focus when only one point is supplied.
 */
export function fitViewBox(
  points: { x: number; y: number }[],
  vw: number,
  vh: number,
  margin = 0.12,
): string {
  if (!points.length) return `0 0 ${vw} ${vh}`
  if (points.length === 1) return focusViewBox({ ...points[0], world: 'overworld' }, vw, vh, 3.4)
  const xs = points.map((p) => (p.x / 100) * vw)
  const ys = points.map((p) => (p.y / 100) * vh)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const padX = Math.max((maxX - minX) * margin, vw / 60)
  const padY = Math.max((maxY - minY) * margin, vh / 60)
  let width = maxX - minX + padX * 2
  let height = maxY - minY + padY * 2
  // Keep a sane maximum zoom-out and a minimum zoom-in around tiny clusters.
  const maxW = vw / 1.6
  const maxH = vh / 1.6
  if (width > maxW || height > maxH) {
    const s = Math.min(maxW / width, maxH / height)
    width *= s
    height *= s
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const x = Math.min(Math.max(cx - width / 2, 0), Math.max(0, vw - width))
  const y = Math.min(Math.max(cy - height / 2, 0), Math.max(0, vh - height))
  return `${x} ${y} ${width} ${height}`
}
