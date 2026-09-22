import type { MapMarker } from '../types'
import { markerName, type EngineMarker } from './mapEngine'
import { labelOf } from './links'

/**
 * Task 09 Part C — the one projection rule for the atlas detail panel.
 *
 * The Atlas has two mutually exclusive render paths: the live engine iframe,
 * whose pins are drawn inside the iframe in the engine's own frame, and the
 * static plate, whose SVG pins come from `allPins` in the plate's percent frame.
 * The detail panel (name, Found/Unknown/Not-there, Thread) is a single surface,
 * so it must resolve to exactly one entity *in the active view*:
 *
 *   - an explicit id resolves in whichever set actually owns it (a click, a
 *     Codex/Gideon link, a restored selection);
 *   - with no id, the default comes from the active view only — the engine's
 *     first marker when live, else the first shown plate pin.
 *
 * Before this, `selectedId` fell back to a static plate pin even while the
 * engine was live, so the mark chips could silently target a pin that was not
 * on screen. Returning `pin`/`engineMarker` alongside the id keeps every caller
 * reading the same entity. See ARCHITECTURE.md "Two map frames (do not mix)".
 */
export type AtlasSelection = {
  selectedId?: string
  selectedName: string
  /** The static-plate marker this selection resolves to, if any (note line). */
  pin?: MapMarker
  /** The engine marker this selection resolves to, if any. */
  engineMarker?: EngineMarker
}

export function resolveSelection(opts: {
  selectedQ: string | null
  engineLive: boolean
  platePins: MapMarker[]
  shown: MapMarker[]
  enginePins: EngineMarker[]
  engineList: EngineMarker[]
}): AtlasSelection {
  const { selectedQ, engineLive, platePins, shown, enginePins, engineList } = opts
  const platePin = selectedQ ? platePins.find((m) => m.id === selectedQ) : undefined
  const enginePin = selectedQ ? enginePins.find((m) => m.id === selectedQ) : undefined
  const pin = platePin ?? (!selectedQ && !engineLive ? shown[0] : undefined)
  const engineMarker = enginePin ?? (!selectedQ && engineLive ? engineList[0] : undefined)
  const selectedId = selectedQ ?? (engineLive ? engineMarker?.id : pin?.id)
  const selectedName = selectedQ
    ? enginePin
      ? markerName(enginePin)
      : pin?.name ?? labelOf(selectedQ)
    : engineLive
      ? engineMarker
        ? markerName(engineMarker)
        : 'Select a marker'
      : pin?.name ?? 'Select a pin'
  return { selectedId: selectedId || undefined, selectedName, pin, engineMarker }
}
