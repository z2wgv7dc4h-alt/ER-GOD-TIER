/**
 * Recently-viewed history (Task 51).
 *
 * Every real navigation in the app goes through `setSelectedMarkerId`, so the
 * provider records it here — Atlas pins, Codex entries, Related links, Gideon
 * answers, Reckon receipts, Thread jump-backs and the palette all land in the same
 * list. This module is pure so the ordering/bounding rules are unit-tested; the
 * UI (`Recents`) only renders it.
 *
 * The list is session state, deliberately not part of the persisted per-profile
 * `VaultUi`: switching profiles clears it (Task 30's isolation), and it can never
 * be reloaded from another character's vault.
 */
export const RECENT_CAP = 12

/** Newest first, one entry per id, re-selecting moves it to the front. */
export function pushRecent(facts: string[], id: string): string[] {
  if (!id) return facts
  return [id, ...facts.filter((x) => x !== id)].slice(0, RECENT_CAP)
}

/**
 * What the history becomes when the active profile changes. Exported (rather than
 * an inline `[]`) so the isolation contract is asserted by a test — switching
 * Tarnished must never carry the previous one's recents over.
 */
export function recentAfterProfileSwitch(): string[] {
  return []
}
