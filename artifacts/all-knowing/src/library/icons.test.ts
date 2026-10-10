import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildCatalog, type CatalogInput } from './catalog'
import type { CategoryId } from './model'
import type { EntityRecord } from '../lib/entityIndex'
import type { FanapiData } from '../lib/fanapiData'
import { decodeRegulationData } from '../lib/ar'
import { catalogueIdFor } from '../lib/catalogueIds'

/**
 * Task 196 §1 — the Library cards must show the entity's real picture.
 *
 * The catalogue used to resolve a weapon/item icon from the name lookup only
 * (`iconForEntity`), so DLC rows and much of the item plane fell back to a
 * generic seal even though the enriched index (Task 154 game icons,
 * `image-index-extra.json` Task 184) already shipped a picture. This builds the
 * real catalogue from the committed data and fails if any item category drops
 * below 98% real `/sourced/images/…` pictures (a brand category icon or the
 * generic seal does not count).
 */

const read = (rel: string) =>
  JSON.parse(fs.readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'))

const fanapi = (file: string) => read(`../../public/sourced/open/fanapi/${file}.json`)

const fan: FanapiData = {
  armors: fanapi('armors'),
  talismans: fanapi('talismans'),
  spells: fanapi('spells'),
  ashes: fanapi('ashes'),
  spirits: fanapi('spirits'),
  items: fanapi('items'),
  locations: fanapi('locations'),
  creatures: fanapi('creatures'),
  bosses: fanapi('bosses'),
  npcs: fanapi('npcs'),
  ammos: fanapi('ammos'),
  classes: fanapi('classes'),
  weapons: fanapi('weapons'),
  shields: fanapi('shields'),
}

const indexDoc = read('../../public/sourced/entity-index.json') as { records: Record<string, EntityRecord> }

const input: CatalogInput = {
  fan,
  armoryWeapons: read('../../public/sourced/armory-weapons.json'),
  armoryBosses: [],
  weapons: decodeRegulationData(read('../../public/sourced/regulation-vanilla-v1.17.json')),
  recipes: [],
  secrets: [],
  acquisitions: [],
  guides: [],
  bossCombat: [],
  dialogue: [],
  index: Object.values(indexDoc.records),
  guideItems: read('../../public/sourced/guide/catalog.json'),
}

const catalog = buildCatalog(input)

const ITEM_CATEGORIES: CategoryId[] = [
  'weapons',
  'shields',
  'armor',
  'talismans',
  'sorceries',
  'incantations',
  'ashes',
  'spirits',
  'items',
  'materials',
]

/**
 * A real picture is the entity's own image (a local `/sourced/...` cache or a
 * FanAPI URL from the index), not a placeholder pack glyph or the chrome seal.
 * Brand category icons are not item-category fallbacks, so they do not appear.
 */
const isRealPicture = (icon: string | undefined) =>
  Boolean(icon && !icon.startsWith('/sourced/pack-icons/') && icon !== '/art/sigil.jpg')

describe('Library card pictures (Task 196 §1)', () => {
  it('loads a non-trivial number of cards in every item category', () => {
    for (const cat of ITEM_CATEGORIES) {
      expect(catalog.byCategory[cat].length, `${cat} is empty`).toBeGreaterThan(0)
    }
  })

  for (const cat of ITEM_CATEGORIES) {
    it(`${cat} resolves a real picture for ≥98% of cards`, () => {
      const rows = catalog.byCategory[cat]
      const pictured = rows.filter((e) => isRealPicture(e.icon)).length
      const pct = rows.length ? pictured / rows.length : 1
      expect(pct, `${cat}: ${pictured}/${rows.length} (${Math.round(pct * 100)}%)`).toBeGreaterThanOrEqual(0.98)
    })
  }

  it('prefers the enriched record picture over the name lookup', () => {
    // A crafted index record for a real FanAPI weapon: the card must carry the
    // record's picture, proving the record image is the first rung.
    const sentinel = '/sourced/images/game-icons/999999.webp'
    const record: EntityRecord = {
      id: catalogueIdFor('item', 'Uchigatana'),
      kind: 'weapon',
      name: 'Uchigatana',
      image: sentinel,
      sources: ['test'],
    }
    const tiny = buildCatalog({
      ...input,
      fan: { ...fan, weapons: [{ name: 'Uchigatana', category: 'Katana', weight: 5 }], shields: [] },
      armoryWeapons: [],
      weapons: [],
      index: [record],
    })
    const card = tiny.byCategory.weapons.find((e) => e.name === 'Uchigatana')
    expect(card, 'Uchigatana card missing').toBeTruthy()
    expect(card!.icon).toBe(sentinel)
  })
})
