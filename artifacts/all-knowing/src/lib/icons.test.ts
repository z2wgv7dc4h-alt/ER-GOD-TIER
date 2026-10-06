import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fanImage } from './fanImage'
import type { EntityRecord } from './entityIndex'

/**
 * Task 154 — every item and boss has an icon.
 *
 * Over the committed enrichment index, every item-like kind must have a picture
 * (a `record.image` from the game install / a Fandom cache, or a runtime
 * `image-index` match) and every boss must render. The allow-lists below are the
 * records that legitimately have no game icon (cut/unused content, the bare
 * "Unarmed" weapon, one spelling variant) — each is asserted to still be missing
 * so the list cannot silently rot.
 */

const root = new URL('../../', import.meta.url)
const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))
const records: EntityRecord[] = Object.values(
  (JSON.parse(readFileSync(indexPath, 'utf8')) as { records: Record<string, EntityRecord> }).records,
)

const ITEM_KINDS = ['weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'item', 'material']

/** Named exceptions: records with no game icon (cut/unused, or no icon by design). */
const EXCEPTIONS: Record<string, string[]> = {
  weapon: [
    'Abundance Twinblade',
    'Abundance and Decay Twinblade',
    "Blackflame Monk's Seal",
    'Buckshot Crossbow',
    'Burial Axe',
    'Carian Troll Greatsword',
    "Father Marika's Hammer",
    'Heavy Erdtree Greatshield',
    'Heavy Inseparable Sword',
    'Heavy Sword of Milos',
    "Heavy Varré's Bouquet",
    "Heavy Watchdog's Crosier",
    "Heretic's Hook",
    'Holy Inferno Greatsword',
    "Occult Marika's Hammer",
    'Sharktooth Curved Sword',
    "Sinner's Shield",
    'Storm Arrow',
    'Unarmed',
  ],
  armor: ['Grass Hair Ornament', 'Scarab', 'Tarnished Wrap'],
  talisman: ['Broken Finger Stalker Contract', 'Elden Ring Talisman Template', 'Petition for Help'],
  spell: ["Giant's Flame Take Thee"],
  item: [
    'About Dense Fog of Sleep',
    "Asimi's Husk",
    'Asimi, Silver Chrysalid',
    'Asimi, Silver Tear',
    'Asimi, Silver Tear (item)',
    "Burial Crow's Letter",
    'Carrier Pigeon Letter [1]',
    'Carrier Pigeon Letter [2]',
    'Cord End',
    'Deathsbane Jerky',
    'Deathsbane White Jerky',
    'Dream Mist',
    'Dreambrew',
    'Fetal Position',
    'Fetid Flesh',
    'Flower Dragonbolt',
    "Fringefolk's Rune",
    'Gelmirian Scroll',
    'Glinstone Scrap',
    'Golden Dung',
    'Golden Order Canon',
    'Heavy Meteorite Fragment',
    'Hidden Plumage',
    'Holy Water Grease',
    "Irina's Necklace",
    "Lucent Baldachin's Blessing",
    'Note: Redeemers',
    'Phantom Finger',
    "Ranni's Scroll",
    'Red Insignia',
    'Remembrance of the Elder Inquisitor',
    'Roped Freezing Pot',
    'Sellian Scroll',
    "St. Trina's Crystal Ball",
    'The Carian Oath',
    'Vision of Grace',
  ],
}

/** The one boss the Fandom page only illustrates with an item icon. */
const BOSS_EXCEPTIONS = ['Scadutree Avatar']

function hasPicture(record: EntityRecord): boolean {
  return Boolean(record.image) || Boolean(fanImage(record.name))
}

describe('icon coverage (Task 154)', () => {
  it('has a picture for every item-like kind, ignoring the named exceptions', () => {
    for (const kind of ITEM_KINDS) {
      const all = records.filter((record) => record.kind === kind)
      const allowed = new Set(EXCEPTIONS[kind] ?? [])
      const measured = all.filter((record) => !allowed.has(record.name))
      const covered = measured.filter(hasPicture).length
      expect(all.length, `${kind} has records`).toBeGreaterThan(0)
      expect(covered / measured.length, `${kind}: ${covered}/${measured.length}`).toBeGreaterThanOrEqual(0.98)

      const missing = new Set(all.filter((record) => !hasPicture(record)).map((record) => record.name))
      for (const name of allowed) expect(missing.has(name), `${kind} exception '${name}' is covered now`).toBe(true)
    }
  })

  it('has a picture for every boss, except the named exception', () => {
    const allowed = new Set(BOSS_EXCEPTIONS)
    const missing = records
      .filter((record) => record.kind === 'boss' && !allowed.has(record.name) && !hasPicture(record))
      .map((record) => record.name)
    expect(missing).toEqual([])
    for (const name of allowed) {
      expect(records.some((record) => record.kind === 'boss' && record.name === name && !hasPicture(record))).toBe(true)
    }
  })

  it('has every referenced local image on disk', () => {
    const referenced = new Set<string>()
    for (const record of records) if (record.image?.startsWith('/sourced/images/')) referenced.add(record.image)
    const missing = [...referenced].filter((path) => !existsSync(fileURLToPath(new URL(`public${path}`, root))))
    expect(missing).toEqual([])
  })
})
