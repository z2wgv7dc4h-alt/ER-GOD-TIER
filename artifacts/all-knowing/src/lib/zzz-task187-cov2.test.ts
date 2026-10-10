import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { it } from 'vitest'
import { allEntities, canonicalEntityId, hasEntity } from './entityGraph'
import type { EntityRecord } from './entityIndex'
import { computeEntityCoverage } from './entityCoverage'

const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))

it('region coverage detail', () => {
  const records = (JSON.parse(readFileSync(indexPath, 'utf8')) as { records?: Record<string, EntityRecord> }).records ?? {}
  const report = computeEntityCoverage(records)
  const region = report.kinds.find((k) => k.kind === 'region')!
  const lines = [`REGION total=${region.total} descLoc=${JSON.stringify(region.fields.descriptionLocation)} loc=${JSON.stringify(region.fields.location)} desc=${JSON.stringify(region.fields.description)}`]
  const head = (JSON.parse(readFileSync(fileURLToPath(new URL('../../.scratch/task187/head-index.json', import.meta.url)), 'utf8').replace(/^\uFEFF/, '')) as { records?: Record<string, EntityRecord> }).records ?? {}
  const hreport = computeEntityCoverage(head)
  const hregion = hreport.kinds.find((k) => k.kind === 'region')!
  lines.push(`HEAD REGION descLoc=${JSON.stringify(hregion.fields.descriptionLocation)} loc=${JSON.stringify(hregion.fields.location)} desc=${JSON.stringify(hregion.fields.description)}`)
  // replicate the denominator and list misses
  const CAT = new Set(['weapon', 'shield', 'armor', 'talisman', 'spell', 'ash', 'spirit', 'item'])
  const seen = new Set<string>()
  const list: (EntityRecord | undefined)[] = []
  for (const entity of allEntities()) {
    if (CAT.has(entity.kind)) continue
    const c = canonicalEntityId(entity.id)
    if (c !== entity.id && hasEntity(c)) continue
    if (entity.kind !== 'region') continue
    seen.add(entity.id)
    list.push(records[entity.id])
  }
  for (const [id, record] of Object.entries(records)) {
    if (seen.has(id)) continue
    if (record.kind !== 'region') continue
    if (record.catalogue === false) continue
    list.push(record)
  }
  const miss = list.filter((r) => !(r?.description && r?.location))
  lines.push('LIST total=' + list.length + ' miss=' + miss.length)
  lines.push(miss.map((r) => r?.id ?? '(unresolved)').join(' | '))
  writeFileSync(fileURLToPath(new URL('../../.scratch/task187/region-detail.txt', import.meta.url)), lines.join('\n'))
})
