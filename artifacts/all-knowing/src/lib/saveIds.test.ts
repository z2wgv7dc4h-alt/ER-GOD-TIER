import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hexFor, type SaveIds } from './saveIds'

const doc = JSON.parse(
  fs.readFileSync(new URL('../../public/sourced/open/save-ids.json', import.meta.url), 'utf8'),
) as SaveIds

describe('save ids', () => {
  it('maps names to hex inventory ids', () => {
    expect(Object.keys(doc.ids.weapons).length).toBeGreaterThan(500)
    expect(hexFor(doc, 'weapons', 'Academy Glintstone Staff')).toMatch(/^0x[0-9A-F]+$/)
  })

  it('returns undefined for an unknown name/category', () => {
    expect(hexFor(doc, 'weapons', 'Nonexistent Weapon')).toBeUndefined()
    expect(hexFor(doc, 'nope', 'Academy Glintstone Staff')).toBeUndefined()
  })
})
