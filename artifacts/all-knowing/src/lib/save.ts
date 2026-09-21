import { emptyCharacter } from '../data/seed'
import type { Character } from '../types'
import { applyFacts } from './infer'
import { REGULATION_STAMP } from './regulation'
import { analyzeSave, type SaveResult } from './sl2/analyze'
import type { SaveWorkerResponse } from './sl2/worker'

/**
 * Real, local, read-only PC `.sl2` parser.
 *
 * Parsing is a pure-TypeScript, format-understanding port (BND4 container + fixed
 * little-endian character slots + the packed event-flag bitfield), adapted from the
 * documented Elden Ring save format and the ER-Save-Lib / elden-ring-compass reference
 * parsers. It runs client-side (in a Web Worker when available), never uploads the file,
 * and has no write path — dropping a save can only add facts, never modify the file.
 *
 * Facts flow through the normal `applyFacts` pipeline with evidence source `'save'`.
 */
export async function ingestSave(file: File, slot?: number): Promise<Character> {
  const buffer = await file.arrayBuffer()
  const result = await runParse(buffer, slot)
  return characterFromResult(result, file.name)
}

/** Parse the buffer in a worker when one exists, otherwise inline (tests / SSR). */
function runParse(buffer: ArrayBuffer, slot?: number): Promise<SaveResult> {
  if (typeof Worker === 'undefined') {
    return Promise.resolve(analyzeSave(buffer, slot))
  }
  return new Promise<SaveResult>((resolve, reject) => {
    const worker = new Worker(new URL('./sl2/worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<SaveWorkerResponse>) => {
      worker.terminate()
      if (event.data.ok) resolve(event.data.result)
      else reject(new Error(event.data.error))
    }
    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Could not read that save.'))
    }
    worker.postMessage({ buffer, slot }, [buffer])
  })
}

/** Build a `Character` from a parsed save and run the facts through `applyFacts`. */
export function characterFromResult(result: SaveResult, fileName: string): Character {
  const base: Character = {
    source: 'save',
    platform: 'pc',
    regulation: REGULATION_STAMP,
    fileName,
    name: result.characterName || 'Tarnished',
    level: result.level,
    startingClass: result.startingClass,
    stats: result.stats,
    loadout: [],
    defeatedBosses: [],
    discoveredGraces: [],
    collectedItems: [],
    completedQuestSteps: [],
    deniedFacts: [],
    answers: { platform: 'pc', ...(result.dlc ? { dlc: 'sote' } : {}) },
    evidence: [],
    shots: [],
  }
  return applyFacts(base, result.facts, 'save', result.detail)
}

export function resetCharacter(): Character {
  return { ...emptyCharacter }
}
