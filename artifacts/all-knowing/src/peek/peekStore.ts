/**
 * Task 115 §1 — the single shared peek.
 *
 * Only one peek card is open at a time, no matter how many `EntityLink`s and
 * `<Term>`s are on the page. They all publish into this tiny external store and
 * the active one renders into the one shared portal host. That keeps the DOM to
 * a single card and makes "opening another thing closes the last" free.
 */

export type PeekTarget = {
  /** Unique per trigger (a React `useId`), so the owner can tell if it is active. */
  key: string
  /** Canonical or raw entity id to preview. */
  id: string
  /** The element the card is anchored to. */
  anchor: HTMLElement
  /** Term tooltips suppress the "Show on map" action. */
  variant?: 'entity' | 'term'
}

let active: PeekTarget | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribePeek(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPeek(): PeekTarget | null {
  return active
}

export function openPeek(target: PeekTarget): void {
  active = target
  emit()
}

/** Close the peek, or only when `key` still owns it. */
export function closePeek(key?: string): void {
  if (!active) return
  if (key && active.key !== key) return
  active = null
  emit()
}

let host: HTMLElement | null = null

/** The one shared portal host, created on first use and reused forever. */
export function peekHost(): HTMLElement {
  if (!host) {
    host = document.createElement('div')
    host.className = 'peek-host'
    document.body.appendChild(host)
  }
  return host
}
