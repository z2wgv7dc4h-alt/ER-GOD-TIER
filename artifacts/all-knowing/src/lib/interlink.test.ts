import { describe, expect, it } from 'vitest'
import { linkIndex, linkify, normalizeName } from './interlink'

const index = linkIndex()

describe('interlink index', () => {
  it('resolves authored and generated names to ids', () => {
    expect(index.get(normalizeName('Church of Elleh'))?.id).toBe('grace:elleh')
    // a names.json/alias-plane entry
    expect(index.size).toBeGreaterThan(1000)
  })
})

describe('linkify', () => {
  it('tags a known entity inside prose', () => {
    const spans = linkify('Head to Church of Elleh first.', index)
    const link = spans.find((s) => s.id)
    expect(link?.id).toBe('grace:elleh')
    expect(link?.text).toBe('Church of Elleh')
  })

  it('leaves unknown text untouched', () => {
    const spans = linkify('qzxw vbnm plok', index)
    expect(spans.every((s) => !s.id)).toBe(true)
    expect(spans.map((s) => s.text).join('')).toBe('qzxw vbnm plok')
  })

  it('reassembles the original text exactly', () => {
    const text = 'Grab the Smithing Stone and go to Gatefront, then Stormveil Castle.'
    expect(linkify(text, index).map((s) => s.text).join('')).toBe(text)
  })
})
