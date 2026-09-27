import { useMemo, useState } from 'react'
import type { Remembrance } from '../knowledge/remembrances'
import { status, type EntityState } from '../lib/entityGraph'
import type { RemembranceOption } from '../lib/remembranceChoice'
import type { Verdict } from '../lib/verdict'
import { Related } from '../Related'
import { WikiText } from '../WikiText'
import type { Character } from '../types'
import { attributeStats, isOwned, meetsRequirements, type AttributeKey, type LibraryEntity } from './model'

const STATUS_LABELS: Record<EntityState, string> = {
  done: 'Done',
  owned: 'Owned',
  available: 'Available',
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
}: EntityPanelProps) {
  const [tab, setTab] = useState<Tab>('stats')
  const statusFactId = factId ?? entity.factId
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
          <h2>{entity.name}</h2>
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
            {(requirementEntries.length > 0 || metValue !== null) && (
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

            {requirementEntries.length === 0 && !entity.attack?.length && !entity.stats?.length && !ar && entity.weight === undefined && (
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
            {entity.lore ? <WikiText className="note lib-lore-text" text={entity.lore} /> : <p className="note">No lore text in the data for this entry.</p>}
          </div>
        )}

        {tab === 'related' && (
          <div className="lib-panel-related">
            <Related id={entity.factId} />
          </div>
        )}
      </div>

      <footer className="lib-panel-actions">
        {onOwnedChange && (
          <button type="button" className={isOwnedValue ? 'chip on' : 'chip'} onClick={() => onOwnedChange(!isOwnedValue)}>
            {isOwnedValue ? 'Mark not owned' : 'Mark owned'}
          </button>
        )}
        {onCompare && (
          <button type="button" className={compareActive ? 'chip on' : 'chip'} onClick={onCompare}>
            {compareActive ? 'Pinned to compare' : 'Compare'}
          </button>
        )}
        {onEquip && (
          <button type="button" className="chip" onClick={onEquip}>
            Equip (opens Gear)
          </button>
        )}
        {onAskGideon && (
          <button type="button" className="chip" onClick={onAskGideon}>
            Ask Gideon
          </button>
        )}
        {onSetGoal && (
          <button type="button" className="chip" onClick={onSetGoal}>
            Set as goal
          </button>
        )}
      </footer>
    </section>
  )
}
