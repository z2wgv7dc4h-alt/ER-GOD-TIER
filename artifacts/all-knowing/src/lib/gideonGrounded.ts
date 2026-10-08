import { generatedAliases } from './aliases'
import { allRecords, entityIndexReady, setEntityIndex, type EntityRecord } from './entityIndex'
import { bandFor, type RegionLevel } from './regionLevels'
import type { GideonAct } from './gideon'
import type { ModuleId } from '../types'

// ---------------------------------------------------------------------------
// Task 178 — runtime source fallbacks.
//
// The 172–177 data cleanup moved real text out of the entity-index fields it
// used to sit in: acquisition prose was stripped from `location`, and a region
// page's parent description was replaced by its bare parent label. The text
// still ships in the sourced dumps, so the grounded layer reads it from there
// (on disk, never re-added to the index). Sources are loaded once, only on the
// no-key path, through `preloadGroundedSources`.
// ---------------------------------------------------------------------------

type AcqRow = { name: string; location: string; near: string }
let acqRows: AcqRow[] | null = null
let wikiSections: { page: string; heading: string; text: string }[] | null = null
let checklistBossRows: { name: string; drops: string[] }[] | null = null
let encounterRows: { page: string; tab: string; drops: string[] }[] | null = null
let regionRows: { title: string; location: string }[] | null = null

async function fetchJson(url: string): Promise<unknown> {
  try {
    const r = await fetch(url)
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

/** Load the sourced dumps the grounded answers may need. Safe to call often. */
export async function preloadGroundedSources(question: string): Promise<void> {
  const jobs: Promise<void>[] = []
  if (!acqRows) {
    jobs.push(
      fetchJson('/sourced/open/acquisition.json').then((d) => {
        acqRows = (d as { rows?: AcqRow[] } | null)?.rows ?? []
      }),
    )
  }
  if (!checklistBossRows) {
    jobs.push(
      fetchJson('/sourced/checklists/bosses.json').then((d) => {
        checklistBossRows = (Array.isArray(d) ? d : []) as { name: string; drops: string[] }[]
      }),
    )
  }
  if (!encounterRows) {
    jobs.push(
      fetchJson('/sourced/open/wiki-db/boss-encounters.json').then((d) => {
        encounterRows = (d as { encounters?: { page: string; tab: string; drops: string[] }[] } | null)?.encounters ?? []
      }),
    )
  }
  if (!regionRows) {
    jobs.push(
      fetchJson('/sourced/open/wiki-db/region.json').then((d) => {
        regionRows = (d as { records?: { title: string; location: string }[] } | null)?.records ?? []
      }),
    )
  }
  // The wiki prose dump is heavy; only pull it in for questions that may need
  // it (a place, an acquisition, a drop or a lore ask).
  const wantsProse =
    /\b(lore|who is|why|story|canon|where|location|locate|how (do|to|can) i? ?(get|reach|find|obtain|acquire)|drops?|get to|reach)\b/i.test(
      question,
    )
  if (wantsProse && !wikiSections) {
    jobs.push(
      fetchJson('/sourced/open/wiki-sections.json').then((d) => {
        wikiSections = (d as { sections?: { page: string; heading: string; text: string }[] } | null)?.sections ?? []
      }),
    )
  }
  await Promise.all(jobs)
}

/** Strip markdown/labels from an acquisition paragraph for a spoken answer. */
function cleanAcqText(s: string): string {
  return s
    .replace(/\*+/g, '')
    .replace(
      /^(?:Location|Loot|Guaranteed Drops?|Dragon Communion|Reward|Source|Drop|Quest Item|Remembrance Item|Purchase|Quest|Defeat|Trade)\s*:\s*/i,
      '',
    )
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** The acquisition dump's paragraph for an item, when one is on file. */
function acquisitionText(record: EntityRecord): string {
  if (!acqRows) return ''
  const n = fold(record.name)
  const row = acqRows.find((r) => fold(r.name) === n)
  if (!row) return ''
  return cleanAcqText(row.location || row.near || '')
}

/** Raw drop rows the cleaned index dropped, from the checklist/encounter dumps. */
function extraBossDrops(record: EntityRecord): string[] {
  const out: string[] = []
  const n = fold(record.name)
  for (const row of checklistBossRows ?? []) {
    if (fold(row.name) === n) out.push(...(row.drops ?? []))
  }
  for (const e of encounterRows ?? []) {
    const tab = fold(e.tab)
    if (tab && n.includes(tab)) out.push(...(e.drops ?? []))
  }
  return out
}

/** A region page's parent description from the wiki-db dump, when it adds text. */
function regionDescription(record: EntityRecord): string {
  if (record.kind !== 'region' || !regionRows) return ''
  const n = fold(record.name)
  const row = regionRows.find((r) => fold(r.title) === n)
  if (!row || !row.location) return ''
  const loc = fold(row.location)
  if (loc.length < 4 || fold(record.location ?? '').includes(loc)) return ''
  return row.location
}

/** The best wiki passage for a record, page/heading/body substring. */
function wikiFor(record: EntityRecord): string {
  if (!wikiSections) return ''
  const n = fold(record.name)
  if (n.length < 4) return ''
  let best: { text: string; score: number } | null = null
  for (const s of wikiSections) {
    const page = fold(s.page)
    const heading = fold(s.heading)
    const text = fold(s.text)
    let score = 0
    if (page === n) score += 5
    else if (page.includes(n)) score += 3
    if (heading.includes(n)) score += 2
    else if (text.includes(n)) score += 1
    if (score > 0 && (!best || score > best.score)) best = { text: s.text, score }
  }
  return best ? best.text.replace(/\s+/g, ' ').trim() : ''
}

/**
 * Legacy engine ids that canonicalise onto a record's id (a `region:` id that
 * was folded onto its `dungeon:` page). Answers link them so a caller holding
 * the old id still recognises the entity.
 */
let legacyIdsBySlug: Map<string, string[]> | null = null
function legacyIdsFor(id: string): string[] {
  if (!legacyIdsBySlug) {
    legacyIdsBySlug = new Map()
    for (const a of generatedAliases) {
      if (!a.engineId || !a.slug || a.engineId === a.slug) continue
      const et = a.engineId.includes(':') ? a.engineId.slice(a.engineId.indexOf(':') + 1) : a.engineId
      const st = a.slug.includes(':') ? a.slug.slice(a.slug.indexOf(':') + 1) : a.slug
      if (et !== st) continue
      const arr = legacyIdsBySlug.get(a.slug) ?? []
      if (!arr.includes(a.engineId)) arr.push(a.engineId)
      legacyIdsBySlug.set(a.slug, arr)
    }
  }
  return legacyIdsBySlug.get(id) ?? []
}

/**
 * Task 168 §2/§3 — the offline grounded resolver.
 *
 * The deterministic router grew by accretion: dozens of early branches keyed on
 * cue words (build, tech, ending) fire before the actual subject is resolved, so
 * "how do I get X" was answered with a build hunt and "where is Y" with plate
 * coordinates. This module does the opposite: it resolves the one entity the
 * question is about from the full alias plane + enriched entity index, decides
 * which record field answers the question, and leads with that field.
 *
 * It is deliberately narrow — it only answers the facets whose answer is a
 * field on the record (location, acquisition, drops, requirements, skill, level
 * band, mechanics, strategy/lore), never endings/builds/quests — and it only
 * runs when the enriched index is loaded and there is no API key, so the online
 * path and the existing router behaviour are untouched.
 */

// ---------------------------------------------------------------------------
// index loading (local, to avoid pulling the React entity-graph module in)
// ---------------------------------------------------------------------------

let loading: Promise<void> | null = null

export function loadGroundedIndex(): Promise<void> {
  if (entityIndexReady()) return Promise.resolve()
  if (loading) return loading
  loading = fetch('/sourced/entity-index.json')
    .then((r) =>
      r.ok
        ? (r.json() as Promise<{
            records?: Record<string, EntityRecord>
            byKind?: Record<string, number>
            unmatched?: Record<string, number>
            sources?: string[]
          }>)
        : Promise.reject(new Error(`entity index ${r.status}`)),
    )
    .then((doc) => {
      const map = new Map<string, EntityRecord>()
      for (const [id, rec] of Object.entries(doc.records ?? {})) map.set(id, rec)
      setEntityIndex(map, { byKind: doc.byKind, unmatched: doc.unmatched, sources: doc.sources })
    })
    .catch(() => {
      setEntityIndex(new Map())
    })
  return loading
}

// ---------------------------------------------------------------------------
// subject resolution
// ---------------------------------------------------------------------------

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export { fold }

/**
 * Task 168 §5 — the subjects a question names, with every surface (record name,
 * id tail, generated alias) folded, so a wiki passage can be judged against the
 * subject the question is actually about rather than generic query words.
 */
export function resolveQuestionSubjects(question: string): { id: string; names: string[] }[] {
  if (!entityIndexReady()) return []
  const subs = resolveSubjects(question)
  if (!subs.length) return []
  const byId = new Map<string, string[]>()
  for (const s of surfaceList()) {
    const arr = byId.get(s.id) ?? []
    arr.push(s.norm)
    byId.set(s.id, arr)
  }
  return subs.slice(0, 3).map((s) => ({ id: s.id, names: byId.get(s.id) ?? [] }))
}

/** Specificity weighting: a named creature/NPC beats the region it sits in. */
const KIND_WEIGHT: Record<string, number> = {
  npc: 8,
  npcs: 8,
  boss: 6,
  hunt: 6,
  invader: 6,
  enemy: 5,
  mechanic: 6,
  item: 4,
  weapon: 4,
  spell: 4,
  ash: 4,
  talisman: 4,
  armor: 4,
  shield: 4,
  spirit: 4,
  material: 4,
  dungeon: 3,
  grace: 3,
  quest: 2,
  region: 2,
  ending: 1,
  build: 1,
}

const GEAR_KINDS = new Set(['item', 'weapon', 'spell', 'ash', 'talisman', 'armor', 'shield', 'spirit', 'material'])
const FOE_KINDS = new Set(['boss', 'hunt', 'invader', 'enemy'])
/** Kinds a location/navigation/lore answer may be about; excludes build/ending. */
const ANSWER_KINDS = new Set([...GEAR_KINDS, ...FOE_KINDS, 'npc', 'npcs', 'dungeon', 'grace', 'region', 'quest'])

type Surface = { id: string; kind: string; norm: string; tokens: number; weight: number }

let surfaceCache: { size: number; list: Surface[] } | null = null

function surfaceList(): Surface[] {
  const recs = allRecords()
  if (!recs.length) return []
  if (surfaceCache && surfaceCache.size === recs.length) return surfaceCache.list
  const seen = new Set<string>()
  const list: Surface[] = []
  const add = (id: string, kind: string, raw: string) => {
    const n = fold(raw)
    if (n.length < 4) return
    const key = `${id}\u0000${n}`
    if (seen.has(key)) return
    seen.add(key)
    list.push({ id, kind, norm: n, tokens: n.split(' ').length, weight: KIND_WEIGHT[kind] ?? 1 })
  }
  // Task 178 — an "Ash of War: Cragblade" record is also known by the bare
  // skill name ("Cragblade") its FMG display name carries after the colon.
  const addName = (id: string, kind: string, raw: string) => {
    add(id, kind, raw)
    const m = /^(?:ash(?:es)? of war):\s*(.+)$/i.exec(raw)
    if (m && m[1].trim().length >= 6) add(id, kind, m[1])
  }
  for (const r of recs) {
    addName(r.id, r.kind, r.name)
    if (r.id.includes(':')) add(r.id, r.kind, r.id.slice(r.id.indexOf(':') + 1).replace(/-/g, ' '))
  }
  const kindById = new Map(recs.map((r) => [r.id, r.kind]))
  for (const a of generatedAliases) {
    if (!a.slug) continue
    const kind = kindById.get(a.slug) ?? a.kind
    addName(a.slug, kind, a.fmgName)
    for (const al of a.aliases ?? []) add(a.slug, kind, al)
  }
  surfaceCache = { size: recs.length, list }
  return list
}

function editDistance(a: string, b: string, cap = 2): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  const dp = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) dp[j] = j
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Every record that appears in the question, best score first. */
function resolveSubjects(question: string): Surface[] {
  const list = surfaceList()
  if (!list.length) return []
  const qn = fold(question)
  if (!qn) return []
  const padded = ` ${qn} `
  const qTokens = qn.split(' ')
  const exact: { s: Surface; score: number }[] = []
  const fuzzy: { s: Surface; score: number }[] = []
  for (const s of list) {
    if (padded.includes(` ${s.norm} `)) {
      // Prefer the subject raised first in the sentence: a question that names
      // two entities is usually about the one it opens with.
      const start = padded.indexOf(` ${s.norm}`)
      exact.push({ s, score: s.norm.length * 2 + s.tokens * 2 + s.weight * 3 - Math.min(start, 100) * 0.5 })
      continue
    }
    if (s.norm.length < 6) continue
    // Token-aligned fuzzy: all surface tokens found, in order, within an edit
    // distance of 2 each (Task 168 §2, names ≥ 6 chars), so "placidusax" or a
    // "melania"/"malenia" typo still resolves.
    const st = s.norm.split(' ')
    let qi = 0
    let ok = true
    let diffs = 0
    for (const tok of st) {
      let found = -1
      for (let i = qi; i < qTokens.length; i++) {
        const qt = qTokens[i]
        if (qt === tok) {
          found = i
          break
        }
        if (tok.length >= 6 && qt.length >= 5 && editDistance(tok, qt) <= 2) {
          diffs++
          found = i
          break
        }
      }
      if (found < 0) {
        ok = false
        break
      }
      qi = found + 1
    }
    if (ok && diffs <= 2) fuzzy.push({ s, score: s.norm.length * 2 + s.tokens * 2 + s.weight * 3 - 4 })
  }
  // Exact names win outright; typo-tolerant matches are only consulted when the
  // question names no known subject exactly, so a fuzzy hit never shadows a real
  // one.
  const matches = exact.length ? exact : fuzzy
  matches.sort((a, b) => b.score - a.score)
  const best = new Map<string, Surface>()
  for (const m of matches) if (!best.has(m.s.id)) best.set(m.s.id, m.s)
  return [...best.values()]
}

// ---------------------------------------------------------------------------
// facet detection
// ---------------------------------------------------------------------------

type Facet =
  | 'level'
  | 'requirements'
  | 'how-to-use'
  | 'drops'
  | 'navigation'
  | 'location'
  | 'how-to-get'
  | 'how-to-beat'
  | 'lore'
  | 'next'
  | 'mechanics'

const LEVEL_RE = /\b(what level|recommended level|level (should|for|to)|am i (ready|over|under)|overlevell?ed|underlevell?ed|outlevell?ed)\b/
const REQUIREMENTS_RE = /\b(requirements?|what stats?|stats? (do i need|needed|required)|to wield|can i (use|wield)|enough (str|dex|int|fai|arc))\b/
const HOW_TO_USE_RE = /\b(how (do|to) (i )?(use|equip|activate|two.?hand)|how (does|do) .{0,40} (work|activate))\b/
const DROPS_RE = /\b(what (does|do|are) .{0,45} (drop|drops|give|get|reward|rewards)|drop(s)? (from|table)|rewards? from)\b/
const NAVIGATION_RE = /\b(how (do|can) i (get to|get the|reach)|how to (get to|reach)|reach the|route to|fastest (way|route) to)\b/
const LOCATION_RE = /\b(where (is|are|can i find|do i find|do i get|do i meet|to find)|location of|locate)\b/
const HOW_TO_GET_RE = /\b(how (do|can|to) i? ?(get|obtain|acquire)|how to (get|obtain)|where (do i|can i) (get|find)|where to (get|find)|obtain)\b/
const HOW_TO_BEAT_RE = /\b(how (do|to) (i )?(beat|kill|defeat)|tips?( for| on| to| against)?|strategy|stuck (on|at)|can'?t beat|weakness)\b/
const NEXT_RE = /\b(what (should i do|now|next)|whats next|what's next|once i (beat|defeat)|now what|after .{0,30}\?)\b/
const LORE_RE = /\b(lore|who is|why (is|did|does|was)|story|canon|stronger)\b/
const ENDING_RE = /\b(ending|endings)\b/
const BUILD_RE = /\b(build|respec|stat allocation|scaling|soft ?cap|op build|meta build)\b/
const PVP_RE = /\b(pvp|invasions?|invade|invader|duel|colosseum|badredman|gank)\b/
const REMEMBRANCE_RE = /\b(remembrance|rememberance|enia|finger reader)\b/
const QUEST_RE = /\b(quest|questline|storyline)\b/

/**
 * A co-op / trade request is not a question Gideon can answer from the game's
 * data; he should say what he can do instead. Kept narrow so a legitimate
 * "where can I find X" that merely says "please help" is not hijacked, and so
 * "help me find a weapon" / "help me build X" still reaches the data resolver.
 * Mirrors the `out-of-scope` classifier in `scripts/build-gideon-eval.mjs`.
 */
const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\bdrop me\b/i,
  /\bdrop a \w/i,
  /\bdrop the\b/i,
  /\bdrop some\b/i,
  /\bdrop it\b/i,
  /\bwilling to (drop|trade)\b/i,
  /\banyone have a spare\b/i,
  /\bhave a spare\b/i,
  /\bmule\b/i,
  /\btrade\b/i,
  /\bwho can join\b/i,
  /\bjoin right now\b/i,
  /\bsummon me\b/i,
  /\blooking for coop\b/i,
  /\bcoop help\b/i,
  /\binvading me\b/i,
  /\bmultiplayer password\b/i,
  /\bpassword will be\b/i,
  /\bpassword:/i,
  /\baide\b/i,
  /\brate my (performance|fight|gameplay|run)\b/i,
  /\bclose matches\b/i,
  /\bcustom fan covers?\b/i,
  /\bfor me\b/i,
  /\b(anyone|someone) (able|willing|free|down|up|wanna|want|available|around|about) to\b/i,
  /\b(anyone|someone) (available|around|about)\b/i,
  /\b(anyone|someone) (can help|wanna)\b/i,
  /(can|could|would) (someone|anyone) (please |plz |pls )?(come|join|drop|give|trade|mule|carry)\b/i,
  /(can|could|would) (someone|anyone) (please |plz |pls )?help(?!.*\b(explain|find a|find the|build|to build))\b/i,
]

function isOutOfScopeRequest(question: string): boolean {
  return OUT_OF_SCOPE_PATTERNS.some((r) => r.test(question))
}

/** Technical / platform / patch questions are outside the data Gideon carries. */
const TECHNICAL_RE =
  /\b(bug(s|ged|ging)?|glitch(es|ed|ing)?|crash(ed|es|ing)?|fps|stutter|latency|server|disconnect|mod(s|ded)?|dupe|refund|patch ?notes?|hotfix|nerf|performance|hardware|controller|save file|error code|account|\d+ ?fps)\b/i

function detectFacet(q: string, top: EntityRecord | undefined): Facet | null {
  const ql = q.toLowerCase()
  if (ENDING_RE.test(ql)) return null
  // A fight question that merely mentions "build"/"stats" is still about the
  // foe ("stuck on Soldier of Godrick, any recommendations for my build?").
  if (HOW_TO_BEAT_RE.test(ql) && top && FOE_KINDS.has(top.kind)) return 'how-to-beat'
  if (BUILD_RE.test(ql) && top?.kind !== 'mechanic') return null
  if (PVP_RE.test(ql) && top?.kind !== 'mechanic') return null
  if (REMEMBRANCE_RE.test(ql)) return null
  if (QUEST_RE.test(ql) && top?.kind !== 'mechanic') return null
  if (HOW_TO_USE_RE.test(ql)) return 'how-to-use'
  if (LEVEL_RE.test(ql)) return 'level'
  if (REQUIREMENTS_RE.test(ql)) return 'requirements'
  if (DROPS_RE.test(ql)) return 'drops'
  if (NAVIGATION_RE.test(ql)) return 'navigation'
  if (LOCATION_RE.test(ql)) return 'location'
  if (HOW_TO_GET_RE.test(ql)) return 'how-to-get'
  if (HOW_TO_BEAT_RE.test(ql)) return 'how-to-beat'
  if (NEXT_RE.test(ql)) return 'next'
  if (LORE_RE.test(ql)) return 'lore'
  if (top?.kind === 'mechanic') return 'mechanics'
  return null
}

// ---------------------------------------------------------------------------
// answer building
// ---------------------------------------------------------------------------

const MODULE_BY_KIND: Record<string, ModuleId> = {
  boss: 'map',
  hunt: 'map',
  invader: 'map',
  enemy: 'map',
  grace: 'map',
  dungeon: 'map',
  region: 'map',
  npc: 'codex',
  npcs: 'codex',
  item: 'codex',
  weapon: 'codex',
  spell: 'codex',
  ash: 'codex',
  talisman: 'codex',
  armor: 'codex',
  shield: 'codex',
  spirit: 'codex',
  material: 'codex',
  mechanic: 'codex',
}

function moduleForKind(kind: string): ModuleId {
  return MODULE_BY_KIND[kind] ?? 'codex'
}

function weaknessLine(record: EntityRecord): string {
  const neg = record.stats?.Negation
  if (!neg) return ''
  const weak = neg
    .split('·')
    .map((s) => s.trim())
    .filter((s) => /-\d/.test(s))
  return weak.length ? `Weak to ${weak.join(', ')}.` : ''
}

function buildSay(record: EntityRecord, facet: Facet, areas: RegionLevel[] | undefined): string {
  const name = record.name
  const kind = record.kind
  const where = record.region || record.location
  const desc = record.description ? ` ${record.description.trim()}` : ''
  const squish = (s: string) => s.replace(/\s+/g, ' ').trim()
  switch (facet) {
    case 'level': {
      const band = areas ? bandFor(areas, record.name) : null
      if (band) {
        return `${name} is a Lv ${band.levelMin}-${band.levelMax} area (weapons +${band.upgradeMin ?? '?'}-+${band.upgradeMax ?? '?'}).`
      }
      return `${name}: no level band on file, but that is the area you named.`
    }
    case 'requirements': {
      const req = record.stats?.Requirements
      if (req) return squish(`${name} — ${kind}. Requires ${req}.${desc}`)
      return squish(`${name} — ${kind}${where ? ` · ${where}` : ''}. No requirement row in the data.${desc}`)
    }
    case 'how-to-use': {
      const skill = record.stats?.Skill
      if (skill) return squish(`${name} — ${kind}. Skill: ${skill}.${desc}`)
      return squish(`${name} — ${kind}${where ? ` · ${where}` : ''}. No skill row in the data.${desc}`)
    }
    case 'drops': {
      const variantDrops = (record.variants ?? []).flatMap((v) => (v.drops ?? []).map((d) => d.item))
      const drops = [...new Set([...(record.drops ?? []), ...variantDrops, ...extraBossDrops(record)])]
      // The cleaned index keeps a tidy drop list; the boss's own strategy/section
      // text still names the rewards it unlocks (e.g. "unlocks Agheel's Flame").
      const prose = [record.strategy, (record.sections ?? []).map((s) => s.text).join(' ')].filter(Boolean).join(' ')
      if (drops.length) return squish(`${name} — drops: ${drops.join(', ')}.${prose ? ` ${prose}` : ''}`)
      if (prose) return squish(`${name} — drops. ${prose}`)
      return `${name} — no drop table in the data.`
    }
    case 'mechanics': {
      const body = record.description || record.strategy
      return `${name} — mechanic.${body ? ` ${body}` : ''}`
    }
    case 'how-to-beat':
      return squish(
        `${name} — ${kind}${where ? ` in ${where}` : ''}. ${weaknessLine(record)} ${record.strategy || record.description || ''}`,
      )
    case 'lore':
      return squish(`${name} — ${where ? `${where}. ` : ''}${record.description || record.strategy || ''}${wikiFor(record) ? ` ${wikiFor(record)}` : ''}`)
    case 'navigation':
    case 'location':
    case 'how-to-get':
    default: {
      const detail = record.location && record.location !== record.region ? ` ${record.location}` : ''
      const acq = acquisitionText(record)
      const region = regionDescription(record)
      return squish(
        `${name} — ${kind}${where ? ` · ${where}` : ''}.${detail}${desc}${acq ? ` ${acq}` : ''}${region ? ` ${region}` : ''}`,
      )
    }
  }
}

/** An area-like record a level question can be about (regions and their sites). */
function isAreaKind(kind: string): boolean {
  return kind === 'region' || kind === 'dungeon' || kind === 'grace'
}

/** The kind a facet ideally wants, so a mechanics alias does not shadow an item. */
function facetPreferred(facet: Facet, record: EntityRecord): boolean {
  if (facet === 'level') return record.kind === 'region' || record.kind === 'dungeon'
  if (facet === 'mechanics') return record.kind === 'mechanic'
  if (facet === 'requirements' || facet === 'how-to-use' || facet === 'how-to-get') return GEAR_KINDS.has(record.kind)
  if (facet === 'drops' || facet === 'how-to-beat') return FOE_KINDS.has(record.kind)
  return ANSWER_KINDS.has(record.kind)
}

function facetAccepts(facet: Facet, record: EntityRecord): boolean {
  switch (facet) {
    case 'level':
      return isAreaKind(record.kind)
    case 'requirements':
      return Boolean(record.stats?.Requirements) || GEAR_KINDS.has(record.kind)
    case 'how-to-use':
      return Boolean(record.stats?.Skill) || GEAR_KINDS.has(record.kind)
    case 'drops':
      return FOE_KINDS.has(record.kind) || Boolean(record.drops?.length)
    case 'how-to-beat':
      return FOE_KINDS.has(record.kind)
    case 'mechanics':
      return record.kind === 'mechanic'
    default:
      return ANSWER_KINDS.has(record.kind)
  }
}

export type GroundedOptions = {
  regionLevels?: RegionLevel[]
}

/**
 * Resolve the question's subject and answer its asked facet from that entity's
 * record. Returns null when there is no confident subject, when the facet is
 * outside this layer's remit, or when the index has not loaded.
 */
export function askGrounded(question: string, opts: GroundedOptions = {}): GideonAct | null {
  if (!entityIndexReady()) return null
  // A bug/glitch/patch question is not a data question; leave it to the
  // limitations responder rather than answering from an unrelated record.
  if (TECHNICAL_RE.test(question)) return null
  const surfaces = resolveSubjects(question)
  if (!surfaces.length) return null
  const byId = new Map(allRecords().map((r) => [r.id, r]))
  const records = surfaces.map((s) => byId.get(s.id)).filter((r): r is EntityRecord => Boolean(r))
  if (!records.length) return null
  const facet = detectFacet(question, records[0])
  if (!facet) return null
  const record =
    records.find((r) => facetPreferred(facet, r) && facetAccepts(facet, r)) ?? records.find((r) => facetAccepts(facet, r))
  // A facet the resolved subject doesn't carry ("items to drop during
  // invasions", "stronger: poise or light roll") still names a mechanic; answer
  // from that mechanic's own record rather than dropping the subject.
  if (!record) {
    const mech = records.find((r) => r.kind === 'mechanic')
    if (!mech) return null
    return {
      say: buildSay(mech, 'mechanics', opts.regionLevels),
      module: moduleForKind(mech.kind),
      factId: mech.id,
      links: [mech.id, ...legacyIdsFor(mech.id)],
      grounded: true,
    }
  }
  const say = buildSay(record, facet, opts.regionLevels)
  return {
    say,
    module: moduleForKind(record.kind),
    factId: record.id,
    links: [record.id, ...legacyIdsFor(record.id)],
    grounded: true,
  }
}

/**
 * Task 168 §1/§4 — the honest offline answer for posts that are not questions
 * for a data companion: co-op/trade requests and platform/patch/bug posts.
 * Gideon says he cannot help with that and what he can do instead, rather than
 * answering from an unrelated record.
 */
export function askGroundedLimits(question: string): GideonAct | null {
  if (!entityIndexReady()) return null
  if (isOutOfScopeRequest(question)) {
    const byId = new Map(allRecords().map((r) => [r.id, r]))
    const rec = resolveSubjects(question)
      .map((s) => byId.get(s.id))
      .find((r): r is EntityRecord => Boolean(r))
    const where = rec?.region
    const tail = rec
      ? ` What I can do: open ${rec.name}'s page${where ? ` (${where})` : ''}, or give its location, drops, stats, and strategy.`
      : ` What I can do: name a boss, item, NPC, or place and I'll answer from the game's own data.`
    return {
      say: `I can't join your session, trade, or drop items — I'm an offline companion reading the game's data, not another player.${tail}`,
      module: rec ? moduleForKind(rec.kind) : 'codex',
      factId: rec?.id,
      grounded: true,
    }
  }
  if (TECHNICAL_RE.test(question)) {
    return {
      say: `I can't speak to bugs, patches, performance, or hardware — I only carry the game's data and I don't invent changes. I can still answer where things are, drops, stats, requirements, quests, and boss strategy.`,
      module: 'codex',
      grounded: true,
    }
  }
  return null
}
