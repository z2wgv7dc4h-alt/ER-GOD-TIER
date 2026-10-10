import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { it } from 'vitest'
import { allEntities } from './entityGraph'
import { setEntityIndex, clearEntityIndex, type EntityRecord } from './entityIndex'
import { guardMisses } from './entityCoverage'

const indexPath = fileURLToPath(new URL('../../.scratch/task187/head-index.json', import.meta.url))

it('prints guard misses for task 187 diagnostics', () => {
  const records = (JSON.parse(readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, '')) as { records?: Record<string, EntityRecord> }).records ?? {}
  setEntityIndex(new Map(Object.entries(records)))
  try {
    const misses = guardMisses(records)
    const out = misses
      .filter((m) => m.kind === 'region' || m.kind === 'boss')
      .map((m) => `${m.kind} ${m.label}: ${m.missing.length}/${m.total} :: ${m.missing.slice(0, 40).join(' | ')}`)
    out.push('ALL ENTITIES ' + allEntities().length)
    writeFileSync(fileURLToPath(new URL('../../.scratch/task187/guardmiss-head.txt', import.meta.url)), out.join('\n'))
  } finally {
    clearEntityIndex()
  }
})
