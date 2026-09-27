import { useSyncExternalStore } from 'react'
import { emptyCharacter, markers } from '../data/seed'
import { byId } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { allLines } from '../knowledge/storylines'
import { useWorkspaceOptional } from '../state'
import { useSettings } from '../settings/useSettings'
import type { SpoilerLevel } from '../settings/store'
import type { Character } from '../types'
import { canonicalFactId } from './aliases'

/**
 * Task 112 §2 — one spoiler gate for the whole app.
 *
 * Library, Area, Quests and Gideon answers all render names through
 * `EntityLink` and prose through the lore tabs, so the gate lives here and
 * `useSpoiler(factId)` is the single helper callers use. Levels:
 *
 * - `full`  — never hide anything.
 * - `light` — boss names, NPC fates and endings in regions not yet reached are
 *             blurred until tapped.
 * - `none`  — as `light`, and lore tabs for unreached entities are hidden too.
 *
 * A fact the Tarnished has already logged is never a spoiler; a region is
 * "reached" when any logged grace/boss/item/quest lives there or the player
 * named it as their last region.
 */

export type SpoilerKind = 'boss' | 'npc-fate' | 'ending' | 'lore'

/** Kinds whose *name* is blurred in unreached regions. */
const NAME_KINDS = new Set<SpoilerKind>(['boss', 'npc-fate', 'ending'])

function prefixOf(id: string): string {
  return id.split(':')[0] ?? ''
}

/** What kind of spoiler, if any, this fact represents. */
export function spoilerKindOf(factId: string): SpoilerKind | null {
  const id = canonicalFactId(factId)
  const prefix = prefixOf(id)
  if (prefix === 'boss' || prefix === 'bossflag' || prefix === 'invader' || prefix === 'hunt' || prefix === 'area' || prefix === 'enemy') {
    return 'boss'
  }
  if (prefix === 'line') {
    const line = allLines.find((l) => `line:${l.id}` === id || l.id === factId)
    return line?.kind === 'ending' ? 'ending' : 'npc-fate'
  }
  if (prefix === 'ending') return 'ending'
  if (prefix === 'npc' || prefix === 'merchant') return 'npc-fate'
  if (prefix === 'quest' && /fate|dies|dead|death/.test(id)) return 'npc-fate'
  if (prefix === 'item' || prefix === 'weapon' || prefix === 'shield' || prefix === 'armor' || prefix === 'talisman' || prefix === 'spell' || prefix === 'ash' || prefix === 'spirit') {
    return 'lore'
  }
  return null
}

/** Region for a fact, from the seed pins, the area resolver or the catalog. */
export function regionOf(factId: string): string | undefined {
  const id = canonicalFactId(factId)
  const seed = markers.find((m) => m.id === id || m.id === factId)
  if (seed?.region) return seed.region
  return byId.get(id)?.region
}

/** Every region the character has evidence of having visited. */
export function reachedRegionsOf(character: Character): string[] {
  const out = new Set<string>()
  for (const raw of [
    ...character.discoveredGraces,
    ...character.defeatedBosses,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ]) {
    const id = canonicalFactId(raw)
    const region = byId.get(id)?.region ?? markers.find((m) => m.id === id)?.region
    if (region) out.add(region)
  }
  for (const raw of character.discoveredGraces) {
    const id = canonicalFactId(raw)
    const grace = warpGraces.find((g) => g.id === id) ?? warpGraces.find((g) => g.id === raw)
    if (grace?.region) out.add(grace.region)
  }
  if (typeof character.answers.lastRegion === 'string' && character.answers.lastRegion) {
    out.add(character.answers.lastRegion)
  }
  return [...out]
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function regionReached(reached: string[], region?: string): boolean {
  if (!region) return false
  const r = norm(region)
  if (r.length < 4) return false
  return reached.some((x) => {
    const n = norm(x)
    return n.length >= 4 && (n.includes(r) || r.includes(n))
  })
}

function knownFact(character: Character, id: string): boolean {
  const canonical = canonicalFactId(id)
  return [
    ...character.defeatedBosses,
    ...character.discoveredGraces,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ].some((x) => x === id || canonicalFactId(x) === canonical)
}

// --- Reveal memory (session scoped) ----------------------------------------

const revealed = new Set<string>()
const listeners = new Set<() => void>()

export function isRevealed(factId: string): boolean {
  return revealed.has(factId) || revealed.has(canonicalFactId(factId))
}

export function revealSpoiler(factId: string): void {
  revealed.add(factId)
  revealed.add(canonicalFactId(factId))
  for (const cb of [...listeners]) cb()
}

export function resetRevealed(): void {
  revealed.clear()
  for (const cb of [...listeners]) cb()
}

export function subscribeReveal(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/**
 * Pure decision: is this fact's *name* blurred at this level for this character?
 * `revealedIds` defaults to the session reveal set.
 */
export function isSpoiled(
  factId: string,
  character: Character,
  level: SpoilerLevel,
  revealedIds: ReadonlySet<string> = revealed,
): boolean {
  if (level === 'full') return false
  const kind = spoilerKindOf(factId)
  if (!kind || !NAME_KINDS.has(kind)) return false
  const canonical = canonicalFactId(factId)
  if (revealedIds.has(factId) || revealedIds.has(canonical)) return false
  if (knownFact(character, canonical)) return false
  return !regionReached(reachedRegionsOf(character), regionOf(canonical))
}

/** Pure decision: should this fact's lore tab be hidden at this level? */
export function hideLore(
  factId: string,
  character: Character,
  level: SpoilerLevel,
  revealedIds: ReadonlySet<string> = revealed,
): boolean {
  if (level !== 'none') return false
  const canonical = canonicalFactId(factId)
  if (revealedIds.has(factId) || revealedIds.has(canonical)) return false
  if (knownFact(character, canonical)) return false
  return !regionReached(reachedRegionsOf(character), regionOf(canonical))
}

export type SpoilerState = {
  /** True when the caller should veil the content. */
  hidden: boolean
  revealed: boolean
  kind: SpoilerKind | null
  reveal: () => void
}

/**
 * The one helper. `mode` picks between blurring a name and hiding a lore block;
 * both consult the same settings + character + reveal set.
 */
export function useSpoiler(factId: string, mode: 'name' | 'lore' = 'name'): SpoilerState {
  const workspace = useWorkspaceOptional()
  const character = workspace?.character ?? emptyCharacter
  const settings = useSettings()
  const revealedNow = useSyncExternalStore(
    subscribeReveal,
    () => isRevealed(factId),
    () => false,
  )
  const kind = spoilerKindOf(factId)
  // Outside the provider (a unit-rendered panel) there is no character to judge
  // "reached", so nothing is hidden.
  const hidden = !workspace
    ? false
    : mode === 'lore'
      ? hideLore(factId, character, settings.spoiler)
      : isSpoiled(factId, character, settings.spoiler)
  return {
    hidden: hidden && !revealedNow,
    revealed: revealedNow,
    kind,
    reveal: () => revealSpoiler(factId),
  }
}
