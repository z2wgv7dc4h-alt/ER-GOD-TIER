import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Task 91 guard: the four-section shell replaced the rail / sheet / now mode. */
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

const app = read('./App.tsx')
const css = read('./index.css')
const tabbar = read('./shell/TabBar.tsx')

describe('Task 91 four-section shell', () => {
  it('removes the off-canvas Tarnished rail, its backdrop and the now-open mode', () => {
    for (const source of [app, css]) {
      expect(source).not.toMatch(/tarnished-sheet|\.rail\b|sheet-open|sheet-backdrop|sheet-head|sheet-close|\bnow-open\b|tarnished-toggle/)
    }
  })

  it('has exactly the four phone tabs', () => {
    const labels = [...tabbar.matchAll(/label: '([^']+)'/g)].map((m) => m[1])
    expect(labels).toEqual(['Tarnished', 'Journey', 'Library', 'Gideon'])
  })

  it('mounts the new shell components and keeps every room lazy', () => {
    for (const part of [
      '<MeOverview />',
      '<MeUpdate />',
      '<MeProfiles />',
      '<JourneyNow />',
      '<AtlasWorkspace />',
      '<QuestWorkspace />',
      '<BuildWorkspace />',
      '<KitWorkspace />',
      '<CodexWorkspace />',
      '<Gideon />',
    ]) {
      expect(app, part).toContain(part)
    }
    expect(app).toMatch(/lazy\(\(\) => import/)
  })

  it('keeps the desktop map controls the old topbar owned', () => {
    expect(app).toContain('<MapControls />')
    expect(read('./shell/MapControls.tsx')).toContain('Missing only')
  })
})
