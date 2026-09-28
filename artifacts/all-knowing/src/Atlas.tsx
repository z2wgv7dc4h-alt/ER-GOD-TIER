import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { markers } from './data/seed'
import { warpGraces, worlds, type AtlasWorld } from './knowledge/graces'
import { applyFacts, clearFact, denyFacts } from './lib/infer'
import { mapIcons } from './lib/sourcePack'
import {
  MAP_ENGINE_BASE,
  engineBanner,
  markerKind,
  markerName,
} from './lib/mapEngine'
import { EntityLink } from './EntityLink'
import { Thread } from './Thread'
import { factState, useWorkspace, type FactState } from './state'
import { useCoords } from './lib/coords'
import { placeLabelsForWorld, usePlaceNames } from './lib/placeNames'
import { useEnginePins } from './lib/engineMarkers'
import { layerOrder } from './lib/nav'
import { resolveSelection } from './lib/atlasSelection'
import { clusterMarkers } from './lib/cluster'
import { leftoverPins } from './lib/leftoverPins'
import { approachingGateList, gatePins, unresolvedGateLocks } from './lib/gatePins'
import { resultMarkers, useResultPins } from './map/resultPins'
import { addNote, noteMarkers, notesForWorld, readNotes, removeNote } from './map/notes'
import { watchPins } from './watch/watchlist'
import { heatCells, heatRadius } from './map/heat'
import { focusViewBox, followFocus, graceFocus } from './map/follow'
import { MapNotesPanel, NoteEditor } from './map/MapNotes'
import type { MapMarker } from './types'

/** The engine dump and the curated pins can name the same id; keep one. */
function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>()
  return rows.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
}

function pinColor(kind: MapMarker['kind']) {
  switch (kind) {
    case 'grace': return '#e4c36a'
    case 'boss': return '#c45c3e'
    case 'item': return '#8fb3d9'
    case 'npc': return '#c9a227'
    case 'fragment': return '#d7b56a'
    case 'spirit-ash': return '#9ad0c2'
    case 'dungeon': return '#9a8f78'
  }
}

function stateFill(state: FactState, kind: MapMarker['kind']) {
  if (state === 'true') return pinColor(kind)
  if (state === 'false') return '#4a4336'
  return '#7a6a3a'
}

/**
 * Task 82: the live map embed fails closed. If the iframe never fires `load`
 * (or errors), we do not leave a silent blank canvas — the caller swaps in the
 * static plate and a different banner.
 */
function EngineEmbed({ onFail, follow = false }: { onFail: () => void; follow?: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (loaded) return
    const t = window.setTimeout(onFail, 8000)
    return () => window.clearTimeout(t)
  }, [loaded, onFail])
  // Task 103 §7: the engine opens its own EventSource. Closing it synchronously
  // before React removes the iframe stops the `/engine/api/events` request from
  // being logged as aborted when the player leaves the map.
  useEffect(() => {
    const frame = frameRef.current
    return () => {
      try {
        const win = frame?.contentWindow as { closeEvents?: () => void } | null
        win?.closeEvents?.()
      } catch {
        /* cross-origin or already gone: nothing to close */
      }
    }
  }, [])
  // Task 111 §3: follow mode on PC is the engine's own live-dot follow; the host
  // just toggles it (see the postMessage bridge in vendor/elden-ring-map/web).
  useEffect(() => {
    if (!loaded) return
    frameRef.current?.contentWindow?.postMessage({ type: 'all-knowing:follow', on: follow }, '*')
  }, [loaded, follow])
  return (
    <iframe
      ref={frameRef}
      title="Elden Ring live map"
      className="engine-frame"
      src={`${MAP_ENGINE_BASE}/?embed=1`}
      onLoad={() => setLoaded(true)}
      onError={onFail}
    />
  )
}

export function AtlasWorkspace() {
  const w = useWorkspace()
  const [embedFailed, setEmbedFailed] = useState(false)
  const [showDown, setShowDown] = useState(false)
  const failEmbed = useCallback(() => setEmbedFailed(true), [])
  // The engine is served by our own app now (/engine), so it is offered on every
  // platform — phone and PS5 included. Fail closed: only fall back to the static
  // plate when the engine is genuinely down or the embed errors.
  const engineUp = w.engineStatus === 'live' || (w.engineStatus === 'connecting' && w.engineMarkers.length > 0)
  const engineLive = engineUp && !embedFailed
  const engineDown = !engineUp
  const banner = engineBanner(w.engineStatus, w.engineState)
  // Don't flash "offline" on the very first frame before the bridge connects.
  useEffect(() => {
    if (!engineDown || embedFailed) {
      setShowDown(false)
      return
    }
    const t = window.setTimeout(() => setShowDown(true), 1500)
    return () => window.clearTimeout(t)
  }, [engineDown, embedFailed])
  const [world, setWorld] = useState<AtlasWorld>(
    w.character.answers.dlc === 'sote' ? 'shadow' : 'overworld',
  )
  const [sideOpen, setSideOpen] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  // The overworld plate is a multi-MB image; drawing pins before it decodes
  // makes them look scattered over nothing. Hold the pin layer until it's ready.
  const [artReady, setArtReady] = useState(false)
  useEffect(() => { setArtReady(false) }, [world])
  const coords = useCoords()
  const placeNameDoc = usePlaceNames()
  const enginePins = useEnginePins(world, !engineLive)
  // Task 111 §1/§2: session result pins and vault-backed custom notes.
  const results = useResultPins()
  const notes = readNotes(w.character)
  const worldNotes = notesForWorld(notes, world)
  const [noteDraft, setNoteDraft] = useState<{ x: number; y: number } | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const longPress = useRef<{ timer: number; x: number; y: number; moved: boolean } | null>(null)

  const gracePins: MapMarker[] = useMemo(
    () =>
      warpGraces
        .filter((g) => g.world === world)
        .map((g) => ({
          id: g.id,
          name: g.name,
          kind: 'grace' as const,
          region: g.region,
          campaign: g.campaign === 'tarnished-pack' ? 'base' : g.campaign,
          x: g.x,
          y: g.y,
          note: g.aliases.join(', '),
        })),
    [world],
  )

  const seedPins = useMemo<MapMarker[]>(() => {
    const extra = markers.filter((m) => !gracePins.some((g) => g.id === m.id))
    const mapped = extra.filter((m) => {
      if (world === 'shadow') return m.campaign === 'sote'
      if (world === 'overworld') return m.campaign === 'base'
      return false
    })
    const fromWeb = coords
      .filter((c) => c.world === world)
      .filter((c) => w.layers[(c.kind as MapMarker['kind'])] !== false)
      .map((c) => ({
        id: c.id,
        name: c.name,
        kind: (['grace', 'boss', 'item', 'npc', 'fragment', 'spirit-ash', 'dungeon'].includes(c.kind) ? c.kind : 'item') as MapMarker['kind'],
        region: c.world,
        campaign: c.world === 'shadow' ? 'sote' as const : 'base' as const,
        x: c.x,
        y: c.y,
        note: c.how || c.cat || '',
      }))
    const seen = new Set(gracePins.map((g) => g.name.toLowerCase()))
    const extraWeb = fromWeb.filter((c) => !seen.has(c.name.toLowerCase()))
    // The engine's own markers overlap the web-coord pins, so only add pins whose
    // names are not already present.
    const known = new Set([
      ...seen,
      ...mapped.map((m) => m.name.toLowerCase()),
      ...fromWeb.map((c) => c.name.toLowerCase()),
    ])
    const ermNew = enginePins.filter((p) => !known.has(p.name.toLowerCase()))
    return [...gracePins, ...mapped, ...extraWeb, ...ermNew]
  }, [gracePins, world, coords, w.layers, enginePins])

  const leftoverList = useMemo(
    () => leftoverPins(w.character, coords, { world }),
    [w.character, coords, world],
  )

  const gateList = useMemo(() => gatePins(w.character, coords, { world }), [w.character, coords, world])
  const unresolvedGates = useMemo(
    () => unresolvedGateLocks(w.character, coords),
    [w.character, coords],
  )
  const approaching = useMemo(() => approachingGateList(w.character), [w.character])

  const allPins = useMemo(
    () => dedupeById([...seedPins, ...leftoverList, ...gateList]),
    [seedPins, leftoverList, gateList],
  )

  // Task 113 §5 — the Watchlist layer: every starred entity that has a plate
  // position, kept out of the seed layers so it can be drawn on top and toggled
  // independently. On by default.
  const watchList = useMemo<MapMarker[]>(() => {
    const target = world === 'shadow' ? 'sote' : 'base'
    const kinds: MapMarker['kind'][] = ['grace', 'boss', 'item', 'npc', 'fragment', 'spirit-ash', 'dungeon']
    return watchPins(w.character, coords)
      .filter((p) => (p.campaign ?? 'base') === target)
      .map((p) => ({
        id: p.id,
        name: p.name,
        kind: (p.kind && kinds.includes(p.kind as MapMarker['kind']) ? (p.kind as MapMarker['kind']) : 'item') as MapMarker['kind'],
        region: p.region ?? '',
        campaign: target,
        x: p.x,
        y: p.y,
        watch: true,
      }))
  }, [w.character, coords, world])

  const q = w.query.trim().toLowerCase()
  const shown = allPins.filter((m) => {
    if (m.gate) {
      if (!w.showGates) return false
    } else if (m.leftover) {
      if (!w.showLeftovers) return false
    } else if (!w.layers[m.kind]) {
      return false
    }
    if (q && !`${m.name} ${m.region}`.toLowerCase().includes(q)) return false
    if (w.missingOnly && factState(w.character, m.id) === 'true') return false
    return true
  })

  const engineList = dedupeById(
    w.engineMarkers.filter((m) => {
      const kind = markerKind(m.id, m.category)
      if (!w.layers[kind]) return false
      const name = markerName(m).toLowerCase()
      if (q && !`${name} ${m.category ?? ''} ${m.id}`.includes(q)) return false
      if (w.missingOnly && factState(w.character, m.id) === 'true') return false
      return true
    }),
  )

  // Task 111 §1: grounded result pins for the viewed world, always drawn on top.
  const resultList = useMemo(() => resultMarkers(results, coords, world), [results, coords, world])
  const resultIds = useMemo(() => new Set(resultList.map((m) => m.id)), [resultList])
  // Task 111 §2: notes on this world, as plate pins.
  const noteList = useMemo(() => noteMarkers(notes, world), [notes, world])
  const canDropHere = Boolean(w.currentArea?.factId && graceFocus(w.currentArea.factId))

  // Task 09 Part C — the single selection projection, shared by the engine-iframe
  // and static-plate paths. See lib/atlasSelection.ts for the rule.
  const {
    selectedId,
    selectedName,
    pin: selected,
  } = resolveSelection({
    selectedQ: w.selectedMarkerId,
    engineLive,
    // Result and note pins are not part of the filtered seed layers, but the
    // shared detail panel must be able to name one when it is clicked.
    platePins: [...allPins, ...resultList, ...noteList, ...watchList],
    shown,
    enginePins: w.engineMarkers,
    engineList,
  })
  const selectedState = selectedId ? factState(w.character, selectedId) : 'unknown'
  const isNoteSelected = Boolean(selectedId?.startsWith('note-'))

  const counts = {
    found: seedPins.filter((m) => factState(w.character, m.id) === 'true').length,
    denied: seedPins.filter((m) => factState(w.character, m.id) === 'false').length,
    unknown: seedPins.filter((m) => factState(w.character, m.id) === 'unknown').length,
  }

  const worldMeta = worlds.find((x) => x.id === world)
  const plate = worldMeta?.plate
  // Pins are percent of the plate image. The viewBox uses the image's pixel
  // size (or 100x80 when there is no plate) so the SVG and the `object-fit:
  // contain` image letterbox identically and the pins stay on the art.
  const vw = worldMeta?.w ?? 100
  const vh = worldMeta?.h ?? 80
  const k = plate ? vw / 100 : 1
  const at = (m: MapMarker) => (plate ? { x: (m.x / 100) * vw, y: (m.y / 100) * vh } : { x: m.x, y: m.y })
  // Collapse the dense iconless pins into counted clusters when the plate is busy.
  // Pins are percent (0..100), so the grid cell is too — not plate pixels.
  const { singles, clusters } = useMemo(() => clusterMarkers(shown, 100 / 45), [shown])
  // Per-kind counts for the layer toggles, so a filter's size is visible.
  const countsByKind = useMemo(() => {
    const out: Record<string, number> = {}
    for (const m of allPins) out[m.kind] = (out[m.kind] ?? 0) + 1
    return out
  }, [allPins])

  // Task 120: the committed place names for this plate, drawn under the pins.
  const placeLabels = useMemo(
    () => placeLabelsForWorld(placeNameDoc, world),
    [placeNameDoc, world],
  )
  const placeNameSize = plate ? vw / 120 : 2

  // ── Task 111 overlays ────────────────────────────────────────────────
  // §4: undone density per region.
  const heat = useMemo(
    () => (w.showHeat ? heatCells(allPins, (id) => factState(w.character, id) === 'true') : []),
    [w.showHeat, allPins, w.character],
  )
  // §3: follow the live dot / current area; else centre a chosen result pin.
  const focusPin = w.selectedMarkerId
    ? resultList.find((m) => m.id === w.selectedMarkerId) ?? noteList.find((m) => m.id === w.selectedMarkerId)
    : undefined
  const followPoint = w.follow ? followFocus({ currentArea: w.currentArea, engine: w.engineState }) : null
  const focus = !engineLive
    ? followPoint ?? (focusPin ? { x: focusPin.x, y: focusPin.y, world } : null)
    : null
  const focusHere = focus && focus.world === world
  const viewBox = plate
    ? focusHere
      ? focusViewBox(focus!, vw, vh)
      : `0 0 ${vw} ${vh}`
    : '0 0 100 80'

  function openNote(x: number, y: number) {
    setNoteDraft({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
  }

  /** Client point -> plate percent, through the SVG's own viewBox transform. */
  function pointToPercent(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current
    if (!svg || typeof svg.createSVGPoint !== 'function') return null
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const u = pt.matrixTransform(ctm.inverse())
    return { x: (u.x / vw) * 100, y: (u.y / vh) * 100 }
  }

  function onMapPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.pointerType !== 'touch') return
    const start = { timer: 0, x: e.clientX, y: e.clientY, moved: false }
    start.timer = window.setTimeout(() => {
      if (start.moved) return
      const p = pointToPercent(start.x, start.y)
      if (p) openNote(p.x, p.y)
    }, 550)
    longPress.current = start
  }

  function onMapPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const lp = longPress.current
    if (!lp) return
    if (Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 12) {
      lp.moved = true
      window.clearTimeout(lp.timer)
      longPress.current = null
    }
  }

  function endLongPress() {
    const lp = longPress.current
    if (lp) {
      window.clearTimeout(lp.timer)
      longPress.current = null
    }
  }

  function onMapContextMenu(e: ReactMouseEvent<SVGSVGElement>) {
    e.preventDefault()
    const p = pointToPercent(e.clientX, e.clientY)
    if (p) openNote(p.x, p.y)
  }

  function saveNote(text: string, entityId?: string) {
    if (!noteDraft) return
    w.setCharacter(addNote(w.character, { text, x: noteDraft.x, y: noteDraft.y, world, entityId }))
    setNoteDraft(null)
  }

  const dropNoteHere = () => {
    const g = w.currentArea?.factId ? graceFocus(w.currentArea.factId) : null
    if (!g) return
    setWorld(g.world)
    openNote(g.x, g.y)
  }

  function mark(state: FactState) {
    if (!selectedId) return
    if (state === 'true') w.setCharacter(applyFacts(w.character, [selectedId], 'answer', 'atlas pin'))
    if (state === 'false') w.setCharacter(denyFacts(w.character, [selectedId], 'atlas pin'))
    if (state === 'unknown') w.setCharacter(clearFact(w.character, selectedId))
  }

  return (
    <div className={sideOpen ? 'map-stage side-open' : 'map-stage'}>
      <div className="atlas">
        {/* Exactly one of these renders: the live engine canvas, or the static
            plate. The engine's pins are drawn inside its own iframe, so the
            two pin sets never share a view. */}
        {engineLive ? (
          <EngineEmbed onFail={failEmbed} follow={w.follow} />
        ) : (
          <div className="atlas-plate">
            {plate && !artReady && <p className="note atlas-loading">Loading map…</p>}
          <svg
            ref={svgRef}
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className={focusHere ? 'atlas-focus' : undefined}
            onContextMenu={onMapContextMenu}
            onPointerDown={onMapPointerDown}
            onPointerMove={onMapPointerMove}
            onPointerUp={endLongPress}
            onPointerLeave={endLongPress}
          >
            {plate && (
              <image
                className="atlas-art-img"
                href={plate}
                x={0}
                y={0}
                width={vw}
                height={vh}
                onLoad={() => setArtReady(true)}
                onError={() => setArtReady(true)}
              />
            )}
            <text x={8 * k} y={8 * k} fill="#8a7018" fontSize={3 * k} fontFamily="Cinzel">
              {worldMeta?.label}
            </text>
            {/* Task 120: committed region names as an overlay under the pins. */}
            {(!plate || artReady) && placeLabels.map((l) => {
              const p = plate ? { x: (l.x / 100) * vw, y: (l.y / 100) * vh } : { x: l.x, y: l.y }
              return (
                <text
                  key={l.id}
                  className="atlas-place-name"
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="Georgia, 'Times New Roman', serif"
                  fontSize={l.tier === 0 ? placeNameSize : placeNameSize * 0.72}
                  fill="#2f2718"
                  stroke="#efe3c7"
                  strokeWidth={placeNameSize * 0.16}
                  strokeOpacity={0.82}
                  style={{ paintOrder: 'stroke', fontVariantCaps: 'small-caps', pointerEvents: 'none' }}
                >
                  {l.name}
                </text>
              )
            })}
            {!plate && (
              <>
            <path d="M8,72 C18,70 22,58 20,46 C16,34 24,22 38,18 C52,14 58,28 70,22 C82,16 90,28 88,42 C86,58 78,70 62,74 C40,78 18,76 8,72 Z" fill="none" stroke="#3a3120" strokeWidth="0.35" />
            <path d="M66,52 C70,44 78,36 86,34 C92,40 90,52 84,58 C76,62 68,58 66,52 Z" fill="none" stroke="#2a3a4a" strokeWidth="0.3" />
              </>
            )}
            {(!plate || artReady) && heat.map((c) => {
              const p = { x: (c.x / 100) * vw, y: (c.y / 100) * vh }
              const r = heatRadius(c.count) * k
              return (
                <g key={`heat:${c.region}`} className="heat">
                  <circle cx={p.x} cy={p.y} r={r} fill="#c45c3e" fillOpacity={0.16} stroke="#c45c3e" strokeOpacity={0.55} strokeWidth={0.3 * k} />
                  <text x={p.x} y={p.y + 0.9 * k} textAnchor="middle" fill="#f0d9c0" fontSize={2.4 * k}>{c.count}</text>
                </g>
              )
            })}
            {(!plate || artReady) && singles.map((m) => {
              if (resultIds.has(m.id)) return null
              const st = factState(w.character, m.id)
              const p = at(m)
              return (
                <g
                  key={m.id}
                  className={m.gate ? 'pin gate' : m.leftover ? 'pin leftover' : 'pin'}
                  onClick={() => w.setSelectedMarkerId(m.id)}
                >
                  {(m.leftover || m.gate) && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={2.4 * k}
                      fill="none"
                      stroke={m.gate ? '#c45c3e' : '#e4c36a'}
                      strokeWidth={0.28 * k}
                      strokeDasharray={`${0.8 * k} ${0.55 * k}`}
                    />
                  )}
                  {mapIcons[m.kind] ? (
                    <image
                      href={mapIcons[m.kind]}
                      x={p.x - 2 * k}
                      y={p.y - 2 * k}
                      width={4 * k}
                      height={4 * k}
                      opacity={st === 'true' ? 1 : st === 'false' ? 0.3 : 0.75}
                    />
                  ) : (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={(w.selectedMarkerId === m.id ? 1.7 : 1.15) * k}
                    fill={stateFill(st, m.kind)}
                    opacity={st === 'true' ? 1 : st === 'false' ? 0.35 : 0.7}
                    stroke={st === 'unknown' ? '#e4c36a' : 'none'}
                    strokeWidth={st === 'unknown' ? 0.25 * k : 0}
                  />
                  )}
                  {w.selectedMarkerId === m.id && (
                    <text x={p.x + 2 * k} y={p.y + 0.8 * k}>{m.name}</text>
                  )}
                </g>
              )
            })}
            {(!plate || artReady) && clusters.map((c, i) => {
              if (resultIds.has(c.first.id)) return null
              const p = plate ? { x: (c.x / 100) * vw, y: (c.y / 100) * vh } : { x: c.x, y: c.y }
              return (
                <g key={`cluster:${i}`} className="pin cluster" onClick={() => w.setSelectedMarkerId(c.first.id)}>
                  <circle cx={p.x} cy={p.y} r={2 * k} fill="#6b5a2a" fillOpacity={0.85} stroke="#e4c36a" strokeWidth={0.25 * k} />
                  <text x={p.x} y={p.y + 0.9 * k} textAnchor="middle" fill="#f3e6b8" fontSize={2 * k}>
                    {c.count}
                  </text>
                </g>
              )
            })}
            {/* Task 111 §2 — custom note pins (teal), above the seed layers. */}
            {(!plate || artReady) && noteList.map((m) => {
              const p = at(m)
              return (
                <g key={`note:${m.id}`} className="pin note-pin" onClick={() => w.setSelectedMarkerId(m.id)}>
                  <rect x={p.x - 1.5 * k} y={p.y - 1.5 * k} width={3 * k} height={3 * k} rx={0.5 * k} fill="#12211e" stroke="#9ad0c2" strokeWidth={0.32 * k} />
                  <text x={p.x + 2.2 * k} y={p.y + 0.8 * k}>{m.name}</text>
                </g>
              )
            })}
            {/* Task 111 §1 — result pins, always on top and pulsing. */}
            {(!plate || artReady) && resultList.map((m) => {
              const st = factState(w.character, m.id)
              const p = at(m)
              return (
                <g key={`result:${m.id}`} className="pin result" onClick={() => w.setSelectedMarkerId(m.id)}>
                  <circle className="pin-pulse" cx={p.x} cy={p.y} r={3 * k} fill="none" stroke="#e4c36a" strokeWidth={0.4 * k} />
                  <circle cx={p.x} cy={p.y} r={1.7 * k} fill={stateFill(st, m.kind)} stroke="#ffe9a8" strokeWidth={0.35 * k} />
                  <text x={p.x + 2.2 * k} y={p.y + 0.8 * k}>{m.name}</text>
                </g>
              )
            })}
            {/* Task 113 §5 — the watchlist layer, a gold ring over its lore pins. */}
            {(!plate || artReady) && w.showWatch && watchList.map((m) => {
              const st = factState(w.character, m.id)
              const p = at(m)
              return (
                <g key={`watch:${m.id}`} className="pin watch" onClick={() => w.setSelectedMarkerId(m.id)}>
                  <circle cx={p.x} cy={p.y} r={2.6 * k} fill="none" stroke="#ffe9a8" strokeWidth={0.35 * k} />
                  <circle cx={p.x} cy={p.y} r={1.25 * k} fill={stateFill(st, m.kind)} stroke="#c9a227" strokeWidth={0.3 * k} />
                  {w.selectedMarkerId === m.id && (
                    <text x={p.x + 2.2 * k} y={p.y + 0.8 * k}>{m.name}</text>
                  )}
                </g>
              )
            })}
          </svg>
          </div>
        )}
        {/* Task 111 §2 — the drop-note sheet, opened by long-press / right-click. */}
        {noteDraft && (
          <NoteEditor
            x={noteDraft.x}
            y={noteDraft.y}
            world={world}
            onSave={saveNote}
            onCancel={() => setNoteDraft(null)}
          />
        )}
        {/* Task 82: the engine never fails silently — a visible banner says why
            the static plate is showing, and it differs for a down engine vs a
            failed embed. */}
        {(embedFailed || showDown) && (
          <div
            className="atlas-banner"
            role="status"
            title={
              embedFailed
                ? 'Live map embed failed — restart the map engine (npm start) and reload.'
                : 'Map engine offline (:8099) — start it with npm start.'
            }
          >
            {embedFailed
              ? 'Live map embed failed — showing the saved map plate. Reload to try again.'
              : 'The live map is unavailable — showing the saved map plate. Check Tarnished → Profiles for details.'}
          </div>
        )}
        {/* Task 69: the phone Atlas surface. `.topbar .toggles` is hidden under
            700px, so these are the only place the three job controls render on a
            phone; the seven pin kinds hide behind one "layers" overflow. Desktop
            keeps the topbar toggles and never shows this bar. */}
        {!engineLive && (<><div className="atlas-jobs" role="group" aria-label="Map job filters">
          <button
            type="button"
            className={w.missingOnly ? 'chip on' : 'chip'}
            aria-pressed={w.missingOnly}
            onClick={() => w.setMissingOnly(!w.missingOnly)}
          >
            Missing only
          </button>
          {/* leftovers / locks only draw plate overlays — the engine has its own
              pin set, so they are dead controls while it is live. Hiding them
              also stops the chip bar wrapping and covering the map header. */}
          {!engineLive && (
            <>
              <button
                type="button"
                className={w.showLeftovers ? 'chip on' : 'chip'}
                aria-pressed={w.showLeftovers}
                onClick={() => w.toggleLeftovers()}
              >
                Missed nearby
              </button>
              <button
                type="button"
                className={w.showGates ? 'chip on' : 'chip'}
                aria-pressed={w.showGates}
                onClick={() => w.toggleGates()}
              >
                locks
              </button>
              {/* Task 111 §3/§4 — follow the current area, and the undone heat. */}
              <button
                type="button"
                className={w.follow ? 'chip on' : 'chip'}
                aria-pressed={!!w.follow}
                onClick={() => w.toggleFollow()}
              >
                follow
              </button>
              <button
                type="button"
                className={w.showHeat ? 'chip on' : 'chip'}
                aria-pressed={!!w.showHeat}
                onClick={() => w.toggleHeat()}
              >
                heat
              </button>
              <button
                type="button"
                className={notesOpen ? 'chip on' : 'chip'}
                aria-pressed={notesOpen}
                onClick={() => setNotesOpen((v) => !v)}
              >
                notes{worldNotes.length ? ` ${worldNotes.length}` : ''}
              </button>
            </>
          )}
          <button
            type="button"
            className={layersOpen ? 'chip on' : 'chip'}
            aria-expanded={layersOpen}
            aria-controls="atlas-layers"
            onClick={() => setLayersOpen((v) => !v)}
          >
            layers
          </button>
        </div>
        {layersOpen && (
          <div className="atlas-layers" id="atlas-layers" role="group" aria-label="Map pin layers">
            <button
              type="button"
              className={w.showWatch ? 'chip on' : 'chip'}
              aria-pressed={!!w.showWatch}
              onClick={() => w.toggleWatch()}
            >
              Watchlist{watchList.length ? ` ${watchList.length}` : ''}
            </button>
            {layerOrder.map((id) => (
              <button
                key={id}
                type="button"
                className={w.layers[id] ? 'chip on' : 'chip'}
                aria-pressed={w.layers[id]}
                onClick={() => w.toggleLayer(id)}
              >
                {id}{countsByKind[id] ? ` ${countsByKind[id]}` : ''}
              </button>
            ))}
          </div>
        )}
        </>)}
        <button
          type="button"
          className={engineLive ? 'atlas-toggle engine-live' : 'atlas-toggle'}
          onClick={() => setSideOpen((v) => !v)}
          aria-expanded={sideOpen}
        >
          {sideOpen ? 'Hide details' : 'Filters & details'}
        </button>
      </div>
      <aside className="side">
        <div className="kicker">{banner.label}</div>

        <div className="legend-pins">
          <span className="note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src={mapIcons.grace} alt="" /> grace
          </span>
          <span className="note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/art/pin-unknown.jpg" alt="" /> unknown
          </span>
          <span className="note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/art/pin-denied.jpg" alt="" /> not there
          </span>
          {w.showLeftovers && (
            <span className="note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: '2px dashed #e4c36a',
                  display: 'inline-block',
                }}
              />
              missed nearby
            </span>
          )}
          {w.showGates && (
            <span className="note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: '2px dashed #c45c3e',
                  display: 'inline-block',
                }}
              />
              locks if you continue
            </span>
          )}
          {w.showWatch && watchList.length > 0 && (
            <span className="note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: '2px solid #ffe9a8',
                  display: 'inline-block',
                }}
              />
              watchlist
            </span>
          )}
        </div>
        {!engineLive && (
          <div className="opts" style={{ margin: '10px 0' }}>
            {worlds.map((wr) => (
              <button key={wr.id} type="button" className={world === wr.id ? 'chip on' : 'chip'} onClick={() => setWorld(wr.id)}>
                {wr.label}
              </button>
            ))}
          </div>
        )}
        <p className="note">{worldMeta?.hint}</p>

        {/* Task 111 §2 — Journey › Map › Notes. */}
        {!engineLive && (
          <MapNotesPanel
            notes={worldNotes}
            onShow={(n) => {
              w.setSelectedMarkerId(n.id)
              setSideOpen(false)
            }}
            onDelete={(id) => w.setCharacter(removeNote(w.character, id))}
            onAddHere={dropNoteHere}
            canAddHere={canDropHere}
          />
        )}

        <p className="note">
          {banner.detail}
          {engineLive && ` · ${w.engineMarkers.length || w.engineState?.markerCount || 0} markers`}
          {banner.liveMemory && ' · live-memory on (read-only, offline only)'}
        </p>

        <div className="tally">
          <span>{counts.found} found</span>
          <span className="dim">{counts.unknown} unknown</span>
          <span className="dim">{counts.denied} not there</span>
        </div>

        {w.showGates && (
          <div className="gate-locks">
            <div className="kicker">Locks if you continue</div>
            {approaching.length === 0 ? (
              <p className="note">No world-state gate is one beat away on this character.</p>
            ) : (
              <ul className="list">
                {approaching.map((g) => (
                  <li key={g.id}>
                    <span>{g.name}</span>
                    <span className="dim">{g.locks.length} lock{g.locks.length === 1 ? '' : 's'}</span>
                  </li>
                ))}
              </ul>
            )}
            {unresolvedGates.length > 0 && (
              <>
                <p className="note">No pin — listed here, not placed on the plate:</p>
                <ul className="list">
                  {unresolvedGates.map(({ gate, lock }) => (
                    <li key={lock.factId}>
                      <span>{lock.name}</span>
                      <span className="dim">{gate.id.replace('gate:', '')}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <p className="note">
          Best captures: open the map → Options → the Site of Grace list for this area.
          Underground and Shadow are different map screens. Fog on a screenshot is not
          “not discovered” — it is unknown until the name is on the warp list.
        </p>

        <h3>{selectedId && !isNoteSelected ? <EntityLink id={selectedId}>{selectedName}</EntityLink> : selectedName}</h3>
        {selected && (
          <p className="note">
            {selected.leftover ? 'leftover · ' : ''}{selected.kind} · {selected.region} · {selectedState}
          </p>
        )}
        {selected?.note && <p className="note">{selected.note}</p>}

        {isNoteSelected ? (
          <div className="opts">
            <button type="button" className="chip" onClick={() => { w.setCharacter(removeNote(w.character, selectedId!)); w.setSelectedMarkerId(null) }}>
              Delete note
            </button>
          </div>
        ) : (
          <>
            <div className="opts">
              <button type="button" className={selectedState === 'true' ? 'chip on' : 'chip'} onClick={() => mark('true')}>Found</button>
              <button type="button" className={selectedState === 'unknown' ? 'chip on' : 'chip'} onClick={() => mark('unknown')}>Unknown</button>
              <button type="button" className={selectedState === 'false' ? 'chip on' : 'chip'} onClick={() => mark('false')}>Not there</button>
            </div>

            {selectedId && <Thread id={selectedId} />}
          </>
        )}

        {resultList.length > 0 && (
          <div className="atlas-results">
            <div className="kicker">Recent results</div>
            <ul className="list">
              {resultList.map((m) => (
                <li key={m.id} onClick={() => { w.setSelectedMarkerId(m.id); setSideOpen(false) }}>
                  <span>{m.name}</span>
                  <span className="dim">{m.kind}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="list">
          {(engineLive ? engineList.slice(0, 80) : shown).map((m) => {
            const id = m.id
            const label = 'name' in m && (m as { name?: string }).name
              ? (m as { name: string }).name
              : markerName(m as { id: string; names?: { en?: string } })
            const st = factState(w.character, id)
            return (
              <li key={id} className={st === 'true' ? 'gone' : ''} onClick={() => w.setSelectedMarkerId(id)}>
                <span>{label}</span>
                <span>{st}</span>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
