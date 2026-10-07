import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Task 165 §10 — guide cross-links and a real "open". A guide card must expose
 * the scraped page's own `url`, and boss/area/map-pin surfaces must render a
 * "Guides for this …" block. The blocks load asynchronously, so this guards the
 * wiring at the source level rather than the rendered tree.
 */
const pack = readFileSync(new URL('./PackData.tsx', import.meta.url), 'utf8')
const panel = readFileSync(new URL('./library/EntityPanel.tsx', import.meta.url), 'utf8')
const area = readFileSync(new URL('./shell/JourneyArea.tsx', import.meta.url), 'utf8')
const atlas = readFileSync(new URL('./Atlas.tsx', import.meta.url), 'utf8')

describe('Guide cross-links (Task 165 §10)', () => {
  it('renders the stored guide url as a real link on a card', () => {
    expect(pack).toContain('href={g.url}')
  })

  it('a boss page links to guides for that boss', () => {
    expect(panel).toMatch(/heading="Guides for this boss"/)
  })

  it('an area page links to guides for that area', () => {
    expect(area).toMatch(/heading="Guides for this area"/)
  })

  it('a map pin detail links to its area guide', () => {
    expect(atlas).toContain('GuidesFor')
    expect(atlas).toMatch(/heading="Guides for this area"/)
  })
})
