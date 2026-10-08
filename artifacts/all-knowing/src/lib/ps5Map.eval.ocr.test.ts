import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import groundTruth from './__fixtures__/ps5/ground-truth.json'
import { createNodeWorker, type NodeOcrWorker } from './ps5Capture.node'
import { mapPhotoFromFile } from './ps5Map.node'
import { detectFeatures } from './ps5MapFeatures'
import { registerToWorld } from './ps5MapRegistration'
import { buildGraceIndex, detectGraceBlobs, snapGraces } from './ps5MapGraces'
import { classifyFragments } from './ps5MapFragments'
import type { MapReference, MapWorld } from './ps5MapReference'

/**
 * Task 135 §6 — the acceptance eval over the three real map photos. Run with
 * `npm run test:ocr` (it decodes three phone JPEGs through WASM Tesseract, so it
 * is excluded from the default suite). Every metric is printed; the assertions
 * gate the section's acceptance. Hand counts were made by viewing the photo and
 * are documented per fixture below — they are the gold ring icons a person can
 * count, not every gold map marker.
 */

const FIXTURE = path.resolve(__dirname, '__fixtures__/ps5')

type Fixture = {
  file: string
  world: MapWorld
  /** Gold grace-icons visible in the photo, counted by eye (see the report). */
  handCount: number
  /** Coarse revealed regions from ground truth (normalised tokens). */
  revealed: string[]
  /** Regions the ground truth calls visible but unrevealed. */
  unrevealed: string[]
}

const FIXTURES: Fixture[] = [
  {
    file: 'map-overworld-01.jpg',
    world: 'overworld',
    handCount: 58,
    revealed: ['Limgrave', 'Weeping Peninsula', 'Liurnia', 'Caelid', 'Dragonbarrow'],
    unrevealed: ['Altus', 'Leyndell', 'Mt. Gelmir', 'Mountaintops'],
  },
  {
    file: 'map-overworld-north-01.jpg',
    world: 'overworld',
    handCount: 93,
    revealed: ['Liurnia', 'Altus', 'Leyndell', 'Mt. Gelmir', 'Mountaintops', 'Caelid', 'Limgrave'],
    unrevealed: ['Consecrated Snowfield'],
  },
  {
    file: 'map-underground-01.jpg',
    world: 'underground',
    handCount: 24,
    revealed: ['Ainsel River', 'Siofra River'],
    unrevealed: [],
  },
]

/** Grace regions → the coarse ground-truth region tokens. */
const GRACE_REGION: Record<string, string> = {
  Limgrave: 'Limgrave',
  Stormhill: 'Limgrave',
  Stormveil: 'Limgrave',
  'Weeping Peninsula': 'Weeping Peninsula',
  Liurnia: 'Liurnia',
  'Raya Lucaria': 'Liurnia',
  Caelid: 'Caelid',
  'Redmane Castle': 'Caelid',
  Altus: 'Altus',
  Leyndell: 'Leyndell',
  Mountaintops: 'Mountaintops',
  'Forbidden Lands': 'Mountaintops',
  'Farum Azula': 'Mountaintops',
  Siofra: 'Siofra River',
  Nokron: 'Siofra River',
  Ainsel: 'Ainsel River',
  Deeproot: 'Deeproot',
}

/** Map-fragment region tail → coarse token. */
const FRAGMENT_REGION: Record<string, string> = {
  'Limgrave, West': 'Limgrave',
  'Limgrave, East': 'Limgrave',
  'Weeping Peninsula': 'Weeping Peninsula',
  'Liurnia, East': 'Liurnia',
  'Liurnia, North': 'Liurnia',
  'Liurnia, West': 'Liurnia',
  Caelid: 'Caelid',
  Dragonbarrow: 'Dragonbarrow',
  'Altus Plateau': 'Altus',
  'Leyndell, Royal Capital': 'Leyndell',
  'Mt. Gelmir': 'Mt. Gelmir',
  'Mountaintops of the Giants, West': 'Mountaintops',
  'Mountaintops of the Giants, East': 'Mountaintops',
  'Consecrated Snowfield': 'Consecrated Snowfield',
}

function loadRefs(): Record<MapWorld, MapReference> {
  const doc = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/sourced/maps/map-ref-keypoints.json'), 'utf8')) as {
    worlds: Record<MapWorld, MapReference>
  }
  return doc.worlds
}

function precisionRecall(got: string[], expected: string[]): { precision: number; recall: number; tp: number } {
  const g = new Set(got)
  const e = new Set(expected)
  const tp = [...g].filter((x) => e.has(x)).length
  return { precision: g.size ? tp / g.size : 0, recall: e.size ? tp / e.size : 0, tp }
}

type Row = {
  file: string
  detected: number
  hand: number
  snapped: number
  purity: number
  inliers: number
  error: number
  regions: string[]
  fragmentPrecision: number
  fragmentRecall: number
  decodeMs: number
  detectMs: number
  registerMs: number
  graceMs: number
  ms: number
}

describe('PS5 map photo eval (slow decode)', () => {
  let worker: NodeOcrWorker
  const rows: Row[] = []
  beforeAll(async () => { worker = await createNodeWorker() }, 300_000)
  afterAll(async () => {
    await worker?.terminate()
    for (const r of rows) {
      console.log(
        `[map-eval] ${r.file}: detected=${r.detected} (hand ${r.hand}) snapped=${r.snapped} purity=${(r.purity * 100).toFixed(0)}%` +
        ` inliers=${r.inliers} err=${r.error.toFixed(2)}px fragments P=${(r.fragmentPrecision * 100).toFixed(0)}% R=${(r.fragmentRecall * 100).toFixed(0)}% ${r.ms}ms`,
      )
    }
    const outDir = path.resolve(process.cwd(), 'node_modules/.tmp/ps5map')
    mkdirSync(outDir, { recursive: true })
    writeFileSync(path.join(outDir, 'eval.json'), JSON.stringify(rows, null, 2))
  })

  const refs = loadRefs()
  // Build the index exactly like the app (`loadBrowserGraceIndex`) and the eval:
  // each engine grace's world comes from its `master` (M00/M01/M10) in the marker
  // table, otherwise overworld and underground graces at the same (x, y) collide.
  const engineDoc = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/sourced/open/engine-markers.json'), 'utf8')) as {
    graces: { name: string; px: number; py: number }[]
    markers?: { name: string; cat: string; master: string }[]
  }
  const masterOf = new Map((engineDoc.markers ?? []).filter((m) => m.cat === 'grace').map((m) => [m.name, m.master]))
  const graceIndex = buildGraceIndex(engineDoc.graces.map((g) => ({ ...g, master: masterOf.get(g.name) })))

  for (const fixture of FIXTURES) {
    it(`${fixture.file} registers and reads graces + regions`, async () => {
      const started = Date.now()
      const photo = await mapPhotoFromFile(worker, path.join(FIXTURE, fixture.file))
      const decode = Date.now() - started
      const tDetect = Date.now()
      const features = detectFeatures(photo.gray)
      const detect = Date.now() - tDetect
      const tReg = Date.now()
      const reg = registerToWorld(features, refs[fixture.world])
      const register = Date.now() - tReg
      expect(reg, 'registration failed').not.toBeNull()
      expect(reg!.inliers).toBeGreaterThanOrEqual(12)
      expect(reg!.error).toBeLessThan(6)

      const tGrace = Date.now()
      const blobs = detectGraceBlobs(photo.color)
      const graces = snapGraces(blobs, reg!.H, refs[fixture.world], fixture.world, { index: graceIndex, tolerancePercent: 1.4 })
      const graceMs = Date.now() - tGrace

      const mapped = graces.map((g) => GRACE_REGION[g.region] ?? g.region)
      const expected = new Set(fixture.revealed)
      const inRegion = mapped.filter((r) => expected.has(r)).length
      const purity = mapped.length ? inRegion / mapped.length : 1

      const fragments = classifyFragments(photo.gray, photo.color, reg!.Hinv, refs[fixture.world], fixture.world)
      const revealedFrags = fragments.filter((f) => f.revealed).map((f) => FRAGMENT_REGION[f.region] ?? f.region)
      const fr = precisionRecall(revealedFrags, fixture.revealed)

      rows.push({
        file: fixture.file,
        detected: blobs.length,
        hand: fixture.handCount,
        snapped: graces.length,
        purity,
        inliers: reg!.inliers,
        error: reg!.error,
        regions: reg!.regions,
        fragmentPrecision: fr.precision,
        fragmentRecall: fr.recall,
        decodeMs: decode,
        detectMs: detect,
        registerMs: register,
        graceMs,
        ms: Date.now() - started,
      })

      // Task 167 §Map: detectGraceBlobs deliberately returns grace *emblems*, not
      // every gold ring a person can spot — gold terrain and non-grace markers are
      // rejected (fill/strength/bezel filters). So its output no longer tracks the
      // all-gold hand count exactly; the task's acceptance is that it keeps most of
      // the hand-counted emblems and snaps ≥70% of what it detects, ≥90% pure.
      const snapRate = blobs.length ? graces.length / blobs.length : 0
      expect(blobs.length).toBeGreaterThanOrEqual(Math.floor(fixture.handCount * 0.5))
      expect(snapRate).toBeGreaterThanOrEqual(0.7)
      // Nearly every snapped grace is in a region the player can actually see.
      expect(purity).toBeGreaterThanOrEqual(0.9)

      if (fixture.world === 'overworld') {
        // The revealed fragment set covers the ground-truth regions.
        expect(fr.recall).toBeGreaterThanOrEqual(0.8)
        expect(fr.precision).toBeGreaterThanOrEqual(0.6)
        // No region the photo shows as parchment is called revealed.
        for (const region of fixture.unrevealed) {
          expect(revealedFrags).not.toContain(region)
        }
      }

      expect(decode).toBeGreaterThan(0)
      expect(detect).toBeGreaterThan(0)
      expect(register).toBeGreaterThan(0)
      expect(graceMs).toBeGreaterThan(0)
      expect(groundTruth[fixture.file as keyof typeof groundTruth]).toBeTruthy()
    }, 600_000)
  }
})
