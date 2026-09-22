/**
 * Per-area level bands from the Fextralife Game Progress Route
 * (`scripts/build-region-levels.mjs` → open/region-levels.json). Powers the
 * level-aware "before you go / am I over-levelled" advice.
 */
export type RegionLevel = {
  area: string
  levelMin: number
  levelMax: number
  upgradeMin: number | null
  upgradeMax: number | null
  steps: string
}
export type RegionLevels = { source: string; areas: RegionLevel[] }

let cache: RegionLevels | null = null

export async function loadRegionLevels(): Promise<RegionLevels> {
  if (cache) return cache
  const r = await fetch('/sourced/open/region-levels.json')
  if (!r.ok) throw new Error('region levels ' + r.status)
  cache = (await r.json()) as RegionLevels
  return cache
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** The band whose area name best matches a region label (longest overlap wins). */
export function bandFor(areas: RegionLevel[], regionLabel: string | null | undefined): RegionLevel | null {
  if (!regionLabel) return null
  const r = norm(regionLabel)
  if (!r) return null
  let best: RegionLevel | null = null
  let bestLen = 0
  for (const a of areas) {
    const an = norm(a.area)
    // Match when one name contains the other, scored by the shorter length so a
    // specific label ("Weeping Peninsula") beats a broader one ("Limgrave").
    if (an.includes(r) || r.includes(an)) {
      const score = Math.min(an.length, r.length)
      if (score > bestLen) {
        bestLen = score
        best = a
      }
    }
  }
  return best
}
