import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Task 127 §1: the old world ribbon (a dropdown chip of world-change banners)
 * is gone from Journey › Now. Its one piece of advice is a plain row inside the
 * goal card. This source guard keeps the ribbon from being resurrected.
 */
const dir = fileURLToPath(new URL('.', import.meta.url))

describe('WorldRibbon removal (Task 127)', () => {
  it('is rendered by no file', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
    const importers = files.filter((f) => /<WorldRibbon\b/.test(readFileSync(dir + f, 'utf8')))
    expect(importers).toEqual([])
  })

  it('keeps the suggested-area advice in the Journey › Now goal card', () => {
    const journeyNow = readFileSync(dir + 'JourneyNow.tsx', 'utf8')
    expect(journeyNow).toContain('suggestedNextArea')
    expect(journeyNow).toContain('Suggested next area')
  })
})
