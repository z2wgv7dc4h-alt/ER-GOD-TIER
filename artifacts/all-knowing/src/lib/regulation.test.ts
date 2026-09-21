import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { demoCharacter, emptyCharacter } from '../data/seed'
import { regulation as catalogRegulation } from '../knowledge/catalog'
import { characterFromEngine } from './mapEngine'
import { fromPacket, toPacket } from './packet'
import { REGULATION_SOURCES, REGULATION_STAMP, regulationAudit } from './regulation'

describe('regulation stamp', () => {
  it('is the confirmed Tarnished Pack line, not just SCOPE’s example string', () => {
    expect(REGULATION_STAMP).toBe('1.17-tarnished-pack')
  })

  it('is present on the empty and demo characters', () => {
    expect(emptyCharacter.regulation).toBe(REGULATION_STAMP)
    expect(demoCharacter.regulation).toBe(REGULATION_STAMP)
  })

  it('is present on the catalog', () => {
    expect(catalogRegulation).toBe(REGULATION_STAMP)
  })

  it('is present on a character built from a save-engine snapshot', () => {
    const c = characterFromEngine(
      { slot: 0, name: 'dog', level: 9, ok: true, found: ['grace:10000800'] },
      'ER0000.sl2',
    )
    expect(c.regulation).toBe(REGULATION_STAMP)
  })

  it('survives a packet round-trip and back-fills a legacy packet', () => {
    expect(fromPacket(toPacket(emptyCharacter)).regulation).toBe(REGULATION_STAMP)

    const legacy = { kind: 'all-knowing.packet', version: 1, exportedAt: 0, character: { ...emptyCharacter } }
    delete (legacy.character as { regulation?: string }).regulation
    expect(fromPacket(legacy).regulation).toBe(REGULATION_STAMP)
  })
})

describe('regulation audit', () => {
  it('reports the AR/Build-lab source as consistent', () => {
    const ar = REGULATION_SOURCES.find((s) => s.id === 'build-lab-ar')
    expect(ar?.version).toBe(REGULATION_STAMP)
    expect(ar?.consistent).toBe(true)
  })

  it('flags the marker extract and FMG dump as a real mismatch', () => {
    const audit = regulationAudit()
    expect(audit.stamp).toBe(REGULATION_STAMP)
    expect(audit.consistent).toBe(false)
    const ids = audit.mismatched.map((s) => s.id)
    expect(ids).toContain('marker-extract')
    expect(ids).toContain('fmg-dump')
  })

  it('never marks an off-stamp source consistent', () => {
    for (const s of REGULATION_SOURCES) {
      expect(s.consistent).toBe(s.version === REGULATION_STAMP)
    }
  })
})

// Read the actual files on disk — the audit's claims must match the data.
describe('regulation audit against the real data', () => {
  const names = JSON.parse(
    readFileSync(new URL('../../public/sourced/open/names.json', import.meta.url), 'utf8'),
  ) as { name: string }[]
  const regulation = JSON.parse(
    readFileSync(new URL('../../public/sourced/regulation-vanilla-v1.17.json', import.meta.url), 'utf8'),
  ) as { weapons: { name?: string }[] }
  const paramdex = readFileSync(
    new URL('../../public/sourced/open/paramdex/EquipParamWeapon.txt', import.meta.url),
    'utf8',
  )

  it('the AR regulation really carries Tarnished Pack rows', () => {
    const hasIdus = regulation.weapons.some((w) => /^Idus Sword$/.test(w.name ?? ''))
    const hasLeontiel = regulation.weapons.some((w) => /Leontiel/.test(w.name ?? ''))
    expect(hasIdus).toBe(true)
    expect(hasLeontiel).toBe(true)
  })

  it('the FMG dump really has no SotE / Tarnished Pack names', () => {
    const text = names.map((n) => n.name).join('\n')
    for (const probe of ['Idus Sword', 'Leontiel', 'Milady', 'Rellana', 'Messmer', 'Bayle']) {
      expect(text.includes(probe)).toBe(false)
    }
  })

  it('Paramdex really has no Tarnished Pack weapon rows', () => {
    expect(/Idus Sword/.test(paramdex)).toBe(false)
    expect(/Leontiel/.test(paramdex)).toBe(false)
  })
})
