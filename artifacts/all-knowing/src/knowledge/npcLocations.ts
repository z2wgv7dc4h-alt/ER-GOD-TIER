import { knownFactIds } from '../lib/infer'
import { generatedAliases } from '../lib/aliases'
import type { Character } from '../types'
import { facts } from './catalog'
import { warpGraces } from './graces'

/**
 * Task 79: a small authored NPC locator.
 *
 * Each row is one stage of an NPC's route, gated by `whenFacts` (facts this
 * character already knows) and pointing at an existing `grace:` slug. Nothing
 * else is stored: no dialogue, no lat/lng, no new storyline line.
 *
 * Every grace id must exist in `graces.ts` warps ∪ catalog grace facts ∪ the
 * generated alias plane (which Task 73 gave a stub slug for every warp). A row
 * whose grace id does not exist is skipped and reported in
 * `refusedNpcLocations`; an NPC whose latest known stage was skipped resolves to
 * no pin rather than a stale earlier one.
 */
export type NpcLocation = {
  npc: string
  name: string
  aliases: string[]
  graceId: string
  whenFacts: string[]
  note?: string
}

type Candidate = NpcLocation

// Grace universe: warps ∪ catalog graces ∪ alias-plane grace slugs.
const GRACE_IDS = new Set<string>([
  ...warpGraces.map((g) => g.id),
  ...facts.filter((f) => f.kind === 'grace').map((f) => f.id),
  ...generatedAliases.filter((a) => a.kind === 'grace').map((a) => a.slug),
])

const CANDIDATES: Candidate[] = [
  // Blaidd — Mistwood howl, then Siofra, Nokron, and the Rise.
  { npc: 'blaidd', name: 'Blaidd', aliases: ['blaidd', 'half-wolf', 'wolf knight'], graceId: 'grace:mistwood', whenFacts: [], note: 'Howling at Mistwood Ruins — use the Finger Snap.' },
  { npc: 'blaidd', name: 'Blaidd', aliases: [], graceId: 'grace:siofra-river-well-depths', whenFacts: ['quest:ranni:service'] },
  { npc: 'blaidd', name: 'Blaidd', aliases: [], graceId: 'grace:nokron', whenFacts: ['quest:ranni:service', 'boss:radahn'] },
  { npc: 'blaidd', name: 'Blaidd', aliases: [], graceId: 'grace:ranni-s-rise', whenFacts: ['quest:ranni:service', 'boss:radahn', 'quest:ranni:ring'] },

  // Alexander.
  { npc: 'alexander', name: 'Iron Fist Alexander', aliases: ['alexander', 'warrior jar', 'jar uncle'], graceId: 'grace:stormhill-shack', whenFacts: [], note: 'Stuck in the hole south of Stormhill.' },
  { npc: 'alexander', name: 'Iron Fist Alexander', aliases: [], graceId: 'grace:redmane-castle-plaza', whenFacts: ['quest:alexander:festival'] },
  { npc: 'alexander', name: 'Iron Fist Alexander', aliases: [], graceId: 'grace:dragon-temple-lift', whenFacts: ['quest:alexander:festival', 'quest:alexander:complete'] },

  // Millicent.
  { npc: 'millicent', name: 'Millicent', aliases: ['millicent', 'rot girl'], graceId: 'grace:church-of-the-plague', whenFacts: [] },
  { npc: 'millicent', name: 'Millicent', aliases: [], graceId: 'grace:ergtree-grazing', whenFacts: ['quest:millicent:altus'] },
  { npc: 'millicent', name: 'Millicent', aliases: [], graceId: 'grace:windmill-village', whenFacts: ['quest:millicent:altus', 'quest:millicent:godskin'] },

  // Boc.
  { npc: 'boc', name: 'Boc the Seamster', aliases: ['boc', 'seamster'], graceId: 'grace:agheel-north', whenFacts: [], note: 'Disguised as a tree south of Agheel Lake North.' },
  { npc: 'boc', name: 'Boc the Seamster', aliases: [], graceId: 'grace:coastal-cave', whenFacts: ['quest:boc:needle'] },

  // Hyetta.
  { npc: 'hyetta', name: 'Hyetta', aliases: ['hyetta'], graceId: 'grace:lake-facing-cliffs', whenFacts: [] },
  { npc: 'hyetta', name: 'Hyetta', aliases: [], graceId: 'grace:bellum-church', whenFacts: ['quest:hyetta:bellum'] },
  { npc: 'hyetta', name: 'Hyetta', aliases: [], graceId: 'grace:frenzied-flame-proscription', whenFacts: ['quest:hyetta:bellum', 'quest:hyetta:maiden'] },

  // Irina / Edgar.
  { npc: 'irina', name: 'Irina', aliases: ['irina', 'edgar'], graceId: 'grace:bridge-of-sacrifice', whenFacts: [] },
  { npc: 'irina', name: 'Edgar the Revenger', aliases: [], graceId: 'grace:revenger-s-shack', whenFacts: ['quest:edgar:revenger'] },

  // Igon.
  { npc: 'igon', name: 'Igon', aliases: ['igon', 'dragon hunter igon'], graceId: 'grace:jagged', whenFacts: [] },
  { npc: 'igon', name: 'Igon', aliases: [], graceId: 'grace:jagged-peak-summit', whenFacts: ['quest:igon:summon'] },

  // Roderika — the shack stage has a grace; her Roundtable stage does not, so it
  // is refused and she resolves to no pin after the memento.
  { npc: 'roderika', name: 'Roderika', aliases: ['roderika', 'roderika-hewg', 'spirit tuner'], graceId: 'grace:stormhill-shack', whenFacts: [] },
  { npc: 'roderika', name: 'Roderika', aliases: [], graceId: 'grace:roundtable-hold', whenFacts: ['quest:roderika:given'], note: 'At the Roundtable Hold.' },
]

type InternalRow = Candidate & { valid: boolean }

const rows: InternalRow[] = CANDIDATES.map((r) => ({ ...r, valid: GRACE_IDS.has(r.graceId) }))

export const npcLocations: NpcLocation[] = rows.filter((r) => r.valid).map(({ valid: _valid, ...r }) => r)
export const refusedNpcLocations: { npc: string; graceId: string; whenFacts: string[] }[] = rows
  .filter((r) => !r.valid)
  .map((r) => ({ npc: r.npc, graceId: r.graceId, whenFacts: r.whenFacts }))

export type NpcLocateHit = {
  npc: string
  name: string
  graceId: string
  graceName: string
  note?: string
}

function graceName(id: string): string {
  return (
    warpGraces.find((g) => g.id === id)?.name ??
    facts.find((f) => f.id === id)?.name ??
    generatedAliases.find((a) => a.slug === id && a.kind === 'grace')?.fmgName ??
    id
  )
}

function matchesNpc(row: NpcLocation, id: string): boolean {
  return row.npc === id || row.aliases.includes(id)
}

export function npcLocate(character: Character, npcId: string): NpcLocateHit | null {
  const id = npcId.toLowerCase().trim()
  if (!id) return null
  const known = knownFactIds(character)
  const forNpc = rows.filter((r) => matchesNpc(r, id))
  if (!forNpc.length) return null

  const satisfied = forNpc.filter((r) => r.whenFacts.every((f) => known.has(f)))
  // Most satisfied whenFacts wins; a tie resolves to the later table row.
  const mostAdvanced = satisfied.reduce<InternalRow | null>(
    (best, r) => (!best || r.whenFacts.length >= best.whenFacts.length ? r : best),
    null,
  )

  // No stage applies yet: use the baseline (empty whenFacts) row if one exists.
  if (!mostAdvanced) {
    const baseline = forNpc.find((r) => r.whenFacts.length === 0)
    return baseline ? hitOf(baseline) : null
  }
  // The latest stage has no real grace: refuse rather than fall back to a stale one.
  if (!mostAdvanced.valid) return null
  return hitOf(mostAdvanced)
}

function hitOf(row: NpcLocation): NpcLocateHit {
  return { npc: row.npc, name: row.name, graceId: row.graceId, graceName: graceName(row.graceId), note: row.note }
}

/** Resolve a free-text mention to a table NPC key, for the router. */
export function matchNpc(text: string): string | undefined {
  const n = text.toLowerCase()
  for (const row of npcLocations) {
    const names = [row.npc, ...row.aliases].filter(Boolean)
    if (names.some((x) => new RegExp(`\\b${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(n))) {
      return row.npc
    }
  }
  return undefined
}
