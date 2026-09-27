import { matchMany } from '../knowledge/catalog'
import type { AtlasWorld } from '../knowledge/graces'
import type { Character, MapMarker } from '../types'

/**
 * Task 111 §2 — custom map notes.
 *
 * A note is a free-text pin the player drops on the plate, optionally linked to
 * an entity. Notes live in the vault with the character (`answers.mapNotes`), so
 * switching Tarnished switches notes with it. Coordinates are percent of the
 * world plate the note was dropped on, which is the same frame the Atlas draws
 * pins in.
 */
export type MapNote = {
  id: string
  text: string
  x: number
  y: number
  world: AtlasWorld
  entityId?: string
  at: number
}

export const NOTES_ANSWER_KEY = 'mapNotes'

function isNote(value: unknown): value is MapNote {
  if (!value || typeof value !== 'object') return false
  const n = value as Partial<MapNote>
  return (
    typeof n.id === 'string' &&
    typeof n.text === 'string' &&
    typeof n.x === 'number' &&
    typeof n.y === 'number' &&
    typeof n.world === 'string'
  )
}

/** Parse the character's stored notes; corrupt / missing data degrades to []. */
export function readNotes(character: Character): MapNote[] {
  const raw = character.answers?.[NOTES_ANSWER_KEY]
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isNote)
  } catch {
    return []
  }
}

function writeNotes(character: Character, notes: MapNote[]): Character {
  return {
    ...character,
    answers: { ...character.answers, [NOTES_ANSWER_KEY]: JSON.stringify(notes) },
  }
}

export type NoteInput = {
  text: string
  x: number
  y: number
  world: AtlasWorld
  entityId?: string
  /** Test seam; defaults to a time+random id. */
  id?: string
  at?: number
}

export function addNote(character: Character, input: NoteInput): Character {
  const text = input.text.trim()
  if (!text) return character
  const id = input.id ?? `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const note: MapNote = {
    id,
    text,
    x: input.x,
    y: input.y,
    world: input.world,
    entityId: input.entityId || undefined,
    at: input.at ?? Date.now(),
  }
  return writeNotes(character, [...readNotes(character), note])
}

export function removeNote(character: Character, id: string): Character {
  return writeNotes(character, readNotes(character).filter((n) => n.id !== id))
}

export function updateNote(character: Character, id: string, patch: Partial<Omit<MapNote, 'id'>>): Character {
  return writeNotes(
    character,
    readNotes(character).map((n) => (n.id === id ? { ...n, ...patch, text: patch.text?.trim() || n.text } : n)),
  )
}

export function notesForWorld(notes: MapNote[], world: AtlasWorld): MapNote[] {
  return notes.filter((n) => n.world === world)
}

/** Notes as plate pins (kind `item`; the Atlas styles the note layer itself). */
export function noteMarkers(notes: MapNote[], world: AtlasWorld): MapMarker[] {
  return notesForWorld(notes, world).map((n) => ({
    id: n.id,
    name: n.text,
    kind: 'item',
    region: n.world,
    campaign: n.world === 'shadow' ? 'sote' : 'base',
    x: n.x,
    y: n.y,
    note: n.entityId ? `linked: ${n.entityId}` : 'note',
  }))
}

/** Entity suggestions for the note editor's optional link field. */
export function matchNoteLinks(query: string, limit = 6) {
  const q = query.trim()
  if (q.length < 2) return [] as { id: string; name: string }[]
  const seen = new Set<string>()
  const out: { id: string; name: string }[] = []
  for (const f of matchMany(q)) {
    if (seen.has(f.id)) continue
    seen.add(f.id)
    out.push({ id: f.id, name: f.name })
    if (out.length >= limit) break
  }
  return out
}
