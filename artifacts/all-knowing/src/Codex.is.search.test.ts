import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { searchSync } from './lib/search'

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

const app = read('./App.tsx')
const codex = read('./Codex.tsx')
const tabbar = read('./shell/TabBar.tsx')
const sectionTabs = read('./shell/SectionTabs.tsx')
const sections = read('./lib/sections.ts')

describe('Task 91: Codex is Library → Search, not a top-level tab', () => {
  it('does not delete Codex.tsx', () => {
    expect(codex).toContain('export function CodexWorkspace')
  })

  it('has no Codex section or tab', () => {
    expect(tabbar).not.toMatch(/Codex/)
    expect(sectionTabs).not.toMatch(/Codex/)
    expect(sections).not.toMatch(/id: 'codex'/)
  })

  it('mounts CodexWorkspace only for library/search', () => {
    expect(app).toMatch(/if \(section === 'library'\)/)
    expect(app).toMatch(/<CodexWorkspace \/>/)
  })

  it('mounts no FanAPI grid or gathering list on the other sections', () => {
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
