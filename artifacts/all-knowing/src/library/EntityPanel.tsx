import { useState } from 'react'
import { Related } from '../Related'
import { WikiText } from '../WikiText'
import type { Character } from '../types'
import { attributeStats, isOwned, meetsRequirements, type AttributeKey, type LibraryEntity } from './model'

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
  /** Overrides; when omitted they are derived from `character`. */
  owned?: boolean
  requirementsMet?: boolean | null
  /** AR at the character's stats, when the host can resolve the weapon row. */
  ar?: { now: number; max: number } | null
  compareActive?: boolean
  onClose?: () => void
  onOwnedChange?: (owned: boolean) => void
  onCompare?: () => void
  onEquip?: () => void
  onAskGideon?: () => void
  onShowOnMap?: () => void
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
  owned,
  requirementsMet,
  ar,
  compareActive,
  onClose,
  onOwnedChange,
  onCompare,
  onEquip,
  onAskGideon,
  onShowOnMap,
}: EntityPanelProps) {
  const [tab, setTab] = useState<Tab>('stats')
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
      </footer>
    </section>
  )
}
