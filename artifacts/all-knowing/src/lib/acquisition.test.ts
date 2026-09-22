import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchAcquisition, type AcquisitionDoc } from './acquisition'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/acquisition.json', import.meta.url), 'utf8'),
) as AcquisitionDoc

describe('acquisition (from MCP DB)', () => {
  it('has structured rows', () => {
    expect(doc.rows.length).toBeGreaterThan(2000)
    expect(doc.rows.some((r) => r.method === 'merchant' && r.near)).toBe(true)
  })

  it('matches by item name', () => {
    expect(matchAcquisition('ab', doc.rows)).toEqual([])
    expect(matchAcquisition('larval tear', doc.rows).length).toBeGreaterThan(0)
  })
})
