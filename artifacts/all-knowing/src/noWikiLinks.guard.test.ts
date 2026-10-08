import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Task 181 — the owner rule: no outbound wiki link when the prose is on disk.
 * These four components used to render Fextralife/Fandom `href`s; they must now
 * show the stored text instead. The blocks are lazy/data-driven, so this guards
 * the source: no wiki domain and no `href` bound to a stored `.url` may appear.
 */
const files: Record<string, URL> = {
  'Build.tsx': new URL('./Build.tsx', import.meta.url),
  'PackData.tsx': new URL('./PackData.tsx', import.meta.url),
  'library/BossFacts.tsx': new URL('./library/BossFacts.tsx', import.meta.url),
  'library/WikiTab.tsx': new URL('./library/WikiTab.tsx', import.meta.url),
}

const WIKI_DOMAIN = /fextralife\.com|fandom\.com|wiki\.gg/i

describe('Task 181 — no outbound wiki links from the link-bearing components', () => {
  for (const [name, url] of Object.entries(files)) {
    const src = readFileSync(url, 'utf8')

    it(`${name} names no wiki domain`, () => {
      expect(src).not.toMatch(WIKI_DOMAIN)
    })

    it(`${name} has no href bound to a stored url`, () => {
      expect(src).not.toMatch(/href=\{[^}]*\.url/)
      expect(src).not.toMatch(/href="https?:\/\//)
    })
  }
})
