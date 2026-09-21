import { beforeEach, describe, expect, it } from 'vitest'
import { applyFacts } from './infer'
import {
  activeProfile,
  addProfile,
  deleteProfile,
  loadVault,
  saveVault,
  switchProfile,
  upsertActive,
  type Vault,
} from './vault'

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

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true })
})

// `addProfile` derives its id from `Date.now()`; wait out the millisecond so two
// profiles created back-to-back in a test never collide.
async function addProfileSafely(vault: Vault, label: string): Promise<Vault> {
  await new Promise((r) => setTimeout(r, 2))
  return addProfile(vault, label)
}

describe('multi-profile isolation', () => {
  it('creates 2 profiles, keeps facts isolated, and persists across a switch', async () => {
    let vault = loadVault()
    const firstId = vault.activeId

    vault = await addProfileSafely(vault, 'Wyatt')
    const secondId = vault.activeId
    expect(vault.profiles).toHaveLength(2)
    expect(activeProfile(vault).label).toBe('Wyatt')

    // Add facts to the second Tarnished only.
    const loaded = applyFacts(
      activeProfile(vault).character,
      ['boss:godrick', 'grace:elleh'],
      'answer',
      'profile test',
    )
    vault = upsertActive(vault, { character: loaded })
    expect(activeProfile(vault).character.defeatedBosses).toContain('boss:godrick')

    // Switch back to the first — it must be untouched by the other's facts.
    vault = switchProfile(vault, firstId)
    const first = activeProfile(vault)
    expect(first.id).toBe(firstId)
    expect(first.character.defeatedBosses).toEqual([])
    expect(first.character.discoveredGraces).toEqual([])
    expect(first.character.evidence).toEqual([])

    // Switch forward again — the second's facts persisted.
    vault = switchProfile(vault, secondId)
    const second = activeProfile(vault)
    expect(second.id).toBe(secondId)
    expect(second.character.defeatedBosses).toContain('boss:godrick')
    expect(second.character.discoveredGraces).toContain('grace:elleh')

    // And they survive a save/reload round-trip.
    saveVault(vault)
    const reloaded = loadVault()
    expect(activeProfile(reloaded).id).toBe(secondId)
    expect(activeProfile(reloaded).character.defeatedBosses).toContain('boss:godrick')
  })

  it('gives a brand-new profile a blank character, not a copy of the active one', async () => {
    let vault = loadVault()
    const loaded = applyFacts(
      activeProfile(vault).character,
      ['boss:godrick'],
      'answer',
      'before new profile',
    )
    vault = upsertActive(vault, { character: loaded })

    vault = await addProfileSafely(vault, 'Fresh')
    const fresh = activeProfile(vault)
    expect(fresh.label).toBe('Fresh')
    expect(fresh.character.defeatedBosses).toEqual([])
    expect(fresh.character.evidence).toEqual([])
  })

  it('ignores a switch to an unknown profile id', () => {
    const vault = loadVault()
    expect(switchProfile(vault, 'p-does-not-exist')).toBe(vault)
  })
})

describe('profile management', () => {
  it('renames only the active profile', async () => {
    let vault = loadVault()
    const firstId = vault.activeId
    vault = await addProfileSafely(vault, 'Second')
    const secondId = vault.activeId

    vault = upsertActive(vault, {
      label: 'Renamed',
      character: { ...activeProfile(vault).character, name: 'Renamed' },
    })

    expect(vault.profiles.find((p) => p.id === secondId)?.label).toBe('Renamed')
    expect(vault.profiles.find((p) => p.id === firstId)?.label).toBe('Tarnished')
    expect(vault.profiles.find((p) => p.id === firstId)?.character.name).toBe('Tarnished')
  })

  it('deletes a profile and reassigns the active one', async () => {
    let vault = loadVault()
    const firstId = vault.activeId
    vault = await addProfileSafely(vault, 'Second')
    const secondId = vault.activeId

    vault = deleteProfile(vault, secondId)
    expect(vault.profiles.map((p) => p.id)).toEqual([firstId])
    expect(vault.activeId).toBe(firstId)
  })

  it('refuses to delete the last remaining profile', () => {
    const vault = loadVault()
    const after = deleteProfile(vault, vault.activeId)
    expect(after.profiles).toHaveLength(1)
    expect(after).toBe(vault)
  })
})
