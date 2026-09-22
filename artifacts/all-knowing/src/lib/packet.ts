import { emptyCharacter } from '../data/seed'
import { byId } from '../knowledge/catalog'
import type { Character, Evidence, EvidenceSource, FactState } from '../types'
import { resolveClaim, resolveConflict, type ConflictOptions } from './conflict'
import { prefixKind, reconcileFacts } from './infer'
import { REGULATION_STAMP } from './regulation'

export const PACKET_VERSION = 1

export type Packet = {
  kind: 'all-knowing.packet'
  version: number
  regulation: string
  exportedAt: number
  character: Character
}

export function toPacket(character: Character): Packet {
  return {
    kind: 'all-knowing.packet',
    version: PACKET_VERSION,
    regulation: REGULATION_STAMP,
    exportedAt: Date.now(),
    character: { ...character, shots: [] },
  }
}

export function fromPacket(raw: unknown): Character {
  const doc = raw as Packet
  if (!doc || doc.kind !== 'all-knowing.packet') throw new Error('Not an All-Knowing packet.')
  const regulation = doc.character?.regulation || doc.regulation || emptyCharacter.regulation
  return { ...emptyCharacter, ...doc.character, regulation, shots: [] }
}

function setOf(c: Character) {
  return new Set([
    ...c.defeatedBosses,
    ...c.discoveredGraces,
    ...c.collectedItems,
    ...c.completedQuestSteps,
  ])
}

export function diffPackets(current: Character, other: Character) {
  const a = setOf(current)
  const b = setOf(other)
  const onlyHere = [...a].filter((id) => !b.has(id))
  const onlyThere = [...b].filter((id) => !a.has(id))
  return { onlyHere, onlyThere, same: a.size - onlyHere.length }
}

function union(a: string[] = [], b: string[] = []) {
  return [...new Set([...a, ...b])]
}

/**
 * Every fact a character currently lists as true or false. Used by the diff so
 * packets that predate `evidence[]` (list-only) still compare sensibly.
 */
function knownFacts(c: Character) {
  return [
    ...c.defeatedBosses,
    ...c.discoveredGraces,
    ...c.collectedItems,
    ...c.completedQuestSteps,
    ...(c.deniedFacts || []),
  ]
}

function listState(c: Character, fact: string): FactState {
  const known = setOf(c)
  if (known.has(fact)) return 'true'
  if ((c.deniedFacts || []).includes(fact)) return 'false'
  return 'unknown'
}

/** The strongest entry in a list, by Task 24's authority rules. */
function strongest(entries: Evidence[], opts: ConflictOptions): Evidence | undefined {
  return entries.reduce<Evidence | undefined>(
    (acc, e) => (acc ? resolveConflict(acc, e, opts).winner : e),
    undefined,
  )
}

/**
 * Combine two characters' evidence without dropping the loser (SCOPE #5).
 * Entries are keyed by id — the same id is the same recorded assertion, so the
 * later copy wins if timestamps differ.
 */
export function mergeEvidence(a: Evidence[], b: Evidence[]): Evidence[] {
  const byEvidenceId = new Map<string, Evidence>()
  for (const e of [...a, ...b]) {
    const prev = byEvidenceId.get(e.id)
    if (!prev || e.at >= prev.at) byEvidenceId.set(e.id, e)
  }
  return [...byEvidenceId.values()]
}

/**
 * Import a packet by merging it into the local character rather than replacing
 * it. Local and imported evidence are pooled and `reconcileFacts` re-derives
 * each fact from the full list, so Task 24's authority rules pick the winner
 * and the losing entry stays on `evidence[]`.
 */
export function mergePacket(current: Character, other: Character, opts: ConflictOptions = {}): Character {
  const evidence = mergeEvidence(current.evidence, other.evidence)
  const factIds = [...new Set(evidence.map((e) => e.fact))]
  const next: Character = {
    ...current,
    source: current.source === 'empty' ? other.source : current.source,
    evidence,
    defeatedBosses: union(current.defeatedBosses, other.defeatedBosses),
    discoveredGraces: union(current.discoveredGraces, other.discoveredGraces),
    collectedItems: union(current.collectedItems, other.collectedItems),
    completedQuestSteps: union(current.completedQuestSteps, other.completedQuestSteps),
    deniedFacts: union(current.deniedFacts, other.deniedFacts),
  }
  return reconcileFacts(next, factIds, opts)
}

export type PacketDiffKind = 'added' | 'flipped' | 'lost'

export type PacketDiffRow = {
  fact: string
  /** Catalog kind (boss / grace / item / quest / region) for display grouping. */
  kind: string
  before: FactState
  after: FactState
  /** What the imported packet alone asserts about the fact. */
  incoming: FactState
  /** Source of the evidence that wins the merged fact, per `conflict.ts`. */
  winner?: EvidenceSource
  /** True when the merged winner is evidence the packet brought. */
  importedWins: boolean
  reason: string
}

export type PacketDiff = {
  /** Facts the packet adds that were not already true locally. */
  added: PacketDiffRow[]
  /** Facts whose state would flip (true → false). */
  flipped: PacketDiffRow[]
  /** Facts the packet disagrees on but loses to higher-authority local evidence. */
  lost: PacketDiffRow[]
  same: number
}

/**
 * Real diff between local state and an imported packet, decided by
 * `resolveClaim` on the pooled evidence — not a set difference. Each fact the
 * packet has an opinion on is classified as added, flipped, or lost to local
 * higher-authority evidence; everything else counts as `same`.
 */
export function diffPacket(current: Character, other: Character, opts: ConflictOptions = {}): PacketDiff {
  const merged = mergePacket(current, other, opts)
  const localEvidenceIds = new Set(current.evidence.map((e) => e.id))
  const all = new Set<string>([
    ...current.evidence.map((e) => e.fact),
    ...other.evidence.map((e) => e.fact),
    ...knownFacts(current),
    ...knownFacts(other),
  ])

  const added: PacketDiffRow[] = []
  const flipped: PacketDiffRow[] = []
  const lost: PacketDiffRow[] = []
  let same = 0

  for (const fact of all) {
    const before = listState(current, fact)
    const after = listState(merged, fact)
    const incoming = listState(other, fact)
    const res = resolveClaim(merged.evidence, fact, opts)
    const challenger = strongest(res.losers, opts)
    const reason = res.winner
      ? challenger
        ? resolveConflict(challenger, res.winner, opts).reason
        : `only ${res.winner.source} evidence`
      : 'no evidence'
    const row: PacketDiffRow = {
      fact,
      kind: byId.get(fact)?.kind || prefixKind(fact),
      before,
      after,
      incoming,
      winner: res.winner?.source,
      importedWins: !!res.winner && !localEvidenceIds.has(res.winner.id),
      reason,
    }
    if (after !== before) {
      if (after === 'true') added.push(row)
      else flipped.push(row)
    } else if (incoming !== 'unknown' && incoming !== before) {
      // The packet wanted a change and did not get it — a local source outranked it.
      lost.push(row)
    } else {
      same += 1
    }
  }

  return { added, flipped, lost, same }
}

/** The packet as compact JSON — the single clipboard / share payload. */
export function packetJson(character: Character): string {
  return JSON.stringify(toPacket(character))
}

/** The download filename for a character's packet. */
export function packetFileName(character: Character): string {
  return `${character.name.replace(/\s+/g, '-').toLowerCase() || 'tarnished'}.all-knowing.json`
}

/**
 * SHA-256 of the packet JSON as hex — the short handoff fingerprint shown beside
 * the filename. Browser-native `crypto.subtle`; returns '' when the page is not a
 * secure context (no subtle crypto), so the UI can say so instead of inventing a
 * checksum.
 */
export async function packetHash(character: Character): Promise<string> {
  if (!globalThis.crypto?.subtle) return ''
  const bytes = new TextEncoder().encode(packetJson(character))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Largest standard QR (version 40, error-correction L, byte mode) holds 2953
 * bytes. Used only to *classify* a packet for the handoff UI. We do not render a
 * QR here: there is no browser QR-generator API, and Task 57 forbids a new
 * dependency, so the packet is handed off by clipboard/download and a fingerprint
 * rather than by a truncated code. See `copyPacket`.
 */
export const QR_MAX_BYTES = 2953

/**
 * Copy the packet JSON to the clipboard. Primary share path for a phone. Prefers
 * the async Clipboard API and falls back to a hidden textarea + `execCommand('copy')`
 * for embedded/older contexts. Resolves to false when neither path worked so the
 * caller can point at the download instead of lying about it.
 */
export async function copyPacket(character: Character): Promise<boolean> {
  const text = packetJson(character)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* permission denied or no clipboard — try the legacy path */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
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

export function downloadPacket(character: Character) {
  const blob = new Blob([JSON.stringify(toPacket(character), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = packetFileName(character)
  a.click()
  URL.revokeObjectURL(url)
}
