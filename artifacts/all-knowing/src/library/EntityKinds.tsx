import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { EntityKind } from '../lib/entityGraph'
import type { EntityRecord } from '../lib/entityIndex'
import { areaBand, areaBosses, areaGraces, areaLoot, areaNpcs } from '../lib/areaHub'
import { dungeonsInRegion } from '../lib/dungeons'
import { loadNpcPlacements, type NpcPlacement } from '../lib/npcPlacements'
import { loadRegionLevels, type RegionLevel } from '../lib/regionLevels'
import { loadSecrets, type WallSecret } from '../lib/secrets'
import { merchants } from '../knowledge/merchants'
import { normalizeName } from '../lib/fanImage'
import type { Character } from '../types'
import { EntityLink } from '../EntityLink'
import { WikiText } from '../WikiText'
import type { LibraryEntity } from './model'

/**
 * Task 144 §1 — kind-specific entity page bodies.
 *
 * The one `EntityPanel` stays the shell; this module supplies the body that
 * actually fits the kind: a location's graces/bosses/loot/NPCs/dungeons and
 * level band, a grace's nearby things, an NPC's questline and stock, and a
 * boss's drops and strategy. It is lazy-loaded from `EntityPanel`, so the eager
 * main chunk never pays for the area index or merchant stock.
 */

function Rows({ children }: { children: ReactNode }) {
  return <ul className="area-list">{children}</ul>
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="lib-panel-block">
      <div className="kicker">{title}</div>
      {children}
    </div>
  )
}

function RegionSections({ entity, character }: { entity: LibraryEntity; character: Character }) {
  const area = entity.name
  const [bands, setBands] = useState<RegionLevel[]>([])
  const [secrets, setSecrets] = useState<WallSecret[]>([])

  useEffect(() => {
    let cancelled = false
    void loadRegionLevels().then((d) => { if (!cancelled) setBands(d.areas) }).catch(() => {})
    void loadSecrets().then((d) => { if (!cancelled) setSecrets(d.walls) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const graces = useMemo(() => areaGraces(character, area), [character, area])
  const bosses = useMemo(() => areaBosses(character, area), [character, area])
  const items = useMemo(() => areaLoot(character, area), [character, area])
  const npcs = useMemo(() => areaNpcs(character, area), [character, area])
  const dungeons = useMemo(() => dungeonsInRegion(area), [area])
  const band = useMemo(() => areaBand(bands, area), [bands, area])
  const areaSecrets = useMemo(() => {
    const n = area.toLowerCase()
    return secrets.filter((s) => `${s.area} ${s.heading} ${s.text}`.toLowerCase().includes(n)).slice(0, 4)
  }, [secrets, area])

  return (
    <>
      {entity.lore && <WikiText className="note lib-lore-text" text={entity.lore} />}

      {band && (
        <Block title="Level band">
          <p className="note">Lv {band.levelMin}–{band.levelMax}</p>
        </Block>
      )}

      <Block title={`Graces inside (${graces.filter((g) => g.done).length}/${graces.length})`}>
        {graces.length ? (
          <Rows>
            {graces.map((g) => (
              <li key={g.id}><span aria-hidden>{g.done ? '✓' : '○'}</span> <EntityLink id={g.id}>{g.name}</EntityLink></li>
            ))}
          </Rows>
        ) : <p className="note">No graces catalogued here.</p>}
      </Block>

      <Block title={`Bosses (${bosses.filter((b) => b.done).length}/${bosses.length})`}>
        {bosses.length ? (
          <Rows>
            {bosses.map((b) => (
              <li key={b.id}><span aria-hidden>{b.done ? '✓' : '○'}</span> <EntityLink id={b.id}>{b.name}</EntityLink></li>
            ))}
          </Rows>
        ) : <p className="note">No catalogued bosses here.</p>}
      </Block>

      <Block title="Items &amp; loot">
        {items.length ? (
          <Rows>
            {items.slice(0, 12).map((l) => (
              <li key={l.id}><span aria-hidden>{l.owned ? '✓' : '○'}</span> <EntityLink id={l.id}>{l.name}</EntityLink></li>
            ))}
          </Rows>
        ) : <p className="note">No loot rows here.</p>}
      </Block>

      <Block title="NPCs found here">
        {npcs.length ? (
          <Rows>
            {npcs.map((n) => <li key={n.id}><EntityLink id={n.id} /></li>)}
          </Rows>
        ) : <p className="note">No NPCs mapped here.</p>}
      </Block>

      <Block title="Dungeons">
        {dungeons.length ? (
          <Rows>
            {dungeons.map((d) => <li key={d.id}><EntityLink id={`dungeon:${d.id}`}>{d.name}</EntityLink></li>)}
          </Rows>
        ) : <p className="note">No dungeons catalogued here.</p>}
      </Block>

      {areaSecrets.length > 0 && (
        <Block title="Secrets">
          <Rows>
            {areaSecrets.map((s) => <li key={s.id}><strong>{s.heading}</strong><div className="note">{s.text.slice(0, 180)}</div></li>)}
          </Rows>
        </Block>
      )}
    </>
  )
}

function GraceSections({ entity, character }: { entity: LibraryEntity; character: Character }) {
  const area = entity.region ?? entity.name
  const bosses = useMemo(() => areaBosses(character, area), [character, area])
  const items = useMemo(() => areaLoot(character, area), [character, area])
  const npcs = useMemo(() => areaNpcs(character, area), [character, area])
  return (
    <>
      {entity.region && <p className="note"><strong>Region:</strong> {entity.region}</p>}
      <Block title="Nearby bosses">
        {bosses.length ? <Rows>{bosses.slice(0, 6).map((b) => <li key={b.id}><span aria-hidden>{b.done ? '✓' : '○'}</span> <EntityLink id={b.id}>{b.name}</EntityLink></li>)}</Rows> : <p className="note">None catalogued.</p>}
      </Block>
      <Block title="Nearby items">
        {items.length ? <Rows>{items.slice(0, 6).map((l) => <li key={l.id}><EntityLink id={l.id}>{l.name}</EntityLink></li>)}</Rows> : <p className="note">None catalogued.</p>}
      </Block>
      <Block title="Nearby NPCs">
        {npcs.length ? <Rows>{npcs.slice(0, 6).map((n) => <li key={n.id}><EntityLink id={n.id} /></li>)}</Rows> : <p className="note">None mapped.</p>}
      </Block>
    </>
  )
}

function NpcSections({
  entity,
  record,
  character,
  onShowWiki,
}: {
  entity: LibraryEntity
  record: EntityRecord | undefined
  character: Character
  onShowWiki: () => void
}) {
  const [placements, setPlacements] = useState<NpcPlacement[]>([])
  useEffect(() => {
    let cancelled = false
    void loadNpcPlacements().then((d) => {
      if (cancelled) return
      const name = entity.name.toLowerCase()
      setPlacements(d.placements.filter((p) => p.name.toLowerCase() === name).slice(0, 20))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [entity.name])

  const stock = useMemo(() => {
    const target = normalizeName(entity.name)
    const vendor = merchants.find((m) => normalizeName(m.vendor) === target)
      ?? merchants.find((m) => normalizeName(m.vendor).includes(target))
    return vendor?.stock ?? []
  }, [entity.name])

  const steps = record?.questSteps ?? []
  const known = new Set(character.completedQuestSteps)

  return (
    <>
      <Block title="Questline">
        {steps.length ? (
          <ol className="area-list npc-steps">
            {steps.map((s) => {
              const done = Boolean(s.entityId && known.has(s.entityId))
              return (
                <li key={`${s.order}-${s.title}`} className={done ? 'npc-step done' : 'npc-step'}>
                  <span aria-hidden>{done ? '✓' : '○'}</span> <strong>{s.title}</strong>
                  {s.location ? <span className="note"> · {s.location}</span> : null}
                </li>
              )
            })}
          </ol>
        ) : <p className="note">No tracked quest steps.</p>}
      </Block>

      <Block title="Where they are now">
        {placements.length ? (
          <>
            <p className="note">{placements.length} known placements · {[...new Set(placements.map((p) => p.map))].length} maps</p>
            <Rows>{placements.slice(0, 4).map((p) => <li key={`${p.map}:${p.x}:${p.z}`} className="note">{p.map}</li>)}</Rows>
          </>
        ) : (
          <p className="note">{entity.where || record?.location || 'No placement data.'}</p>
        )}
      </Block>

      {stock.length > 0 && (
        <Block title="What they sell">
          <Rows>{stock.slice(0, 12).map((item) => <li key={item}>{item}</li>)}</Rows>
        </Block>
      )}

      <Block title="Dialogue">
        <button type="button" className="chip" onClick={onShowWiki}>Open dialogue &amp; wiki</button>
      </Block>
    </>
  )
}

function BossSections({ entity, record, onShowWiki }: { entity: LibraryEntity; record: EntityRecord | undefined; onShowWiki: () => void }) {
  const drops = record?.drops ?? (entity.stats?.find((s) => s.label === 'Drops')?.value.split(' · ') ?? [])
  return (
    <>
      <Block title="Drops">
        {drops.length ? <Rows>{drops.map((d) => <li key={d}>{d}</li>)}</Rows> : <p className="note">No drops recorded.</p>}
      </Block>
      {(record?.strategy || entity.lore) && (
        <Block title="Strategy">
          <WikiText className="note" text={(record?.strategy || entity.lore)!} />
          <button type="button" className="chip" onClick={onShowWiki}>More in Wiki</button>
        </Block>
      )}
    </>
  )
}

export function EntityKinds({
  kind,
  entity,
  record,
  character,
  onShowWiki,
}: {
  kind: EntityKind
  entity: LibraryEntity
  record: EntityRecord | undefined
  character: Character
  onShowWiki: () => void
}) {
  if (kind === 'region' || kind === 'dungeon') return <RegionSections entity={entity} character={character} />
  if (kind === 'grace') return <GraceSections entity={entity} character={character} />
  if (kind === 'npc' || kind === 'merchant') return <NpcSections entity={entity} record={record} character={character} onShowWiki={onShowWiki} />
  if (kind === 'boss' || kind === 'enemy') return <BossSections entity={entity} record={record} onShowWiki={onShowWiki} />
  return null
}

export default EntityKinds
