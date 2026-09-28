import rosterJson from '../data/bosses.json'

/**
 * Task 130 §2 — the canonical boss roster one stop.
 *
 * `scripts/build-boss-roster.mjs` merges every boss dataset the repo ships into
 * `src/data/bosses.json`: one record per encounter (a boss fought in two places
 * is two records). This module is the pure read surface the shell, the Area hub,
 * the Library, quick-log and the completion views share — so every screen counts
 * the same fights.
 */

export type BossCampaign = 'base' | 'sote'

export type BossTier =
  | 'great-rune'
  | 'remembrance'
  | 'major'
  | 'field'
  | 'dungeon'
  | 'evergaol'
  | 'mini'

export type BossEncounter = {
  /** Canonical fact id, shared with the entity graph. */
  id: string
  name: string
  campaign: BossCampaign
  region: string
  /** Dungeon / area the fight is in (plus the nearest grace when known). */
  location: string
  grace: string | null
  tier: BossTier
  requiredForEnding: boolean
  drops: string[]
  coords: { x: number; y: number; map?: string | null } | null
  hp: number | null
  sources: string[]
}

export const bossRoster = rosterJson as BossEncounter[]

/** Distinct canonical fact ids — one per boss, across every encounter. */
export const bossFactIds: string[] = [...new Set(bossRoster.map((r) => r.id))]

export const bossRosterTotal = bossRoster.length
export const bossFactCount = bossFactIds.length
export const bossFactIdSet = new Set(bossFactIds)

const TIER_RANK: Record<BossTier, number> = {
  'great-rune': 0,
  remembrance: 1,
  major: 2,
  evergaol: 3,
  dungeon: 4,
  field: 5,
  mini: 6,
}

export const TIER_LABEL: Record<BossTier, string> = {
  'great-rune': 'Great Rune',
  remembrance: 'Remembrance',
  major: 'Main',
  field: 'Field',
  dungeon: 'Dungeon',
  evergaol: 'Evergaol',
  mini: 'Mini',
}

/** Remembrance and Great Rune fights lead the Setup step (Task 130 §2). */
export function isRosterMajor(tier: BossTier): boolean {
  return tier === 'great-rune' || tier === 'remembrance'
}

export function tierRank(tier: BossTier): number {
  return TIER_RANK[tier]
}

export type RegionBossGroup = {
  region: string
  campaign: BossCampaign
  /** Remembrance / Great Rune fights, shown as tiles first. */
  major: BossEncounter[]
  /** Everything else in the region, collapsed. */
  rest: BossEncounter[]
}

/** Encounter rows grouped by region; majors split out, everything else sorted. */
export function rosterGroups(): RegionBossGroup[] {
  const byRegion = new Map<string, RegionBossGroup>()
  for (const row of bossRoster) {
    const group = byRegion.get(row.region) ?? { region: row.region, campaign: row.campaign, major: [], rest: [] }
    if (isRosterMajor(row.tier)) group.major.push(row)
    else group.rest.push(row)
    // A region with any base encounter stays base-labelled.
    if (row.campaign === 'base') group.campaign = 'base'
    byRegion.set(row.region, group)
  }
  const byMajor = (a: BossEncounter, b: BossEncounter) =>
    tierRank(a.tier) - tierRank(b.tier) || a.name.localeCompare(b.name) || a.location.localeCompare(b.location)
  return [...byRegion.values()]
    .map((g) => ({ ...g, major: g.major.sort(byMajor), rest: g.rest.sort(byMajor) }))
    .sort((a, b) => a.region.localeCompare(b.region))
}

/** Every roster encounter whose region matches an Area-hub area label. */
export function rosterForRegion(region: string | null | undefined): BossEncounter[] {
  const key = (region ?? '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
  if (key.length < 4) return []
  return bossRoster.filter((row) => {
    const r = row.region.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
    return r.length >= 4 && (r.includes(key) || key.includes(r))
  })
}

/** The encounters for the canonical ids a character has already defeated. */
export function defeatedEncounterCount(defeated: readonly string[]): number {
  const known = new Set(defeated)
  return bossFactIds.filter((id) => known.has(id)).length
}
