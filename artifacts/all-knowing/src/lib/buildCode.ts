import type { LoadoutSlot, Stats } from '../types'

/**
 * Compact, shareable build codes (Task 47) — stats + level + loadout only, not
 * the whole run. This is deliberately *not* the Task 32 packet: a packet carries
 * evidence/progress; a build code is a short string meant to be pasted into chat.
 *
 * Shape: `akb1.` + base64url(UTF-8 JSON of `{ l, s, k, n? }`), where
 *   l = level, s = the 8 stats in fixed order, k = loadout rows
 *   ([id, name, kind, affinity?, upgrade?]), n = optional short build label.
 *
 * Name decision: the code may carry an optional short *build* label (e.g.
 * "Rivers PvP"), never the Tarnished's name — importing applies stats/level/
 * loadout only, so a shared build cannot rename someone's character.
 */
export const BUILD_CODE_PREFIX = 'akb1.'
export const MAX_BUILD_NAME = 40

const STAT_ORDER = [
  'vigor',
  'mind',
  'endurance',
  'strength',
  'dexterity',
  'intelligence',
  'faith',
  'arcane',
] as const

const SLOT_KINDS = ['armament', 'catalyst', 'shield', 'armor', 'talisman', 'ash'] as const

export type BuildPayload = {
  level: number
  stats: Stats
  loadout: LoadoutSlot[]
  /** Optional short label for the build itself (not the character). */
  name?: string
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function encodeBuildCode(build: BuildPayload): string {
  const stats = STAT_ORDER.map((key) => build.stats[key])
  const loadout = build.loadout.map((slot) => {
    const row: (string | number)[] = [slot.id, slot.name, slot.kind]
    if (slot.affinity) row[3] = slot.affinity
    if (typeof slot.upgrade === 'number') {
      row[3] = row[3] ?? ''
      row[4] = slot.upgrade
    }
    return row
  })
  const payload: Record<string, unknown> = { l: build.level, s: stats, k: loadout }
  const name = build.name?.trim().slice(0, MAX_BUILD_NAME)
  if (name) payload.n = name
  return BUILD_CODE_PREFIX + toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

function fail(message: string): never {
  throw new Error(message)
}

function normalizeSlot(raw: unknown): LoadoutSlot {
  if (!Array.isArray(raw) || typeof raw[0] !== 'string' || typeof raw[1] !== 'string') {
    fail('Build code has an invalid gear slot.')
  }
  const kind = raw[2]
  if (typeof kind !== 'string' || !(SLOT_KINDS as readonly string[]).includes(kind)) {
    fail('Build code has an unknown gear kind.')
  }
  const slot: LoadoutSlot = { id: raw[0], name: raw[1], kind: kind as LoadoutSlot['kind'] }
  if (typeof raw[3] === 'string' && raw[3]) slot.affinity = raw[3]
  if (typeof raw[4] === 'number' && Number.isFinite(raw[4])) slot.upgrade = raw[4]
  return slot
}

function normalizePayload(raw: unknown): BuildPayload {
  if (!raw || typeof raw !== 'object') fail('Build code is malformed (not an object).')
  const o = raw as Record<string, unknown>

  const level = o.l
  if (typeof level !== 'number' || !Number.isFinite(level) || level < 1 || level > 999) {
    fail('Build code has no valid level.')
  }

  const s = o.s
  if (
    !Array.isArray(s) ||
    s.length !== STAT_ORDER.length ||
    !s.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= 99)
  ) {
    fail('Build code has invalid stats.')
  }
  const stats = {} as Stats
  STAT_ORDER.forEach((key, i) => {
    stats[key] = s[i] as number
  })

  const k = o.k
  if (!Array.isArray(k)) fail('Build code has no loadout.')
  const loadout = (k as unknown[]).map(normalizeSlot)

  const name = typeof o.n === 'string' ? o.n.trim().slice(0, MAX_BUILD_NAME) : undefined
  return { level, stats, loadout, name: name || undefined }
}

/** Decode a build code. Throws a readable Error on anything malformed. */
export function decodeBuildCode(code: string): BuildPayload {
  const trimmed = (code ?? '').trim()
  if (!trimmed) fail('Paste a build code first.')
  if (!trimmed.startsWith(BUILD_CODE_PREFIX)) {
    fail(`Not an All-Knowing build code (expected it to start with “${BUILD_CODE_PREFIX}”).`)
  }
  const body = trimmed.slice(BUILD_CODE_PREFIX.length).replace(/\s+/g, '')
  if (!body) fail('Build code is empty.')
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(body)))
  } catch {
    fail('Build code is malformed (could not decode).')
  }
  return normalizePayload(parsed)
}

/** Non-throwing decode for the UI: returns the error text instead of throwing. */
export function tryDecodeBuildCode(
  code: string,
): { ok: true; build: BuildPayload } | { ok: false; error: string } {
  try {
    return { ok: true, build: decodeBuildCode(code) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid build code.' }
  }
}

/** Copy a build code. Same browser path as the packet copy, kept local. */
export async function copyBuildCode(code: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea')
    area.value = code
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  } catch {
    return false
  }
}
