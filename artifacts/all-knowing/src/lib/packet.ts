import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'

export const PACKET_VERSION = 1

export type Packet = {
  kind: 'all-knowing.packet'
  version: number
  regulation: string
  exportedAt: number
  character: Character
}

export function toPacket(character: Character): Packet {
  return {
    kind: 'all-knowing.packet',
    version: PACKET_VERSION,
    regulation: '1.17-tarnished-pack',
    exportedAt: Date.now(),
    character: { ...character, shots: [] },
  }
}

export function fromPacket(raw: unknown): Character {
  const doc = raw as Packet
  if (!doc || doc.kind !== 'all-knowing.packet') throw new Error('Not an All-Knowing packet.')
  return { ...emptyCharacter, ...doc.character, shots: [] }
}

function setOf(c: Character) {
  return new Set([
    ...c.defeatedBosses,
    ...c.discoveredGraces,
    ...c.collectedItems,
    ...c.completedQuestSteps,
  ])
}

export function diffPackets(current: Character, other: Character) {
  const a = setOf(current)
  const b = setOf(other)
  const onlyHere = [...a].filter((id) => !b.has(id))
  const onlyThere = [...b].filter((id) => !a.has(id))
  return { onlyHere, onlyThere, same: a.size - onlyHere.length }
}

export function downloadPacket(character: Character) {
  const blob = new Blob([JSON.stringify(toPacket(character), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${character.name.replace(/\s+/g, '-').toLowerCase() || 'tarnished'}.all-knowing.json`
  a.click()
  URL.revokeObjectURL(url)
}
