import { useMemo, useState } from 'react'
import type { Remembrance } from '../knowledge/remembrances'
import { getEntity, status, type EntityKind, type EntityState } from '../lib/entityGraph'
import type { RemembranceOption } from '../lib/remembranceChoice'
import type { Verdict } from '../lib/verdict'
import { Related } from '../Related'
import { Spoiler, SpoilerGate } from '../settings/Spoiler'
import { WikiText } from '../WikiText'
import { BossPrepCard } from '../combat/BossPrepCard'
import type { Character } from '../types'
import { BossFacts } from './BossFacts'
import { attributeStats, isOwned, meetsRequirements, type AttributeKey, type CategoryId, type LibraryEntity } from './model'

const STATUS_LABELS: Record<EntityState, string> = {
  done: 'Done',
  owned: 'Owned',
  available: 'Available',
  ahead: 'Ahead of you',
  locked: 'Locked',
  missed: 'Missed',
  unknown: 'Unknown',
}

function EntityStatusStrip({ factId, character }: { factId: string; character: Character }) {
  const info = useMemo(() => status(factId, character), [factId, character])
  return (
    <div className={`entity-status ${info.state}`} title={info.why}>
      <span className="entity-status-state">{STATUS_LABELS[info.state]}</span>
      <span className="entity-status-why">{info.why}</span>
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
}

const EQUIPPABLE = new Set<EntityKind>(['weapon', 'shield', 'armor', 'talisman'])
const COMPARABLE = new Set<EntityKind>(['weapon', 'shield', 'armor', 'talisman'])

function panelKind(entity: LibraryEntity, factId: string, kind?: EntityKind): EntityKind {
  if (kind) return kind
  return CATEGORY_KIND[entity.category] ?? getEntity(factId).kind
}

type Tab = 'stats' | 'where' | 'lore' | 'related'

const ATTR_LABELS: Record<AttributeKey, string> = {
  str: 'Str',
  dex: 'Dex',
  int: 'Int',
  fai: 'Fai',
  arc: 'Arc',
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
  const statusFactId = factId ?? entity.factId
  const panelKindValue = panelKind(entity, statusFactId, kind)
  const isBoss = panelKindValue === 'boss' || panelKindValue === 'enemy'
  const isNpc = panelKindValue === 'npc' || panelKindValue === 'merchant'
  const isGrace = panelKindValue === 'grace'
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
          {isOwnedValue && <span className="lib-owned-badge">Owned ✓</span>}
        </div>
        {onClose && (
          <button type="button" className="chip lib-panel-close" onClick={onClose} aria-label="Close details">
            Close
          </button>
        )}
      </header>

      <EntityStatusStrip factId={statusFactId} character={character} />

      {verdict && (
        <p className={`entity-verdict ${verdict.kind}`} role="status">
          {verdict.line}
        </p>
      )}

      <div className="lib-panel-tabs" role="tablist">
        {(['stats', 'where', 'lore', 'related'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'chip on' : 'chip'}
            onClick={() => setTab(t)}
          >
            {t === 'stats' ? 'Stats' : t === 'where' ? 'Where' : t === 'lore' ? 'Lore' : 'Related'}
          </button>
        ))}
      </div>

      <div className="lib-panel-body">
        {tab === 'stats' && (
          <div className="lib-panel-stats">
            {isBoss && (
              <BossFacts
                factId={statusFactId}
                name={entity.name}
                region={entity.region}
                character={character}
              />
            )}

            {/* Task 107 §10: the Task 105 combat toolkit — best weapon, status
                procs, spirit ashes, buffs and the recommended-level verdict. */}
            {isBoss && <BossPrepCard bossId={statusFactId} character={character} />}

            {!isBoss && (requirementEntries.length > 0 || metValue !== null) && (
              <div className="lib-panel-block">
                <div className="kicker">Requirements</div>
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
                <div className="kicker">Scaling</div>
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
                <div className="kicker">Attack rating</div>
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

            {entity.weight !== undefined && (
              <div className="lib-panel-block">
                <div className="kicker">Weight</div>
                <p className="note">{entity.weight}</p>
              </div>
            )}

            {!isBoss && entity.stats && entity.stats.length > 0 && (
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

            {!isBoss && requirementEntries.length === 0 && !entity.attack?.length && !entity.stats?.length && !ar && entity.weight === undefined && (
              <p className="note">No structured stats in the data for this entry.</p>
            )}
          </div>
        )}

        {tab === 'where' && (
          <div className="lib-panel-where">
            {entity.where && <WikiText className="note" text={entity.where} />}
            {entity.region && (
              <p className="note">
                <strong>Region:</strong> {entity.region}
              </p>
            )}
            {!entity.where && !entity.region && <p className="note">No acquisition text in the data for this entry.</p>}
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
            {entity.lore ? (
              <SpoilerGate factId={statusFactId}>
                <WikiText className="note lib-lore-text" text={entity.lore} />
              </SpoilerGate>
            ) : (
              <p className="note">No lore text in the data for this entry.</p>
            )}
          </div>
        )}

        {tab === 'related' && (
          <div className="lib-panel-related">
            <Related id={entity.factId} />
          </div>
        )}
      </div>

      <footer className="lib-panel-actions">
        {isBoss && (
          <>
            {onOwnedChange && (
              <button
                type="button"
                className={isOwnedValue ? 'chip on' : 'chip'}
                aria-pressed={isOwnedValue}
                onClick={() => onOwnedChange(!isOwnedValue)}
              >
                {isOwnedValue ? 'Defeated ✓' : 'Mark defeated'}
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

        {!isBoss && !isNpc && !isGrace && (
          <>
            {onOwnedChange && (
              <button type="button" className={isOwnedValue ? 'chip on' : 'chip'} onClick={() => onOwnedChange(!isOwnedValue)}>
                {isOwnedValue ? 'Mark not owned' : 'Mark owned'}
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
            {onShowOnMap && (
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
