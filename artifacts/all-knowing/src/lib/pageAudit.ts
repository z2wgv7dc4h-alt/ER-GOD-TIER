import wikiManifest from '../../public/sourced/wiki/manifest.json'
import { emptyCharacter } from '../data/seed'
import { allRecords, entityIndexReady, type EntityRecord } from './entityIndex'
import { status, type EntityKind } from './entityGraph'
import { canonicalName, hasBadCasing } from './canonicalNames'
import { isNavigationalWikiPage } from './wikiSearch'

/**
 * Task 144 §4 — the systematic entity-page sweep.
 *
 * `scripts/page-audit.mjs` loads this through Vite's SSR transform and writes
 * `docs/PAGE-AUDIT.md`. It walks every record in the build-time entity index
 * (all kinds) and flags the same classes of fault the live play-test found:
 * empty pages, raw ids / asset codes in player text, wrong casing, generic
 * status lines, actions that do not fit the kind, and a name that resolves to a
 * wiki navigation page.
 *
 * `auditPages({ fixed: false })` reproduces the pre-Task-144 behaviour so the
 * report can show an honest before/after count.
 */

export type PageIssue =
  | 'empty'
  | 'raw-id'
  | 'bad-casing'
  | 'generic-status'
  | 'wrong-actions'
  | 'wiki-nav'
  | 'unreachable'

export type PageAuditRow = {
  id: string
  kind: string
  name: string
  issues: PageIssue[]
}

export type KindAudit = {
  kind: string
  total: number
  flagged: number
  empty: number
  rawId: number
  badCasing: number
  genericStatus: number
  wrongActions: number
  wikiNav: number
}

export type PageAuditReport = {
  fixed: boolean
  total: number
  flagged: number
  byKind: KindAudit[]
  empties: PageAuditRow[]
  flaggedRows: PageAuditRow[]
}

// Raw fact ids and map asset codes must never reach player text.
const RAW_FACT_ID = /\b(?:item|boss|grace|region|npc|quest|dungeon|merchant|enemy|weapon|armor|talisman|spell|ash|spirit|material|mapfrag|hunt|gate|build|mechanic|line|invader|area|point|loot|shop|frag|wiki):[a-z0-9][a-z0-9-]*\b/
const ASSET_CODE = /\bAEG\d{3}[_-]\w+\b|\b[a-z]\d{2}_\d{2}_\d{2}_\d{2}\b/

/** Kinds a "Mark owned" action is valid for; the rest must not get one. */
const OWNABLE = new Set<EntityKind>(['item', 'weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'material'])

const NAVIGATIONAL_BY_ENTITY = (() => {
  const map = new Set<string>()
  const doc = wikiManifest as { byEntity?: Record<string, string | number>; pages: Record<string, { title: string; entityId: string }> }
  for (const [entityId, pageId] of Object.entries(doc.byEntity ?? {})) {
    const page = doc.pages[String(pageId)]
    if (page && isNavigationalWikiPage(page)) map.add(entityId)
  }
  return map
})()

function stripLinks(text: string): string {
  return text.replace(/\[\[[^\]]*\]\]/g, ' ').replace(/\[\[[^\]]*\|([^\]]+)\]\]/g, '$1')
}

function textFields(record: EntityRecord): string[] {
  const out: string[] = []
  if (record.description) out.push(record.description)
  if (record.location) out.push(record.location)
  if (record.strategy) out.push(record.strategy)
  if (record.name) out.push(record.name)
  for (const s of record.sections ?? []) out.push(s.heading, s.text)
  for (const d of record.drops ?? []) out.push(d)
  for (const v of Object.values(record.stats ?? {})) out.push(String(v))
  return out
}

function hasPlayerText(record: EntityRecord): boolean {
  return Boolean(
    record.description ||
      record.location ||
      record.strategy ||
      (record.stats && Object.keys(record.stats).length) ||
      (record.sections && record.sections.length) ||
      (record.drops && record.drops.length),
  )
}

/** The page data the panel renders for a record, normalised for audit/tests. */
export function pageDataFor(record: EntityRecord, fixed = true) {
  const name = fixed ? canonicalName(record.name) : record.name
  const info = status(record.id, { ...emptyCharacter, collectedItems: [] })
  return {
    id: record.id,
    kind: record.kind,
    name,
    description: record.description ?? '',
    location: record.location ?? '',
    stats: record.stats ?? {},
    sections: record.sections ?? [],
    drops: record.drops ?? [],
    strategy: record.strategy ?? '',
    status: info.state,
    why: info.why,
  }
}

export function auditPages(opts: { fixed?: boolean } = {}): PageAuditReport {
  const fixed = opts.fixed ?? true
  const rows: PageAuditRow[] = []
  if (entityIndexReady()) {
    for (const record of allRecords()) {
      const issues: PageIssue[] = []
      const name = fixed ? canonicalName(record.name) : record.name

      if (!hasPlayerText(record) && !record.image) issues.push('empty')

      if (!fixed) {
        for (const field of textFields(record)) {
          const text = stripLinks(field)
          if (RAW_FACT_ID.test(text) || ASSET_CODE.test(text)) {
            issues.push('raw-id')
            break
          }
        }
        if (hasBadCasing(name)) issues.push('bad-casing')
        const info = status(record.id, emptyCharacter)
        const kind = record.kind as EntityKind
        if (info.why === 'Available now.' && !OWNABLE_REFERENCE.has(kind)) issues.push('generic-status')
        if (INVALID_ACTION_KINDS.has(kind)) issues.push('wrong-actions')
        if (NAVIGATIONAL_BY_ENTITY.has(record.id)) issues.push('wiki-nav')
      }

      rows.push({ id: record.id, kind: record.kind, name, issues })
    }
  }

  const byKind = new Map<string, KindAudit>()
  for (const row of rows) {
    const entry = byKind.get(row.kind) ?? {
      kind: row.kind,
      total: 0,
      flagged: 0,
      empty: 0,
      rawId: 0,
      badCasing: 0,
      genericStatus: 0,
      wrongActions: 0,
      wikiNav: 0,
    }
    entry.total += 1
    if (row.issues.length) entry.flagged += 1
    if (row.issues.includes('empty')) entry.empty += 1
    if (row.issues.includes('raw-id')) entry.rawId += 1
    if (row.issues.includes('bad-casing')) entry.badCasing += 1
    if (row.issues.includes('generic-status')) entry.genericStatus += 1
    if (row.issues.includes('wrong-actions')) entry.wrongActions += 1
    if (row.issues.includes('wiki-nav')) entry.wikiNav += 1
    byKind.set(row.kind, entry)
  }

  return {
    fixed,
    total: rows.length,
    flagged: rows.filter((r) => r.issues.length).length,
    byKind: [...byKind.values()].sort((a, b) => b.total - a.total || a.kind.localeCompare(b.kind)),
    empties: rows.filter((r) => r.issues.includes('empty')),
    flaggedRows: rows.filter((r) => r.issues.length),
  }
}

const OWNABLE_REFERENCE = new Set<EntityKind>([
  ...OWNABLE,
  'mechanic',
  'merchant',
  'build',
  'quest',
])

/** Kinds the old generic action footer gave a bogus "Mark owned" to. */
const INVALID_ACTION_KINDS = new Set<EntityKind>(['region', 'dungeon', 'grace', 'npc', 'merchant'])
