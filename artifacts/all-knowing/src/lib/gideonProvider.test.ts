import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Character } from '../types'
import {
  DEEPSEEK_BASE_URL,
  DEEPSEEK_MODEL,
  DEFAULT_GIDEON_BASE_URL,
  DEFAULT_GIDEON_MODEL,
  isReasoningModel,
  gideonBaseUrl,
  gideonModel,
  gideonProvider,
  gideonProviderId,
} from './gideonProvider'
import { buildGrounding, validateGideonAct } from './gideonLlm'
import { REGULATION_STAMP } from './regulation'

const messages = [
  { role: 'system' as const, content: 'You are Gideon.' },
  { role: 'user' as const, content: 'Where next?' },
]

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

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Gideon provider config (Task 142 §1)', () => {
  it('defaults to Meta and honors an explicit provider', () => {
    vi.stubEnv('VITE_GIDEON_PROVIDER', '')
    vi.stubEnv('VITE_GIDEON_BASE_URL', '')
    expect(gideonProviderId()).toBe('meta')

    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    expect(gideonProviderId()).toBe('deepseek')

    vi.stubEnv('VITE_GIDEON_PROVIDER', ' nope ')
    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.deepseek.com/v1')
    expect(gideonProviderId()).toBe('deepseek')

    vi.stubEnv('VITE_GIDEON_PROVIDER', '')
    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.meta.ai/v1')
    expect(gideonProviderId()).toBe('meta')
  })

  it('picks the dev proxy for the configured provider, explicit base wins', () => {
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'meta')
    vi.stubEnv('VITE_GIDEON_BASE_URL', '')
    expect(gideonBaseUrl()).toBe('/gideon-llm/v1')

    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    expect(gideonBaseUrl()).toBe('/gideon-llm-deepseek/v1')

    vi.stubEnv('VITE_GIDEON_BASE_URL', 'https://api.deepseek.com/v1/')
    expect(gideonBaseUrl()).toBe('https://api.deepseek.com/v1')
  })

  it('resolves per-provider default models and honors an override', () => {
    vi.stubEnv('VITE_GIDEON_PROVIDER', '')
    vi.stubEnv('VITE_GIDEON_BASE_URL', '')
    vi.stubEnv('VITE_GIDEON_MODEL', '')
    expect(gideonModel()).toBe(DEFAULT_GIDEON_MODEL)
    expect(DEFAULT_GIDEON_BASE_URL).toBe('https://api.meta.ai/v1')

    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    expect(gideonModel()).toBe(DEEPSEEK_MODEL)

    vi.stubEnv('VITE_GIDEON_MODEL', 'deepseek-reasoner')
    expect(gideonModel()).toBe('deepseek-reasoner')

    expect(DEEPSEEK_BASE_URL).toBe('https://api.deepseek.com/v1')
  })

  it('flags provider capabilities behind the adapter', () => {
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    vi.stubEnv('VITE_GIDEON_MODEL', '')
    expect(gideonProvider()).toMatchObject({
      label: 'DeepSeek',
      supportsResponses: false,
      supportsVision: false,
      supportsStrictSchema: false,
    })

    vi.stubEnv('VITE_GIDEON_PROVIDER', 'meta')
    expect(gideonProvider()).toMatchObject({
      label: 'Meta Muse',
      supportsResponses: true,
      supportsVision: true,
      supportsStrictSchema: true,
    })
  })
})

describe('Gideon request-shape adapter (Task 142 §1)', () => {
  it('builds the Meta schema-constrained chat + responses attempts', () => {
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'meta')
    vi.stubEnv('VITE_GIDEON_MODEL', '')
    const attempts = gideonProvider().completionBodies(messages, {}, DEFAULT_GIDEON_MODEL)
    expect(attempts.map((a) => a.path)).toEqual(['/chat/completions', '/responses'])

    const chat = attempts[0].body as Record<string, any>
    expect(chat.model).toBe(DEFAULT_GIDEON_MODEL)
    expect(chat.messages).toEqual(messages)
    expect(chat.response_format.type).toBe('json_schema')
    expect(chat.response_format.json_schema.strict).toBe(true)
    expect(chat.reasoning_effort).toBe('minimal')
    expect(chat.prompt_cache_key).toBe('all-knowing-gideon')

    const responses = attempts[1].body as Record<string, any>
    expect(responses.input).toEqual(messages)
    expect(responses.reasoning).toEqual({ effort: 'minimal' })
    expect(responses.messages).toBeUndefined()
  })

  it('builds a single DeepSeek json_object attempt with no strict schema or Meta params', () => {
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    const attempts = gideonProvider().completionBodies(messages, {}, DEEPSEEK_MODEL)
    expect(attempts).toHaveLength(1)
    expect(attempts[0].path).toBe('/chat/completions')
    const body = attempts[0].body as Record<string, any>
    expect(body.model).toBe('deepseek-chat')
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.reasoning_effort).toBeUndefined()
    expect(body.prompt_cache_key).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain('json_schema')
  })

  it('omits temperature for DeepSeek reasoning models', () => {
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    const body = gideonProvider().completionBodies(messages, {}, 'deepseek-reasoner')[0].body as Record<string, unknown>
    expect(body.temperature).toBeUndefined()
    expect(isReasoningModel('deepseek-reasoner')).toBe(true)
    expect(isReasoningModel('deepseek-chat')).toBe(false)
  })

  it('uses OpenAI-style tools on both providers and only constrains the final answer', () => {
    const tools = [{ type: 'function' as const, function: { name: 'search', description: 'd', parameters: {} } }]
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    const deepseek = gideonProvider().chatBody([], tools, {}, DEEPSEEK_MODEL)
    expect(deepseek.tools).toEqual(tools)
    expect(deepseek.tool_choice).toBe('auto')
    expect(deepseek.response_format).toBeUndefined()

    vi.stubEnv('VITE_GIDEON_PROVIDER', 'meta')
    const meta = gideonProvider().chatBody([], tools, {}, DEFAULT_GIDEON_MODEL)
    expect(meta.tools).toEqual(tools)
    expect(meta.response_format).toBeUndefined()

    const metaNoTools = gideonProvider().chatBody([], [], {}, DEFAULT_GIDEON_MODEL)
    const schema = metaNoTools.response_format as Record<string, any>
    expect(schema.json_schema.strict).toBe(true)
  })

  it('keeps the schema in the prompt for DeepSeek and validates client-side', () => {
    vi.stubEnv('VITE_GIDEON_PROVIDER', 'deepseek')
    const grounding = buildGrounding('where next', character, {})
    // DeepSeek json_object may return an act the strict schema would have rejected.
    const validation = validateGideonAct({ say: 'Rest at the grace.', factId: 'boss:not-in-the-pack' }, grounding)
    expect(validation.act).toBeNull()
    expect(validation.rejected.some((r) => r.startsWith('factId:'))).toBe(true)
  })
})
