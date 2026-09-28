import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import { byId, matchMany, type Fact } from '../knowledge/catalog'
import { planRoute } from '../knowledge/endings'
import { allLines, findLine, stillAvailable } from '../knowledge/storylines'
import type { Character, ModuleId, Stats } from '../types'
import { canonicalFactId, generatedAliases, matchAllWarps } from './aliases'
import { areaLabel, type AreaSignal } from './areaContext'
import { resolveEntityId } from './entityGraph'
import type { ChatMessage } from './muse'
import type { GideonAction, GideonAct, GideonMemory, GideonSource } from './gideon'
import { searchSync } from './search'

const STAT_KEYS: (keyof Stats)[] = [
  'vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane',
]

export const GIDEON_MODULES: ModuleId[] = ['reckon', 'map', 'build', 'quests', 'codex']

/**
 * Everything the model is allowed to talk about. Ids in `factIds`, `buildIds`
 * and `goalIds` are the complete set the response may reference; anything else
 * is treated as a hallucination and rejected before it reaches the UI.
 */
export type Grounding = {
  text: string
  factIds: Set<string>
  buildIds: Set<string>
  goalIds: Set<string>
}

/**
 * Assemble the structured grounding pack from data that already exists in this
 * repo: still-available lines, the route plan for the current goal, search hits
 * for the player's own words, and a bounded catalog slice. No wiki text, no RAG.
 */
export function buildGrounding(
  question: string,
  character: Character,
  memory: GideonMemory = {},
  area?: AreaSignal | null,
): Grounding {
  const factIds = new Set<string>()
  const allBuilds = [...opBuilds, ...pvpBuilds]
  const buildIds = new Set(allBuilds.map((b) => b.id))
  const goalIds = new Set(allLines.map((l) => l.id))

  const survey = stillAvailable(character)
  const lines = [...survey.active, ...survey.open, ...survey.locked, ...survey.done].slice(0, 24).map((r) => ({
    id: r.line.id,
    name: r.line.name,
    state: r.state,
    note: r.note,
  }))

  const goalId = memory.goalId
  const goalLine = (goalId ? allLines.find((l) => l.id === goalId) : undefined) || findLine(question)
  const plan = goalLine ? planRoute(character, goalLine) : null
  const goalPlan = goalLine && plan
    ? {
        goal: goalLine.id,
        name: goalLine.name,
        locked: plan.locked,
        current: plan.current
          ? { id: plan.current.id, do: plan.current.do, detail: plan.current.detail, factId: plan.current.factId, module: plan.current.module }
          : null,
        todo: plan.todo.slice(0, 5).map((s) => ({ do: s.do, factId: s.factId })),
        detours: plan.detours,
      }
    : null

  const hits = searchSync(question).slice(0, 8)
  for (const h of hits) factIds.add(h.id)
  for (const g of matchAllWarps(question).slice(0, 5)) factIds.add(g.id)

  const slice: Fact[] = []
  const pushFact = (f?: Fact) => {
    if (f && !slice.includes(f) && slice.length < 40) slice.push(f)
  }
  for (const f of matchMany(question)) pushFact(f)
  for (const h of hits) pushFact(byId.get(h.id))
  if (plan) {
    for (const step of [plan.current, ...plan.todo.slice(0, 4)]) {
      if (step?.factId) pushFact(byId.get(step.factId))
    }
  }
  for (const f of slice) factIds.add(f.id)

  const pack = {
    character: {
      name: character.name,
      level: character.level,
      platform: character.platform,
      startingClass: character.startingClass,
      source: character.source,
      defeatedBosses: character.defeatedBosses.slice(0, 30),
      discoveredGraces: character.discoveredGraces.slice(0, 30),
      collectedItems: character.collectedItems.slice(0, 30),
      completedQuestSteps: character.completedQuestSteps.slice(0, 30),
    },
    currentArea: area?.region ? { region: area.region, place: area.place ?? null, label: areaLabel(area) } : null,
    lines,
    goalPlan,
    search: hits.map((h) => ({ id: h.id, name: h.name, detail: h.detail, module: h.module })),
    catalog: slice.map((f) => ({ id: f.id, name: f.name, kind: f.kind, region: f.region, note: f.note })),
    builds: allBuilds.map((b) => ({ id: b.id, name: b.name, tag: b.tag })),
    allowedModules: GIDEON_MODULES,
  }

  return { text: JSON.stringify(pack), factIds, buildIds, goalIds }
}

const SYSTEM_PROMPT = `You are Gideon Ofnir, the All-Knowing, the guide inside an Elden Ring companion app. The Tarnished is mid-run and asking for advice.

Answer ONLY from the grounding pack in the user message and from the results of the tools you call. The pack contains the character's facts, the current area, the storylines and their state, the route plan, search results, a catalog slice, and the builds.

Hard rules:
- For how / where / why / lore / what questions the pack does not cover, call "wiki_search" (and "wiki_page" for the full page) and answer from the returned sections. Quote at most two short excerpts, name the wiki page you used, and turn any [[id|label]] in the excerpt into a link. Fall back to what you know only when the wiki returns nothing.
- Refer to anything in the game with [[id]] from a tool result. Never invent ids. Cite such an id as [[boss:godrick]] or [[boss:godrick|the Grafted]]. A cited id must resolve; an unknown one is dropped.
- Never invent fact ids, build ids, goal ids, module names, or item names. Use an id only if it appears verbatim in a tool result or the grounding pack.
- "factId" / "buildId" / "goal" / "module" must be one of the ids / values in the pack (legacy fields; prefer links + actions).
- To change the player's record, propose an action; do not claim you changed it. Character-changing actions: markDone / markNotDone / addOwned / removeOwned ({ids}), setGoal ({id}), equip ({slot,id}), setStats ({stats, level}). Navigation actions: showOnMap / open ({id}).
- "links" lists fact ids you referenced but did not inline as [[id]].
- "sources" may only contain urls returned by a web_search result in this same turn. Never invent a url.
- If the pack does not cover the question, say so briefly and point at the closest grounded lead instead of guessing.
- Stay in Gideon's voice: precise, arch, a little cold. 1-4 sentences. No markdown.

Return json only, exactly this shape:
{"say": string, "module": string|null, "factId": string|null, "buildId": string|null, "goal": string|null, "offer": {"label": string, "prompt": string}|null, "navigateNow": boolean, "links": string[]|null, "actions": array|null, "sources": {"title": string, "url": string}[]|null}

Set navigateNow true only when you also set factId or module. Omit (null) every optional field you do not need.`

/**
 * The system prompt, the prior turns of the session, and the current grounding
 * pack. Passing `history` keeps one open conversation with the model so follow-ups
 * ("and after that?", "why not the other one?") have the earlier answer in context
 * — the router still answers deterministically first, so this only affects the
 * optional LLM path.
 */
export function gideonMessages(question: string, g: Grounding, history: ChatMessage[] = []): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-8),
    { role: 'user', content: `Grounding pack (json):\n${g.text}\n\nTarnished's question: ${question}` },
  ]
}

/** Anything shaped `prefix:slug` (boss:godrick, grace:church-of-elleh, …). */
const ID_TOKEN = /\b[a-z][a-z0-9]*(?::[a-z0-9][a-z0-9:_-]*)\b/gi

/** Every id the model is allowed to *name*: grounding pack plus catalog/aliases. */
function allowedIds(g: Grounding): Set<string> {
  const allowed = new Set<string>([...g.factIds, ...g.buildIds, ...g.goalIds, ...byId.keys()])
  for (const a of generatedAliases) {
    allowed.add(a.slug)
    allowed.add(a.engineId)
  }
  return allowed
}

function splitSentences(say: string): string[] {
  return say
    .match(/[^.!?]+[.!?]*/g)
    ?.map((s) => s.trim())
    .filter(Boolean) ?? [say.trim()]
}

/**
 * Requirement: never ship a sentence that names a fact id outside catalog/aliases.
 * Each sentence is inspected for `prefix:slug` tokens; a sentence with any unknown
 * token is dropped whole rather than edited. Returns the surviving prose.
 */
/** Task 101 marker spans are resolved by the renderer, not by the id gate. */
const MARKER_SPAN = /\[\[[^\]]*\]\]/g

export function stripUngroundedSentences(say: string, g: Grounding): string {
  const allowed = allowedIds(g)
  return splitSentences(say)
    .filter((sentence) => {
      // Bare `prefix:slug` tokens are gated; `[[id]]` markers are left for the
      // renderer, which shows an unknown id as plain text (never a dead link).
      const masked = sentence.replace(MARKER_SPAN, ' ')
      const tokens = masked.match(ID_TOKEN) ?? []
      return tokens.every((token) => allowed.has(token) || resolveEntityId(token) !== null)
    })
    .join(' ')
    .trim()
}

export type Validation = {
  act: GideonAct | null
  /** Legacy critical id fields. A non-empty list rejects the whole act. */
  rejected: string[]
  /** Task 101 softer drops (unknown action/link ids, source urls): logged, act kept. */
  dropped: string[]
}

/** Resolve an id through the alias plane + entity graph, or null when unknown. */
function knownEntityId(id: unknown, g: Grounding): string | null {
  if (typeof id !== 'string' || !id.trim()) return null
  const raw = id.trim()
  const resolved = resolveEntityId(raw)
  if (resolved) return resolved
  // Grounding ids that are not graph entities (e.g. blitz/story goal ids).
  if (g.factIds.has(raw) || g.buildIds.has(raw) || g.goalIds.has(raw)) return canonicalFactId(raw)
  return null
}

/** Canonicalise a goal id: graph entity, or the raw grounding goal id. */
function knownGoalId(id: unknown, g: Grounding): string | null {
  if (typeof id !== 'string' || !id.trim()) return null
  const raw = id.trim()
  if (g.goalIds.has(raw)) return raw
  return resolveEntityId(raw) ?? (g.factIds.has(raw) ? canonicalFactId(raw) : null)
}

function pickStats(value: unknown): Partial<Stats> {
  const out: Partial<Stats> = {}
  if (!value || typeof value !== 'object') return out
  const o = value as Record<string, unknown>
  for (const key of STAT_KEYS) {
    const v = o[key]
    if (typeof v === 'number' && Number.isFinite(v)) out[key] = v
  }
  return out
}

function validateActions(raw: unknown, g: Grounding, dropped: string[]): GideonAction[] {
  if (!Array.isArray(raw)) return []
  const out: GideonAction[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const a = item as Record<string, unknown>
    const type = typeof a.type === 'string' ? a.type : ''
    if (type === 'markDone' || type === 'markNotDone' || type === 'addOwned' || type === 'removeOwned') {
      const ids = (Array.isArray(a.ids) ? a.ids : [])
        .map((id) => knownEntityId(id, g))
        .filter((id): id is string => Boolean(id))
      if (ids.length) out.push({ type, ids })
      else dropped.push(`action:${type}`)
    } else if (type === 'setGoal') {
      const id = knownGoalId(a.id, g)
      if (id) out.push({ type, id })
      else dropped.push(`action:setGoal:${String(a.id)}`)
    } else if (type === 'equip') {
      const id = knownEntityId(a.id, g)
      const slot = typeof a.slot === 'string' ? a.slot.trim() : ''
      if (id && slot) out.push({ type, slot, id })
      else dropped.push(`action:equip:${String(a.id)}`)
    } else if (type === 'setStats') {
      const stats = pickStats(a.stats)
      const level = typeof a.level === 'number' && Number.isFinite(a.level) ? a.level : undefined
      if (Object.keys(stats).length || level != null) out.push({ type, stats, level })
      else dropped.push('action:setStats')
    } else if (type === 'showOnMap' || type === 'open') {
      const id = knownEntityId(a.id, g)
      if (id) out.push({ type, id })
      else dropped.push(`action:${type}:${String(a.id)}`)
    } else {
      dropped.push(`action:${type || 'unknown'}`)
    }
  }
  return out
}

/**
 * Turn the model's JSON into a GideonAct. Legacy id fields (factId/buildId/goal)
 * still poison the whole turn, so a fabricated pin or build never reaches the UI
 * and the caller falls back to the router. Task 101's `links`, `actions` and
 * `sources` are validated more softly: an unknown id or an unverified url is
 * dropped from that field (and logged in `dropped`), the rest of the act stands.
 * `allowedUrls` is the set of urls a `web_search` result produced this turn;
 * sources outside it (including an empty set) are dropped.
 */
export function validateGideonAct(raw: unknown, g: Grounding, allowedUrls: Iterable<string> = []): Validation {
  const rejected: string[] = []
  const dropped: string[] = []
  if (!raw || typeof raw !== 'object') return { act: null, rejected: ['response'], dropped }
  const r = raw as Record<string, unknown>
  const rawSay = typeof r.say === 'string' ? r.say.trim() : ''
  if (!rawSay) return { act: null, rejected: ['say'], dropped }

  // Drop any sentence that names a bare unknown id. `[[id]]` markers survive and
  // the renderer shows an unknown one as plain text — but log the drop.
  const say = stripUngroundedSentences(rawSay, g)
  if (!say) rejected.push('say:ungrounded')
  for (const m of rawSay.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    const id = (m[1] ?? '').trim()
    if (id && knownEntityId(id, g) === null) dropped.push(`say:marker:${id}`)
  }

  const act: GideonAct = { say }

  if (typeof r.module === 'string' && (GIDEON_MODULES as string[]).includes(r.module)) {
    act.module = r.module as ModuleId
  }

  if (r.factId != null) {
    if (typeof r.factId === 'string' && g.factIds.has(r.factId)) act.factId = r.factId
    else rejected.push(`factId:${String(r.factId)}`)
  }
  if (r.buildId != null) {
    if (typeof r.buildId === 'string' && g.buildIds.has(r.buildId)) act.buildId = r.buildId
    else rejected.push(`buildId:${String(r.buildId)}`)
  }
  if (r.goal != null) {
    if (typeof r.goal === 'string' && g.goalIds.has(r.goal)) act.goal = r.goal
    else rejected.push(`goal:${String(r.goal)}`)
  }

  if (r.offer && typeof r.offer === 'object') {
    const o = r.offer as Record<string, unknown>
    if (typeof o.label === 'string' && o.label.trim() && typeof o.prompt === 'string' && o.prompt.trim()) {
      act.offer = { label: o.label.trim(), prompt: o.prompt.trim() }
    }
  }

  if (r.navigateNow === true && (act.factId || act.module)) act.navigateNow = true

  // --- Task 101: links / actions / sources (soft drops) --------------------
  if (Array.isArray(r.links)) {
    const links: string[] = []
    for (const id of r.links) {
      const resolved = knownEntityId(id, g)
      if (resolved) {
        if (!links.includes(resolved)) links.push(resolved)
      } else {
        dropped.push(`link:${String(id)}`)
      }
    }
    if (links.length) act.links = links
  }

  const actions = validateActions(r.actions, g, dropped)
  if (actions.length) act.actions = actions

  if (Array.isArray(r.sources)) {
    const allowed = new Set(allowedUrls)
    const sources: GideonSource[] = []
    for (const item of r.sources) {
      if (!item || typeof item !== 'object') continue
      const s = item as Record<string, unknown>
      const title = typeof s.title === 'string' ? s.title.trim() : ''
      const url = typeof s.url === 'string' ? s.url.trim() : ''
      if (title && url && allowed.has(url)) sources.push({ title, url })
      else dropped.push(`source:${url || 'unknown'}`)
    }
    if (sources.length) act.sources = sources
  }

  if (rejected.length) return { act: null, rejected, dropped }
  return { act, rejected, dropped }
}
