import wikiManifest from '../../public/sourced/wiki/manifest.json'
import { emptyCharacter } from '../data/seed'
import { allRecords, entityIndexReady, type EntityRecord } from './entityIndex'
import { allEntities, status, type EntityKind } from './entityGraph'
import { canonicalName, hasBadCasing, JUNK_NAME } from './canonicalNames'
import { kindStatus, NO_DATA, overlayEntity, trackActionLabel } from '../library/pageModel'
import { scenarioCharacter } from './__fixtures__/scenarios/urmummytoilet'
import type { Character } from '../types'
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
  | 'junk'
  | 'duplicate'

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
  junk: number
  duplicate: number
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
  const characters = fixed ? [emptyCharacter, scenarioCharacter()] : []
  if (entityIndexReady()) {
    for (const record of allRecords()) {
      const issues: PageIssue[] = []
      const name = fixed ? canonicalName(record.name) : record.name

      if (!hasPlayerText(record) && !record.image) issues.push('empty')

      if (fixed) {
        issues.push(...renderedIssues(record, characters))
      } else {
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

      rows.push({ id: record.id, kind: record.kind, name: fixed ? overlayEntity(record.id).name : name, issues })
    }
    if (fixed) {
      // Graph ids the app links to that have no index row still open a page.
      const indexed = new Set(rows.map((r) => r.id))
      for (const e of allEntities()) {
        if (indexed.has(e.id) || e.id.startsWith('wiki:')) continue
        const stub: EntityRecord = { id: e.id, kind: e.kind, name: e.name, sources: [] }
        const issues = renderedIssues(stub, characters)
        const lore = overlayEntity(e.id).lore
        if (!lore && !e.icon) issues.unshift('empty')
        rows.push({ id: e.id, kind: e.kind, name: overlayEntity(e.id).name, issues })
      }
    }
  }

  if (fixed) {
    // An NPC page with nothing of its own that shares a boss's name is the boss
    // filed twice. NPCs with a questline you also fight (Patches, Millicent) keep both.
    const bossNames = new Set(rows.filter((r) => r.kind === 'boss').map((r) => r.name.toLowerCase()))
    for (const row of rows) {
      if ((row.kind === 'npc' || row.kind === 'merchant') && row.issues.includes('empty') && bossNames.has(row.name.toLowerCase())) {
        row.issues.push('duplicate')
      }
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
      junk: 0,
      duplicate: 0,
    }
    entry.total += 1
    if (row.issues.length) entry.flagged += 1
    if (row.issues.includes('empty')) entry.empty += 1
    if (row.issues.includes('raw-id')) entry.rawId += 1
    if (row.issues.includes('bad-casing')) entry.badCasing += 1
    if (row.issues.includes('generic-status')) entry.genericStatus += 1
    if (row.issues.includes('wrong-actions')) entry.wrongActions += 1
    if (row.issues.includes('wiki-nav')) entry.wikiNav += 1
    if (row.issues.includes('junk')) entry.junk += 1
    if (row.issues.includes('duplicate')) entry.duplicate += 1
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


const TITLE_CASE_CONNECTIVE = /\s(?:Of|The|And|In|To|At|For|From)\s/

/**
 * Every rule checked against what the page actually renders: the overlay's
 * entity (name, region, lore), the kind status line for an empty and a mid-game
 * character, and the track button. This is the same code the panel runs.
 */
function renderedIssues(record: EntityRecord, characters: Character[]): PageIssue[] {
  const issues: PageIssue[] = []
  const kind = record.kind as EntityKind
  const entity = overlayEntity(record.id)
  const texts = [entity.name, entity.lore ?? '']
  let generic = false
  for (const character of characters) {
    const line = kindStatus(kind, status(record.id, character), entity, record, character)
    texts.push(line.label, line.why)
    if (!line.why.trim() || line.why === 'Available now.') generic = true
  }
  // A name shaped like an id segment ("Corhyn:goldmask") is a raw id too.
  const idShapedName = /^[A-Za-z]+:[a-z0-9]/.test(entity.name) && !/:\s/.test(entity.name)
  if (idShapedName || texts.some((t) => RAW_FACT_ID.test(stripLinks(t)) || ASSET_CODE.test(stripLinks(t)))) issues.push('raw-id')
  // The game's own spelling always wins ("Grovel For Mercy" is how the game writes it).
  const gameSpelling = canonicalName(entity.name.toLowerCase()) === entity.name
  if (
    entity.name === entity.name.toLowerCase() ||
    (TITLE_CASE_CONNECTIVE.test(entity.name) && !gameSpelling) ||
    hasBadCasing(entity.name)
  ) issues.push('bad-casing')
  if (generic || texts.some((t) => t.includes(NO_DATA))) issues.push('generic-status')
  const track = trackActionLabel(kind, false)
  if (track && /owned/i.test(track) && !OWNABLE.has(kind)) issues.push('wrong-actions')
  if (NAVIGATIONAL_BY_ENTITY.has(record.id)) issues.push('wiki-nav')
  if (JUNK_NAME.test(entity.name.trim())) issues.push('junk')
  return issues
}
