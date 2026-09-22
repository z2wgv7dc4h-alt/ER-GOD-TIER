import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Task 82 guard: the Atlas engine never fails silently. */
const atlas = readFileSync(new URL('./Atlas.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
const doc = readFileSync(new URL('../docs/MAP-ENGINE.md', import.meta.url), 'utf8')

describe('Atlas fails closed (Task 82)', () => {
  it('owns the iframe and gives it an error/load handler', () => {
    expect(atlas).toContain('function EngineEmbed')
    expect(atlas).toMatch(/onError=\{onFail\}/)
    expect(atlas).toMatch(/onLoad=\{\(\) => setLoaded\(true\)\}/)
    // the old silent one-liner is gone
    expect(atlas).not.toMatch(/className="engine-frame" src=/)
  })

  it('gates the live iframe on the engine actually being up and the embed not failing', () => {
    expect(atlas).toMatch(/engineUp/)
    expect(atlas).toMatch(/embedFailed/)
    expect(atlas).toMatch(/engineMarkers\.length > 0/)
  })

  it('shows a distinct banner for a down engine vs a failed embed', () => {
    expect(atlas).toContain('Map engine offline (:8099)')
    expect(atlas).toContain('Live map embed failed')
    expect(css).toContain('.atlas-banner')
  })

  it('keeps the phone job chips', () => {
    expect(atlas).toContain('atlas-jobs')
  })

  it('documents the blank-map checklist', () => {
    expect(doc).toContain('## If the map is blank')
  })
})
