import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fanImage, fanImageCount, normalizeName } from './fanImage'
import { facts } from '../knowledge/catalog'

const root = new URL('../../', import.meta.url)
const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, root), 'utf8'))
const onDisk = (publicPath: string) => existsSync(fileURLToPath(new URL(`public${publicPath}`, root)))

const armoryWeapons = read('public/sourced/armory-weapons.json') as { name: string; dlc: boolean }[]
const armoryBosses = read('public/sourced/armory-bosses.json') as { name: string }[]
const guideItems = read('public/sourced/guide/items.json') as { name: string; dlc: boolean }[]

describe('normalizeName', () => {
  it('lowercases, drops possessives and parentheticals, collapses punctuation', () => {
    expect(normalizeName("Godrick's Great Rune")).toBe('godrick great rune')
    expect(normalizeName('Margit, the Fell Omen')).toBe('margit the fell omen')
    expect(normalizeName('Godfrey, First Elden Lord (golden shade)')).toBe('godfrey first elden lord')
    expect(normalizeName('  Hand   Axe  ')).toBe('hand axe')
  })
})

describe('fanImage', () => {
  it('resolves a base-game weapon to a cached local WebP', () => {
    const hit = fanImage('Hand Axe')
    expect(hit).toMatch(/^\/sourced\/images\/weapons\/.+\.webp$/)
    expect(onDisk(hit!)).toBe(true)
  })

  it('resolves a base-game boss', () => {
    const hit = fanImage('Maliketh, the Black Blade')
    expect(hit).toMatch(/^\/sourced\/images\/bosses\/.+\.webp$/)
    expect(onDisk(hit!)).toBe(true)
  })

  it('falls back to an alias when the primary name is unknown', () => {
    expect(fanImage('Definitely Not A Real Item')).toBeUndefined()
    expect(fanImage('Definitely Not A Real Item', ['Hand Axe'])).toBe(fanImage('Hand Axe'))
  })

  it('matches either half of a slash-separated phase name', () => {
    // Catalog name: "Radagon of the Golden Order / Elden Beast"; the FanAPI has
    // both "Radagon of the Golden Order" and "Elden Beast" as separate rows.
    expect(fanImage('Radagon of the Golden Order / Elden Beast')).toBe(fanImage('Radagon of the Golden Order'))
  })

  it('returns undefined for Shadow of the Erdtree content the FanAPI predates', () => {
    expect(fanImage('Messmer the Impaler')).toBeUndefined()
    expect(fanImage('Bayle the Dread')).toBeUndefined()
  })

  it('every indexed path exists on disk', () => {
    const index = read('src/data/image-index.json') as Record<string, string>
    const missing = Object.values(index).filter((p) => !onDisk(p))
    expect(missing).toEqual([])
    expect(fanImageCount()).toBeGreaterThan(2000)
  })
})

describe('Codex image coverage', () => {
  it('covers the majority of base-game weapons and bosses', () => {
    const weapons = armoryWeapons.filter((w) => !w.dlc && fanImage(w.name))
    const bosses = armoryBosses.filter((b) => fanImage(b.name))
    expect(weapons.length).toBeGreaterThanOrEqual(280)
    expect(bosses.length).toBeGreaterThanOrEqual(70)
  })

  it('covers the majority of base-game guide items', () => {
    const hit = guideItems.filter((g) => !g.dlc && fanImage(g.name))
    expect(hit.length).toBeGreaterThanOrEqual(1400)
  })

  it('leaves the pre-SotE DLC gap visible rather than guessing', () => {
    const base = guideItems.filter((g) => !g.dlc)
    const dlc = guideItems.filter((g) => g.dlc)
    const baseHit = base.filter((g) => fanImage(g.name)).length / base.length
    const dlcHit = dlc.filter((g) => fanImage(g.name)).length / dlc.length
    expect(baseHit).toBeGreaterThan(0.6)
    expect(dlcHit).toBeLessThan(0.1)
  })

  it('resolves real pictures for catalog item/boss facts', () => {
    const baseFacts = facts.filter((f) => f.campaign === 'base' && (f.kind === 'item' || f.kind === 'boss'))
    const hit = baseFacts.filter((f) => fanImage(f.name, f.aliases))
    expect(hit.length / baseFacts.length).toBeGreaterThanOrEqual(0.65)
  })
})
