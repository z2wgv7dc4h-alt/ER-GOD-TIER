import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Task 165 §10 — guide cross-links and a real "open". Task 181: the stored guide
 * text is expanded in-app instead of linking out to the scraped `url`, and
 * boss/area/map-pin surfaces must render a "Guides for this …" block. The blocks
 * load asynchronously, so this guards the wiring at the source level rather than
 * the rendered tree.
 */
const pack = readFileSync(new URL('./PackData.tsx', import.meta.url), 'utf8')
const bossFacts = readFileSync(new URL('./library/BossFacts.tsx', import.meta.url), 'utf8')
const area = readFileSync(new URL('./shell/JourneyArea.tsx', import.meta.url), 'utf8')
const atlas = readFileSync(new URL('./Atlas.tsx', import.meta.url), 'utf8')

describe('Guide cross-links (Task 165 §10)', () => {
  it('expands the stored guide text in-app instead of linking to the wiki (Task 181)', () => {
    expect(pack).not.toContain('href={g.url}')
    expect(pack).toContain('Open full guide')
    expect(pack).toMatch(/<WikiText text=\{g\.text\}/)
  })

  it('a boss page links to guides for that boss', () => {
    expect(bossFacts).toMatch(/heading="Guides for this boss"/)
  })

  it('an area page links to guides for that area', () => {
    expect(area).toMatch(/heading="Guides for this area"/)
  })

  it('a map pin detail links to its area guide', () => {
    expect(atlas).toContain('GuidesFor')
    expect(atlas).toMatch(/heading="Guides for this area"/)
  })
})
