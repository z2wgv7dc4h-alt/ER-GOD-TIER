/**
 * Task 137 §3 — the wiki-step → authored-beat matcher.
 *
 * The entity index merges the wiki DB's ordered NPC walkthrough with the
 * authored `storylines.ts` beats. The old rule attached a wiki step whenever its
 * text merely shared tokens with a beat, which silently glued the wrong step to
 * the wrong beat (and reordered lines). This matcher only attaches a step when
 * there is a real signal:
 *
 *   - the wiki step names a location the beat mentions (`location`), or
 *   - the two share a named item/thing entity (`item`).
 *
 * Token containment is kept only as a tie-breaker among qualifying candidates.
 * When nothing qualifies the wiki step stays a separate ordered step, so the
 * merged list never invents a beat identity.
 *
 * Pure and synchronous, so it is unit-tested against real Sellen/Ranni/Millicent/
 * Alexander fixtures without loading the whole index.
 */

export type WikiStepLike = { location?: string; action?: string; breaks?: boolean }
export type AuthoredBeatLike = { do: string; detail?: string; region?: string; location?: string }

export type StepMatchReason = 'location' | 'item' | 'both'

export type StepMatch = {
  index: number
  score: number
  reason: StepMatchReason
  /** The shared location string or item phrase that justified the match. */
  signal: string
}

export type StepMatchOptions = {
  /**
   * Normalised names of real item/thing entities (single- or multi-word). A
   * shared phrase is the "item overlap" signal.
   */
  entityNames?: ReadonlySet<string>
  /** Wiki step indices already attached to an earlier beat. */
  used?: ReadonlySet<number>
}

function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function norm(value: unknown): string {
  return fold(String(value ?? ''))
    .toLowerCase()
    .replace(/[\u2019'`"]/g, '')
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim()
}

function tokenize(value: string): string[] {
  return norm(value).split(' ').filter(Boolean)
}

/** The first phrase (≤4 words) present in `other` that is a known item entity. */
function sharedItemEntity(text: string, other: string, entityNames: ReadonlySet<string>): string | undefined {
  const words = tokenize(text)
  const haystack = ` ${norm(other)} `
  for (let i = 0; i < words.length; i++) {
    for (let len = 4; len >= 1; len--) {
      if (i + len > words.length) continue
      const phrase = words.slice(i, i + len).join(' ')
      if (phrase.length >= 4 && entityNames.has(phrase) && haystack.includes(` ${phrase} `)) return phrase
    }
  }
  return undefined
}

function containsLocation(beatText: string, beatRegion: string, location: string): string | undefined {
  const hay = ` ${beatText} ${beatRegion} `
  // The wiki location often carries a region prefix and a comma/parenthetical
  // qualifier ("Altus Plateau (Erdtree-Gazing Hill Ruins)"). Each segment is a
  // real place; the beat must name it whole, or lead with a distinctive
  // two/three-word prefix of it (so "Erdtree-Gazing Hill" matches its ruins).
  const segments = location.split(/[(),]/).map(norm).filter((s) => s.length >= 4)
  for (const segment of segments) {
    if (hay.includes(` ${segment} `)) return location
    const words = segment.split(' ').filter(Boolean)
    for (let len = Math.min(3, words.length); len >= 2; len--) {
      if (hay.includes(` ${words.slice(0, len).join(' ')} `)) return location
    }
    if (words[0] && words[0].length >= 8 && hay.includes(` ${words[0]} `)) return location
  }
  return undefined
}

/**
 * The best qualifying wiki step for one authored beat, or null when none carries
 * a location or item signal. `used` steps are skipped so two beats cannot claim
 * the same wiki step.
 */
export function matchWikiStepToBeat(
  beat: AuthoredBeatLike,
  wikiSteps: readonly WikiStepLike[],
  options: StepMatchOptions = {},
): StepMatch | null {
  const entityNames = options.entityNames ?? new Set<string>()
  const used = options.used ?? new Set<number>()
  const beatText = norm(`${beat.do} ${beat.detail ?? ''}`)
  const beatRegion = norm(`${beat.region ?? ''} ${beat.location ?? ''}`)
  const beatTokens = new Set(tokenize(`${beat.do} ${beat.detail ?? ''} ${beat.region ?? ''}`))

  let best: StepMatch | null = null
  wikiSteps.forEach((step, index) => {
    if (used.has(index)) return
    const stepText = `${step.location ?? ''} ${step.action ?? ''}`
    const location = containsLocation(beatText, beatRegion, step.location ?? '')
    const item = sharedItemEntity(stepText, beatText, entityNames)
    if (!location && !item) return

    // Containment only ranks already-qualified candidates.
    const stepTokens = new Set(tokenize(stepText))
    let hit = 0
    for (const token of beatTokens) if (stepTokens.has(token)) hit++
    const containment = beatTokens.size ? hit / beatTokens.size : 0
    const score = (location ? 1 : 0) + (item ? 1 : 0) + containment
    const reason: StepMatchReason = location && item ? 'both' : location ? 'location' : 'item'
    const signal = location ?? item ?? ''
    if (!best || score > best.score) best = { index, score, reason, signal }
  })
  return best
}

/** Build the normalised item-entity name set the matcher's item signal checks. */
export function itemEntityNameSet(names: Iterable<string>): Set<string> {
  const out = new Set<string>()
  for (const raw of names) {
    const name = norm(raw)
    if (name.length >= 4) out.add(name)
  }
  return out
}
