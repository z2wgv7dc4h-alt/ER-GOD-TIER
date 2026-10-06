import type { AtlasWorld } from '../knowledge/graces'

/**
 * Task 158 — the message the host sends the live engine iframe so "Show on map"
 * focuses the target there too. The engine (vendor/elden-ring-map) only zooms
 * its canvas, so the static-plate fix from Task 155 never reached the map the
 * player actually sees. This turns our resolved placement into the engine's
 * own frame (master + master pixels), and lets the engine find the rest by name.
 */

/** The engine master a world's pins live on. Ashen Capital has no engine plate. */
export const ENGINE_MASTER: Partial<Record<AtlasWorld, 'M00' | 'M01' | 'M10'>> = {
  overworld: 'M00',
  underground: 'M01',
  shadow: 'M10',
}

/** The mosaic the engine's master pixels are in (see knowledge/graces.ts). */
const MOSAIC = 10496

export type EngineFocus = {
  /** Request token so a repeated "Show on map" is sent again, not deduped. */
  at: number
  id: string
  name: string
  kind?: string
  master?: string
  px?: number
  py?: number
}

/**
 * Build the engine focus payload. The Pack-960 worlds (overworld/underground)
 * share the engine frame, so `center` (percent = px / 10496) becomes master
 * pixels. Ashen/shadow plates are stand-ins with their own frames, so those are
 * sent by name only and the engine uses its own marker position; unknown points
 * are left for the engine's name search rather than plotted to a wrong spot.
 */
export function engineFocusMessage(input: {
  at: number
  id: string
  name: string
  kind?: string
  layer: AtlasWorld
  center: { x: number; y: number }
}): EngineFocus {
  const framed = input.layer === 'overworld' || input.layer === 'underground'
  return {
    at: input.at,
    id: input.id,
    name: input.name,
    kind: input.kind,
    master: ENGINE_MASTER[input.layer],
    ...(framed
      ? { px: (input.center.x / 100) * MOSAIC, py: (input.center.y / 100) * MOSAIC }
      : {}),
  }
}
