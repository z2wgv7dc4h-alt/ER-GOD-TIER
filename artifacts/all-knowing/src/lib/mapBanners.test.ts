import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { PlaceNameDoc } from './placeNames'

/**
 * Task 122 section A - the committed banner-detector output.
 *
 * `vendor/elden-ring-map/tools/find_map_banners.py` matches the nine known
 * `WorldMapPlaceNameParam` banner crops against the extracted tile pyramids and
 * must re-find all nine. The committed copy is what these tests read (the
 * generated `data/map-banners.json` is gitignored).
 */
type Banner = {
  id: string
  master: string
  px: number
  py: number
  rect: [number, number, number, number]
  confidence: number
  source: string
  name: string
}

type BannerDoc = {
  generatedBy: string
  source: string
  masterPx: number
  knownLabels: number
  banners: Banner[]
  unlabeled: unknown[]
}

const doc = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/map-banners.json', import.meta.url), 'utf8'),
) as BannerDoc

const placeDoc = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/map-place-names.json', import.meta.url), 'utf8'),
) as PlaceNameDoc

/** The nine names the shipped param carries, mapped to their master. */
const KNOWN: Array<[string, string]> = [
  ['Limgrave', 'M00'],
  ['Liurnia of the Lakes', 'M00'],
  ['Altus Plateau', 'M00'],
  ['Caelid', 'M00'],
  ['Mountaintops of the Giants', 'M00'],
  ['Ainsel River', 'M01'],
  ['Deeproot Depths', 'M01'],
  ['Siofra River', 'M01'],
  ['Realm of Shadow', 'M10'],
]

describe('map banners - committed detector output', () => {
  it('has the expected schema', () => {
    expect(doc.masterPx).toBe(10496)
    expect(Array.isArray(doc.banners)).toBe(true)
    expect(doc.banners.length).toBeGreaterThanOrEqual(KNOWN.length)
    for (const b of doc.banners) {
      expect(['M00', 'M01', 'M10']).toContain(b.master)
      expect(b.confidence).toBeGreaterThan(0)
      expect(b.confidence).toBeLessThanOrEqual(1)
      expect(b.rect).toHaveLength(4)
      expect(b.rect[2]).toBeGreaterThan(b.rect[0])
      expect(b.rect[3]).toBeGreaterThan(b.rect[1])
      expect(b.px).toBeGreaterThanOrEqual(0)
      expect(b.px).toBeLessThanOrEqual(doc.masterPx)
      expect(b.py).toBeGreaterThanOrEqual(0)
      expect(b.py).toBeLessThanOrEqual(doc.masterPx)
      expect(typeof b.name).toBe('string')
      expect(b.name.length).toBeGreaterThan(0)
    }
  })

  it('re-finds all nine known banners near their param position', () => {
    for (const [name, master] of KNOWN) {
      const param = placeDoc.labels.find((l) => l.names.en === name)
      expect(param, `${name} missing from place-names`).toBeDefined()
      const hit = doc.banners.find(
        (b) =>
          b.master === (param!.master || master) &&
          Math.hypot(b.px - param!.px, b.py - param!.py) <= 400,
      )
      expect(hit, `${name} not re-found by the detector`).toBeDefined()
    }
  })

  it('never emits a derived label without a detected banner', () => {
    const derived = placeDoc.labels.filter((l) => (l as { source?: string }).source === 'derived-banner')
    for (const label of derived) {
      const hit = doc.banners.find(
        (b) => b.id === label.id && Math.hypot(b.px - label.px, b.py - label.py) <= 1,
      )
      expect(hit, `derived label ${label.id} has no detection`).toBeDefined()
    }
  })
})
