import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Task 83 guard: the play shell has three tabs, a sheet, and no Sit. */
const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
const qol = readFileSync(new URL('./QoL.tsx', import.meta.url), 'utf8')
const shortcuts = readFileSync(new URL('./lib/shortcuts.ts', import.meta.url), 'utf8')

function sliceFrom(source: string, marker: string, end: string): string {
  const start = source.indexOf(marker)
  expect(start, `missing ${marker}`).toBeGreaterThan(-1)
  const stop = source.indexOf(end, start)
  expect(stop, `missing ${end} after ${marker}`).toBeGreaterThan(start)
  return source.slice(start, stop)
}

describe('Task 83 play shell', () => {
  it('has no Sit anywhere in the shell, controls, shortcuts or styles', () => {
    for (const source of [app, css, qol, shortcuts]) {
      expect(source).not.toMatch(/\bSit\b|sitMode|SitToggle|FirstSit|\.app\.sit|\.first-sit|sheet-sit|topbar-sit/)
    }
  })

  it('shows exactly the Map / Now / Kit tabs', () => {
    const tabbar = sliceFrom(app, 'aria-label="Play"', '</nav>')
    for (const label of ['Map', 'Now', 'Kit']) expect(tabbar).toContain(`<span>${label}</span>`)
    for (const extra of ['Gideon', 'Reckon', 'Build', 'Quests', 'Codex']) {
      expect(tabbar).not.toContain(`<span>${extra}</span>`)
    }
  })

  it('moves profiles, packet, save drop, recents, the character card and the five rooms into the sheet', () => {
    const sheet = sliceFrom(app, 'id="tarnished-sheet"', '</aside>')
    for (const part of ['ProfileSwitcher', 'PacketBar', 'SaveDrop', 'Recents', 'CharacterCard', 'modules.map']) {
      expect(sheet).toContain(part)
    }
  })

  it('keeps the two play layouts and drops the 1100px rail layout', () => {
    expect(css).toMatch(/grid-template-columns:\s*280px minmax\(0,\s*1fr\)/)
    expect(css).not.toMatch(/\.app\.sit/)
    // The old horizontal rail rules are gone from the 1100px block.
    const block = sliceFrom(css, '@media (max-width: 1100px)', '\n}')
    expect(block).not.toContain('.rail')
    expect(block).not.toContain('flex-direction: row')
  })
})
