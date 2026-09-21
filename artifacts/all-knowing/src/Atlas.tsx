import { useMemo, useState } from 'react'
import { markers } from './data/seed'
import { warpGraces, worlds, type AtlasWorld } from './knowledge/graces'
import { applyFacts, clearFact, denyFacts } from './lib/infer'
import { mapIcons } from './lib/sourcePack'
import {
  MAP_ENGINE_BASE,
  markerKind,
  markerName,
} from './lib/mapEngine'
import { Thread } from './Thread'
import { factState, useWorkspace, type FactState } from './state'
import { useCoords } from './lib/coords'
import type { MapMarker } from './types'

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

export function AtlasWorkspace() {
  const w = useWorkspace()
  const ps5 = w.character.platform === 'ps5' || w.character.platform === 'both'
  const engineLive = !ps5 && (w.engineStatus === 'live' || w.engineMarkers.length > 0)
  const [world, setWorld] = useState<AtlasWorld>(
    w.character.answers.dlc === 'sote' ? 'shadow' : 'overworld',
  )
  const coords = useCoords()

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

  const seedPins = useMemo(() => {
    const extra = markers.filter((m) => !gracePins.some((g) => g.id === m.id))
    const mapped = extra.filter((m) => {
      if (world === 'shadow') return m.campaign === 'sote'
      if (world === 'overworld') return m.campaign === 'base'
      return false
    })
    const fromWeb = coords
      .filter((c) => c.world === world)
      .filter((c) => c.kind === 'grace' || w.layers[(c.kind as MapMarker['kind'])] !== false)
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
    return [...gracePins, ...mapped, ...extraWeb]
  }, [gracePins, world, coords, w.layers])

  const q = w.query.trim().toLowerCase()
  const shown = seedPins.filter((m) => {
    if (m.kind !== 'grace' && !w.layers[m.kind]) return false
    if (q && !`${m.name} ${m.region}`.toLowerCase().includes(q)) return false
    if (w.missingOnly && factState(w.character, m.id) === 'true') return false
    return true
  })

  const engineList = w.engineMarkers.filter((m) => {
    const kind = markerKind(m.id, m.category)
    if (!w.layers[kind]) return false
    const name = markerName(m).toLowerCase()
    if (q && !`${name} ${m.category ?? ''} ${m.id}`.includes(q)) return false
    if (w.missingOnly && factState(w.character, m.id) === 'true') return false
    return true
  })

  const selected = seedPins.find((m) => m.id === w.selectedMarkerId) ?? shown[0]
  const selectedEngine = w.engineMarkers.find((m) => m.id === w.selectedMarkerId) || engineList[0]
  const selectedId = w.selectedMarkerId || selected?.id
  const selectedState = selectedId ? factState(w.character, selectedId) : 'unknown'

  const counts = {
    found: seedPins.filter((m) => factState(w.character, m.id) === 'true').length,
    denied: seedPins.filter((m) => factState(w.character, m.id) === 'false').length,
    unknown: seedPins.filter((m) => factState(w.character, m.id) === 'unknown').length,
  }

  const worldMeta = worlds.find((x) => x.id === world)

  function mark(state: FactState) {
    if (!selectedId) return
    if (state === 'true') w.setCharacter(applyFacts(w.character, [selectedId], 'answer', 'atlas pin'))
    if (state === 'false') w.setCharacter(denyFacts(w.character, [selectedId], 'atlas pin'))
    if (state === 'unknown') w.setCharacter(clearFact(w.character, selectedId))
  }

  return (
    <div className="map-stage">
      <div className="atlas">
        {engineLive ? (
          <iframe title="Elden Ring live map" className="engine-frame" src={`${MAP_ENGINE_BASE}/?embed=1`} />
        ) : (
          <div className="atlas-plate">
            {worldMeta?.plate && (
              <img className="atlas-art" src={worldMeta.plate} alt="" />
            )}
          <svg viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice">
            <text x="8" y="8" fill="#8a7018" fontSize="3" fontFamily="Cinzel">
              {worldMeta?.label}
            </text>
            {!worldMeta?.plate && (
              <>
            <path d="M8,72 C18,70 22,58 20,46 C16,34 24,22 38,18 C52,14 58,28 70,22 C82,16 90,28 88,42 C86,58 78,70 62,74 C40,78 18,76 8,72 Z" fill="none" stroke="#3a3120" strokeWidth="0.35" />
            <path d="M66,52 C70,44 78,36 86,34 C92,40 90,52 84,58 C76,62 68,58 66,52 Z" fill="none" stroke="#2a3a4a" strokeWidth="0.3" />
              </>
            )}
            {shown.map((m) => {
              const st = factState(w.character, m.id)
              return (
                <g key={m.id} className="pin" onClick={() => w.setSelectedMarkerId(m.id)}>
                  {mapIcons[m.kind] ? (
                    <image
                      href={mapIcons[m.kind]}
                      x={m.x - 2}
                      y={m.y - 2}
                      width="4"
                      height="4"
                      opacity={st === 'true' ? 1 : st === 'false' ? 0.3 : 0.75}
                    />
                  ) : (
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={w.selectedMarkerId === m.id ? 1.7 : 1.15}
                    fill={stateFill(st, m.kind)}
                    opacity={st === 'true' ? 1 : st === 'false' ? 0.35 : 0.7}
                    stroke={st === 'unknown' ? '#e4c36a' : 'none'}
                    strokeWidth={st === 'unknown' ? 0.25 : 0}
                  />
                  )}
                  {w.selectedMarkerId === m.id && (
                    <text x={m.x + 2} y={m.y + 0.8}>{m.name}</text>
                  )}
                </g>
              )
            })}
          </svg>
          </div>
        )}
      </div>
      <aside className="side">
        <div className="kicker">
          {ps5
            ? 'PS5 atlas · warp list + pins, not a save'
            : engineLive
              ? `egormagurin engine · ${w.engineMarkers.length || w.engineState?.markerCount || 0} markers`
              : w.engineStatus === 'connecting'
                ? 'Waiting for map engine on :8099'
                : 'PC atlas · engine offline'}
        </div>

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
        </div>
        <div className="opts" style={{ margin: '10px 0' }}>
          {worlds.map((wr) => (
            <button key={wr.id} type="button" className={world === wr.id ? 'chip on' : 'chip'} onClick={() => setWorld(wr.id)}>
              {wr.label}
            </button>
          ))}
        </div>
        <p className="note">{worldMeta?.hint}</p>

        <div className="tally">
          <span>{counts.found} found</span>
          <span className="dim">{counts.unknown} unknown</span>
          <span className="dim">{counts.denied} not there</span>
        </div>

        {ps5 && (
          <p className="note">
            Best captures: open the map → Options → the Site of Grace list for this area.
            Underground and Shadow are different map screens. Fog on a screenshot is not
            “not discovered” — it is unknown until the name is on the warp list.
          </p>
        )}

        <h3>{engineLive ? markerName(selectedEngine || { id: '—' }) : (selected?.name ?? 'Select a pin')}</h3>
        {selected && (
          <p className="note">
            {selected.kind} · {selected.region} · {selectedState}
          </p>
        )}

        <div className="opts">
          <button type="button" className={selectedState === 'true' ? 'chip on' : 'chip'} onClick={() => mark('true')}>Found</button>
          <button type="button" className={selectedState === 'unknown' ? 'chip on' : 'chip'} onClick={() => mark('unknown')}>Unknown</button>
          <button type="button" className={selectedState === 'false' ? 'chip on' : 'chip'} onClick={() => mark('false')}>Not there</button>
        </div>

        {selectedId && <Thread id={selectedId} onOpen={w.setSelectedMarkerId} />}

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
