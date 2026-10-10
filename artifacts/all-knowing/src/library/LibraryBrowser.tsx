import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Character } from '../types'
import { regionMatches } from '../lib/areaHub'
import { areaFromFactId } from '../lib/areaContext'
import { fanImage, normalizeName } from '../lib/fanImage'
import { extraImage, brandCategoryIcon } from '../lib/extraImages'
import { applyFacts, denyFacts } from '../lib/infer'
import { weaponVerdict } from '../lib/weaponVerdict'
import type { Verdict } from '../lib/verdict'
import { useEnrichment } from '../lib/entityEnrich'
import { parseEntityHash } from '../lib/entityHash'
import type { EntityRecord } from '../lib/entityIndex'
import { useLibraryCatalog } from './catalog'
import { CompareTray } from './CompareTray'
import { EntityPanel } from './EntityPanel'
import { GatheringNodes } from './GatheringNodes'
import { WikiSearchResults } from './WikiSearchResults'
import { weaponAr, weaponArAtMax } from '../lib/weaponAr'
import { Term } from '../peek/Term'
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
  enemies: 'Godrick Soldier',
  materials: 'Golden Seed',
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
  enemies: <path d="M6 8c0-3 3-5 6-5s6 2 6 5v5a6 6 0 0 1-12 0zM9 11h.01M15 11h.01M9 15c1 .8 5 .8 6 0M3 9l3 1M21 9l-3 1" />,
  materials: <path d="M12 3c3 3 5 6 5 9a5 5 0 0 1-10 0c0-3 2-6 5-9zM12 12v9M9 18l3 3 3-3" />,
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

// Task 193 §4: the brand fallback each rail category falls back to when it has
// no representative entity picture (real pictures always win).
const CATEGORY_BRAND_KIND: Partial<Record<CategoryId, string>> = {
  npcs: 'npc',
  enemies: 'enemy',
  locations: 'region',
  mechanics: 'mechanic',
  guides: 'guide',
}

function CategoryIcon({ id }: { id: CategoryId }) {
  const name = CATEGORY_ICON_NAME[id]
  const src = (name ? fanImage(name) ?? extraImage(name) : undefined) ?? brandCategoryIcon(CATEGORY_BRAND_KIND[id])
  if (src) return <img className="lib-rail-icon" src={src} alt="" loading="lazy" decoding="async" />
  return <CategoryGlyph id={id} />
}

// Task 107 §9: a phone shows one card per row, so 50 results overflowed the
// 4-screen budget. 30 keeps the grid scannable and the page short on any width.
const PAGE_SIZE = 30

/** Short labels for the active sort chip. */
const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  ar: 'AR',
  weight: 'Weight',
  requirement: 'Req',
  region: 'Region',
}

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

function cardStats(entity: LibraryEntity, record?: EntityRecord): string[] {
  const out: string[] = []
  const stats = entity.stats?.length
    ? entity.stats
    : Object.entries(record?.stats ?? {}).map(([label, value]) => ({ label, value }))
  // Task 144 §1: weight is rendered once. An enriched "Weight" stat row next to
  // the `3 wt` chip used to read "3 wt · Weight: 3".
  const weightStat = stats.find((s) => s.label.trim().toLowerCase() === 'weight')
  const weight =
    entity.weight !== undefined
      ? entity.weight
      : weightStat
        ? Number.parseFloat(weightStat.value)
        : undefined
  if (weight !== undefined && Number.isFinite(weight)) out.push(`${weight} wt`)
  for (const stat of stats) {
    if (stat.label.trim().toLowerCase() === 'weight') continue
    out.push(`${stat.label}: ${stat.value}`)
    if (out.length >= 2) break
  }
  if (entity.attack?.length) out.push(`${entity.attack.map((a) => a.label).join('/')}`)
  return out.slice(0, 2)
}

function CategoryRail({
  active,
  counts,
  pending,
  onSelect,
}: {
  active: CategoryId
  counts: Record<CategoryId, number>
  pending: Set<CategoryId>
  onSelect: (id: CategoryId) => void
}) {
  // Hide a category only once its data has settled and it is genuinely empty;
  // a still-loading category keeps its slot (Task 137 §1, no empty categories).
  const visible = CATEGORIES.filter((c) => (counts[c.id] ?? 0) > 0 || c.id === active || pending.has(c.id))
  return (
    <nav className="lib-rail" aria-label="Library categories">
      {visible.map((c) => (
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
  if (verdict.kind === 'usable') return 'Usable'
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
  const record = useEnrichment(entity.factId)
  const owned = isOwned(entity, character)
  const met = meetsRequirements(entity, character)
  // Task 196 §3 — the "Needs N" requirement only shows once a character is set
  // up (stats known), and only as a small muted tag when it is unmet. The
  // verdict badge already says "Needs …" for a weapon, so avoid a twin.
  const unmet = met === false && character.source !== 'empty' && !verdict ? unmetBadge(entity, character) : null
  const stats = cardStats(entity, record)
  const icon = entity.icon ?? record?.image
  return (
    <button
      type="button"
      className={selected ? 'lib-card on' : 'lib-card'}
      onClick={onOpen}
    >
      <span className="lib-card-thumb">
        {icon ? (
          <img src={icon} alt="" loading="lazy" decoding="async" />
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
        {unmet && <span className="lib-tag unmet" title="Requirements not met">{unmet}</span>}
      </span>
    </button>
  )
}

/**
 * Task 196 §2 — one labelled group inside the Filters panel. The panel is the
 * only home for the filter controls now; the toolbar row stays a single line.
 */
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lib-filter-group">
      <h4 className="lib-filter-group-title">{title}</h4>
      <div className="lib-filter-group-body">{children}</div>
    </section>
  )
}

/**
 * Task 196 §2 — the whole filter set, as labelled sections in the Filters
 * panel. Nothing was dropped: ownership, requirements, near, type, damage,
 * campaign, scaling, sort and view are all still reachable here (the type is
 * also exposed as the one-row dropdown).
 */
export function FilterPanelBody({
  filter,
  subtypes,
  damageOptions,
  hasScaling,
  near,
  hasArea,
  sort,
  sortDir,
  view,
  updateFilter,
  onNear,
  onSort,
  onSortDir,
  onView,
}: {
  filter: LibraryFilter
  subtypes: string[]
  damageOptions: string[]
  hasScaling: boolean
  near: boolean
  hasArea: boolean
  sort: SortKey
  sortDir: SortDir
  view: 'grid' | 'table'
  updateFilter: (fn: (f: LibraryFilter) => LibraryFilter) => void
  onNear: () => void
  onSort: (key: SortKey) => void
  onSortDir: () => void
  onView: (v: 'grid' | 'table') => void
}) {
  return (
    <>
      <FilterGroup title="Ownership">
        <div className="lib-chipgroup" role="group" aria-label="Ownership">
          {(['all', 'owned', 'not'] as OwnershipFilter[]).map((o) => (
            <button
              key={o}
              type="button"
              className={filter.owned === o ? 'chip on' : 'chip'}
              onClick={() => updateFilter((f) => ({ ...f, owned: o }))}
            >
              {o === 'all' ? 'Any' : o === 'owned' ? 'Owned' : 'Not owned'}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Requirements">
        <button
          type="button"
          className={filter.meets ? 'chip on' : 'chip'}
          aria-pressed={filter.meets}
          onClick={() => updateFilter((f) => ({ ...f, meets: !f.meets }))}
        >
          I meet requirements
        </button>
        <button
          type="button"
          className={near ? 'chip on' : 'chip'}
          aria-pressed={near}
          disabled={!hasArea}
          onClick={onNear}
        >
          Near me
        </button>
      </FilterGroup>

      {subtypes.length > 1 && (
        <FilterGroup title="Type">
          <div className="lib-subtypes" role="group" aria-label="Type filters">
            <button
              type="button"
              className={filter.subtypes.length === 0 ? 'chip on' : 'chip'}
              onClick={() => updateFilter((f) => ({ ...f, subtypes: [] }))}
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
                    updateFilter((f) => ({
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
        </FilterGroup>
      )}

      {damageOptions.length > 0 && (
        <FilterGroup title="Damage type">
          <div className="lib-subtypes" role="group" aria-label="Damage types">
            <button
              type="button"
              className={filter.damages.length === 0 ? 'chip on' : 'chip'}
              onClick={() => updateFilter((f) => ({ ...f, damages: [] }))}
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
                    updateFilter((f) => ({
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
        </FilterGroup>
      )}

      <FilterGroup title="Campaign">
        <div className="lib-chipgroup" role="group" aria-label="Campaign">
          {(['all', 'base', 'dlc'] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={filter.campaign === c ? 'chip on' : 'chip'}
              onClick={() => updateFilter((f) => ({ ...f, campaign: c }))}
            >
              {c === 'all' ? 'All' : c === 'base' ? 'Base' : 'DLC'}
            </button>
          ))}
        </div>
      </FilterGroup>

      {hasScaling && (
        <FilterGroup title="Scaling ≥">
          <div className="lib-chipgroup" role="group" aria-label="Minimum scaling">
            {(['S', 'A', 'B', 'C', 'D'] as ScalingLetter[]).map((letter) => (
              <button
                key={letter}
                type="button"
                className={filter.scalingMin === letter ? 'chip on' : 'chip'}
                onClick={() =>
                  updateFilter((f) => ({ ...f, scalingMin: f.scalingMin === letter ? null : letter }))
                }
              >
                {letter}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Sort">
        <label className="lib-sort">
          <span className="sr-only">Sort by</span>
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
          >
            <option value="name">Name</option>
            <option value="ar">AR at my stats</option>
            <option value="weight">Weight</option>
            <option value="requirement">Requirement</option>
            <option value="region">Region</option>
          </select>
        </label>
        <button type="button" className="chip" onClick={onSortDir}>
          {sortDir === 'asc' ? 'Asc ↑' : 'Desc ↓'}
        </button>
      </FilterGroup>

      <FilterGroup title="View">
        <div className="lib-chipgroup" role="group" aria-label="View">
          <button type="button" className={view === 'grid' ? 'chip on' : 'chip'} onClick={() => onView('grid')}>
            Grid
          </button>
          <button type="button" className={view === 'table' ? 'chip on' : 'chip'} onClick={() => onView('table')}>
            Table
          </button>
        </div>
      </FilterGroup>
    </>
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

  const catalog = useLibraryCatalog(cat, true)
  const { byCategory, weaponByName, pending } = catalog
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
    // Task 144 §1 — keep any open entity overlay's `?e=` when the Library writes
    // its own cat/id/q deep link, so the writer never drops a deep-linked page.
    const entity = parseEntityHash(window.location.hash)
    const next = buildDeepLink(cat, selectedId, q || null, entity)
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
    return !near || !area ? base : base.filter((e) => regionMatches(e.region, area))
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

  // Task 196 §2 — one toolbar row for every viewport: search, the category's
  // type filter as a dropdown, and a Filters button. Every other control lives
  // in the Filters panel; the active ones echo below as small removable chips.
  const updateFilter = useCallback((fn: (f: LibraryFilter) => LibraryFilter) => {
    setFilter(fn)
    setPage(0)
  }, [])

  const typeValue = filter.subtypes.length === 1 ? filter.subtypes[0] : ''

  const activeChips: { key: string; label: string; onRemove: () => void }[] = []
  if (filter.owned !== 'all') {
    activeChips.push({
      key: 'owned',
      label: filter.owned === 'owned' ? 'Owned' : 'Not owned',
      onRemove: () => updateFilter((f) => ({ ...f, owned: 'all' })),
    })
  }
  if (filter.meets) {
    activeChips.push({ key: 'meets', label: 'Meets reqs', onRemove: () => updateFilter((f) => ({ ...f, meets: false })) })
  }
  if (near) {
    activeChips.push({ key: 'near', label: 'Near me', onRemove: () => { setNear(false); setPage(0) } })
  }
  for (const s of filter.subtypes) {
    activeChips.push({
      key: `type:${s}`,
      label: s,
      onRemove: () => updateFilter((f) => ({ ...f, subtypes: f.subtypes.filter((x) => x !== s) })),
    })
  }
  if (filter.campaign !== 'all') {
    activeChips.push({
      key: 'campaign',
      label: filter.campaign === 'dlc' ? 'DLC' : 'Base',
      onRemove: () => updateFilter((f) => ({ ...f, campaign: 'all' })),
    })
  }
  if (filter.scalingMin) {
    activeChips.push({
      key: 'scaling',
      label: `Scaling ≥ ${filter.scalingMin}`,
      onRemove: () => updateFilter((f) => ({ ...f, scalingMin: null })),
    })
  }
  for (const d of filter.damages) {
    activeChips.push({
      key: `dmg:${d}`,
      label: d,
      onRemove: () => updateFilter((f) => ({ ...f, damages: f.damages.filter((x) => x !== d) })),
    })
  }
  if (sort !== 'name' || sortDir !== 'asc') {
    activeChips.push({
      key: 'sort',
      label: `${SORT_LABELS[sort]} ${sortDir === 'asc' ? '↑' : '↓'}`,
      onRemove: () => { setSort('name'); setSortDir('asc'); setPage(0) },
    })
  }

  const filterButtonCount = activeFilterCount(filter) + (near ? 1 : 0)

  function changeSort(key: SortKey) {
    setSort(key)
    setPage(0)
  }

  function flipSortDir() {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    setPage(0)
  }

  function toggleNear() {
    setNear((v) => !v)
    setPage(0)
  }

  return (
    <div className="lib-browser">
      <div className="lib-layout">
        <CategoryRail active={cat} counts={counts} pending={pending} onSelect={selectCategory} />

        <div className="lib-main">
          <div className="lib-toolbar">
            <div className="lib-toolbar-row">
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

              {subtypes.length > 1 && (
                <label className="lib-type">
                  <span className="sr-only">Type</span>
                  <select
                    className="lib-type-select"
                    aria-label="Type"
                    value={typeValue}
                    onChange={(e) =>
                      updateFilter((f) => ({ ...f, subtypes: e.target.value ? [e.target.value] : [] }))
                    }
                  >
                    <option value="">All types</option>
                    {subtypes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <button
                type="button"
                className={filterButtonCount > 0 ? 'chip on lib-filters-btn' : 'chip lib-filters-btn'}
                aria-expanded={filtersOpen}
                aria-label="Filters"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                Filters{filterButtonCount > 0 ? ` (${filterButtonCount})` : ''}
              </button>
            </div>

            {activeChips.length > 0 && (
              <div className="lib-activefilters" aria-label="Active filters">
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className="lib-activechip"
                    title={`Remove ${c.label}`}
                    onClick={c.onRemove}
                  >
                    {c.label}
                    <span aria-hidden="true"> ×</span>
                  </button>
                ))}
                <button type="button" className="lib-activechip clear" onClick={clearFilters}>
                  Clear all
                </button>
              </div>
            )}
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
                <div className="lib-filters-scroll">
                  <FilterPanelBody
                    filter={filter}
                    subtypes={subtypes}
                    damageOptions={damageOptions}
                    hasScaling={hasScaling}
                    near={near}
                    hasArea={Boolean(w.currentArea)}
                    sort={sort}
                    sortDir={sortDir}
                    view={view}
                    updateFilter={updateFilter}
                    onNear={toggleNear}
                    onSort={changeSort}
                    onSortDir={flipSortDir}
                    onView={setView}
                  />
                </div>
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

          {/* Task 133 §3 — full-text wiki results alongside the category rows. */}
          {q.trim().length >= 3 && (
            <div className="lib-wiki">
              <WikiSearchResults query={q} onPick={(id) => w.openEntity(id)} />
            </div>
          )}

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
                            {key === 'ar' ? (
                              <Term id="mechanic:attack-rating">{label}</Term>
                            ) : key === 'requirement' ? (
                              <Term id="mechanic:stat-requirements">{label}</Term>
                            ) : key === 'weight' ? (
                              <Term id="mechanic:equip-load">{label}</Term>
                            ) : (
                              label
                            )}
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
              onShowOnMap={() => w.focusOnMap(selected.factId)}
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
