import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HelpSheet } from './Help'
import { SECTIONS } from './lib/sections'
import { SHORTCUT_GROUPS } from './lib/shortcuts'

describe('HelpSheet', () => {
  const html = renderToStaticMarkup(<HelpSheet onClose={() => {}} />)
  // React escapes `&` in text nodes; compare against the readable text.
  const text = html.replace(/&amp;/g, '&')

  it('renders a dismissible dialog', () => {
    expect(html).toContain('class="help-overlay"')
    expect(html).toContain('role="dialog"')
    expect(text).toContain('Close · Esc')
  })

  it('shows every shortcut group and row in the catalog', () => {
    for (const group of SHORTCUT_GROUPS) {
      expect(text).toContain(group.title)
      for (const item of group.items) {
        expect(text, `${group.title}: ${item.label}`).toContain(item.label)
      }
    }
  })

  it('renders the keys for each keyboard shortcut', () => {
    for (const group of SHORTCUT_GROUPS) {
      for (const item of group.items) {
        if (item.probe) expect(text, `${group.title}: ${item.keys}`).toContain(item.keys)
      }
    }
  })

  it('names the real capabilities, without claims it cannot back', () => {
    const lower = text.toLowerCase()
    for (const phrase of [
      'lockout confirm',
      'packet qr',
      'sha-256',
      'hunt list + show on map',
      'grounded position',
      'blessing meters',
      'scadutree fragment',
      'live memory is off by default',
      'fanapi is reference, not ar',
      'in-repo regulation',
      'co-op & goods paste',
      'the map never goes blank',
    ]) {
      expect(lower, phrase).toContain(phrase)
    }
    // No dungeon interiors, no gathering nodes plotted on the map.
    expect(text).not.toMatch(/dungeon interior/i)
    expect(text).not.toMatch(/gathering nodes? (on|displayed|shown|plotted)/i)
  })

  it('names only sections and sub-views that exist in the shell model', () => {
    // Strip markup so the parenthetical lists read as plain prose.
    const plain = text.replace(/<[^>]+>/g, '')
    for (const section of SECTIONS) {
      expect(plain, section.label).toContain(section.label)
      for (const sub of section.subs) {
        expect(plain.toLowerCase(), `${section.label} → ${sub.label}`).toContain(
          sub.label.toLowerCase(),
        )
      }
    }
    // Every "Section (a / b / …)" list must match that section's real sub-views exactly,
    // so the Help can never name a tab that the shell does not have.
    const groups = [...plain.matchAll(/(Tarnished|Journey|Library|Gideon)\s*\(([^)]*)\)/g)]
    expect(groups.length).toBeGreaterThan(0)
    for (const [, label, list] of groups) {
      const meta = SECTIONS.find((s) => s.label === label)
      expect(meta, label).toBeDefined()
      const named = list.split('/').map((s) => s.trim().toLowerCase()).filter(Boolean)
      const actual = (meta?.subs ?? []).map((s) => s.label.toLowerCase())
      expect(named, label).toEqual(actual)
    }
  })
})
