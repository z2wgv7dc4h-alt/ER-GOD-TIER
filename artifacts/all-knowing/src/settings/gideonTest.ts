import {
  callGideonLlm,
  DEFAULT_GIDEON_TIMEOUT_MS,
  gideonKey,
  gideonModel,
  gideonProvider,
  hasGideonKey,
  type ChatMessage,
} from '../lib/muse'

export type ConnectionResult = { ok: boolean; detail: string }

/**
 * Task 112 §1 — the "Test connection" button.
 *
 * Cheap by design: one tiny schema-constrained ping through the same transport
 * Gideon uses, so it proves the key, the provider, the base URL and the route all
 * work. Task 142 §3: it uses the *same 45 s timeout as real calls* (12 s aborted
 * on a slow reasoning model), reports the provider + model + latency, and on
 * failure surfaces the HTTP status / error body summary — redacting the key.
 * The router is always available, so a missing key is reported as such rather
 * than as a failure. `deps` is injectable so the pure decision logic is unit-
 * tested without a network.
 */
export async function testGideonConnection(deps: {
  hasKey?: () => boolean
  model?: () => string
  provider?: () => string
  call?: (messages: ChatMessage[]) => Promise<unknown>
  now?: () => number
} = {}): Promise<ConnectionResult> {
  const hasKey = (deps.hasKey ?? hasGideonKey)()
  if (!hasKey) {
    return { ok: false, detail: 'No key configured — Gideon runs on the deterministic router only.' }
  }
  const model = (deps.model ?? gideonModel)()
  const provider = (deps.provider ?? (() => gideonProvider().label))()
  const call = deps.call ?? ((messages: ChatMessage[]) =>
    callGideonLlm(messages, { timeoutMs: DEFAULT_GIDEON_TIMEOUT_MS, maxTokens: 200 }))
  const messages: ChatMessage[] = [
    { role: 'system', content: 'Reply with json: {"say":"pong"}' },
    { role: 'user', content: 'ping' },
  ]
  const now = deps.now ?? Date.now
  const started = now()
  try {
    const out = await call(messages)
    const latency = Math.max(0, now() - started)
    const say = out && typeof out === 'object' ? (out as { say?: unknown }).say : undefined
    const reply = typeof say === 'string' && say.trim()
      ? ` replied “${say.trim().slice(0, 60)}”`
      : ' responded'
    return { ok: true, detail: `${provider} · ${model}${reply} in ${latency} ms.` }
  } catch (err) {
    const latency = Math.max(0, now() - started)
    return { ok: false, detail: `${provider} · ${model} failed in ${latency} ms: ${summarizeError(err)}` }
  }
}

/** HTTP status + error-body summary, with the API key redacted, never echoed. */
function summarizeError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err)).trim()
  const key = gideonKey()
  const safe = key ? raw.split(key).join('***') : raw
  return safe || 'Connection failed.'
}
