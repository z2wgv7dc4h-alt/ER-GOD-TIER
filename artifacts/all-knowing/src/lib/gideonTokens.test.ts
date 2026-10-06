import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Character } from '../types'
import { REGULATION_STAMP } from './regulation'
import { askGideonAgent, compactToolResult } from './gideonAgent'
import { askGideon, askGideonRouter, clearGideonAnswerCache } from './gideon'
import { buildGrounding, gideonMessages } from './gideonLlm'
import { gideonProvider } from './gideonProvider'
import { GIDEON_TOOLS, MAX_GIDEON_TOOLS, selectGideonTools, type GideonIntent } from './gideonTools'
import {
  beginGideonUsage,
  callGideonChat,
  clearGideonUsage,
  endGideonUsage,
  gideonUsageSummary,
} from './muse'

const character: Character = {
  source: 'reckon',
  platform: 'ps5',
  regulation: REGULATION_STAMP,
  name: 'Tarnished',
  level: 40,
  startingClass: 'vagabond',
  stats: { vigor: 20, mind: 10, endurance: 15, strength: 20, dexterity: 12, intelligence: 9, faith: 9, arcane: 7 },
  loadout: [],
  defeatedBosses: [],
  discoveredGraces: [],
  collectedItems: [],
  completedQuestSteps: [],
  deniedFacts: [],
  answers: {},
  evidence: [],
  shots: [],
}

const OPEN_QUESTION = 'Which ending should I chase if I want faith and I killed Seluvis?'

const SAMPLES = [
  'where do I find the Moonveil katana',
  'Godrick strategy',
  'where is Ranni',
  'what level for Caelid',
  'upgrade my weapon',
]

const API_URL = /\/chat\/completions$|\/responses$/

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** Any non-API fetch (sourced data) gets an empty JSON array so loaders settle. */
function dataResponse() {
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
}

function apiCalls(fetchMock: ReturnType<typeof vi.fn>): number {
  return fetchMock.mock.calls.filter((call) => API_URL.test(String((call as unknown[])[0]))).length
}

function stubDeepseek() {
  vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
  vi.stubEnv('VITE_GIDEON_API_KEY', 'test-key')
  vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.deepseek.com/v1')
  vi.stubEnv('VITE_GIDEON_MODEL', '')
}

beforeEach(() => {
  clearGideonAnswerCache()
  clearGideonUsage()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Task 153 §1 — slim grounding', () => {
  it('is at most 1,500 characters for every sample question', () => {
    for (const question of SAMPLES) {
      const g = buildGrounding(question, character, {}, undefined, 'slim')
      expect(g.text.length, question).toBeLessThanOrEqual(1500)
    }
  })

  it('is smaller than the full pack but still carries matched ids', () => {
    const full = buildGrounding('where do I find the Moonveil katana', character, {}, undefined, 'full')
    const slim = buildGrounding('where do I find the Moonveil katana', character, {}, undefined, 'slim')
    expect(slim.text.length).toBeLessThan(full.text.length)
    expect(slim.factIds.size).toBeGreaterThan(0)
  })
})

describe('Task 153 §2 — tool subset', () => {
  const intents: GideonIntent = {
    combat: true,
    placements: true,
    guides: true,
    weapons: true,
    levels: true,
    dialogue: true,
    medusa: true,
    quests: true,
  }

  it('never exceeds 8 tools', () => {
    expect(selectGideonTools(intents).length).toBeLessThanOrEqual(MAX_GIDEON_TOOLS)
  })

  it('keeps the canonical order and is stable for the same intent set', () => {
    const a = selectGideonTools(intents).map((t) => t.function.name)
    const b = selectGideonTools(intents).map((t) => t.function.name)
    expect(a).toEqual(b)
    const canonical = GIDEON_TOOLS.filter((t) => a.includes(t.function.name)).map((t) => t.function.name)
    expect(a).toEqual(canonical)
  })

  it('always includes the entity-lookup core', () => {
    const names = selectGideonTools({}).map((t) => t.function.name)
    expect(names).toContain('search')
    expect(names).toContain('get_entity')
    expect(names).toContain('wiki_search')
  })
})

describe('Task 153 §3 — agent loop limits', () => {
  it('stops after 3 steps and every tool result is <= 1,500 characters', async () => {
    stubDeepseek()
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (API_URL.test(String(url))) {
        return jsonResponse({
          choices: [
            {
              message: {
                content: '',
                tool_calls: [{ id: 'c1', function: { name: 'search', arguments: '{"q":"godrick"}' } }],
              },
            },
          ],
        })
      }
      return dataResponse()
    })
    vi.stubGlobal('fetch', fetchMock)

    const act = await askGideonAgent(
      'where do I find the Moonveil katana',
      character,
      {},
      [],
      undefined,
      { placements: true },
    )
    expect(act).toBeNull()
    expect(apiCalls(fetchMock)).toBe(3)

    let toolMessages = 0
    for (const call of fetchMock.mock.calls) {
      if (!API_URL.test(String(call[0]))) continue
      const body = JSON.parse((call[1] as RequestInit).body as string) as {
        messages?: { role?: string; content?: unknown }[]
      }
      for (const m of body.messages ?? []) {
        if (m.role === 'tool') {
          toolMessages += 1
          expect(String(m.content).length).toBeLessThanOrEqual(1500)
        }
      }
    }
    expect(toolMessages).toBe(3)
  })

  it('drops empty fields and caps the compact tool result', () => {
    const out = compactToolResult({ id: 'boss:godrick', empty: null, note: '', nested: { a: undefined }, list: [] })
    expect(out).toBe('{"id":"boss:godrick"}')
  })
})

describe('Task 153 §3 — API error goes straight to the fallback', () => {
  it('makes exactly one agent fetch and no second full completion', async () => {
    stubDeepseek()
    const fetchMock = vi.fn(async (url: string) => {
      if (API_URL.test(String(url))) return jsonResponse({ error: 'boom' }, 500)
      return dataResponse()
    })
    vi.stubGlobal('fetch', fetchMock)

    const act = await askGideon(OPEN_QUESTION, character)
    expect(apiCalls(fetchMock)).toBe(1)
    expect(act).toEqual(askGideonRouter(OPEN_QUESTION, character))
  })
})

describe('Task 153 §4 — output cap', () => {
  it('defaults max_tokens to 500', () => {
    stubDeepseek()
    const body = gideonProvider().chatBody([], [], {}, 'deepseek-chat')
    expect(body.max_tokens).toBe(500)
  })
})

describe('Task 153 §5 — cache-friendly message order', () => {
  it('puts the constant system prompt first, history next, the grounding question last', () => {
    const g = buildGrounding(OPEN_QUESTION, character, {}, undefined, 'slim')
    const history = [
      { role: 'user' as const, content: 'earlier question' },
      { role: 'assistant' as const, content: 'earlier answer' },
    ]
    const messages = gideonMessages(OPEN_QUESTION, g, history)
    expect(messages[0].role).toBe('system')
    expect(messages[1]).toEqual(history[0])
    expect(messages[2]).toEqual(history[1])
    expect(messages[messages.length - 1].role).toBe('user')
    expect(messages[messages.length - 1].content).toContain(OPEN_QUESTION)
  })
})

describe('Task 153 §6 — usage counter', () => {
  it('records and sums usage per answer', async () => {
    stubDeepseek()
    const usage = {
      prompt_tokens: 100,
      completion_tokens: 20,
      prompt_cache_hit_tokens: 40,
      prompt_cache_miss_tokens: 60,
    }
    const fetchMock = vi.fn(async (url: string) => {
      if (API_URL.test(String(url))) {
        return jsonResponse({ choices: [{ message: { content: '{"say":"ok"}' } }], usage })
      }
      return dataResponse()
    })
    vi.stubGlobal('fetch', fetchMock)

    beginGideonUsage()
    await callGideonChat([{ role: 'user', content: 'hi' }], [])
    await callGideonChat([{ role: 'user', content: 'hi' }], [])
    endGideonUsage()

    const summary = gideonUsageSummary()
    expect(summary.last.calls).toBe(2)
    expect(summary.last.prompt).toBe(200)
    expect(summary.last.completion).toBe(40)
    expect(summary.last.cached).toBe(80)
    expect(summary.today.calls).toBe(2)
  })
})

describe('Task 153 §7 — answer cache', () => {
  it('answers the same question twice with a single API fetch', async () => {
    stubDeepseek()
    const fetchMock = vi.fn(async (url: string) => {
      if (API_URL.test(String(url))) {
        return jsonResponse({ choices: [{ message: { content: '{"say":"Chase the Age of Stars."}' } }] })
      }
      return dataResponse()
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = await askGideon(OPEN_QUESTION, character)
    const second = await askGideon(OPEN_QUESTION, character)
    expect(second).toEqual(first)
    expect(apiCalls(fetchMock)).toBe(1)
  })
})

describe('Task 153 — request-size report', () => {
  /** Mirrors the intent flags `askGideon` computes, for the size measurement. */
  function intentsFor(ql: string): GideonIntent {
    const has = (re: RegExp) => re.test(ql)
    return {
      combat: has(/\b(stuck|wipe|cannot|can't beat|help with)\b/),
      placements: has(/\b(where|find|locate)\b/),
      guides: has(/\b(how|guide|upgrade|smithing|somber|bell bearing|talisman|incantation|sorcer|damage type|stats?|buff|craft|recipe|cookbook)\b/),
      weapons: has(/\b(upgrade|reinforce|respec|rebirth|different weapon|switch weapons?|stat allocation|best weapons?|early weapons?|strong weapons?|good weapons?)\b/),
      levels: has(/\b(what level|recommended level|before i (go|leave|move)|what should i do|what now|what next)\b/),
    }
  }

  it('prints before/after request characters for the sample questions', () => {
    // The brief's pre-task measurement for the 21-tool schema. Used as the
    // "before" tool-definition size; the trimmed schema size is logged too.
    const BEFORE_TOOL_CHARS = 7216
    const afterToolChars = JSON.stringify(GIDEON_TOOLS).length
    let beforeTotal = 0
    let afterTotal = 0
    for (const question of SAMPLES) {
      const full = buildGrounding(question, character, {}, undefined, 'full')
      const slim = buildGrounding(question, character, {}, undefined, 'slim')
      const system = gideonMessages(question, full)[0].content.length
      const beforeUser = `Grounding pack (json):\n${full.text}\n\nTarnished's question: ${question}`.length
      const afterUser = `Grounding pack (json):\n${slim.text}\n\nTarnished's question: ${question}`.length
      const afterTools = JSON.stringify(selectGideonTools(intentsFor(question))).length
      const before = system + beforeUser + BEFORE_TOOL_CHARS
      const after = system + afterUser + afterTools
      beforeTotal += before
      afterTotal += after
      expect(after).toBeLessThan(before)
      // eslint-disable-next-line no-console
      console.log(
        `[153] ${question}: before ${before} chars -> after ${after} chars ` +
          `(grounding ${full.text.length}->${slim.text.length}, tools ${BEFORE_TOOL_CHARS}->${afterTools})`,
      )
    }
    // eslint-disable-next-line no-console
    console.log(`[153] TOTAL before ${beforeTotal} chars -> after ${afterTotal} chars; trimmed 21-tool schema now ${afterToolChars} chars`)
  })
})
