import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Task 88: hard guards on the play shell. These read production source only
 * (never this test), so a leftover control fails the suite instead of being
 * quietly accepted. If one fails, delete the chrome — do not weaken the test.
 */
const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

const app = read('./App.tsx')
const css = read('./index.css')
const state = read('./state.tsx')
const qol = read('./QoL.tsx')
const shortcuts = read('./lib/shortcuts.ts')
const vault = read('./lib/vault.ts')

function between(source: string, open: string, close: string): string {
  const start = source.indexOf(open)
  expect(start, `missing ${open}`).toBeGreaterThan(-1)
  const end = source.indexOf(close, start)
  expect(end, `missing ${close} after ${open}`).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('shell guards (Task 88)', () => {
  it('keeps every Sit API out of production source and styles', () => {
    const SIT = /sitMode|setSitMode|SitToggle|FirstSit|sheet-sit|topbar-sit|first-sit/
    const files: [string, string][] = [
      ['App.tsx', app],
      ['index.css', css],
      ['state.tsx', state],
      ['QoL.tsx', qol],
      ['shortcuts.ts', shortcuts],
      ['vault.ts', vault],
    ]
    for (const [name, source] of files) expect(source, name).not.toMatch(SIT)
  })

  it('has exactly the Map / Now / Kit tabs, no sixth', () => {
    const tabbar = between(app, 'aria-label="Play"', '</nav>')
    const labels = [...tabbar.matchAll(/<span>([^<]+)<\/span>/g)].map((m) => m[1])
    expect(labels).toEqual(['Map', 'Now', 'Kit'])
    expect(tabbar).not.toMatch(/Codex|Reckon|Quests|Build lab|Gideon/)
  })

  it('never puts the sit class on the desktop root', () => {
    const className = between(app, 'const className = [', '].filter(Boolean).join')
    expect(className).not.toMatch(/sit/)
    expect(css).not.toMatch(/\.app\.sit/)
  })

  it('keeps Packet and Recents inside the closed sheet, off first paint', () => {
    const rail = between(app, 'className="rail"', '</aside>')
    for (const part of ['PacketBar', 'Recents', 'ProfileSwitcher', 'CharacterCard', 'SaveDrop']) {
      expect(rail).toContain(part)
    }
    const workspace = between(app, '<main className="workspace">', '</main>')
    for (const part of ['PacketBar', 'Recents', 'ProfileSwitcher', 'CharacterCard', 'SaveDrop']) {
      expect(workspace, part).not.toContain(part)
    }
  })

  it('closes the sheet by default and slides it off-canvas', () => {
    expect(app).toMatch(/const \[sheetOpen, setSheetOpen\] = useState\(false\)/)
    expect(app).toMatch(/sheetOpen \? 'sheet-open' : ''/)
    const railRule = css.slice(css.indexOf('.rail {'), css.indexOf('.app.sheet-open .rail'))
    expect(railRule).toMatch(/translateX\(-105%\)/)
    expect(css).toMatch(/\.app\.sheet-open \.rail \{ transform: translateX\(0\); \}/)
  })
})
