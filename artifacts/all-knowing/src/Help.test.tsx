import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HelpSheet } from './Help'
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
})
