import { mapFragments, type Collectible } from '../knowledge/collectibles'
import { applyH, type Homography } from './ps5MapFeatures'
import type { ColorImage } from './ps5MapGraces'
import type { MapReference, MapWorld } from './ps5MapReference'
import type { GrayImage } from './ps5Image'

/**
 * Task 135 §4 — which map fragments are owned, from the terrain in the photo.
 *
 * A collected fragment paints the region: saturated colour and fine relief. An
 * uncollected one is plain parchment or grey fog — flat and desaturated. For each
 * known `mapFragments` region we project an anchor onto the photo and score the
 * patch there. Anchors come from the graces already in the region; regions with no
 * grace (Dragonbarrow, Mt. Gelmir …) carry an authored approximate anchor derived
 * from the surrounding geography, never from the fixture.
 */

export type RegionAnchor = { region: string; xPercent: number; yPercent: number }

/**
 * Plate-percent anchors per map-fragment region. Grace-derived where the region
 * has known graces; interpolated from neighbouring regions otherwise.
 */
export const REGION_ANCHORS: RegionAnchor[] = [
  { region: 'Limgrave, West', xPercent: 35.77, yPercent: 66.05 },
  { region: 'Limgrave, East', xPercent: 41.44, yPercent: 66.03 },
  { region: 'Weeping Peninsula', xPercent: 40.88, yPercent: 77.62 },
  { region: 'Liurnia, East', xPercent: 25.96, yPercent: 58.53 },
  { region: 'Liurnia, North', xPercent: 19.35, yPercent: 48.28 },
  { region: 'Liurnia, West', xPercent: 23.08, yPercent: 44.91 },
  { region: 'Caelid', xPercent: 44.39, yPercent: 59.57 },
  { region: 'Dragonbarrow', xPercent: 54.0, yPercent: 50.5 },
  { region: 'Altus Plateau', xPercent: 25.41, yPercent: 32.44 },
  { region: 'Leyndell, Royal Capital', xPercent: 37.18, yPercent: 28.83 },
  { region: 'Mt. Gelmir', xPercent: 16.35, yPercent: 26.0 },
  { region: 'Mountaintops of the Giants, West', xPercent: 48.14, yPercent: 33.31 },
  { region: 'Mountaintops of the Giants, East', xPercent: 59.09, yPercent: 28.59 },
  { region: 'Consecrated Snowfield', xPercent: 52.0, yPercent: 20.0 },
]

export type FragmentClassification = {
  fragmentId: string
  name: string
  region: string
  campaign: Collectible['campaign']
  /** Anchor in reference plate pixels. */
  mapX: number
  mapY: number
  /** Anchor projected into the photo. */
  photoX: number
  photoY: number
  visible: boolean
  revealed: boolean
  /** Mean colour saturation 0..1. */
  saturation: number
  /** Mean local gradient magnitude 0..255. */
  detail: number
}

export type ClassifyOptions = {
  /** Patch radius as a percent of the plate's width. */
  patchPercent?: number
  /** Saturation above which the terrain counts as painted. */
  saturationThreshold?: number
  /** Detail above which fine relief counts as painted. */
  detailThreshold?: number
}

const DEFAULTS: Required<ClassifyOptions> = {
  patchPercent: 3,
  saturationThreshold: 0.16,
  detailThreshold: 13,
}

function regionOf(collectible: Collectible): string {
  // `mapFragments` names are like "Map: Limgrave, West" — keep the tail.
  return collectible.name.replace(/^Map:\s*/i, '')
}

function normRegion(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** The authored anchor for a fragment, matched on the exact region tail. */
function anchorFor(collectible: Collectible): RegionAnchor | undefined {
  const name = normRegion(regionOf(collectible))
  return (
    REGION_ANCHORS.find((a) => normRegion(a.region) === name) ??
    REGION_ANCHORS.find((a) => {
      const t = normRegion(a.region)
      return name.includes(t) || t.includes(name)
    })
  )
}

function patchScore(gray: GrayImage, color: ColorImage, cx: number, cy: number, radius: number): { saturation: number; detail: number } {
  const x0 = Math.max(1, Math.round(cx - radius))
  const y0 = Math.max(1, Math.round(cy - radius))
  const x1 = Math.min(gray.width - 2, Math.round(cx + radius))
  const y1 = Math.min(gray.height - 2, Math.round(cy + radius))
  let satSum = 0
  let satN = 0
  let gradSum = 0
  let gradN = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = (y * color.width + x) * 4
      const r = color.rgba[p]
      const g = color.rgba[p + 1]
      const b = color.rgba[p + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (max > 0) satSum += (max - min) / max
      satN++
      const i = y * gray.width + x
      const gx = gray.data[i + 1] - gray.data[i - 1]
      const gy = gray.data[i + gray.width] - gray.data[i - gray.width]
      gradSum += Math.sqrt(gx * gx + gy * gy)
      gradN++
    }
  }
  return { saturation: satN ? satSum / satN : 0, detail: gradN ? gradSum / gradN : 0 }
}

/**
 * Classify every known map-fragment region for one registered photo. A region is
 * marked `revealed` only when it is visible in frame and the terrain patch looks
 * painted rather than parchment/fog.
 */
export function classifyFragments(
  gray: GrayImage,
  color: ColorImage,
  Hinv: Homography,
  ref: MapReference,
  world: MapWorld,
  opts: ClassifyOptions = {},
): FragmentClassification[] {
  if (world !== 'overworld') return []
  const o = { ...DEFAULTS, ...opts }
  const out: FragmentClassification[] = []
  for (const collectible of mapFragments) {
    const anchor = anchorFor(collectible)
    if (!anchor) continue
    const mapX = (anchor.xPercent / 100) * ref.width
    const mapY = (anchor.yPercent / 100) * ref.height
    const [photoX, photoY] = applyH(Hinv, mapX, mapY)
    const radius = (o.patchPercent / 100) * ref.width
    const visible =
      photoX >= -radius && photoY >= -radius && photoX < gray.width + radius && photoY < gray.height + radius &&
      containsTerrain(photoX, photoY, gray)
    const score = visible ? patchScore(gray, color, photoX, photoY, radius) : { saturation: 0, detail: 0 }
    const revealed = visible && (score.saturation >= o.saturationThreshold || score.detail >= o.detailThreshold)
    out.push({
      fragmentId: collectible.id,
      name: collectible.name,
      region: regionOf(collectible),
      campaign: collectible.campaign,
      mapX,
      mapY,
      photoX,
      photoY,
      visible,
      revealed,
      saturation: score.saturation,
      detail: score.detail,
    })
  }
  return out
}

/** Guard against projecting a region anchor into the black TV bezel or UI text. */
function containsTerrain(x: number, y: number, gray: GrayImage): boolean {
  if (x < 2 || y < 2 || x >= gray.width - 2 || y >= gray.height - 2) return false
  // The bezel is near-black; the map is not.
  let sum = 0
  let n = 0
  for (let dy = -6; dy <= 6; dy += 3) {
    for (let dx = -6; dx <= 6; dx += 3) {
      const xx = Math.round(x + dx)
      const yy = Math.round(y + dy)
      if (xx < 0 || yy < 0 || xx >= gray.width || yy >= gray.height) continue
      sum += gray.data[yy * gray.width + xx]
      n++
    }
  }
  return n > 0 && sum / n > 18
}
