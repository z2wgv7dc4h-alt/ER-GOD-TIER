import { describe, expect, it } from 'vitest'
import { hasEntity } from './entityGraph'
import { DUNGEON_KINDS, dungeonBosses, dungeons, dungeonsInRegion, regionMatches } from './dungeons'

const countKind = (kind: string) => dungeons.filter((d) => d.kind === kind).length

describe('Task 104 dungeon index', () => {
  it('covers the named families with sane counts per kind', () => {
    expect(countKind('catacomb')).toBeGreaterThanOrEqual(20)
    expect(countKind('cave')).toBeGreaterThanOrEqual(20)
    expect(countKind('tunnel')).toBeGreaterThanOrEqual(8)
    expect(countKind('hero-grave')).toBeGreaterThanOrEqual(4)
    expect(countKind('evergaol')).toBeGreaterThanOrEqual(8)
    expect(countKind('divine-tower')).toBeGreaterThanOrEqual(5)
    expect(countKind('ruins')).toBeGreaterThanOrEqual(4)
    expect(countKind('gaol')).toBeGreaterThanOrEqual(3)
    expect(countKind('legacy')).toBeGreaterThanOrEqual(15)
  })

  it('has every required field on every row', () => {
    for (const d of dungeons) {
      expect(d.id, d.name).toBeTruthy()
      expect(d.name).toBeTruthy()
      expect(DUNGEON_KINDS).toContain(d.kind)
      expect(d.region).toBeTruthy()
      expect(d.world).toBeTruthy()
      expect(typeof d.dlc).toBe('boolean')
      expect(d.x === null || typeof d.x === 'number').toBe(true)
      expect(d.y === null || typeof d.y === 'number').toBe(true)
      expect(Array.isArray(d.bosses)).toBe(true)
      expect(Array.isArray(d.loot)).toBe(true)
      expect(Array.isArray(d.keys)).toBe(true)
      expect(typeof d.levers).toBe('number')
      expect(typeof d.impSeals).toBe('number')
    }
  })

  it('has unique ids', () => {
    expect(new Set(dungeons.map((d) => d.id)).size).toBe(dungeons.length)
  })

  it('resolves every boss id through the entity graph', () => {
    expect(dungeonBosses.length).toBeGreaterThan(50)
    for (const b of dungeonBosses) {
      expect(b.id, b.name).toMatch(/^[a-z]+:/)
      expect(hasEntity(b.id, b.name), `${b.id} (${b.name})`).toBe(true)
    }
  })

  it('knows well-known base and DLC rows, with their requirements', () => {
    const byName = new Map(dungeons.map((d) => [d.name, d]))
    expect(byName.get('Stormveil Castle')?.id).toBe('stormveil')
    expect(byName.get('Stormfoot Catacombs')?.dlc).toBe(false)
    expect(byName.get('Fog Rift Catacombs')?.dlc).toBe(true)
    expect(byName.get("Fringefolk Hero's Grave")?.impSeals).toBe(2)
    expect(byName.get('Raya Lucaria Academy')?.keys).toContain('Academy Glintstone Key')
  })
})

describe('dungeonsInRegion', () => {
  it('scopes to a region label with the Area-hub containment rule', () => {
    const limgrave = dungeonsInRegion('Limgrave').map((d) => d.name)
    expect(limgrave).toContain('Stormfoot Catacombs')
    expect(limgrave).toContain("Fringefolk Hero's Grave")
    expect(limgrave).not.toContain('Caelid Catacombs')
  })

  it('matches a region through its longer label', () => {
    expect(regionMatches('Liurnia of the Lakes', 'Liurnia')).toBe(true)
    expect(dungeonsInRegion('Liurnia').some((d) => d.name === 'Raya Lucaria Academy')).toBe(true)
  })

  it('is empty for a null or unknown region', () => {
    expect(dungeonsInRegion(null)).toEqual([])
    expect(dungeonsInRegion('Nowhere At All')).toEqual([])
  })
})
