import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Task 62 guard: the ~21.8k gathering-node placements have model codes, not item
 * names, so they stay off the player map and out of Gideon's answers. Only the
 * Codex may list them, labelled unverified / model code only.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const DUMP = /gatheringNodes|gathering-nodes/

describe('gathering nodes stay off the player map', () => {
  it('Atlas never references the gathering-nodes dump', () => {
    expect(read('src/Atlas.tsx')).not.toMatch(DUMP)
  })

  it('no Atlas pin layer references the dump', () => {
    for (const file of [
      'src/lib/leftoverPins.ts',
      'src/lib/gatePins.ts',
      'src/lib/coords.ts',
      'src/lib/mapEngine.ts',
      'src/knowledge/graces.ts',
      'src/knowledge/bossPins.ts',
    ]) {
      expect(read(file), file).not.toMatch(DUMP)
    }
  })

  it('Gideon never answers material locations from the dump', () => {
    for (const file of ['src/lib/gideon.ts', 'src/Gideon.tsx', 'src/lib/search.ts']) {
      expect(read(file), file).not.toMatch(DUMP)
    }
  })

  it('only the Codex lists them, labelled unverified / model code only', () => {
    const codex = read('src/Codex.tsx')
    expect(codex).toMatch(/useGatheringNodes/)
    expect(codex).toMatch(/unverified placement, model code only/i)
    // ...and with no "show on map" affordance, since there is no verified pin.
    const section = codex.slice(codex.indexOf('Gathering nodes'))
    expect(section.slice(0, 900)).not.toMatch(/Show on map/)
  })
})
