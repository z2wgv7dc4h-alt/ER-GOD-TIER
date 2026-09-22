import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchSecrets, type SecretsDoc } from './secrets'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/secrets.json', import.meta.url), 'utf8'),
) as SecretsDoc

describe('secrets (illusory walls, from MCP DB)', () => {
  it('has wall entries', () => {
    expect(doc.walls.length).toBeGreaterThan(30)
    expect(doc.walls.every((w) => w.area)).toBe(true)
  })

  it('matches by area or text', () => {
    expect(matchSecrets('xy', doc.walls)).toEqual([])
    expect(matchSecrets('illusory', doc.walls).length).toBeGreaterThan(0)
  })
})
