import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { clearEntityIndex, setEntityIndex, type EntityRecord } from './entityIndex'
import { coverageViolations, deadLinks, edgeCoverage, linkableMentions } from './linksAudit'

/**
 * Task 138 §3 guards. Runs the same computation `npm run audit:links` writes into
 * `docs/LINKS-AUDIT.md`, over the committed enrichment index installed exactly as
 * the app installs it at runtime. Fails if a data id stops resolving or an
 * edge-coverage minimum regresses.
 */
const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))

function loadRecords(): Record<string, EntityRecord> {
  const doc = JSON.parse(readFileSync(indexPath, 'utf8')) as { records?: Record<string, EntityRecord> }
  return doc.records ?? {}
}

describe('links audit guards (Task 138 §3)', () => {
  beforeAll(() => {
    setEntityIndex(new Map(Object.entries(loadRecords())))
  })
  afterAll(() => {
    clearEntityIndex()
  })

  it('has no dead links in the data', () => {
    const dead = deadLinks()
    expect(dead, dead.map((d) => `${d.id} (${d.source})`).join('\n')).toEqual([])
  })

  it('meets every per-kind edge-coverage minimum', () => {
    const breaches = coverageViolations(edgeCoverage())
    expect(breaches, breaches.join('\n')).toEqual([])
  })

  it('autolink finds known entity names in prose', () => {
    expect(linkableMentions('Margit, the Fell Omen waits at the Church of Elleh.')).toBeGreaterThan(0)
  })
})
