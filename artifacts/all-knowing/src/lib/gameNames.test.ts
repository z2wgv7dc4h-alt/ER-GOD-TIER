import { describe, expect, it } from 'vitest'
import unresolved from '../../docs/tasks/146-unresolved-names.json'
import indexJson from '../../public/sourced/entity-index.json'
import { canonicalFactId } from './aliases'

type IndexRecord = { id: string; kind: string; name: string }
const records = (indexJson as { records: Record<string, IndexRecord> }).records

/**
 * Task 146 — the strings the PS5 photo reader sees, verbatim from the game's own
 * FMG name tables (NpcName / PlaceName). Each was deleted in commit 07e7eb0 and
 * must resolve again through the app's alias plane to a record that exists.
 */
const gameNames = [
  ...new Set([
    ...unresolved.enemy.unresolved,
    ...unresolved.npc.unresolved,
    ...unresolved.region.unresolved,
  ]),
]

describe('in-game names (Task 146)', () => {
  it('resolves every game spelling through the alias plane to an existing record', () => {
    const bad: string[] = []
    for (const name of gameNames) {
      const id = canonicalFactId('unknown', name)
      if (id === 'unknown' || !records[id]) bad.push(`${name} -> ${id}`)
    }
    expect(bad, `unresolved game names:\n${bad.join('\n')}`).toEqual([])
  })

  it('has the restored items, each of its sibling kind', () => {
    const expected: [string, string, string][] = [
      ['item:twinned-armor', 'Twinned Armor', 'armor'],
      ['item:gold-sewing-needle', 'Gold Sewing Needle', 'item'],
      ['item:pest-thread-spears', 'Pest-Thread Spears', 'spell'],
      ['item:perfumer-tricia', 'Perfumer Tricia', 'spirit'],
    ]
    for (const [id, name, kind] of expected) {
      expect(records[id], id).toBeTruthy()
      expect(records[id].name).toBe(name)
      expect(records[id].kind).toBe(kind)
    }
  })

  it('keeps the base/altered siblings the restored rows sit beside', () => {
    expect(records['item:twinned-armor-altered']).toBeTruthy()
    expect(records['item:pest-threads']).toBeTruthy()
  })
})
