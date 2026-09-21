import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import { byId, matchMany, type Fact } from '../knowledge/catalog'
import { planRoute } from '../knowledge/endings'
import { allLines, findLine, stillAvailable } from '../knowledge/storylines'
import type { Character, ModuleId } from '../types'
import { matchAllWarps } from './aliases'
import type { ChatMessage } from './deepseek'
import type { GideonAct, GideonMemory } from './gideon'
import { searchSync } from './search'

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
export function buildGrounding(question: string, character: Character, memory: GideonMemory = {}): Grounding {
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

Answer ONLY from the grounding pack provided in the user message. The pack is json and contains: the character's facts, the storylines and their state, the current route plan, search results, a catalog slice, and the available builds.

Hard rules:
- Never invent fact ids, build ids, goal ids, module names, or item names. Use an id only if it appears verbatim in the grounding pack.
- "factId" must be one of the ids listed in the catalog or search arrays.
- "buildId" must be one of the ids listed in the builds array.
- "goal" must be one of the ids listed in the lines array.
- "module" must be one of the allowedModules.
- If the pack does not cover the question, say so briefly and point at the closest grounded lead instead of guessing.
- Stay in Gideon's voice: precise, arch, a little cold. 1-4 sentences. No markdown.

Return json only, exactly this shape:
{"say": string, "module": string|null, "factId": string|null, "buildId": string|null, "goal": string|null, "offer": {"label": string, "prompt": string}|null, "navigateNow": boolean}

Set navigateNow true only when you also set factId or module. Omit (null) every optional field you do not need.`

export function gideonMessages(question: string, g: Grounding): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Grounding pack (json):\n${g.text}\n\nTarnished's question: ${question}` },
  ]
}

export type Validation = { act: GideonAct | null; rejected: string[] }

/**
 * Turn the model's JSON into a GideonAct, but only for ids that exist in the
 * grounding pack. An invented factId/buildId/goal id poisons the whole turn:
 * returning null makes the caller fall back to the deterministic router rather
 * than surfacing a fabricated pin or build. A bad `module` is dropped silently
 * because it carries no id the UI navigates to.
 */
export function validateGideonAct(raw: unknown, g: Grounding): Validation {
  const rejected: string[] = []
  if (!raw || typeof raw !== 'object') return { act: null, rejected: ['response'] }
  const r = raw as Record<string, unknown>
  const say = typeof r.say === 'string' ? r.say.trim() : ''
  if (!say) return { act: null, rejected: ['say'] }

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

  if (rejected.length) return { act: null, rejected }
  return { act, rejected }
}
