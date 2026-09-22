import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchBossDrops, type FextBoss } from './bosses'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/bosses-fextralife.json', import.meta.url), 'utf8'),
) as { source: string; bosses: FextBoss[] }
const rows = doc.bosses

describe('fextralife boss drops', () => {
  it('covers base + SotE with drops', () => {
    expect(rows.length).toBeGreaterThan(150)
    expect(rows.filter((b) => b.drops.length).length).toBeGreaterThan(150)
  })

  it('has the DLC remembrance bosses and their drops', () => {
    const messmer = rows.find((b) => b.name.includes('Messmer'))!
    expect(messmer.locations).toContain('Shadow Keep')
    expect(messmer.drops).toContain('Remembrance of the Impaler')
    expect(messmer.drops.some((d) => d.includes('Runes'))).toBe(true)
  })

  it('matches by name, location or drop', () => {
    expect(matchBossDrops('me', rows)).toEqual([])
    expect(matchBossDrops('messmer', rows).length).toBeGreaterThan(0)
    expect(matchBossDrops('shadow keep', rows).length).toBeGreaterThan(0)
  })
})
