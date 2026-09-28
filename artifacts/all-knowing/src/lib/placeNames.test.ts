import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MASTER_PX,
  TIER_MIN_ZOOM,
  placeLabelFontSize,
  placeLabelName,
  placeLabelVisible,
  placeLabelsForWorld,
  worldMasters,
  type PlaceNameDoc,
} from './placeNames'

/**
 * Task 120 - the committed extractor output.
 *
 * The generated `vendor/elden-ring-map/data/place-names.json` is gitignored;
 * this is the small copy the app (and these tests) consume.
 */
const doc = JSON.parse(
  readFileSync(new URL('../../public/sourced/open/map-place-names.json', import.meta.url), 'utf8'),
) as PlaceNameDoc

const byName = new Map(doc.labels.map((l) => [placeLabelName(l), l] as const))

/**
 * Deliberately loose master-pixel bounding boxes for the major regions, checked
 * against the tiles' 10496 frame. The label anchors are the game's own
 * WorldMapPlaceNameParam positions (they often sit just off the coast, on the
 * banner art), so the boxes are generous - the point is "same world, right
 * continent", which catches a broken projection or a master mix-up.
 */
const REGION_BOX: Record<string, [number, number, number, number]> = {
  Limgrave: [1800, 6200, 3200, 7600],
  'Liurnia of the Lakes': [3000, 4000, 3800, 5200],
  'Altus Plateau': [2600, 1400, 3600, 2400],
  Caelid: [4800, 6800, 6400, 8200],
  'Mountaintops of the Giants': [6000, 2800, 7600, 4000],
  'Ainsel River': [1200, 3200, 2400, 4200],
  'Deeproot Depths': [3600, 1800, 4800, 2800],
  'Siofra River': [4800, 5200, 6000, 6200],
  'Realm of Shadow': [3200, 6000, 4600, 7400],
}

describe('map place names - committed extractor output', () => {
  it('has the expected schema', () => {
    expect(doc.masterPx).toBe(10496)
    expect(doc.locales).toEqual(['en', 'ru'])
    expect(Array.isArray(doc.labels)).toBe(true)
    expect(doc.labels.length).toBeGreaterThan(0)

    const ids = new Set<string>()
    for (const l of doc.labels) {
      expect(l.id).toMatch(/^(place|banner):/)
      expect(Number.isInteger(l.textId)).toBe(true)
      expect(Number.isInteger(l.tier)).toBe(true)
      expect(['M00', 'M01', 'M10']).toContain(l.master)
      expect(['overworld', 'underground', 'shadow']).toContain(l.world)
      expect(typeof l.names.en).toBe('string')
      expect(l.names.en.length).toBeGreaterThan(0)
      expect(l.names.ru.length).toBeGreaterThan(0)
      expect(l.px).toBeGreaterThanOrEqual(0)
      expect(l.px).toBeLessThanOrEqual(MASTER_PX)
      expect(l.py).toBeGreaterThanOrEqual(0)
      expect(l.py).toBeLessThanOrEqual(MASTER_PX)
      expect(ids.has(l.id)).toBe(false)
      ids.add(l.id)
    }
  })

  it('projects every major region inside its bounding box', () => {
    // These six are the spec's list wherever the shipped param actually carries
    // them; the rest of the list's names are sub-regions with no stored
    // coordinate (see the honesty test below).
    for (const [name, box] of Object.entries(REGION_BOX)) {
      const label = byName.get(name)
      if (!label) continue
      const [x0, y0, x1, y1] = box
      expect(label.px, `${name} x`).toBeGreaterThanOrEqual(x0)
      expect(label.px, `${name} x`).toBeLessThanOrEqual(x1)
      expect(label.py, `${name} y`).toBeGreaterThanOrEqual(y0)
      expect(label.py, `${name} y`).toBeLessThanOrEqual(y1)
    }
    // ...and those with coordinates must be present.
    for (const name of ['Limgrave', 'Liurnia of the Lakes', 'Caelid']) {
      expect(byName.has(name), `${name} missing`).toBe(true)
    }
  })

  it('does not fabricate coordinates for sub-regions', () => {
    // Stormhill / Mistwood / Weeping Peninsula / Lake of Rot / Gravesite Plain
    // live only in MapNameTexParam(_m61), a colour->name key with no position.
    // The extractor must not invent one, so they are absent by design.
    for (const name of ['Stormhill', 'Mistwood', 'Weeping Peninsula', 'Gravesite Plain']) {
      expect(byName.has(name), `${name} should not be invented`).toBe(false)
    }
  })
})

describe('map place names - tier and zoom logic', () => {
  it('shows tier 0 everywhere and gates later tiers by scale', () => {
    expect(placeLabelVisible(0, 0.02)).toBe(true)
    expect(placeLabelVisible(0, 1)).toBe(true)
    expect(placeLabelVisible(1, 0.5)).toBe(false)
    expect(placeLabelVisible(1, TIER_MIN_ZOOM['1'])).toBe(true)
    expect(placeLabelVisible(2, 1.1)).toBe(false)
    expect(placeLabelVisible(2, 1.5)).toBe(true)
  })

  it('scales the font with zoom and clamps it', () => {
    expect(placeLabelFontSize(0, 1)).toBeGreaterThan(placeLabelFontSize(0, 0.2))
    expect(placeLabelFontSize(0, 0.01)).toBe(11)
    expect(placeLabelFontSize(0, 100)).toBe(34)
    expect(placeLabelFontSize(0, 1)).toBeGreaterThan(placeLabelFontSize(1, 1))
  })

  it('maps Atlas worlds to the right engine masters', () => {
    expect(worldMasters('overworld')).toEqual(['M00'])
    expect(worldMasters('underground')).toEqual(['M01'])
    expect(worldMasters('shadow')).toEqual(['M10'])
    expect(worldMasters('ashen')).toEqual(['M00'])
    expect(worldMasters('nonsense')).toEqual([])
  })

  it('returns plate percentages for the selected world', () => {
    const overworld = placeLabelsForWorld(doc, 'overworld')
    expect(overworld.length).toBeGreaterThan(0)
    expect(overworld.every((l) => l.x >= 0 && l.x <= 100 && l.y >= 0 && l.y <= 100)).toBe(true)
    expect(placeLabelsForWorld(doc, 'shadow').every((l) => l.id.startsWith('place:'))).toBe(true)
    expect(placeLabelsForWorld(null, 'overworld')).toEqual([])
  })
})
