import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { searchSync } from './lib/search'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

const app = read('./App.tsx')
const codex = read('./Codex.tsx')

describe('Task 86: Codex is a search destination, not a tab', () => {
  it('does not delete Codex.tsx', () => {
    expect(codex).toContain('export function CodexWorkspace')
  })

  it('has no Codex tab — the play tab bar stays Map / Now / Kit', () => {
    const tabbar = app.slice(app.indexOf('aria-label="Play"'), app.indexOf('</nav>', app.indexOf('aria-label="Play"')))
    expect(tabbar).not.toMatch(/Codex/)
    expect(tabbar).not.toMatch(/tab === 'codex'/)
  })

  it('opens only from the sheet link or a search hit, and mounts only for module codex', () => {
    // The five room links (including Codex) live in the Tarnished sheet.
    const sheet = app.slice(app.indexOf('id="tarnished-sheet"'), app.indexOf('</aside>', app.indexOf('id="tarnished-sheet"')))
    expect(sheet).toContain('modules.map')
    // The stage guards the room behind both the module and the Now tab.
    expect(app).toMatch(/!mobileNow/)
    expect(app).toMatch(/w\.module === 'codex' && <CodexWorkspace \/>/)
  })

  it('mounts no FanAPI grid or gathering list on Map / Now / Kit', () => {
    for (const file of ['./App.tsx', './Gideon.tsx', './Atlas.tsx', './Build.tsx', './Quests.tsx', './Dungeon.tsx']) {
      const source = read(file)
      expect(source, file).not.toMatch(/useFanapiData|useGatheringNodes|matchGatheringNodes|matchTalismans|matchSpells|matchArmors/)
    }
  })

  it("still resolves 'elleh' to grace:elleh through searchSync", () => {
    const hits = searchSync('elleh')
    expect(hits.some((h) => h.id === 'grace:elleh')).toBe(true)
  })
})
