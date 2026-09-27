import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Character } from '../types'
import { regionMatches } from '../lib/areaHub'
import { areaFromFactId } from '../lib/areaContext'
import { normalizeName } from '../lib/fanImage'
import { applyFacts, denyFacts } from '../lib/infer'
import { weaponVerdict, type Verdict } from '../lib/verdict'
import { useLibraryCatalog } from './catalog'
import { CompareTray } from './CompareTray'
import { EntityPanel } from './EntityPanel'
import { GatheringNodes } from './GatheringNodes'
import {
  CATEGORIES,
  addToCompare,
  applyFilters,
  buildDeepLink,
  defaultFilter,
  isOwned,
  meetsRequirements,
  parseDeepLink,
  removeFromCompare,
  sortEntities,
  subtypesOf,
  weaponAr,
  weaponArAtMax,
  type CategoryId,
  type LibraryEntity,
  type LibraryFilter,
  type OwnershipFilter,
  type ScalingLetter,
  type SortDir,
  type SortKey,
} from './model'
import { useWorkspace } from '../state'
import './library.css'

// Task 107 §9: a phone shows one card per row, so 50 results overflowed the
// 4-screen budget. 30 keeps the grid scannable and the page short on any width.
const PAGE_SIZE = 30

/** Task 103 §2: the grid placeholder shown while the category dataset loads. */
function SkeletonGrid({ rows = 9 }: { rows?: number }) {
  return (
    <div className="lib-skel" role="status" aria-live="polite" aria-label="Loading entries">
      <span className="skel-label">Loading entries…</span>
      <div className="lib-grid">
        {Array.from({ length: rows }).map((_, i) => (
          <div className="lib-skel-card" key={i} aria-hidden>
            <span className="skel skel-thumb" />
            <span className="lib-skel-body">
              <span className="skel skel-line skel-line-sm" />
              <span className="skel skel-line" />
              <span className="skel skel-line skel-line-xs" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function activeFilterCount(filter: LibraryFilter): number {
  let n = 0
  if (filter.owned !== 'all') n++
  if (filter.meets) n++
  if (filter.subtypes.length) n++
  if (filter.damages.length) n++
  if (filter.scalingMin) n++
  if (filter.campaign !== 'all') n++
  return n
}

function cardStats(entity: LibraryEntity): string[] {
  const out: string[] = []
  if (entity.weight !== undefined) out.push(`${entity.weight} wt`)
  for (const stat of entity.stats ?? []) {
    out.push(`${stat.label}: ${stat.value}`)
    if (out.length >= 2) break
  }
  if (entity.attack?.length) out.push(`${entity.attack.map((a) => a.label).join('/')}`)
  return out.slice(0, 2)
}

function CategoryRail({
  active,
  counts,
  onSelect,
}: {
  active: CategoryId
  counts: Record<CategoryId, number>
  onSelect: (id: CategoryId) => void
}) {
  return (
    <nav className="lib-rail" aria-label="Library categories">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          className={c.id === active ? 'lib-rail-item on' : 'lib-rail-item'}
          onClick={() => onSelect(c.id)}
          aria-current={c.id === active}
        >
          <span className="lib-rail-mono" aria-hidden>{c.mono}</span>
          <span className="lib-rail-label">{c.label}</span>
          <span className="lib-rail-count">{counts[c.id] ?? 0}</span>
        </button>
      ))}
    </nav>
  )
}

const VERDICT_GLYPH: Record<Verdict['kind'], string> = { upgrade: '↑', 'side-grade': '≈', 'not-for-you': '↓' }

function EntityCard({
  entity,
  character,
  selected,
  verdict,
  onOpen,
}: {
  entity: LibraryEntity
  character: Character
  selected: boolean
  verdict?: Verdict | null
  onOpen: () => void
}) {
  const owned = isOwned(entity, character)
  const met = meetsRequirements(entity, character)
  const stats = cardStats(entity)
  return (
    <button
      type="button"
      className={selected ? 'lib-card on' : 'lib-card'}
      onClick={onOpen}
    >
      <span className="lib-card-thumb">
        {entity.icon ? (
          <img src={entity.icon} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="lib-card-mono" aria-hidden>{entity.name.slice(0, 2)}</span>
        )}
      </span>
      <span className="lib-card-body">
        <span className="lib-card-type">
          {entity.subtype ?? entity.category}
          {entity.dlc ? ' · DLC' : ''}
        </span>
        <span className="lib-card-name">{entity.name}</span>
        {stats.length > 0 && <span className="lib-card-stats">{stats.join(' · ')}</span>}
      </span>
      <span className="lib-card-flags">
        {verdict && (
          <span className={`lib-flag verdict verdict-${verdict.kind}`} title={verdict.line}>
            {VERDICT_GLYPH[verdict.kind]}
          </span>
        )}
        {owned && <span className="lib-flag owned" title="Owned">✓</span>}
        {met === false && <span className="lib-flag unmet" title="Requirements not met">✗</span>}
        {met === true && <span className="lib-flag met" title="Requirements met">●</span>}
      </span>
    </button>
  )
}

export function LibraryBrowser() {
  const w = useWorkspace()
  const { character, setCharacter } = w

  const [cat, setCat] = useState<CategoryId>('weapons')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<LibraryFilter>(() => defaultFilter())
  const [sort, setSort] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compare, setCompare] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [near, setNear] = useState(false)

  const catalog = useLibraryCatalog(cat)
  const { byCategory, weaponByName } = catalog
  const catEntities = byCategory[cat]

  const weapons = useMemo(() => [...new Set(weaponByName.values())], [weaponByName])

  // --- deep links + palette ------------------------------------------------
  useEffect(() => {
    function applyHash() {
      const link = parseDeepLink(window.location.hash)
      if (!link) return
      if (link.cat) setCat(link.cat)
      if (link.id) setSelectedId(link.id)
      if (link.q) setQ(link.q)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  useEffect(() => {
    const next = buildDeepLink(cat, selectedId, q || null)
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next)
    }
  }, [cat, selectedId, q])

  const paletteId = w.selectedMarkerId
  useEffect(() => {
    if (!paletteId) return
    const hit = catalog.entities.find(
      (e) => e.factId === paletteId || e.id === paletteId || normalizeName(e.name) === normalizeName(paletteId),
    )
    if (hit) {
      setCat(hit.category)
      setSelectedId(hit.id)
    }
  }, [paletteId, catalog.entities])

  // --- filtering / sorting -------------------------------------------------
  const arFor = useCallback(
    (entity: LibraryEntity): number | undefined => {
      if (!entity.weaponName) return undefined
      const weapon = weaponByName.get(normalizeName(entity.weaponName))
      if (!weapon) return undefined
      return weaponAr(weapon, character)
    },
    [weaponByName, character],
  )

  const filtered = useMemo(() => {
    const base = applyFilters(catEntities, { ...filter, q }, character)
    const area = w.currentArea?.region
    if (!near || !area) return base
    return base.filter((e) => regionMatches(e.region, area))
  }, [catEntities, filter, q, character, near, w.currentArea])

  const sorted = useMemo(
    () => sortEntities(filtered, sort, sortDir, { arFor }),
    [filtered, sort, sortDir, arFor],
  )

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  // Task 100 §3: the same advisor verdict the entity page shows, as a small card badge.
  const verdicts = useMemo(() => {
    const out = new Map<string, Verdict>()
    for (const e of pageRows) {
      if (!e.weaponName) continue
      const weapon = weaponByName.get(normalizeName(e.weaponName))
      if (weapon) out.set(e.id, weaponVerdict(character, weapons, weapon))
    }
    return out
  }, [pageRows, weaponByName, weapons, character])

  const subtypes = useMemo(() => subtypesOf(catEntities), [catEntities])
  const damageOptions = useMemo(() => {
    const set = new Set<string>()
    for (const e of catEntities) for (const a of e.attack ?? []) set.add(a.label)
    return [...set]
  }, [catEntities])
  const hasScaling = catEntities.some((e) => e.scaling && Object.keys(e.scaling).length > 0)
  const selected = useMemo(
    () => (selectedId ? catalog.entities.find((e) => e.id === selectedId) ?? null : null),
    [selectedId, catalog.entities],
  )
  const compareEntities = useMemo(
    () => compare.map((id) => catalog.entities.find((e) => e.id === id)).filter((e): e is LibraryEntity => Boolean(e)),
    [compare, catalog.entities],
  )
  const selectedAr = useMemo(() => {
    if (!selected?.weaponName) return null
    const weapon = weaponByName.get(normalizeName(selected.weaponName))
    if (!weapon) return null
    return { now: weaponAr(weapon, character), max: weaponArAtMax(weapon, character) }
  }, [selected, weaponByName, character])

  function selectCategory(id: CategoryId) {
    setCat(id)
    setSelectedId(null)
    setQ('')
    setFilter(defaultFilter())
    setPage(0)
  }

  function openEntity(entity: LibraryEntity) {
    setSelectedId(entity.id)
    setCat(entity.category)
  }

  function changeOwned(entity: LibraryEntity, owned: boolean) {
    if (owned) setCharacter(applyFacts(character, [entity.factId], 'answer', 'library'))
    else setCharacter(denyFacts(character, [entity.factId], 'library'))
  }

  const counts = useMemo(() => {
    const out = {} as Record<CategoryId, number>
    for (const c of CATEGORIES) out[c.id] = byCategory[c.id]?.length ?? 0
    return out
  }, [byCategory])

  const activeFilters = activeFilterCount(filter)
  const isEmpty = sorted.length === 0
  const showSkeleton = catalog.loading && isEmpty

  return (
    <div className="lib-browser">
      <div className="lib-layout">
        <CategoryRail active={cat} counts={counts} onSelect={selectCategory} />

        <div className="lib-main">
          <div className="lib-toolbar">
            <input
              className="lib-search"
              type="search"
              value={q}
              placeholder={`Search ${CATEGORIES.find((c) => c.id === cat)?.label ?? ''}…`}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(0)
              }}
              aria-label="Search within category"
            />

            <div className="lib-tools">
              <div className="lib-chipgroup" role="group" aria-label="Ownership">
                {(['all', 'owned', 'not'] as OwnershipFilter[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={filter.owned === o ? 'chip on' : 'chip'}
                    onClick={() => {
                      setFilter((f) => ({ ...f, owned: o }))
                      setPage(0)
                    }}
                  >
                    {o === 'all' ? 'All' : o === 'owned' ? 'Owned' : 'Not owned'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={filter.meets ? 'chip on' : 'chip'}
                onClick={() => {
                  setFilter((f) => ({ ...f, meets: !f.meets }))
                  setPage(0)
                }}
              >
                I meet requirements
              </button>

              <button
                type="button"
                className={near ? 'chip on' : 'chip'}
                aria-pressed={near}
                disabled={!w.currentArea}
                onClick={() => {
                  setNear((v) => !v)
                  setPage(0)
                }}
              >
                Near me
              </button>

              <div className="lib-chipgroup" role="group" aria-label="Campaign">
                {(['all', 'base', 'dlc'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={filter.campaign === c ? 'chip on' : 'chip'}
                    onClick={() => {
                      setFilter((f) => ({ ...f, campaign: c }))
                      setPage(0)
                    }}
                  >
                    {c === 'all' ? 'All' : c === 'base' ? 'Base' : 'DLC'}
                  </button>
                ))}
              </div>

              {hasScaling && (
                <div className="lib-chipgroup" role="group" aria-label="Minimum scaling">
                  <span className="lib-chipgroup-label">Scaling ≥</span>
                  {(['S', 'A', 'B', 'C', 'D'] as ScalingLetter[]).map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      className={filter.scalingMin === letter ? 'chip on' : 'chip'}
                      onClick={() => {
                        setFilter((f) => ({ ...f, scalingMin: f.scalingMin === letter ? null : letter }))
                        setPage(0)
                      }}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              )}

              <label className="lib-sort">
                Sort
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as SortKey)
                    setPage(0)
                  }}
                >
                  <option value="name">Name</option>
                  <option value="ar">AR at my stats</option>
                  <option value="weight">Weight</option>
                  <option value="requirement">Requirement</option>
                  <option value="region">Region</option>
                </select>
              </label>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                  setPage(0)
                }}
              >
                {sortDir === 'asc' ? 'Asc ↑' : 'Desc ↓'}
              </button>

              <div className="lib-chipgroup" role="group" aria-label="View">
                <button type="button" className={view === 'grid' ? 'chip on' : 'chip'} onClick={() => setView('grid')}>
                  Grid
                </button>
                <button type="button" className={view === 'table' ? 'chip on' : 'chip'} onClick={() => setView('table')}>
                  Table
                </button>
              </div>

              {(activeFilters > 0 || q || near) && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    setFilter(defaultFilter())
                    setQ('')
                    setNear(false)
                    setPage(0)
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {subtypes.length > 1 && (
              <div className="lib-subtypes" role="group" aria-label="Type filters">
                <button
                  type="button"
                  className={filter.subtypes.length === 0 ? 'chip on' : 'chip'}
                  onClick={() => setFilter((f) => ({ ...f, subtypes: [] }))}
                >
                  All types
                </button>
                {subtypes.map((s) => {
                  const on = filter.subtypes.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      onClick={() =>
                        setFilter((f) => ({
                          ...f,
                          subtypes: on ? f.subtypes.filter((x) => x !== s) : [...f.subtypes, s],
                        }))
                      }
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}

            {damageOptions.length > 0 && (
              <div className="lib-subtypes" role="group" aria-label="Damage types">
                <button
                  type="button"
                  className={filter.damages.length === 0 ? 'chip on' : 'chip'}
                  onClick={() => setFilter((f) => ({ ...f, damages: [] }))}
                >
                  All damage
                </button>
                {damageOptions.map((d) => {
                  const on = filter.damages.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      onClick={() =>
                        setFilter((f) => ({
                          ...f,
                          damages: on ? f.damages.filter((x) => x !== d) : [...f.damages, d],
                        }))
                      }
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="lib-resultbar">
            <span className="lib-count">
              {showSkeleton
                ? `Loading ${CATEGORIES.find((c) => c.id === cat)?.label ?? ''}…`
                : `${sorted.length} ${CATEGORIES.find((c) => c.id === cat)?.label ?? ''} · ${activeFilters} filters`}
            </span>
            {pageCount > 1 && (
              <span className="lib-pager">
                <button type="button" className="chip" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  Prev
                </button>
                <span>
                  Page {safePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  className="chip"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </button>
              </span>
            )}
          </div>

          <div className="lib-results">
            {showSkeleton ? (
              <SkeletonGrid />
            ) : isEmpty ? (
              <div className="lib-empty">
                <h3>Nothing in {CATEGORIES.find((c) => c.id === cat)?.label}</h3>
                <p className="note">
                  {catEntities.length === 0
                    ? 'This dataset is still loading or is not installed. Try another category.'
                    : 'No entries match the current search and filters.'}
                </p>
                <div className="lib-tiles">
                  {CATEGORIES.map((c) => (
                    <button key={c.id} type="button" className="lib-tile" onClick={() => selectCategory(c.id)}>
                      <span className="lib-rail-mono" aria-hidden>{c.mono}</span>
                      <span>{c.label}</span>
                      <span className="lib-rail-count">{counts[c.id] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : view === 'grid' ? (
              <div className="lib-grid">
                {pageRows.map((e) => (
                  <EntityCard
                    key={e.id}
                    entity={e}
                    character={character}
                    selected={e.id === selectedId}
                    verdict={verdicts.get(e.id) ?? null}
                    onOpen={() => openEntity(e)}
                  />
                ))}
              </div>
            ) : (
              <div className="lib-tablewrap">
                <table className="lib-table">
                  <thead>
                    <tr>
                      {(
                        [
                          ['name', 'Name'],
                          ['region', 'Region'],
                          ['weight', 'Weight'],
                          ['requirement', 'Req'],
                          ['ar', 'AR'],
                        ] as [SortKey, string][]
                      ).map(([key, label]) => (
                        <th key={key}>
                          <button
                            type="button"
                            onClick={() => {
                              if (sort === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                              else {
                                setSort(key)
                                setSortDir(key === 'name' || key === 'region' ? 'asc' : 'desc')
                              }
                            }}
                          >
                            {label}
                            {sort === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                          </button>
                        </th>
                      ))}
                      <th>Owned</th>
                      <th>Met</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((e) => {
                      const met = meetsRequirements(e, character)
                      return (
                        <tr
                          key={e.id}
                          className={e.id === selectedId ? 'on' : ''}
                          onClick={() => openEntity(e)}
                        >
                          <td>
                            {e.icon && <img className="lib-table-icon" src={e.icon} alt="" loading="lazy" decoding="async" />}
                            {e.name}
                          </td>
                          <td>{e.region ?? '—'}</td>
                          <td>{e.weight ?? '—'}</td>
                          <td>{e.requirements ? Object.entries(e.requirements).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ') : '—'}</td>
                          <td>{arFor(e) ?? '—'}</td>
                          <td>{isOwned(e, character) ? '✓' : ''}</td>
                          <td>{met === null ? '—' : met ? '✓' : '✗'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {cat === 'locations' && <GatheringNodes />}
          </div>
        </div>

        {selected && (
          <aside className="lib-detail">
            <EntityPanel
              entity={selected}
              character={character}
              ar={selectedAr}
              compareActive={compare.includes(selected.id)}
              onClose={() => setSelectedId(null)}
              onOwnedChange={(owned) => changeOwned(selected, owned)}
              onCompare={() => {
                setCompare((ids) => addToCompare(ids, selected.id))
                setCompareOpen(true)
              }}
              onEquip={() => w.setModule('build')}
              onAskGideon={() => {
                w.setQuery(selected.name)
                w.go('gideon')
              }}
              onSetGoal={() => {
                setCharacter({
                  ...character,
                  answers: { ...character.answers, gideonGoal: selected.factId },
                })
                w.go('journey', 'now')
              }}
              onQuestline={() => w.go('journey', 'quests')}
              onImHere={() => {
                const area = areaFromFactId(selected.factId)
                setCharacter(applyFacts(character, [selected.factId], 'answer', "I'm here"))
                if (area) {
                  w.setCurrentArea({ ...area, factId: selected.factId, source: 'map', at: Date.now() })
                }
              }}
              onShowOnMap={() => {
                w.setSelectedMarkerId(selected.factId)
                w.setModule('map')
              }}
            />
          </aside>
        )}
      </div>

      {compare.length > 0 && (
        <div className="lib-tray">
          {compareOpen ? (
            <CompareTray
              entities={compareEntities}
              character={character}
              weapons={weapons}
              onRemove={(id) => setCompare((ids) => removeFromCompare(ids, id))}
              onClear={() => setCompare([])}
              onClose={() => setCompareOpen(false)}
            />
          ) : (
            <div className="lib-compare-bar">
              <span className="lib-compare-label">Compare · {compare.length}/4</span>
              <div className="lib-compare-pins">
                {compareEntities.map((e) => (
                  <span key={e.id} className="chip on lib-compare-pin">
                    {e.name}
                    <button type="button" className="lib-pin-x" aria-label={`Remove ${e.name}`} onClick={() => setCompare((ids) => removeFromCompare(ids, e.id))}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="opts">
                <button type="button" className="chip" onClick={() => setCompareOpen(true)}>
                  Compare
                </button>
                <button type="button" className="chip" onClick={() => setCompare([])}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
