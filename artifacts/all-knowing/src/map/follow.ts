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
