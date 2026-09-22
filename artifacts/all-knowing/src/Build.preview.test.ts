import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { estimateDefense } from './Build'
import { demoCharacter, emptyCharacter } from './data/seed'

/**
 * Task 71: the Build preview used to invent a numeric poise (a class-based
 * constant) and an endurance-based equip load, and render them beside the real
 * Clark attack rating, so they looked like regulation data. The constants are
 * written as regex here so a plain grep of `src/` for them stays clean.
 */
const buildSource = readFileSync(fileURLToPath(new URL('./Build.tsx', import.meta.url)), 'utf8')

describe('Build preview does not fake defense numbers', () => {
  it('estimateDefense reports only a label, never a numeric poise/load', () => {
    for (const character of [emptyCharacter, demoCharacter]) {
      const preview = estimateDefense(character) as Record<string, unknown>
      expect('poise' in preview).toBe(false)
      expect('load' in preview).toBe(false)
      expect(typeof preview.label).toBe('string')
    }
  })

  it('drops the old invented constants and their regulation-looking labels', () => {
    expect(buildSource).not.toMatch(/\b28\s*\+/)
    expect(buildSource).not.toMatch(/\b48\s*\+/)
    expect(buildSource).not.toMatch(/Poise \(sketch\)/)
    expect(buildSource).not.toMatch(/Equip load budget/)
  })

  it('labels the remaining preview as an estimate', () => {
    expect(buildSource).toMatch(/estimate/i)
    expect(buildSource).toMatch(/estimates only/i)
  })
})
