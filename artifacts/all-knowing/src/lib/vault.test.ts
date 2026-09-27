import { beforeAll, describe, expect, it } from 'vitest'
import type { Shot } from '../types'
import { fromPacket, toPacket } from './packet'
import { activeProfile, defaultUi, exportActive, loadVault, saveVault, uiLocation, upsertActive, type VaultUi } from './vault'

function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k) },
    setItem: (k: string, v: string) => { map.set(k, String(v)) },
  } as unknown as Storage
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
})

describe('vault round-trip', () => {
  it('saves a character and reloads an identical profile', () => {
    const vault = loadVault()
    const saved = upsertActive(vault, {
      label: 'Wyatt',
      character: {
        ...activeProfile(vault).character,
        name: 'Wyatt',
        level: 42,
        defeatedBosses: ['boss:godrick'],
        discoveredGraces: ['grace:elleh'],
      },
    })
    saveVault(saved)

    const reloaded = activeProfile(loadVault())
    expect(reloaded.label).toBe('Wyatt')
    expect(reloaded.character.name).toBe('Wyatt')
    expect(reloaded.character.level).toBe(42)
    expect(reloaded.character.defeatedBosses).toEqual(['boss:godrick'])
    expect(reloaded.character.discoveredGraces).toEqual(['grace:elleh'])
  })

  it('never puts screenshots in an exported packet', () => {
    const vault = loadVault()
    const shot: Shot = { id: 's1', kind: 'map', name: 'map.png', url: 'blob:local-shot', notes: '', hits: [] }
    const updated = upsertActive(vault, {
      character: { ...activeProfile(vault).character, shots: [shot] },
    })
    const packet = exportActive(updated)
    expect(packet.character.shots).toEqual([])
    expect(JSON.stringify(packet)).not.toContain('blob:')
  })

  it('rejects documents that are not All-Knowing packets', () => {
    expect(() => fromPacket({ kind: 'something-else' })).toThrow(/packet/i)
    expect(toPacket(activeProfile(loadVault()).character).kind).toBe('all-knowing.packet')
  })
})

describe('location persistence (Task 93)', () => {
  it('defaults the UI to a real section/sub, not just a module id', () => {
    expect(uiLocation(defaultUi())).toEqual({ section: 'me', sub: 'overview' })
  })

  it('migrates a legacy vault that only stored a ModuleId', () => {
    const legacy: VaultUi = { module: 'map', missingOnly: true, selectedMarkerId: null }
    expect(uiLocation(legacy)).toEqual({ section: 'journey', sub: 'map' })
    expect(uiLocation({ ...legacy, module: 'codex' })).toEqual({ section: 'library', sub: 'search' })
  })

  it('round-trips section/sub exactly through the vault', () => {
    const base = loadVault()
    const saved = upsertActive(base, { ui: { ...defaultUi(), section: 'library', sub: 'pvp' } })
    saveVault(saved)
    const ui = activeProfile(loadVault()).ui
    expect(ui.section).toBe('library')
    expect(ui.sub).toBe('pvp')
    expect(uiLocation(ui)).toEqual({ section: 'library', sub: 'pvp' })
  })

  it('resolves a legacy Kit / Reference location to Builds / Guides', () => {
    expect(uiLocation({ module: 'build', section: 'library', sub: 'kit', missingOnly: false, selectedMarkerId: null })).toEqual(
      { section: 'library', sub: 'builds' },
    )
    expect(uiLocation({ module: 'codex', section: 'library', sub: 'reference', missingOnly: false, selectedMarkerId: null })).toEqual(
      { section: 'library', sub: 'guides' },
    )
  })
})
