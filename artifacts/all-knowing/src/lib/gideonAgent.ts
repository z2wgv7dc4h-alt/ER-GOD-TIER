import type { Character } from '../types'
import { MAX_GIDEON_TOOLS, runGideonTool, selectGideonTools, type GideonIntent, type ToolContext } from './gideonTools'
import {
  callGideonChat,
  callGideonResponses,
  supportsGideonResponses,
  type AgentMessage,
  type AgentTool,
  type ChatMessage,
} from './muse'
import { buildGrounding, gideonMessages, validateGideonAct, type Grounding } from './gideonLlm'
import type { AreaSignal } from './areaContext'
import type { GideonAct, GideonMemory } from './gideon'

/**
 * The tool-calling harness. Two transports:
 *   - Responses API (preferred): the server keeps reasoning + tool calls across
 *     turns via `previous_response_id` — the docs' recommended agent path.
 *   - Chat Completions: a local message loop, used as a fallback.
 * Either way the model calls OUR deterministic functions and answers from real
 * data, so every id it names is real and hyperlinkable. Bounded turns; any throw
 * propagates to `askGideon`, which falls back to the deterministic router.
 */
/** Task 153 §3 — three steps is enough for lookup → answer. */
const MAX_STEPS = 3
/** Task 153 §3 — compact tool output, capped so it is not re-sent unbounded. */
const MAX_TOOL_RESULT_CHARS = 1500
const WEB_SEARCH = import.meta.env.VITE_GIDEON_WEB_SEARCH === '1'

// Session continuity for the Responses API: the last response id threads the
// next turn server-side (reasoning + tool history kept for us).
let lastResponseId: string | undefined

function parseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function parseArgs(s: string): Record<string, unknown> {
  const j = parseJson(s || '{}')
  return j && typeof j === 'object' ? (j as Record<string, unknown>) : {}
}

const URL_RE = /https?:\/\/[^\s"'<>)\]]+/g

/**
 * Task 101: the only urls a source may cite are ones a web_search result
 * produced this turn. The provider runs web search server-side, so we collect
 * every url seen in any tool output / response text this turn and validate the
 * model's `sources` against that set; an unverified url is dropped.
 */
function collectUrls(value: unknown, into: Set<string>): void {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  for (const m of text.match(URL_RE) ?? []) into.add(m.replace(/[.,;:]+$/, ''))
}

/** Anything shaped `prefix:slug` (boss:godrick, grace:church-of-elleh, …). */
const ID_TOKEN = /^[a-z][a-z0-9]*(?::[a-z0-9][a-z0-9:_-]*)$/i

/** Collect every id-shaped string a tool returned, for grounding-aware validation. */
function collectIds(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    if (ID_TOKEN.test(value)) into.add(value)
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) collectIds(v, into)
    return
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) collectIds(v, into)
  }
}

/** Drop empty / null fields so the JSON payload we re-send is as small as possible. */
function dropEmpty(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(dropEmpty).filter((v) => v !== undefined && v !== null && v !== '')
    return arr.length ? arr : undefined
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const compacted = dropEmpty(v)
      if (compacted === undefined || compacted === null || compacted === '') continue
      if (Array.isArray(compacted) && compacted.length === 0) continue
      out[k] = compacted
    }
    return Object.keys(out).length ? out : undefined
  }
  return value
}

/** Compact JSON for a tool result, capped (Task 153 §3). Exported for tests. */
export function compactToolResult(result: unknown, max = MAX_TOOL_RESULT_CHARS): string {
  let text: string
  try {
    text = JSON.stringify(dropEmpty(result) ?? null)
  } catch {
    text = JSON.stringify(String(result))
  }
  return text.length > max ? text.slice(0, max) : text
}

function runTools(
  calls: { id: string; name: string; arguments: string }[],
  ctx: ToolContext,
): Promise<{ call_id: string; result: unknown }[]> {
  return Promise.all(
    calls.map(async (t) => ({
      call_id: t.id,
      result: await runGideonTool(t.name, parseArgs(t.arguments), ctx).catch((e) => ({ error: String(e) })),
    })),
  )
}

function agentTools(intents: GideonIntent): AgentTool[] {
  const tools: AgentTool[] = selectGideonTools(intents)
  // Web search is opt-in; when on it still counts against the 8-tool cap.
  return WEB_SEARCH ? ([{ type: 'web_search' } as const, ...tools] as AgentTool[]).slice(0, MAX_GIDEON_TOOLS) : tools
}

async function viaResponses(
  question: string,
  character: Character,
  memory: GideonMemory,
  history: ChatMessage[],
  grounding: Grounding,
  intents: GideonIntent,
  area?: AreaSignal | null,
): Promise<GideonAct | null> {
  const firstInput = gideonMessages(question, grounding, history).map((m) => ({ role: m.role, content: m.content }))
  const ctx: ToolContext = { character, memory, area }
  const urls = new Set<string>()
  const toolIds = new Set<string>()
  let input: unknown = firstInput
  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await callGideonResponses(input, agentTools(intents), lastResponseId)
    if (res.id) lastResponseId = res.id
    if (res.outputText) collectUrls(res.outputText, urls)
    if (res.functionCalls.length === 0) {
      const raw = parseJson(res.outputText)
      return raw ? validateGideonAct(raw, grounding, urls, toolIds).act : null
    }
    const results = await runTools(res.functionCalls, ctx)
    for (const r of results) {
      collectUrls(r.result, urls)
      collectIds(r.result, toolIds)
    }
    input = results.map((r) => ({
      type: 'function_call_output',
      call_id: r.call_id,
      output: compactToolResult(r.result),
    }))
  }
  return null
}

async function viaChat(
  question: string,
  character: Character,
  memory: GideonMemory,
  history: ChatMessage[],
  grounding: Grounding,
  intents: GideonIntent,
  area?: AreaSignal | null,
): Promise<GideonAct | null> {
  const messages: AgentMessage[] = gideonMessages(question, grounding, history).map((m) => ({
    role: m.role,
    content: m.content,
  }))
  const ctx: ToolContext = { character, memory, area }
  const urls = new Set<string>()
  const toolIds = new Set<string>()
  for (let step = 0; step < MAX_STEPS; step++) {
    const { content, toolCalls } = await callGideonChat(messages, agentTools(intents))
    if (content) collectUrls(content, urls)
    if (toolCalls.length === 0) {
      const raw = parseJson(content)
      return raw ? validateGideonAct(raw, grounding, urls, toolIds).act : null
    }
    messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls.map((t) => ({
        id: t.id,
        type: 'function' as const,
        function: { name: t.name, arguments: t.arguments },
      })),
    })
    const results = await runTools(toolCalls, ctx)
    for (const r of results) {
      collectUrls(r.result, urls)
      collectIds(r.result, toolIds)
      messages.push({ role: 'tool', tool_call_id: r.call_id, content: compactToolResult(r.result) })
    }
  }
  return null
}

export async function askGideonAgent(
  question: string,
  character: Character,
  memory: GideonMemory,
  history: ChatMessage[] = [],
  area?: AreaSignal | null,
  intents: GideonIntent = {},
): Promise<GideonAct | null> {
  // Task 153 §1 — the agent answers from tools, so it gets the slim pack.
  const grounding = buildGrounding(question, character, memory, area, 'slim')
  // Meta Responses first (reasoning continuity); everything else runs the
  // Chat Completions loop (DeepSeek has no `/responses` endpoint).
  if (supportsGideonResponses()) {
    try {
      const act = await viaResponses(question, character, memory, history, grounding, intents, area)
      if (act) return act
    } catch (e) {
      console.warn('[gideon] Responses path unavailable; using Chat Completions.', e)
    }
  }
  return viaChat(question, character, memory, history, grounding, intents, area)
}

/** Reset the threaded response id (e.g. on a new character / new session). */
export function resetGideonSession(): void {
  lastResponseId = undefined
}
