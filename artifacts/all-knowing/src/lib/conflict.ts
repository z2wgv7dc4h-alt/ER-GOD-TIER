import type { Evidence, EvidenceClaim, EvidenceSource, FactState } from '../types'

/**
 * Conflict rules (SCOPE item #5).
 *
 * When two sources disagree about the same fact, the winner is decided by the
 * authority of the source, not by which call happened to run first:
 *
 * | Winner                        | When                        |
 * |-------------------------------|-----------------------------|
 * | save flag                     | PC parser trusted           |
 * | later screenshot + match      | PS5, no save                |
 * | explicit answer               | user overrides inference    |
 * | inference                     | never beats a direct source |
 *
 * The loser is never discarded: every entry stays on `character.evidence[]`,
 * and `applyFacts` / `denyFacts` recompute the fact's state from the full
 * evidence list. See `reconcileFacts()` in `infer.ts`.
 */

export type ConflictOptions = {
  /**
   * Whether the PC save parser's flags are trusted (SCOPE #1). An untrusted
   * save carries no authority — its rows resolve to `unknown` rather than
   * silently flipping a fact. Defaults to `true`; the Task 11 parser is real.
   */
  trustedSave?: boolean
}

/** Authority rank. Higher wins. An untrusted save drops to 0. */
export function sourceRank(source: EvidenceSource, trustedSave = true): number {
  switch (source) {
    case 'save':
      return trustedSave ? 40 : 0
    case 'screenshot':
      return 30
    case 'answer':
      return 20
    case 'inference':
      return 10
  }
}

export function claimOf(e: Evidence): EvidenceClaim {
  return e.claim ?? 'true'
}

export type ConflictResolution = {
  winner: Evidence
  loser: Evidence
  /** Human-readable reason, for tests and diagnostics. */
  reason: string
}

/**
 * Resolve two evidence entries that disagree about the same fact.
 *
 * `b` is treated as the more recently recorded entry, so an exact tie (same
 * rank, same timestamp) falls to `b`. That makes a later denial beat an
 * earlier assertion from an equally-authoritative source.
 */
export function resolveConflict(a: Evidence, b: Evidence, opts: ConflictOptions = {}): ConflictResolution {
  if (a.fact !== b.fact) {
    throw new Error(`resolveConflict called with different facts: ${a.fact} vs ${b.fact}`)
  }
  const trusted = opts.trustedSave ?? true
  const ra = sourceRank(a.source, trusted)
  const rb = sourceRank(b.source, trusted)
  if (ra !== rb) {
    const aWins = ra > rb
    return {
      winner: aWins ? a : b,
      loser: aWins ? b : a,
      reason: `${aWins ? a.source : b.source} outranks ${aWins ? b.source : a.source}`,
    }
  }
  if (a.at !== b.at) {
    const aWins = a.at > b.at
    return {
      winner: aWins ? a : b,
      loser: aWins ? b : a,
      reason: 'later evidence wins at equal authority',
    }
  }
  return { winner: b, loser: a, reason: 'tie broken in favour of the later-recorded entry' }
}

export type FactResolution = {
  state: FactState
  winner?: Evidence
  /** Every other entry for the fact — kept, never dropped. */
  losers: Evidence[]
}

/**
 * Pick the winning evidence for one fact and derive its three-state value.
 * An empty list, or a winner with zero authority (untrusted save), is
 * `unknown` — we have not been told, rather than been told “no”.
 */
export function resolveClaim(evidence: Evidence[], fact: string, opts: ConflictOptions = {}): FactResolution {
  const entries = evidence.filter((e) => e.fact === fact)
  if (entries.length === 0) return { state: 'unknown', losers: [] }

  const winner = entries.reduce((acc, e) => resolveConflict(acc, e, opts).winner)
  const losers = entries.filter((e) => e !== winner)
  const trusted = opts.trustedSave ?? true
  if (sourceRank(winner.source, trusted) === 0) return { state: 'unknown', winner, losers }
  return { state: claimOf(winner) === 'false' ? 'false' : 'true', winner, losers }
}
