import type { Section } from '../types'

/**
 * Task 112 §1 — device-level player settings.
 *
 * These are preferences about the second screen itself (text size, motion,
 * default landing, spoiler appetite, haptics), not facts about a Tarnished, so
 * they live in one small localStorage document rather than in the vault. The
 * module is deliberately dependency-free and synchronous: `getSettings()` is
 * safe to call from a boot path, and React subscribes through `useSettings()`.
 *
 * Spoiler level is the exception the rest of the app reads most: see
 * `src/lib/spoilers.ts`. Both the store and the spoiler helper share this type.
 */

export type TextSize = 'S' | 'M' | 'L'
export type SpoilerLevel = 'none' | 'light' | 'full'

export type Settings = {
  textSize: TextSize
  reduceMotion: boolean
  /** Where a fresh Tarnished lands on open. */
  landing: Section
  spoiler: SpoilerLevel
  haptics: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  textSize: 'M',
  reduceMotion: false,
  landing: 'journey',
  spoiler: 'light',
  haptics: true,
}

export const SETTINGS_KEY = 'all-knowing.settings.v1'

export const LANDING_SECTIONS: { id: Section; label: string }[] = [
  { id: 'journey', label: 'Journey' },
  { id: 'me', label: 'Tarnished' },
  { id: 'library', label: 'Library' },
  { id: 'gideon', label: 'Gideon' },
]

const LANDINGS = LANDING_SECTIONS.map((s) => s.id)

/** Coerce anything that came out of localStorage (or a stale vault) to a valid Settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const textSize: TextSize = o.textSize === 'S' || o.textSize === 'L' ? o.textSize : DEFAULT_SETTINGS.textSize
  const spoiler: SpoilerLevel = o.spoiler === 'none' || o.spoiler === 'full' ? o.spoiler : DEFAULT_SETTINGS.spoiler
  const landing = LANDINGS.includes(o.landing as Section) ? (o.landing as Section) : DEFAULT_SETTINGS.landing
  return {
    textSize,
    reduceMotion: typeof o.reduceMotion === 'boolean' ? o.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
    landing,
    spoiler,
    haptics: typeof o.haptics === 'boolean' ? o.haptics : DEFAULT_SETTINGS.haptics,
  }
}

function readFromStorage(): Settings {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return sanitizeSettings(JSON.parse(raw))
  } catch { /* storage disabled or corrupt */ }
  return DEFAULT_SETTINGS
}

let current: Settings | null = null
const listeners = new Set<() => void>()

/** The current settings. Reads localStorage once, then serves the cached value. */
export function getSettings(): Settings {
  if (!current) current = readFromStorage()
  return current
}

/** Merge a patch, persist it, and notify subscribers. Returns the new settings. */
export function setSettings(patch: Partial<Settings>): Settings {
  current = sanitizeSettings({ ...getSettings(), ...patch })
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SETTINGS_KEY, JSON.stringify(current))
  } catch { /* quota / disabled */ }
  for (const cb of [...listeners]) cb()
  return current
}

export function subscribeSettings(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/** Test helper: forget the cached read so the next get re-reads storage. */
export function resetSettings(): void {
  current = null
}
