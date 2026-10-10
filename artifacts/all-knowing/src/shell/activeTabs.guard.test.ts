import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Task 198 §1/§3 — an active section or sub-tab must never paint its label the
 * same colour as its own background (the "solid gold block with gold text" bug).
 *
 * The shell styles are split across two files (`index.css`, then `ui/ui.css`,
 * per `main.tsx`), and the active-tab rules appear in both. Whichever file wins
 * by source order, the *effective* colour/background pair must stay readable, so
 * this guard resolves the cascade for both possible orders and fails if any one
 * of them yields gold-on-gold.
 */

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')

const INDEX = read('../index.css')
const UI = read('../ui/ui.css')

const VARS: Record<string, string> = {
  '--gold': '#c9a227',
  '--gold-dim': '#8a7018',
  '--bg-raised': '#14110c',
  '--line': '#3a3120',
  '--line-soft': '#2a2418',
  '--bg': '#0b0906',
}

/** Last declaration of `prop` for `selector` in one stylesheet. */
function decl(css: string, selector: string, prop: string): string | undefined {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '')
  let found: string | undefined
  for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map((s) => s.trim())
    if (!selectors.includes(selector)) continue
    for (const d of m[2].split(';')) {
      const [name, ...rest] = d.split(':')
      if (!name || !rest.length) continue
      if (name.trim() === prop) found = rest.join(':').trim()
    }
  }
  return found
}

function resolve(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const v = value.trim()
  const varMatch = v.match(/^var\((--[a-z-]+)\)$/i)
  return varMatch ? VARS[varMatch[1]] : v.toLowerCase()
}

/** Effective colour/background for a selector across a file order. */
function effective(selector: string, order: string[]) {
  let color: string | undefined
  let background: string | undefined
  for (const css of order) {
    const c = decl(css, selector, 'color')
    if (c != null) color = resolve(c)
    const b = decl(css, selector, 'background') ?? decl(css, selector, 'background-color')
    if (b != null) background = resolve(b)
  }
  return { color, background }
}

describe('Task 198 §3: active tab text colour never equals its background', () => {
  const ACTIVE_TABS = ['.section-tabs button.active', '.subtabs button.active']

  for (const selector of ACTIVE_TABS) {
    it(`${selector} stays readable whichever stylesheet wins`, () => {
      for (const order of [[INDEX, UI], [UI, INDEX]]) {
        const { color, background } = effective(selector, order)
        expect(color, `${selector} colour`).toBeTruthy()
        expect(background, `${selector} background`).toBeTruthy()
        expect(color, `${selector} must not paint text on its own colour`).not.toBe(background)
      }
    })
  }
})
