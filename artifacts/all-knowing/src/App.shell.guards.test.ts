import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Task 91: hard guards on the four-section shell. Production source only, so a
 * leftover rail/now-mode control fails the suite instead of being accepted. If
 * one fails, delete the chrome — do not weaken the test.
 */
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

const app = read('./App.tsx')
const css = read('./index.css')
const state = read('./state.tsx')
const qol = read('./QoL.tsx')
const shortcuts = read('./lib/shortcuts.ts')
const vault = read('./lib/vault.ts')
const sections = read('./lib/sections.ts')

describe('shell guards (Task 91)', () => {
  it('keeps every Sit API and the removed rail out of production source', () => {
    const BANNED = /sitMode|setSitMode|SitToggle|FirstSit|sheet-sit|topbar-sit|first-sit|sheet-open|sheet-backdrop|sheet-head|sheet-close|tarnished-toggle/
    const files: [string, string][] = [
      ['App.tsx', app],
      ['index.css', css],
      ['state.tsx', state],
      ['QoL.tsx', qol],
      ['shortcuts.ts', shortcuts],
      ['vault.ts', vault],
    ]
    for (const [name, source] of files) expect(source, name).not.toMatch(BANNED)
    expect(css).not.toMatch(/\bnow-open\b/)
  })

  it('removes the .rail rule from the stylesheet', () => {
    expect(css).not.toMatch(/\.rail\s*\{/)
  })

  it('wires setModule as a compat shim over the section/sub model', () => {
    expect(state).toMatch(/function navigateModule/)
    expect(state).toMatch(/setModule: navigateModule/)
    expect(state).toMatch(/locationToModule/)
    expect(sections).toMatch(/MODULE_TO_LOCATION/)
  })

  it('handles the section and Gideon-dock hotkeys', () => {
    expect(shortcuts).toContain("type: 'section'")
    expect(shortcuts).toContain("type: 'dock'")
    expect(qol).toMatch(/case 'section'/)
    expect(qol).toMatch(/case 'dock'/)
  })

  it('persists the last location as a legacy ModuleId', () => {
    expect(vault).toContain('module: ModuleId')
    expect(state).toMatch(/ui: \{ module: locationToModule/)
  })

  it('hides the Gideon dock while the gideon section is active', () => {
    expect(app).toMatch(/w\.section !== 'gideon'/)
  })
})
