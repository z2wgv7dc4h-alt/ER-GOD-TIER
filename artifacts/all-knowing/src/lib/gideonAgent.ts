import type { Character } from '../types'
import { GIDEON_TOOLS, runGideonTool, type ToolContext } from './gideonTools'
import { callGideonChat, type AgentMessage, type AgentTool, type ChatMessage } from './muse'
import { buildGrounding, gideonMessages, validateGideonAct } from './gideonLlm'
import type { GideonAct, GideonMemory } from './gideon'

/**
 * The tool-calling loop. Muse is given our deterministic functions as tools;
 * it either calls one (we run it on the real data and feed the result back) or
 * emits the final act JSON, which is validated against the grounding exactly as
 * the plain path. Bounded turns, so a runaway loop can never hang the UI; any
 * throw propagates to `askGideon`, which falls back to the deterministic router.
 */
const MAX_STEPS = 4
// Optional server-side web search (built-in tool). Off unless enabled, since it
// may not be permitted for every key/tier.
const WEB_SEARCH = import.meta.env.VITE_GIDEON_WEB_SEARCH === '1'

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

export async function askGideonAgent(
  question: string,
  character: Character,
  memory: GideonMemory,
  history: ChatMessage[] = [],
): Promise<GideonAct | null> {
  const grounding = buildGrounding(question, character, memory)
  const messages: AgentMessage[] = gideonMessages(question, grounding, history).map((m) => ({
    role: m.role,
    content: m.content,
  }))
  const tools: AgentTool[] = WEB_SEARCH ? [{ type: 'web_search' }, ...GIDEON_TOOLS] : GIDEON_TOOLS
  const ctx: ToolContext = { character, memory }

  for (let step = 0; step < MAX_STEPS; step++) {
    const { content, toolCalls } = await callGideonChat(messages, tools)
    if (toolCalls.length === 0) {
      const raw = parseJson(content)
      if (!raw) return null
      return validateGideonAct(raw, grounding).act
    }
    // The full assistant message (with tool_calls) must precede the results.
    messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls.map((t) => ({
        id: t.id,
        type: 'function' as const,
        function: { name: t.name, arguments: t.arguments },
      })),
    })
    for (const t of toolCalls) {
      const result = await runGideonTool(t.name, parseArgs(t.arguments), ctx).catch((e) => ({
        error: String(e),
      }))
      messages.push({ role: 'tool', tool_call_id: t.id, content: JSON.stringify(result).slice(0, 4000) })
    }
  }
  return null
}
