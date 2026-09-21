import { demoCharacter, emptyCharacter } from '../data/seed'
import type { Character } from '../types'

/**
 * Save adapter.
 *
 * v1 is a contract + demo ingest. The production parser should be adapted from
 * EthanShoeDev/elden-ring-compass `packages/save-parser` (pure TypeScript,
 * runs in a worker, never writes the file back).
 *
 * Do not upload .sl2 anywhere. File System Access / input[type=file] only.
 */
export async function ingestSave(file: File): Promise<Character> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const looksBinary = header.some((b) => b === 0)
  if (!looksBinary && file.size < 64) {
    throw new Error('That does not look like an Elden Ring save.')
  }

  // Parser hook: replace this with save-parser-ts once vendored.
  return {
    ...demoCharacter,
    source: 'save',
    fileName: file.name,
    name: file.name.replace(/\.(sl2|co2)$/i, '') || demoCharacter.name,
  }
}

export function resetCharacter(): Character {
  return { ...emptyCharacter }
}
