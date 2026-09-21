import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'

/**
 * Save adapter — NOT a real .sl2 parser yet.
 *
 * This is intentionally a labelled empty stub (HANDOFF-CLAUDE.md §6 item 5).
 * The production parser should be adapted from EthanShoeDev/elden-ring-compass
 * `packages/save-parser` (pure TypeScript, runs in a worker, never writes the
 * file back). Until then, dropping a save is an honest "not available yet"
 * error instead of silently loading a demo character.
 *
 * Do not upload .sl2 anywhere. File System Access / input[type=file] only.
 */
export async function ingestSave(file: File): Promise<Character> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const looksBinary = header.some((b) => b === 0)
  if (!looksBinary && file.size < 64) {
    throw new Error('That does not look like an Elden Ring save.')
  }

  throw new Error(
    'Save parsing is not available yet. Use Reckoning for a PS5 run, or npm run map for a live PC save.',
  )
}

export function resetCharacter(): Character {
  return { ...emptyCharacter }
}
