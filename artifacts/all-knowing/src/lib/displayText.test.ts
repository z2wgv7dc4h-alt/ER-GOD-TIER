import { describe, expect, it } from 'vitest'
import { displayName } from './canonicalNames'
import { activityLine, SOURCE_LABEL } from './progressStats'

/** Player-facing names and activity lines never show dump casing or raw tags. */

describe('displayName', () => {
  it('lowers connectives in a Title-Cased dump name', () => {
    expect(displayName('Ranni The Witch')).toBe('Ranni the Witch')
  })

  it('capitalises an all-lowercase slug name', () => {
    expect(displayName('stormveil')).toBe('Stormveil')
    expect(displayName('church of elleh')).toBe('Church of Elleh')
  })

  it("keeps the game's own spelling even when it capitalises connectives", () => {
    expect(displayName('Grovel For Mercy')).toBe('Grovel For Mercy')
  })

  it('keeps a correctly spelled name', () => {
    expect(displayName('Margit, the Fell Omen')).toBe('Margit, the Fell Omen')
  })
})

describe('activityLine', () => {
  it('reads a boss as "Defeated <name>" with no raw id', () => {
    const line = activityLine({ id: 'x', fact: 'boss:margit', source: 'answer', at: 0 } as never)
    expect(line.verb).toBe('Defeated')
    expect(line.name).not.toContain(':')
  })

  it('labels every evidence source in player words', () => {
    for (const label of Object.values(SOURCE_LABEL)) expect(label).not.toMatch(/answer|inference/)
  })
})

describe('canonical names keep qualifiers', () => {
  it('never drops a bracketed qualifier to match a shorter game name', () => {
    expect(displayName('Crucible Knight (Farum Azula)')).toBe('Crucible Knight (Farum Azula)')
    expect(displayName('Godfrey The Grafted')).toBe('Godfrey the Grafted')
  })
})

describe('casing repair edge cases', () => {
  it('keeps a trailing letter label and a lone article', () => {
    expect(displayName('Twinsage Glintstone Sorcerer A')).toBe('Twinsage Glintstone Sorcerer A')
  })
})
