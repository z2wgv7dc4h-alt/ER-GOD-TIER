import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { EntityPanel } from '../library/EntityPanel'
import type { CategoryId, LibraryEntity } from '../library/model'
import { peekInfo } from '../peek/peekData'
import { clearEntityIndex, setEntityIndex, type EntityRecord } from './entityIndex'

/**
 * Task 123 §1 — structured values (armor negation, resistances, scaling,
 * requirements, attack) must render as rows/chips, never as `[object Object]`,
 * `undefined` or `NaN`. This renders an armor, weapon, talisman and boss
 * through both the peek card and the entity panel and scans the output.
 */

const indexPath = fileURLToPath(new URL('../../public/sourced/entity-index.json', import.meta.url))
const BAD = /\[object Object\]|undefined|NaN/

function loadRecords(): Record<string, EntityRecord> {
  const doc = JSON.parse(readFileSync(indexPath, 'utf8')) as { records?: Record<string, EntityRecord> }
  return doc.records ?? {}
}

const records = loadRecords()

function panelEntity(id: string, factId: string, category: CategoryId, name: string): LibraryEntity {
  return { id, factId, name, category }
}

const CASES: { label: string; id: string; entity: LibraryEntity }[] = [
  {
    label: 'armor',
    id: 'item:banished-knight-helm',
    entity: panelEntity('armor:banished-knight-helm', 'item:banished-knight-helm', 'armor', 'Banished Knight Helm'),
  },
  {
    label: 'weapon',
    id: 'item:uchigatana',
    entity: panelEntity('weapons:uchigatana', 'item:uchigatana', 'weapons', 'Uchigatana'),
  },
  {
    label: 'talisman',
    id: 'item:crimson-amber-medallion',
    entity: panelEntity('talismans:crimson-amber-medallion', 'item:crimson-amber-medallion', 'talismans', 'Crimson Amber Medallion'),
  },
  {
    label: 'boss',
    id: 'boss:margit',
    entity: panelEntity('bosses:margit', 'boss:margit', 'bosses', 'Margit, the Fell Omen'),
  },
]

beforeAll(() => {
  setEntityIndex(new Map(Object.entries(records)))
})

describe('entity rendering never stringifies a structured value (Task 123 §1)', () => {
  it('peek content for armor / weapon / talisman / boss has no bad tokens', () => {
    for (const testCase of CASES) {
      const record = records[testCase.id]
      expect(record, `${testCase.id} missing from the index`).toBeTruthy()
      const info = peekInfo(testCase.id, emptyCharacter, record)
      const serialized = JSON.stringify(info)
      expect(serialized, `${testCase.label} peek: ${serialized}`).not.toMatch(BAD)
    }
  })

  it('entity panel markup for armor / weapon / talisman / boss has no bad tokens', () => {
    for (const testCase of CASES) {
      const html = renderToStaticMarkup(
        <EntityPanel entity={testCase.entity} character={emptyCharacter} factId={testCase.id} />,
      )
      expect(html, `${testCase.label} panel`).not.toMatch(BAD)
    }
  })

  it('renders armor negation as labelled chips, not an object', () => {
    const record = records['item:banished-knight-helm']
    const negation = record?.stats?.Negation ?? ''
    expect(negation).toContain('Physical')
    const info = peekInfo('item:banished-knight-helm', emptyCharacter, record)
    const fact = info.facts.find((f) => f.label === 'Negation')
    expect(fact?.value).toBe(negation)
    expect(fact?.value).not.toContain('[object Object]')
    clearEntityIndex()
  })
})
