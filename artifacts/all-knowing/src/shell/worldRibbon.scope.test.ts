import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Task 93 item 2: the "N story flag(s)" ribbon belongs on `me/overview` and
 * `journey/now` only. This is a source guard, so a future page that imports the
 * ribbon without being one of those two fails here.
 */
const dir = fileURLToPath(new URL('.', import.meta.url))

describe('WorldRibbon scope (Task 93)', () => {
  it('is rendered only by MeOverview and JourneyNow', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
    const importers = files.filter((f) => /<WorldRibbon\b/.test(readFileSync(dir + f, 'utf8')))
    expect(importers.sort()).toEqual(['JourneyNow.tsx', 'MeOverview.tsx'])
  })
})
