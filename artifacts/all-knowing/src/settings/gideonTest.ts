import { callGideonLlm } from '../lib/muse'
import { gideonModel, hasGideonKey, type ChatMessage } from '../lib/muse'

export type ConnectionResult = { ok: boolean; detail: string }

/**
 * Task 112 §1 — the "Test connection" button.
 *
 * Cheap by design: one tiny schema-constrained ping through the same transport
 * Gideon uses, so it proves the key, the base URL and the route all work. The
 * router is always available, so a missing key is reported as such rather than
 * as a failure. `deps` is injectable so the pure decision logic is unit-tested
 * without a network.
 */
export async function testGideonConnection(deps: {
  hasKey?: () => boolean
  model?: () => string
  call?: (messages: ChatMessage[]) => Promise<unknown>
} = {}): Promise<ConnectionResult> {
  const hasKey = (deps.hasKey ?? hasGideonKey)()
  if (!hasKey) {
    return { ok: false, detail: 'No key configured — Gideon runs on the deterministic router only.' }
  }
  const model = (deps.model ?? gideonModel)()
  const call = deps.call ?? ((messages: ChatMessage[]) => callGideonLlm(messages, { timeoutMs: 12000, maxTokens: 200 }))
  const messages: ChatMessage[] = [
    { role: 'system', content: 'Reply with json: {"say":"pong"}' },
    { role: 'user', content: 'ping' },
  ]
  try {
    const out = await call(messages)
    const say = out && typeof out === 'object' ? (out as { say?: unknown }).say : undefined
    return {
      ok: true,
      detail: typeof say === 'string' && say.trim()
        ? `${model} replied “${say.trim().slice(0, 60)}”.`
        : `${model} responded.`,
    }
  } catch (err) {
    return { ok: false, detail: (err as Error).message || 'Connection failed.' }
  }
}
