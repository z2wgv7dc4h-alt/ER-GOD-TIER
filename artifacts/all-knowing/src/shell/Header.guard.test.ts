import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Task 165 §22 — the header must have exactly one path to the Tarnished
 * overview. The brand mark used to be a second button that did the same thing
 * as the character chip; it is now a decorative mark.
 */
const src = readFileSync(new URL('./Header.tsx', import.meta.url), 'utf8')

describe('Header overview link (Task 165 §22)', () => {
  it('has exactly one navigation to the Tarnished overview', () => {
    const hits = [...src.matchAll(/go\('me', 'overview'\)/g)]
    expect(hits).toHaveLength(1)
  })

  it('keeps the brand mark non-interactive', () => {
    expect(src).toMatch(/<span className="brand-mark"/)
    expect(src).not.toMatch(/className="brand-mark"[\s\S]{0,120}onClick/)
  })
})
