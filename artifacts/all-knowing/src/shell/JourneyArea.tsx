import { useEffect, useMemo, useState } from 'react'
import { EntityLink } from '../EntityLink'
import { WikiText } from '../WikiText'
import { facts } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { areaLabel } from '../lib/areaContext'
import {
  areaBand,
  areaBosses,
  areaCompletion,
  areaDontMiss,
  areaGraces,
  areaLoot,
  areaNpcs,
  levelVerdict,
  regionMatches,
} from '../lib/areaHub'
import { dungeonsInRegion } from '../lib/dungeons'
import { useEntityIndex } from '../lib/entityIndex'
import { gatheringNodeMaterial, useGatheringNodes } from '../lib/gatheringNodes'
import { loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import { loadSecrets, type WallSecret } from '../lib/secrets'
import { useWorkspace } from '../state'
import { GuidesFor } from '../PackData'
import { EmptyState } from '../ui'
import { AreaPrompt } from './AreaPrompt'
import { AreaPickerSheet } from './AreaChip'

function Bar({ label, have, total }: { label: string; have: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((have / total) * 100)) : 0
  return (
    <div className="meter">
      <label>
        <span>{label}</span>
        <span>{have}/{total}</span>
      </label>
      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function regionFactId(area: string): string | undefined {
  return facts.find((f) => f.kind === 'region' && regionMatches(f.name, area))?.id
}

/**
 * Task 98 — Journey › Area. The region page: level band, my completion here,
 * don't-miss, bosses, dungeons, NPCs here now, loot, secrets, and farm spots.
 * Every row that names an entity is an `EntityLink`.
 */
export function JourneyArea() {
  const w = useWorkspace()
  const area = w.currentArea?.region ?? null
  const character = w.character

  const [bands, setBands] = useState<RegionLevel[]>([])
  const [secrets, setSecrets] = useState<WallSecret[]>([])
  const nodes = useGatheringNodes()
  // Task 144 §3 — the wiki/placement NPC records arrive with the entity index.
  const { version: indexVersion } = useEntityIndex()

  useEffect(() => {
    let cancelled = false
    void loadRegionLevels().then((data) => { if (!cancelled) setBands(data.areas) }).catch(() => {})
    void loadSecrets().then((doc) => { if (!cancelled) setSecrets(doc.walls) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const completion = useMemo(() => areaCompletion(character, area), [character, area])
  const graces = useMemo(() => areaGraces(character, area), [character, area])
  const bosses = useMemo(() => areaBosses(character, area), [character, area])
  const regionDungeons = useMemo(() => dungeonsInRegion(area), [area])
  const npcs = useMemo(() => areaNpcs(character, area), [character, area, indexVersion])
  const lootRows = useMemo(() => areaLoot(character, area), [character, area])
  const dontMiss = useMemo(() => areaDontMiss(character, area), [character, area])

  const band = useMemo(() => areaBand(bands, area), [bands, area])
  const verdict = levelVerdict(character.level, band)
  const regionId = area ? regionFactId(area) : undefined

  const areaSecrets = useMemo(() => {
    if (!area) return []
    const n = area.toLowerCase()
    return secrets.filter((s) => `${s.area} ${s.heading} ${s.text}`.toLowerCase().includes(n)).slice(0, 6)
  }, [secrets, area])

  const farm = useMemo(() => {
    const counts = new Map<string, number>()
    for (const node of nodes) {
      if (!regionMatches(node.region, area)) continue
      // Task 144 §3 — never print a raw AEG asset code. Only a node whose model
      // maps to a real material is listed; unnamed ones are omitted.
      const material = gatheringNodeMaterial(node.model)
      if (!material) continue
      counts.set(material, (counts.get(material) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [nodes, area])

  function showOnMap() {
    if (!area) return
    const target =
      graces[0]?.id ??
      w.currentArea?.factId ??
      warpGraces.find((g) => regionMatches(g.region, area))?.id
    if (target) w.focusOnMap(target)
    else w.setModule('map')
  }

  if (!area) {
    return (
      <div className="area-hub">
        <section className="panel area-pick">
          <div className="kicker">Where are you?</div>
          <EmptyState image="/brand/empty-map.webp" line="Pick the nearest grace and the area page fills in from there." />
          <AreaPickerSheet inline onClose={() => {}} />
        </section>
      </div>
    )
  }

  return (
    <div className="area-hub">
      <AreaPrompt />
      <section className="panel area-head">
        <div className="kicker">Area</div>
        <h2>
          {regionId ? <EntityLink id={regionId}>{area}</EntityLink> : area}
          {w.currentArea?.place && w.currentArea.place !== area ? <span className="note"> · {w.currentArea.place}</span> : null}
        </h2>
        {band ? (
          <p className={verdict === 'right' ? 'note' : 'note area-verdict warn'}>
            Lv {band.levelMin}–{band.levelMax} · you are Lv {character.level} —{' '}
            {verdict === 'under' ? 'under-levelled' : verdict === 'over' ? 'over-levelled' : 'right for this area'}
          </p>
        ) : (
          <p className="note">No level band on file.</p>
        )}
        <div className="opts">
          <button type="button" className="chip on" onClick={showOnMap}>Show area on map</button>
          <span className="chip" aria-label="Current area label">{areaLabel(w.currentArea)}</span>
        </div>
      </section>

      <section className="panel">
        <div className="kicker">My completion here</div>
        <div className="meters">
          <Bar label="Graces" have={completion.graces.have} total={completion.graces.total} />
          <Bar label="Bosses" have={completion.bosses.have} total={completion.bosses.total} />
          <Bar label="Items" have={completion.items.have} total={completion.items.total} />
          <Bar label="Dungeons" have={completion.dungeons.have} total={completion.dungeons.total} />
        </div>
      </section>

      {dontMiss.length > 0 && (
        <section className="panel">
          <div className="kicker">Don’t miss</div>
          <ul className="area-list">
            {dontMiss.map((d) => (
              <li key={`${d.kind}:${d.id}`}>
                <EntityLink id={d.id} />
                <WikiText className="note" text={d.why} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <GuidesFor query={area} heading="Guides for this area" />
      </section>

      <section className="panel">
        <div className="kicker">Bosses</div>
        {bosses.length === 0 ? (
          <p className="note">No catalogued bosses here.</p>
        ) : (
          <ul className="area-list">
            {bosses.map((b) => (
              <li key={b.id}>
                <span aria-hidden>{b.done ? '✓' : '○'}</span> <EntityLink id={b.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="kicker">Dungeons</div>
        {regionDungeons.length === 0 ? (
          <p className="note">No dungeons catalogued here yet.</p>
        ) : (
          <ul className="area-list">
            {regionDungeons.map((d) => (
              <li key={d.id}>
                <EntityLink id={`dungeon:${d.id}`}>{d.name}</EntityLink>
                {d.dlc && <span className="chip">DLC</span>}
                {d.bosses[0] && (
                  <> · <EntityLink id={d.bosses[0].id}>{d.bosses[0].name}</EntityLink></>
                )}
                <div className="note">
                  {d.kind}
                  {d.keys.length > 0 ? ` · ${d.keys.join(', ')}` : ''}
                  {d.impSeals > 0 ? ` · ${d.impSeals} imp seal${d.impSeals > 1 ? 's' : ''}` : ''}
                  {d.levers > 0 ? ` · ${d.levers} lever${d.levers > 1 ? 's' : ''}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="kicker">NPCs here now</div>
        {npcs.length === 0 ? (
          <p className="note">No NPCs mapped to this area.</p>
        ) : (
          <ul className="area-list">
            {npcs.map((n) => (
              <li key={n.id}>
                <EntityLink id={n.id} />
                <div className="note">
                  {n.graceId ? (
                    <>At <EntityLink id={n.graceId}>{n.graceName}</EntityLink></>
                  ) : (
                    n.note ?? 'In this area.'
                  )}
                  {n.graceId && n.note ? ` · ${n.note}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="kicker">Items &amp; loot</div>
        {lootRows.length === 0 ? (
          <p className="note">No loot rows here.</p>
        ) : (
          <ul className="area-list">
            {lootRows.slice(0, 12).map((l) => (
              <li key={l.id}>
                <span aria-hidden>{l.owned ? '✓' : '○'}</span> <EntityLink id={l.id}>{l.name}</EntityLink>
                {l.goodForBuild && <span className="chip on">good for my build</span>}
                {l.missable && <span className="chip warn">missable</span>}
                <WikiText className="note" text={l.how} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {areaSecrets.length > 0 && (
        <section className="panel">
          <div className="kicker">Secrets</div>
          <ul className="area-list">
            {areaSecrets.map((s) => (
              <li key={s.id}>
                {regionId ? <EntityLink id={regionId}>{s.heading}</EntityLink> : <strong>{s.heading}</strong>}
                <div className="note">{s.text.slice(0, 220)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="kicker">Farm here</div>
        {farm.length > 0 ? (
          <ul className="area-list">
            {farm.map(([material, count]) => (
              <li key={material}>
                <strong>{material}</strong> <span className="note">×{count} gathering nodes</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="note">
            {nodes.length === 0
              ? 'Gathering-node data loads here.'
              : 'No named gathering nodes mapped to this area.'}
          </p>
        )}
        <ul className="area-list">
          {lootRows
            .filter((l) => /farm|drop|dropped|creature/i.test(l.how))
            .slice(0, 4)
            .map((l) => (
              <li key={`farm:${l.id}`}>
                <EntityLink id={l.id}>{l.name}</EntityLink> <span className="note">drop</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  )
}
