/**
 * Task 152 — word-start name matching for the command palette.
 *
 * The search matchers used raw substring tests (`name.includes(query)`), so a
 * short query like "Omen" also matched "Promenade" mid-word. Matching on word
 * starts keeps useful partial queries ("omen" still finds "Omenkiller") without
 * matching inside a word.
 */

/** Lower-case and fold punctuation to spaces, the form every matcher compares in. */
export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

/**
 * True when `query` meets `name` on a word boundary: the query starts a word in
 * the name (prefix), or the name starts a word in the query. Never matches a
 * term that only appears mid-word, so "omen" does not match "promenade".
 */
export function wordStartMatch(query: string, name: string): boolean {
  const q = normalizeName(query)
  const n = normalizeName(name)
  if (!q || !n) return false
  if (q === n) return true
  return ` ${n}`.includes(` ${q}`) || ` ${q}`.includes(` ${n}`)
}
