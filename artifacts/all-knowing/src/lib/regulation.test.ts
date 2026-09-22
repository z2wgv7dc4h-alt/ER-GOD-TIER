import { existsSync, readFileSync } from 'node:fs'
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
  it('reports the AR, marker extract and FMG dump as consistent with the stamp', () => {
    const audit = regulationAudit()
    expect(audit.stamp).toBe(REGULATION_STAMP)
    for (const id of ['build-lab-ar', 'marker-extract', 'fmg-dump']) {
      const s = REGULATION_SOURCES.find((x) => x.id === id)
      expect(s?.version).toBe(REGULATION_STAMP)
      expect(s?.consistent).toBe(true)
    }
  })

  it('flags Paramdex as the one remaining, external mismatch', () => {
    const audit = regulationAudit()
    expect(audit.consistent).toBe(false)
    expect(audit.mismatched.map((s) => s.id)).toEqual(['paramdex'])
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
  const npcParamdex = readFileSync(
    new URL('../../public/sourced/open/paramdex/NpcParam.txt', import.meta.url),
    'utf8',
  )

  it('the AR regulation really carries Tarnished Pack rows', () => {
    const hasIdus = regulation.weapons.some((w) => /^Idus Sword$/.test(w.name ?? ''))
    const hasLeontiel = regulation.weapons.some((w) => /Leontiel/.test(w.name ?? ''))
    expect(hasIdus).toBe(true)
    expect(hasLeontiel).toBe(true)
  })

  it('the regenerated FMG dump really has Shadow of the Erdtree and Tarnished Pack names', () => {
    const text = names.map((n) => n.name).join('\n')
    for (const probe of ['Idus Sword', 'Leontiel', 'Milady', 'Rellana', 'Messmer']) {
      expect(text.includes(probe)).toBe(true)
    }
  })

  it('Paramdex weapon names now carry the Shadow of the Erdtree and Tarnished Pack rows', () => {
    // Shadow of the Erdtree rows were already upstream...
    expect(/Milady/.test(paramdex)).toBe(true)
    expect(/Messmer/.test(paramdex)).toBe(true)
    // ...the Tarnished Pack rows were topped up from the install by
    // scripts/extract-paramdex-names.py.
    expect(/Idus Sword/.test(paramdex)).toBe(true)
    expect(/Leontiel/.test(paramdex)).toBe(true)
  })

  it('Paramdex NpcParam.txt is the one remaining off-stamp file (post-SotE, pre-Tarnished-Pack)', () => {
    // The install-derived NpcParam.txt regeneration is not possible (its names
    // are DSMapStudio-resolved, not an FMG row-id join), so this documents the
    // honest remaining gap rather than pretending it is closed.
    expect(/Messmer/.test(npcParamdex)).toBe(true)
    expect(/Leontiel/.test(npcParamdex)).toBe(false)
  })
})

// The atlas marker extract is game-derived and gitignored, so it only exists
// after a local `python tools/build_markers.py` run. When it is present, it
// must show Shadow of the Erdtree content (the install is the 1.17 build).
describe('atlas marker extract (when generated locally)', () => {
  const markerPath = new URL('../../vendor/elden-ring-map/data/markers.json', import.meta.url)
  // A runtime `if` around `it()` leaves this suite with zero registered tests
  // (and some Vitest configs fail a describe block with no tests) on any
  // fresh checkout or CI runner, which never has this gitignored, game-
  // derived file. `skipIf` always registers the test, just marks it skipped.
  it.skipIf(!existsSync(markerPath))('includes Shadow of the Erdtree markers from the 1.17 install', () => {
    const data = JSON.parse(readFileSync(markerPath, 'utf8')) as {
      markers: { names: { en: string } }[]
    }
    const text = data.markers.map((m) => m.names.en).join('\n')
    expect(text).toContain('Belurat')
    expect(text).toContain('Shadow Keep')
  })
})
