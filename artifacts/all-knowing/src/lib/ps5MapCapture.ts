import { rgbaToGray, type GrayImage } from './ps5Image'
import { detectFeatures, type Feature } from './ps5MapFeatures'
import {
  buildMapReference,
  loadMapReferenceFile,
  MAP_PLATES,
  type MapReference,
  type MapWorld,
} from './ps5MapReference'
import { registerPhoto, type Registration } from './ps5MapRegistration'
import { detectGraceBlobs, snapGraces, buildGraceIndex, type ColorImage, type GraceBlob, type GraceIndexEntry, type SnappedGrace } from './ps5MapGraces'
import { classifyFragments, type FragmentClassification } from './ps5MapFragments'

/**
 * Task 135 §5 — browser adapter for the map-photo pipeline.
 *
 * Decoding happens on a canvas, feature detection/registration and the two
 * colour passes are the same pure-TS code the eval uses. The reference keypoints
 * are fetched from the committed index; if it is unavailable the plates are
 * decoded and the keypoints rebuilt on the fly (slower, but never a blank step).
 */

export type MapPhoto = { gray: GrayImage; color: ColorImage }

export async function mapPhotoFromImage(image: Blob | string): Promise<MapPhoto> {
  const bitmap = typeof image === 'string'
    ? await new Promise<ImageBitmap>((resolve, reject) => {
      const el = new Image()
      el.onload = () => void createImageBitmap(el).then(resolve, reject)
      el.onerror = () => reject(new Error('Could not load that image.'))
      el.src = image
    })
    : await createImageBitmap(image)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable.')
  ctx.drawImage(bitmap, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close?.()
  return { gray: rgbaToGray(data, width, height), color: { width, height, rgba: data } }
}

let referenceCache: MapReference[] | null = null

/** Load the committed reference keypoints; rebuild from the plates as a fallback. */
export async function loadBrowserMapReferences(): Promise<MapReference[]> {
  if (referenceCache) return referenceCache
  const file = await loadMapReferenceFile()
  const ready = (['overworld', 'underground'] as MapWorld[]).map((world) => file.worlds[world]).filter((r): r is MapReference => Boolean(r && r.features.length))
  if (ready.length) {
    referenceCache = ready
    return ready
  }
  const built: MapReference[] = []
  for (const world of ['overworld', 'underground'] as MapWorld[]) {
    const photo = await mapPhotoFromImage(MAP_PLATES[world].src)
    built.push(buildMapReference(world, photo.gray))
  }
  referenceCache = built
  return built
}

export type MapAnalysis = {
  /** Photo dimensions, for laying the overlay out. */
  width: number
  height: number
  registration: Registration | null
  blobs: GraceBlob[]
  graces: SnappedGrace[]
  fragments: FragmentClassification[]
  features: Feature[]
  ms: number
}

/** Full map-photo read: register, snap graces, classify fragments. */
export function analyzeMapPhoto(photo: MapPhoto, refs: MapReference[], index: GraceIndexEntry[] = []): MapAnalysis {
  const started = Date.now()
  const features = detectFeatures(photo.gray)
  const registration = registerPhoto(features, refs)
  let blobs: GraceBlob[] = []
  let graces: SnappedGrace[] = []
  let fragments: FragmentClassification[] = []
  if (registration) {
    const ref = refs.find((r) => r.world === registration.world) ?? refs[0]
    blobs = detectGraceBlobs(photo.color)
    // 1.4 % matches the eval (`scripts/photo-eval.mjs`) and is calibrated to the
    // committed plates: registration residual is ~2–3 px, so a tighter tolerance
    // dropped true graces while a looser one let gold terrain snap. See PHOTO-EVAL.
    graces = snapGraces(blobs, registration.H, ref, registration.world, { index, tolerancePercent: 1.4 })
    fragments = classifyFragments(photo.gray, photo.color, registration.Hinv, ref, registration.world)
  }
  return { width: photo.gray.width, height: photo.gray.height, registration, blobs, graces, fragments, features, ms: Date.now() - started }
}

let graceIndexCache: GraceIndexEntry[] | null = null

/** The engine's 413 named graces, as a snap index (fetched once). */
export async function loadBrowserGraceIndex(): Promise<GraceIndexEntry[]> {
  if (graceIndexCache) return graceIndexCache
  try {
    const doc = (await fetch('/sourced/open/engine-markers.json').then((r) => r.json())) as {
      graces?: { name: string; px: number; py: number }[]
      markers?: { name: string; cat: string; master: string }[]
    }
    const masterOf = new Map((doc.markers ?? []).filter((m) => m.cat === 'grace').map((m) => [m.name, m.master]))
    graceIndexCache = buildGraceIndex((doc.graces ?? []).map((g) => ({ ...g, master: masterOf.get(g.name) })))
  } catch {
    graceIndexCache = []
  }
  return graceIndexCache
}
