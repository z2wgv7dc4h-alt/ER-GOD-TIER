import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Character } from '../types'
import { regionMatches } from '../lib/areaHub'
import { areaFromFactId } from '../lib/areaContext'
import { fanImage, normalizeName } from '../lib/fanImage'
import { applyFacts, denyFacts } from '../lib/infer'
import { weaponVerdict, type Verdict } from '../lib/verdict'
import { useLibraryCatalog } from './catalog'
import { CompareTray } from './CompareTray'
import { EntityPanel } from './EntityPanel'
import { GatheringNodes } from './GatheringNodes'
import {
  attributeStats,
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
  type AttributeKey,
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

/**
 * Task 108 §4 — the category rail shows a real picture, not a monogram. Each
 * category names a representative entity that the FanAPI image plane has a
 * cached thumbnail for; `fanImage` resolves it from `image-index.json`. Every
 * category also has an inline SVG glyph, used when a dataset/image is missing
 * (and for entity cards) — never a 1–2 letter circle.
 */
const CATEGORY_ICON_NAME: Partial<Record<CategoryId, string>> = {
  weapons: 'Longsword',
  shields: 'Heater Shield',
  armor: 'Vagabond Knight Helm',
  talismans: 'Erdtree Favor',
  sorceries: 'Glintstone Pebble',
  incantations: 'Lightning Spear',
  ashes: 'Ash of War: Storm Stomp',
  spirits: 'Mimic Tear Ashes',
  items: 'Flask of Crimson Tears',
  bosses: 'Starscourge Radahn',
  npcs: 'Melina',
  recipes: 'Missionary Cookbook 1',
  secrets: 'Stonesword Key',
}

const GLYPH: Record<CategoryId, ReactNode> = {
  weapons: <path d="M6 18 18 6M4 14l6 6M16 7l2-2-1 4z" />,
  shields: <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />,
  armor: <path d="M6 13a6 6 0 0 1 12 0v6H6zM9 19v-3a3 3 0 0 1 6 0v3" />,
  talismans: <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
  sorceries: <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />,
  incantations: <path d="M12 3c2 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-5 0 2 1 3 2 3 0-3-1-4 1-7z" />,
  ashes: <path d="M20 12a8 8 0 1 1-3-6M20 4v5h-5" />,
  spirits: <path d="M6 20v-9a6 6 0 0 1 12 0v9l-3-2-3 2-3-2zM10 11h.01M14 11h.01" />,
  items: <path d="M10 3h4v4l3 4v7a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3v-7l3-4zM7 14h10" />,
  bosses: <path d="M4 17l2-9 4 4 2-6 2 6 4-4 2 9zM4 17h16" />,
  npcs: <path d="M12 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM5 20a7 7 0 0 1 14 0" />,
  locations: <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />,
  recipes: <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" />,
  secrets: <path d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM11.5 11.5 20 20M17 17l2 2M14 14l2 2" />,
  guides: <path d="M12 6c-2-1.5-4.5-2-8-2v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V4c-3.5 0-6 .5-8 2zM12 6v14" />,
  mechanics: <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />,
  dialogue: <path d="M4 5h16v11H9l-5 4z" />,
}

function CategoryGlyph({
  id,
  className = 'lib-rail-glyph',
  size = 22,
}: {
  id: CategoryId
  className?: string
  size?: number
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {GLYPH[id] ?? GLYPH.items}
    </svg>
  )
}

function CategoryIcon({ id }: { id: CategoryId }) {
  const name = CATEGORY_ICON_NAME[id]
  const src = name ? fanImage(name) : undefined
  if (src) return <img className="lib-rail-icon" src={src} alt="" loading="lazy" decoding="async" />
  return <CategoryGlyph id={id} />
}

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
          <CategoryIcon id={c.id} />
          <span className="lib-rail-label">{c.label}</span>
          <span className="lib-rail-count">{counts[c.id] ?? 0}</span>
        </button>
      ))}
    </nav>
  )
}

/**
 * Task 109 §2 — readable word badges, never symbol-only. The stored verdict
 * `line` is the full sentence; the card gets the short form.
 */
function verdictBadge(verdict: Verdict): string {
  if (verdict.kind === 'upgrade') {
    return verdict.gainPct != null ? `Upgrade +${verdict.gainPct}%` : 'Upgrade'
  }
  if (verdict.kind === 'side-grade') return 'Side-grade'
  const need = verdict.line.match(/needs\s+([0-9]+\s+[A-Z]+)/i)
  return need ? `Needs ${need[1].toUpperCase()}` : 'Not for you'
}

/** The first unmet requirement, as a readable "Needs 20 INT". */
function unmetBadge(entity: LibraryEntity, character: Character): string | null {
  if (!entity.requirements) return null
  const attrs = attributeStats(character)
  for (const [key, value] of Object.entries(entity.requirements) as [AttributeKey, number][]) {
    if ((value ?? 0) > 0 && attrs[key] < value) return `Needs ${value} ${key.toUpperCase()}`
  }
  return null
}

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
  // The verdict badge already says "Needs …" for an unmet weapon; avoid a twin.
  const unmet = met === false && !verdict ? unmetBadge(entity, character) : null
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
          <CategoryGlyph id={entity.category} className="lib-card-glyph" size={20} />
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
            {verdictBadge(verdict)}
          </span>
        )}
        {owned && <span className="lib-flag owned" title="Owned">Owned ✓</span>}
        {unmet && <span className="lib-flag unmet" title="Requirements not met">{unmet}</span>}
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
  // Task 109 §1: on a phone the type/damage/campaign facets move into a bottom
  // sheet so the toolbar stays one clean row.
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  function clearFilters() {
    setFilter(defaultFilter())
    setQ('')
    setNear(false)
    setPage(0)
  }

  // Task 109 §1: the type / damage / campaign / scaling facets. Rendered inline
  // on desktop and inside the phone Filters sheet — one definition, no drift.
  const facetControls = (
    <>
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
    </>
  )

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

              {facetControls}

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

            {/* Task 109 §1: the phone toolbar is search + one row. The owned
                dropdown, requirement/near toggles, a Filters sheet opener and
                Sort. Facets live in the sheet below. */}
            <div className="lib-phone-tools" role="group" aria-label="Library filters">
              <label className="lib-sort">
                <span className="sr-only">Ownership</span>
                <select
                  aria-label="Ownership"
                  value={filter.owned}
                  onChange={(e) => {
                    setFilter((f) => ({ ...f, owned: e.target.value as OwnershipFilter }))
                    setPage(0)
                  }}
                >
                  <option value="all">Owned: All</option>
                  <option value="owned">Owned: Yes</option>
                  <option value="not">Owned: No</option>
                </select>
              </label>
              <button
                type="button"
                aria-label="I meet requirements"
                className={filter.meets ? 'chip on' : 'chip'}
                aria-pressed={filter.meets}
                onClick={() => {
                  setFilter((f) => ({ ...f, meets: !f.meets }))
                  setPage(0)
                }}
              >
                I meet reqs
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
              <button
                type="button"
                className={activeFilters > 0 ? 'chip on' : 'chip'}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen(true)}
              >
                Filters ({activeFilters})
              </button>
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
            </div>
          </div>

          {filtersOpen && (
            <div
              className="lib-filters-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Library filters"
              onClick={() => setFiltersOpen(false)}
            >
              <div className="lib-filters-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="lib-filters-head">
                  <span className="kicker">Filters · {sorted.length} results</span>
                  <button type="button" className="chip" onClick={() => setFiltersOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="lib-filters-scroll">{facetControls}</div>
                <div className="lib-filters-foot">
                  <button type="button" className="chip" onClick={clearFilters}>
                    Clear all
                  </button>
                  <button type="button" className="chip on" onClick={() => setFiltersOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

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
                      <CategoryIcon id={c.id} />
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
