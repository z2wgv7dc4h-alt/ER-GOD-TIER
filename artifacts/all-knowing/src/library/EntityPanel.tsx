import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { Remembrance } from '../knowledge/remembrances'
import { edges, getEntity, status, type EntityKind } from '../lib/entityGraph'
import { useEnrichment, useEntityIndex } from '../lib/entityEnrich'
import { encountersOf } from '../lib/bossRoster'
import { loadNpcPlacements, placementsForName, type NpcPlacement } from '../lib/npcPlacements'
import { loadChestData, matchChests, type ChestFact } from '../lib/chestFacts'
import { weaponStatRows, weaponStatusFor, type WeaponStatus } from '../lib/weaponStats'
import type { RemembranceOption } from '../lib/remembranceChoice'
import type { Verdict } from '../lib/verdict'
import { Related, RelatedCollapsible } from '../Related'
import { Spoiler, SpoilerGate } from '../settings/Spoiler'
import { WikiText } from '../WikiText'
import { Term } from '../peek/Term'
import type { Character } from '../types'
import { WikiTab } from './WikiTab'

// Task 137 §4 — the combat cards are the panel's only attack-rating consumers;
// load them lazily so the eagerly-mounted entity overlay does not pull the
// calculator into the main entry chunk.
const BossFacts = lazy(() => import('./BossFacts').then((m) => ({ default: m.BossFacts })))
const BossPrepCard = lazy(() => import('../combat/BossPrepCard').then((m) => ({ default: m.BossPrepCard })))
// Task 144 §1 — the kind-specific body (location/grace/NPC/boss) is its own
// chunk so the eager panel keeps the shared shell only.
const EntityKinds = lazy(() => import('./EntityKinds'))
import { kindStatus, trackActionLabel } from './pageModel'
import type { EntityRecord } from '../lib/entityIndex'
import { attributeStats, isOwned, meetsRequirements, type AttributeKey, type CategoryId, type LibraryEntity } from './model'


function EntityStatusStrip({
  factId,
  character,
  kind,
  entity,
  record,
}: {
  factId: string
  character: Character
  kind: EntityKind
  entity: LibraryEntity
  record: EntityRecord | undefined
}) {
  const info = useMemo(() => status(factId, character), [factId, character])
  const line = useMemo(() => kindStatus(kind, info, entity, record, character), [kind, info, entity, record, character])
  return (
    <div className={`entity-status ${info.state} kind-${kind}`} title={info.why}>
      <span className="entity-status-state">{line.label}</span>
      <span className="entity-status-why">{line.why}</span>
    </div>
  )
}

/**
 * Task 95 — the reusable entity detail panel.
 *
 * Other features will mount this for any `LibraryEntity` (or an entity-shaped
 * object) without pulling in the whole browser. It owns only presentation and a
 * tiny tab state; every side effect is a callback the host wires up.
 */

export type EntityPanelProps = {
  entity: LibraryEntity
  character: Character
  /**
   * Canonical fact id, when it differs from `entity.factId` (Task 97: the
   * universal overlay mounts any graph entity, not just a Library row).
   */
  factId?: string
  /** Graph kind override; when omitted it is derived from the category/id. */
  kind?: EntityKind
  /** Overrides; when omitted they are derived from `character`. */
  owned?: boolean
  requirementsMet?: boolean | null
  /** AR at the character's stats, when the host can resolve the weapon row. */
  ar?: { now: number; max: number } | null
  /** Task 100 §3: the advisor's one-line "is this good for me" verdict. */
  verdict?: Verdict | null
  /** Task 100 §4: a remembrance's Enia options, already ranked for the build. */
  remembrance?: { remembrance: Remembrance; options: RemembranceOption[] } | null
  compareActive?: boolean
  onClose?: () => void
  onOwnedChange?: (owned: boolean) => void
  onTradeOption?: (factId: string) => void
  onCompare?: () => void
  onEquip?: () => void
  onAskGideon?: () => void
  onShowOnMap?: () => void
  onSetGoal?: () => void
  /** NPC: jump to the questline board (Journey › Quests). */
  onQuestline?: () => void
  /** Grace: set the current area to here and mark the grace found. */
  onImHere?: () => void
}

const CATEGORY_KIND: Partial<Record<CategoryId, EntityKind>> = {
  weapons: 'weapon',
  shields: 'shield',
  armor: 'armor',
  talismans: 'talisman',
  sorceries: 'spell',
  incantations: 'spell',
  ashes: 'ash',
  spirits: 'spirit',
  bosses: 'boss',
  npcs: 'npc',
  // Task 166 §11 — guide/secret/recipe are reference pages, so the category
  // fallback must not type them as an ownable `item`.
  guides: 'mechanic',
  secrets: 'mechanic',
  recipes: 'mechanic',
}

const EQUIPPABLE = new Set<EntityKind>(['weapon', 'shield', 'armor', 'talisman'])
const COMPARABLE = new Set<EntityKind>(['weapon', 'shield', 'armor', 'talisman'])

function panelKind(entity: LibraryEntity, factId: string, kind?: EntityKind): EntityKind {
  if (kind) return kind
  return CATEGORY_KIND[entity.category] ?? getEntity(factId).kind
}

type Tab = 'stats' | 'where' | 'lore' | 'related' | 'wiki'

const TAB_LABELS: Record<Tab, string> = { stats: 'Stats', where: 'Where', lore: 'Lore', related: 'Related', wiki: 'Wiki' }

const ATTR_LABELS: Record<AttributeKey, string> = {
  str: 'Str',
  dex: 'Dex',
  int: 'Int',
  fai: 'Fai',
  arc: 'Arc',
}

function DetailedExcerpt({ heading, text }: { heading: string; text: string }) {
  return (
    <div className="lib-panel-block">
      <div className="kicker">{heading}</div>
      <WikiText className="note" text={text} />
    </div>
  )
}

function RequirementRow({ attr, value, character }: { attr: AttributeKey; value: number; character: Character }) {
  const met = attributeStats(character)[attr] >= value
  return (
    <li className={met ? 'lib-req met' : 'lib-req unmet'}>
      <span className="lib-req-dot" aria-hidden>{met ? '✓' : '✗'}</span>
      <span>{ATTR_LABELS[attr]}</span>
      <span>{value}</span>
    </li>
  )
}

/**
 * Task 183 §1 — an NPC's known positions, straight from `npc-placements.json`
 * (MSB coordinates), shown in the where-to-find section. No positions are
 * invented: when the NPC has no placement the block is omitted and the plain
 * location text stands.
 */
export function NpcPlacementsBlock({ placements }: { placements: NpcPlacement[] }) {
  if (!placements.length) return null
  const maps = [...new Set(placements.map((p) => p.map))]
  return (
    <div className="lib-panel-block">
      <div className="kicker">Known positions</div>
      <p className="note">
        {placements.length} placement{placements.length === 1 ? '' : 's'} across {maps.length} map{maps.length === 1 ? '' : 's'}.
      </p>
      <ul className="lib-req-list">
        {placements.slice(0, 8).map((p) => (
          <li key={`${p.map}:${p.x}:${p.z}`} className="lib-req">
            <span>
              {p.map}
              {p.world && p.world !== 'overworld' ? ` · ${p.world}` : ''}
            </span>
            <span className="note">{Math.round(p.x)}, {Math.round(p.z)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Task 183 §2 — a chest that holds this item, from `world-lots.json` via
 * `chestFacts.ts`. Rendered in the where-to-find section so an item page names
 * the chest and region it comes from; omitted entirely when no chest matches.
 */
export function ChestFactsBlock({ chests }: { chests: ChestFact[] }) {
  if (!chests.length) return null
  return (
    <div className="lib-panel-block">
      <div className="kicker">Found in a chest</div>
      <ul className="lib-req-list">
        {chests.slice(0, 6).map((c) => (
          <li key={c.id} className="lib-req">
            <span>{c.region || c.map}</span>
            <span className="note">{c.items.join(', ')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Task 183 §3 — status build-up decoded from the regulation
 * `statusSpEffectParams` (via `weaponStats.ts`), shown next to the attack
 * rating. Poise rides along when the entity carries one, so the two "beyond AR"
 * numbers sit together. No status and no poise means no block.
 */
export function WeaponNumbersBlock({ status, poise }: { status: WeaponStatus[]; poise?: string }) {
  if (!status.length && !poise) return null
  return (
    <div className="lib-panel-block">
      <div className="kicker">Status build-up</div>
      {status.length > 0 && (
        <div className="lib-attack">
          {status.map((s) => (
            <span key={s.label} className="lib-attack-chip">
              {s.label} <strong>{s.value}</strong>
            </span>
          ))}
        </div>
      )}
      {poise && (
        <p className="note">
          <Term id="mechanic:poise">Poise</Term> {poise}
        </p>
      )}
    </div>
  )
}

export function EntityPanel({
  entity,
  character,
  factId,
  kind,
  owned,
  requirementsMet,
  ar,
  verdict,
  remembrance,
  compareActive,
  onClose,
  onOwnedChange,
  onTradeOption,
  onCompare,
  onEquip,
  onAskGideon,
  onShowOnMap,
  onSetGoal,
  onQuestline,
  onImHere,
}: EntityPanelProps) {
  const [tab, setTab] = useState<Tab>('stats')
  // Task 183 §1 — the NPC's own MSB placements, loaded only for NPC pages and
  // only once the where-to-find tab is actually opened. Each async block carries
  // the entity name it was fetched for, so switching pages cannot show stale data.
  const [placements, setPlacements] = useState<{ name: string; rows: NpcPlacement[] } | null>(null)
  // Task 183 §2/§3 — chest matches and the regulation status build-up, both
  // loaded only when their tab/kind actually needs them.
  const [chestHits, setChestHits] = useState<{ name: string; rows: ChestFact[] } | null>(null)
  const [weaponStatus, setWeaponStatus] = useState<{ name: string; rows: WeaponStatus[] } | null>(null)
  const statusFactId = factId ?? entity.factId
  // Task 119 §3: read the enriched record first; skeleton (not "No data") while
  // the one index fetch is still in flight.
  const record = useEnrichment(statusFactId)
  const { ready: indexReady, version: indexVersion } = useEntityIndex()
  // Task 156 — an item with no location text, no map row and no source edge has
  // nothing to show, so the map action is dropped rather than opening on nothing.
  const hasMapSource = useMemo(() => {
    if (record?.location || record?.map) return true
    return edges(statusFactId).some((e) =>
      ['soldBy', 'droppedBy', 'foundIn', 'craftedFrom', 'tradedFor', 'sells', 'drops'].includes(e.rel),
    )
  }, [record, statusFactId, indexVersion])
  const panelKindValue = panelKind(entity, statusFactId, kind)
  const isBoss = panelKindValue === 'boss' || panelKindValue === 'enemy'
  // Task 165 §2 — a boss fought in several places lists them first (block 1).
  const isGroupBoss = isBoss && encountersOf(entity.factId).length > 0
  // Task 165 §2 — a boss page inlines Stats/Where/Related, so its tab strip
  // reduces to the two reference tabs that have nowhere else to go.
  const tabs: Tab[] = isBoss ? ['lore', 'wiki'] : ['stats', 'where', 'lore', 'related', 'wiki']
  const isNpc = panelKindValue === 'npc' || panelKindValue === 'merchant'
  const isGrace = panelKindValue === 'grace'
  // Task 144 §1 — a region/dungeon is not ownable; it gets its own actions.
  const isLocation = panelKindValue === 'region' || panelKindValue === 'dungeon'
  const BOSS_LABELS = new Set(['hp', 'negation', 'poise', 'status resist', 'weak to', 'resists', 'drops', 'arena'])
  const enrichedStats = Object.entries(record?.stats ?? {}).filter(([label]) => {
    if (isBoss && BOSS_LABELS.has(label.toLowerCase())) return false
    return !(entity.stats ?? []).some((s) => s.label.toLowerCase() === label.toLowerCase())
  })
  // Task 183 §1 — fetch the placement file for an NPC only, and only once the
  // where tab is open, so a weapon page never pays for the 180 KB file.
  useEffect(() => {
    if (!isNpc || tab !== 'where' || placements?.name === entity.name) return
    let cancelled = false
    void loadNpcPlacements()
      .then((d) => {
        if (!cancelled) setPlacements({ name: entity.name, rows: placementsForName(entity.name, d.placements) })
      })
      .catch(() => { /* no placement file: the block simply does not render */ })
    return () => {
      cancelled = true
    }
  }, [isNpc, tab, placements, entity.name])
  // Task 183 §2 — which chests hold this item, from the same world-lots dump the
  // atlas layer uses, shown in the where-to-find section.
  useEffect(() => {
    if (tab !== 'where' || isNpc || isBoss || isGrace || isLocation || chestHits?.name === entity.name) return
    let cancelled = false
    void loadChestData()
      .then((d) => {
        if (!cancelled) setChestHits({ name: entity.name, rows: matchChests(entity.name, d.facts) })
      })
      .catch(() => { /* no chest data: the block simply does not render */ })
    return () => {
      cancelled = true
    }
  }, [tab, isNpc, isBoss, isGrace, isLocation, chestHits, entity.name])
  // Task 183 §3 — status build-up for the weapon on screen (regulation decode).
  useEffect(() => {
    if (tab !== 'stats' || !entity.weaponName || weaponStatus?.name === entity.name) return
    let cancelled = false
    void weaponStatRows()
      .then((rows) => {
        if (!cancelled) setWeaponStatus({ name: entity.name, rows: weaponStatusFor(entity.weaponName!, rows) })
      })
      .catch(() => { /* no regulation data: the block simply does not render */ })
    return () => {
      cancelled = true
    }
  }, [tab, entity.weaponName, entity.name, weaponStatus])
  const recordSections = record?.sections ?? []
  const isOwnedValue = owned ?? isOwned(entity, character)
  const metValue = requirementsMet === undefined ? meetsRequirements(entity, character) : requirementsMet
  const requirementEntries = Object.entries(entity.requirements ?? {}) as [AttributeKey, number][]
  const scalingEntries = Object.entries(entity.scaling ?? {}) as [AttributeKey, string][]

  return (
    <section className="lib-panel" aria-label={`${entity.name} details`}>
      <header className="lib-panel-head">
        {entity.icon && <img className="lib-panel-icon" src={entity.icon} alt="" loading="lazy" decoding="async" />}
        <div className="lib-panel-title">
          <div className="kicker">
            {entity.subtype ?? entity.category}
            {entity.region ? ` · ${entity.region}` : ''}
            {entity.dlc ? ' · DLC' : ''}
          </div>
          <h2><Spoiler factId={statusFactId}>{entity.name}</Spoiler></h2>
          {isOwnedValue && (
            <span className="lib-owned-badge">
              {panelKindValue === 'grace' ? 'Discovered ✓' : panelKindValue === 'region' || panelKindValue === 'dungeon' ? 'Visited ✓' : 'Owned ✓'}
            </span>
          )}
        </div>
        {onClose && (
          <button type="button" className="chip lib-panel-close" onClick={onClose} aria-label="Close details">
            Close
          </button>
        )}
      </header>

      <EntityStatusStrip factId={statusFactId} character={character} kind={panelKindValue} entity={entity} record={record} />

      {verdict && (
        <p className={`entity-verdict ${verdict.kind}`} role="status">
          {verdict.line}
        </p>
      )}

      <div className="lib-panel-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'chip on' : 'chip'}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="lib-panel-body">
        {/* Task 165 §2 — a boss page is one ordered body: where → weaknesses &
            resistances → strategy (+ guide links) → drops → spirit/co-op →
            recommended level → related. Only Lore and Wiki remain as tabs. */}
        {isBoss && (
          <div className="lib-panel-stats">
            {isGroupBoss && (
              <Suspense fallback={null}>
                <EntityKinds
                  kind={panelKindValue}
                  entity={entity}
                  record={record}
                  character={character}
                  onShowWiki={() => setTab('wiki')}
                />
              </Suspense>
            )}

            <Suspense fallback={null}>
              <BossFacts
                factId={statusFactId}
                name={entity.name}
                region={entity.region}
                character={character}
                onShowOnMap={onShowOnMap}
              />
            </Suspense>

            {/* Task 107 §10: status procs, spirit ashes, buffs/co-op and the one
                recommended-level verdict. The duplicated weaknesses/weapons/
                level blocks are gated off so BossFacts stays the only copy. */}
            <Suspense fallback={null}>
              <BossPrepCard
                bossId={statusFactId}
                character={character}
                sections={['status', 'spirits', 'helpers', 'summon', 'level']}
              />
            </Suspense>

            {!isGroupBoss && (
              <Suspense fallback={null}>
                <EntityKinds
                  kind={panelKindValue}
                  entity={entity}
                  record={record}
                  character={character}
                  onShowWiki={() => setTab('wiki')}
                />
              </Suspense>
            )}

            <RelatedCollapsible id={entity.factId} />
          </div>
        )}

        {!isBoss && tab === 'stats' && (
          <div className="lib-panel-stats">
            {/* Task 144 §1 — the body that fits the kind. NPC quest steps come
                before the numeric/combat rows, so combat stats stay last. */}
            <Suspense fallback={null}>
              <EntityKinds
                kind={panelKindValue}
                entity={entity}
                record={record}
                character={character}
                onShowWiki={() => setTab('wiki')}
              />
            </Suspense>

            {(requirementEntries.length > 0 || metValue !== null) && (
              <div className="lib-panel-block">
                <div className="kicker"><Term id="mechanic:stat-requirements">Requirements</Term></div>
                {requirementEntries.length ? (
                  <ul className="lib-req-list">
                    {requirementEntries.map(([attr, value]) => (
                      <RequirementRow key={attr} attr={attr} value={value} character={character} />
                    ))}
                  </ul>
                ) : (
                  <p className="note">None.</p>
                )}
                {metValue !== null && (
                  <p className={metValue ? 'note lib-met' : 'note lib-unmet'}>
                    {metValue ? 'You meet the requirements.' : 'You do not meet all requirements.'}
                  </p>
                )}
              </div>
            )}

            {remembrance && (
              <div className="lib-panel-block">
                <div className="kicker">Enia trade — ranked for your build</div>
                <ul className="lib-req-list remembrance-options">
                  {remembrance.options.map((option) => (
                    <li key={option.name} className={option.traded ? 'lib-req met' : 'lib-req'}>
                      <span>
                        <strong>{option.name}</strong>
                        <br />
                        <span className="note">{option.traded ? 'Already traded' : option.why}</span>
                      </span>
                      {!option.traded && option.factId && onTradeOption && (
                        <button type="button" className="chip" onClick={() => onTradeOption(option.factId!)}>
                          Mark traded
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {scalingEntries.length > 0 && (
              <div className="lib-panel-block">
                <div className="kicker"><Term id="mechanic:weapon-scaling">Scaling</Term></div>
                <div className="lib-scaling">
                  {scalingEntries.map(([attr, letter]) => (
                    <span key={attr} className="lib-scaling-chip">
                      {ATTR_LABELS[attr]} <strong>{letter}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entity.attack && entity.attack.length > 0 && (
              <div className="lib-panel-block">
                <div className="kicker">Base damage</div>
                <div className="lib-attack">
                  {entity.attack.map((a) => (
                    <span key={a.label} className="lib-attack-chip">
                      {a.label} <strong>{Math.round(a.value)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ar && (
              <div className="lib-panel-block">
                <div className="kicker"><Term id="mechanic:attack-rating">Attack rating</Term></div>
                <div className="lib-ar">
                  <span>
                    At my stats <strong>{ar.now}</strong>
                  </span>
                  <span>
                    Max upgrade <strong>{ar.max}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Task 183 §3 — status build-up from the regulation params, beside AR. */}
            {weaponStatus?.name === entity.name && weaponStatus.rows.length > 0 && (
              <WeaponNumbersBlock
                status={weaponStatus.rows}
                poise={entity.stats?.find((s) => s.label.toLowerCase() === 'poise')?.value}
              />
            )}

            {entity.weight !== undefined && (
              <div className="lib-panel-block">
                <div className="kicker">Weight</div>
                <p className="note">{entity.weight}</p>
              </div>
            )}

            {entity.stats && entity.stats.length > 0 && (
              <div className="lib-panel-block">
                <div className="kicker">Stats</div>
                <dl className="lib-stat-grid">
                  {entity.stats.map((s) => (
                    <div key={s.label} className="lib-stat">
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {enrichedStats.length > 0 && (
              <div className="lib-panel-block">
                <div className="kicker">Enriched facts</div>
                <dl className="lib-stat-grid">
                  {enrichedStats.map(([label, value]) => (
                    <div key={label} className="lib-stat">
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {!isLocation && !isGrace && !isNpc && requirementEntries.length === 0 && !entity.attack?.length && !entity.stats?.length && !ar && entity.weight === undefined && enrichedStats.length === 0 && (
              indexReady ? (
                <p className="note">No structured stats in the data for this entry.</p>
              ) : (
                <p className="note lib-skeleton-note">Loading reference data…</p>
              )
            )}
          </div>
        )}

        {!isBoss && tab === 'where' && (
          <div className="lib-panel-where">
            {(entity.where || record?.location) && <WikiText className="note" text={(entity.where || record!.location)!} />}
            {entity.region && (
              <p className="note">
                <strong>Region:</strong> {entity.region}
              </p>
            )}
            {record?.map && (
              <p className="note">
                <strong>Coords:</strong> {record.map.x}, {record.map.y}
                {record.map.map ? ` · ${record.map.map}` : ''}
              </p>
            )}
            {isNpc && placements && placements.rows.length > 0 && <NpcPlacementsBlock placements={placements.rows} />}
            {!isNpc && chestHits && chestHits.rows.length > 0 && <ChestFactsBlock chests={chestHits.rows} />}
            {!entity.where && !record?.location && !entity.region && !record?.map && !(isNpc && placements && placements.rows.length > 0) && !(chestHits && chestHits.rows.length > 0) && (
              indexReady ? (
                <p className="note">No acquisition text in the data for this entry.</p>
              ) : (
                <p className="note lib-skeleton-note">Loading location data…</p>
              )
            )}
            {onShowOnMap && (
              <div className="opts">
                <button type="button" className="chip" onClick={onShowOnMap}>
                  Show on map
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'lore' && (
          <div className="lib-panel-lore">
            {(entity.lore || record?.description) && (
              <SpoilerGate factId={statusFactId}>
                <WikiText className="note lib-lore-text" text={(entity.lore || record!.description)!} />
              </SpoilerGate>
            )}
            {record?.strategy && record.strategy !== record.description && (
              <DetailedExcerpt heading="Strategy" text={record.strategy} />
            )}
            {recordSections
              .filter((section) => section.text && section.text !== record?.description && section.text !== record?.strategy)
              .slice(0, 3)
              .map((section) => (
                <DetailedExcerpt key={`${section.heading}-${section.text.slice(0, 12)}`} heading={section.heading} text={section.text} />
              ))}
            {!entity.lore && !record?.description && !record?.strategy && recordSections.length === 0 && (
              indexReady ? (
                <p className="note">No lore text in the data for this entry.</p>
              ) : (
                <p className="note lib-skeleton-note">Loading lore data…</p>
              )
            )}
          </div>
        )}

        {!isBoss && tab === 'related' && (
          <div className="lib-panel-related">
            <Related id={entity.factId} />
          </div>
        )}

        {tab === 'wiki' && (
          <div className="lib-panel-wiki">
            <WikiTab entityId={statusFactId} />
          </div>
        )}
      </div>

      <footer className="lib-panel-actions">
        {isBoss && (
          <>
            {onOwnedChange && trackActionLabel(panelKindValue, isOwnedValue, statusFactId) && (
              <button
                type="button"
                className={isOwnedValue ? 'chip on' : 'chip'}
                aria-pressed={isOwnedValue}
                onClick={() => onOwnedChange(!isOwnedValue)}
              >
                {trackActionLabel(panelKindValue, isOwnedValue, statusFactId)}
              </button>
            )}
            {onShowOnMap && (
              <button type="button" className="chip" onClick={onShowOnMap}>
                Show arena on map
              </button>
            )}
            {onSetGoal && (
              <button type="button" className="chip" onClick={onSetGoal}>
                Set as goal
              </button>
            )}
            {onAskGideon && (
              <button type="button" className="chip" onClick={onAskGideon}>
                Ask Gideon
              </button>
            )}
          </>
        )}

        {isNpc && (
          <>
            {onShowOnMap && (
              <button type="button" className="chip" onClick={onShowOnMap}>
                Show where they are now
              </button>
            )}
            {onQuestline && (
              <button type="button" className="chip" onClick={onQuestline}>
                Questline
              </button>
            )}
            {onAskGideon && (
              <button type="button" className="chip" onClick={onAskGideon}>
                Ask Gideon
              </button>
            )}
          </>
        )}

        {isGrace && (
          <>
            {onImHere && (
              <button type="button" className="chip on" onClick={onImHere}>
                I&apos;m here
              </button>
            )}
            {onShowOnMap && (
              <button type="button" className="chip" onClick={onShowOnMap}>
                Show on map
              </button>
            )}
          </>
        )}

        {isLocation && (
          <>
            {onShowOnMap && (
              <button type="button" className="chip" onClick={onShowOnMap}>
                Show on map
              </button>
            )}
            {onAskGideon && (
              <button type="button" className="chip" onClick={onAskGideon}>
                Ask Gideon
              </button>
            )}
          </>
        )}

        {!isBoss && !isNpc && !isGrace && !isLocation && (
          <>
            {onOwnedChange && trackActionLabel(panelKindValue, isOwnedValue) && (
              <button type="button" className={isOwnedValue ? 'chip on' : 'chip'} onClick={() => onOwnedChange(!isOwnedValue)}>
                {trackActionLabel(panelKindValue, isOwnedValue)}
              </button>
            )}
            {onEquip && EQUIPPABLE.has(panelKindValue) && (
              <button type="button" className="chip" onClick={onEquip}>
                Equip (opens Gear)
              </button>
            )}
            {onCompare && COMPARABLE.has(panelKindValue) && (
              <button type="button" className={compareActive ? 'chip on' : 'chip'} onClick={onCompare}>
                {compareActive ? 'Pinned to compare' : 'Compare'}
              </button>
            )}
            {onShowOnMap && hasMapSource && (
              <button type="button" className="chip" onClick={onShowOnMap}>
                Show where
              </button>
            )}
            {onAskGideon && (
              <button type="button" className="chip" onClick={onAskGideon}>
                Ask Gideon
              </button>
            )}
          </>
        )}
      </footer>
    </section>
  )
}
