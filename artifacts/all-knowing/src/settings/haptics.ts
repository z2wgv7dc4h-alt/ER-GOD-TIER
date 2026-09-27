import { getSettings, type Settings } from './store'

type Vibrator = { vibrate?: (pattern: number | number[]) => boolean }

/**
 * Task 112 §5 — a 15 ms tick on log / mark / apply when the player enabled
 * haptics. Guarded twice: the setting, and `navigator.vibrate` existing at all
 * (iOS Safari has none). Never throws from a render-path side effect.
 */
export function haptic(
  pattern: number | number[] = 15,
  deps: { settings?: Pick<Settings, 'haptics'>; nav?: Vibrator } = {},
): boolean {
  const settings = deps.settings ?? getSettings()
  if (!settings.haptics) return false
  const nav = deps.nav ?? (typeof navigator !== 'undefined' ? (navigator as Vibrator) : undefined)
  if (!nav || typeof nav.vibrate !== 'function') return false
  try {
    return nav.vibrate(pattern)
  } catch {
    return false
  }
}
