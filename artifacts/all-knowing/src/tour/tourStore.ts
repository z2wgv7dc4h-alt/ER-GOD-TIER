/**
 * Task 117 §2 — the first-run tour.
 *
 * Five short coach marks that name the four sections and the Quick-log button.
 * It is shown once per device, skippable at any step, and replayable from the
 * header `⋯` menu (`startTour`). All state is a tiny localStorage flag plus an
 * in-memory cache so the "shown once" rule is unit-testable without a DOM.
 */

export type TourStep = {
  id: string
  /** The coach-mark heading — the thing being pointed at. */
  title: string
  /** One short sentence on what it is for. */
  body: string
  /** Best-effort CSS selector to point the mark at; falls back to centre. */
  target?: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'me',
    title: 'Tarnished',
    body: 'Your character and setup — stats, gear, save and profiles.',
    target: '[data-tour="me"]',
  },
  {
    id: 'journey',
    title: 'Journey',
    body: 'What to do now, the area around you, and the map.',
    target: '[data-tour="journey"]',
  },
  {
    id: 'library',
    title: 'Library',
    body: 'Look anything up — and plan builds, PvP and guides.',
    target: '[data-tour="library"]',
  },
  {
    id: 'gideon',
    title: 'Gideon',
    body: 'Ask anything and get an answer grounded in your save.',
    target: '[data-tour="gideon"]',
  },
  {
    id: 'log',
    title: 'Log what you just did',
    body: 'Tap + to mark a boss, item, grace or NPC as done while you play.',
    target: '[data-tour="log"]',
  },
]

export const TOUR_SEEN_KEY = 'all-knowing.tour.seen.v1'

let seenCache: boolean | null = null
let open = false
const listeners = new Set<() => void>()

function emit() {
  for (const cb of [...listeners]) cb()
}

/** Whether the tour has been finished or skipped on this device. */
export function hasSeenTour(): boolean {
  if (seenCache !== null) return seenCache
  try {
    seenCache = typeof localStorage !== 'undefined' && localStorage.getItem(TOUR_SEEN_KEY) === '1'
  } catch {
    seenCache = false
  }
  return seenCache
}

/** Record that the tour has been seen, so it never auto-opens again. */
export function markTourSeen(): void {
  seenCache = true
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(TOUR_SEEN_KEY, '1')
  } catch {
    /* private mode / storage disabled — the flag stays in memory */
  }
  emit()
}

/** Test / replay helper: forget that the tour was seen. */
export function resetTourSeen(): void {
  seenCache = null
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(TOUR_SEEN_KEY)
  } catch {
    /* storage disabled */
  }
  emit()
}

export function tourIsOpen(): boolean {
  return open
}

/** Open the tour (first run, or the explicit replay in the `⋯` menu). */
export function startTour(): void {
  open = true
  emit()
}

/** Close the tour; `seen` marks it completed so it will not auto-open again. */
export function endTour(seen = true): void {
  open = false
  if (seen) markTourSeen()
  else emit()
}

export function subscribeTour(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
