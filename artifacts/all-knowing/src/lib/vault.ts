import { emptyCharacter } from '../data/seed'
import type { Character, ModuleId } from '../types'
import { fromPacket, toPacket, type Packet } from './packet'

export type VaultUi = {
  module: ModuleId
  missingOnly: boolean
  sitMode: boolean
  selectedMarkerId: string | null
}

export type Profile = {
  id: string
  label: string
  updatedAt: number
  character: Character
  ui: VaultUi
}

export type Vault = {
  version: 1
  activeId: string
  profiles: Profile[]
}

const VAULT_KEY = 'all-knowing.vault.v1'
const LEGACY_KEY = 'all-knowing.character.v1'
const SIT_KEY = 'all-knowing.sit'

export const defaultUi = (): VaultUi => ({
  module: 'reckon',
  missingOnly: true,
  sitMode: false,
  selectedMarkerId: null,
})

function blankProfile(label = 'Tarnished'): Profile {
  return {
    id: `p-${Date.now().toString(36)}`,
    label,
    updatedAt: Date.now(),
    character: { ...emptyCharacter, name: label, shots: [] },
    ui: defaultUi(),
  }
}

export function loadVault(): Vault {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (raw) {
      const doc = JSON.parse(raw) as Vault
      if (doc?.version === 1 && Array.isArray(doc.profiles) && doc.profiles.length) {
        return doc
      }
    }
  } catch { /* corrupt */ }

  const migrated = blankProfile('Tarnished')
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      migrated.character = { ...emptyCharacter, ...JSON.parse(legacy), shots: [] }
      migrated.label = migrated.character.name || 'Tarnished'
    }
    const sit = localStorage.getItem(SIT_KEY)
    if (sit === '1') migrated.ui.sitMode = true
  } catch { /* ignore */ }

  const vault = { version: 1 as const, activeId: migrated.id, profiles: [migrated] }
  saveVault(vault)
  return vault
}

export function saveVault(vault: Vault) {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
  } catch { /* quota */ }
}

export function activeProfile(vault: Vault) {
  return vault.profiles.find((p) => p.id === vault.activeId) ?? vault.profiles[0]
}

export function upsertActive(vault: Vault, patch: Partial<Profile>): Vault {
  const cur = activeProfile(vault)
  const next: Profile = {
    ...cur,
    ...patch,
    character: patch.character ?? cur.character,
    ui: { ...cur.ui, ...patch.ui },
    updatedAt: Date.now(),
  }
  return {
    ...vault,
    profiles: vault.profiles.map((p) => (p.id === cur.id ? next : p)),
  }
}

export function addProfile(vault: Vault, label: string): Vault {
  const p = blankProfile(label || 'New Tarnished')
  return { ...vault, activeId: p.id, profiles: [...vault.profiles, p] }
}

export function switchProfile(vault: Vault, id: string): Vault {
  if (!vault.profiles.some((p) => p.id === id)) return vault
  return { ...vault, activeId: id }
}

export function deleteProfile(vault: Vault, id: string): Vault {
  if (vault.profiles.length === 1) return vault
  const profiles = vault.profiles.filter((p) => p.id !== id)
  const activeId = vault.activeId === id ? profiles[0].id : vault.activeId
  return { ...vault, profiles, activeId }
}

export function importPacketIntoVault(vault: Vault, raw: unknown, asNew: boolean): Vault {
  const character = fromPacket(raw)
  if (asNew) {
    const p = blankProfile(character.name || 'Imported')
    p.character = character
    return { ...vault, activeId: p.id, profiles: [...vault.profiles, p] }
  }
  return upsertActive(vault, { character, label: character.name || activeProfile(vault).label })
}

export function exportActive(vault: Vault): Packet {
  return toPacket(activeProfile(vault).character)
}
