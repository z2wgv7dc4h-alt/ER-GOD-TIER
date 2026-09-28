import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Task 126 §3: the world ribbon advice moved off `me/overview` and now lives on
 * `journey/now` only. This is a source guard, so a future page that imports the
 * ribbon without being that page fails here.
 */
const dir = fileURLToPath(new URL('.', import.meta.url))

describe('WorldRibbon scope (Task 126)', () => {
  it('is rendered only by JourneyNow', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
    const importers = files.filter((f) => /<WorldRibbon\b/.test(readFileSync(dir + f, 'utf8')))
    expect(importers.sort()).toEqual(['JourneyNow.tsx'])
  })
})
