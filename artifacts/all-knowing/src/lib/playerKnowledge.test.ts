import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Task 170 §4 — guards for the player-knowledge corpus. The corpus is generated
 * by `scripts/collect-player-knowledge.py` from Reddit (via the Arctic Shift
 * archive) and committed under `public/sourced/open/`; text only, no usernames.
 */

const DIR = fileURLToPath(new URL('../../public/sourced/open/', import.meta.url))
const FILE = DIR + 'player-knowledge.json'

type Row = {
  text: string
  score: number
  date: string
  permalink: string
  kind: 'post' | 'comment'
  topic: string
  entities: string[]
  patch: string
  possiblyOutdated: boolean
}

const doc = JSON.parse(readFileSync(FILE, 'utf8')) as {
  collected: number
  patchTable: { date: string; version: string }[]
  rows: Row[]
}
const rows = doc.rows

// Reddit username mentions; `u/vendor` inside a word (e.g. "Beru/Ant-king") is
// not a username because it is not preceded by whitespace or a word boundary.
const USERNAME = /(?<![A-Za-z0-9])u\/[A-Za-z0-9_-]{2,}/i

describe('Task 170 §4 — player knowledge corpus', () => {
  it('exists and ships at least 5,000 rows', () => {
    expect(existsSync(FILE)).toBe(true)
    expect(doc.collected).toBe(rows.length)
    expect(rows.length).toBeGreaterThanOrEqual(5000)
  })

  it('gives every row text, topic, date and patch', () => {
    const bad = rows.filter(
      (r) => !r.text?.trim() || !r.topic || !r.date || !r.patch,
    )
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('contains no u/ username mentions', () => {
    const offenders = rows.filter((r) => USERNAME.test(r.text))
    expect(offenders.slice(0, 5).map((r) => r.permalink)).toEqual([])
  })

  it('resolves entities on at least half the rows', () => {
    const withEntity = rows.filter((r) => (r.entities ?? []).length >= 1).length
    expect(withEntity / rows.length).toBeGreaterThanOrEqual(0.5)
  })

  it('stays under the 25 MB output budget', () => {
    expect(statSync(FILE).size).toBeLessThan(25 * 1024 * 1024)
  })
})
