import { describe, expect, it } from 'vitest'
import { classify, DONE_REPORT, matchCommand } from './omnibox'

/**
 * Task 99 acceptance: the classifier table. Every phrasing must land on exactly
 * one kind, so the palette can render Do · Things · Ask.
 */
const TABLE: [string, 'entity' | 'log' | 'question' | 'command'][] = [
  // — log: the verbs the spec lists —
  ['killed Margit', 'log'],
  ['I killed Margit', 'log'],
  ['beat Godrick', 'log'],
  ['I beat the Red Wolf of Radagon', 'log'],
  ['defeated Rennala', 'log'],
  ['I have defeated Radahn', 'log'],
  ['got the Rold Medallion', 'log'],
  ['found the Academy Glintstone Key', 'log'],
  ['picked up the Fingerslayer Blade', 'log'],
  ['bought the Gold Sewing Needle', 'log'],
  ['rested at Church of Elleh', 'log'],
  ['rested at the First Step', 'log'],
  ['reached Liurnia', 'log'],
  ['gave the Rold Medallion to Gideon', 'log'],
  ['talked to Gideon', 'log'],
  ['finished Margit', 'log'],
  ['cleared Godrick', 'log'],
  ["I've done Margit", 'log'],
  ['just beat Godrick', 'log'],
  ['I killed Margit, what now?', 'log'],

  // — question: where/how/what/why/should/best/can I —
  ['where is Margit', 'question'],
  ['how do I beat Margit', 'question'],
  ['what should I do next', 'question'],
  ['why does Malenia heal', 'question'],
  ['should I kill Fia', 'question'],
  ['best bleed build', 'question'],
  ['can I use Rivers of Blood', 'question'],
  ['who is Marika', 'question'],
  ['what now', 'question'],
  ['where do I go', 'question'],
  ['is Margit optional?', 'question'],

  // — command: section / sub names + the named shortcuts —
  ['map', 'command'],
  ['setup', 'command'],
  ['glance', 'command'],
  ['journey', 'command'],
  ['quests', 'command'],
  ['gear', 'command'],
  ['library builds', 'command'],
  ['gideon', 'command'],
  ['profiles', 'command'],
  ['reference', 'command'],
  ['kit', 'command'],

  // — entity: everything else is a search —
  ['Margit, the Fell Omen', 'entity'],
  ['Rivers of Blood', 'entity'],
  ['Rold Medallion', 'entity'],
]

describe('omnibox classify (Task 99)', () => {
  for (const [text, kind] of TABLE) {
    it(`"${text}" → ${kind}`, () => {
      expect(classify(text).kind).toBe(kind)
    })
  }

  it('covers all four kinds with at least 30 phrasings', () => {
    expect(TABLE.length).toBeGreaterThanOrEqual(30)
    expect(new Set(TABLE.map(([, k]) => k))).toEqual(new Set(['entity', 'log', 'question', 'command']))
  })

  it('resolves log targets to real entity ids', () => {
    const result = classify('killed Margit')
    expect(result.kind).toBe('log')
    if (result.kind === 'log') {
      expect(result.factIds).toContain('boss:margit')
      expect(result.verb).toBe('killed')
      expect(result.targets.map((t) => t.name).join(' ')).toContain('Margit')
    }
  })

  it('keeps "how do I beat Margit" a question, not a log', () => {
    const result = classify('how do I beat Margit')
    expect(result.kind).toBe('question')
  })

  it('routes a command to its section/sub', () => {
    const command = matchCommand('library builds')
    expect(command).toMatchObject({ section: 'library', sub: 'builds' })
    expect(matchCommand('glance')?.glance).toBe(true)
  })

  it('returns entity search hits for a bare name', () => {
    const result = classify('Margit, the Fell Omen')
    expect(result.kind).toBe('entity')
    if (result.kind === 'entity') {
      expect(result.hits.some((h) => h.id === 'boss:margit')).toBe(true)
    }
  })

  it('reuses the moved DONE_REPORT for the router', () => {
    expect(DONE_REPORT.test("i've killed margit")).toBe(true)
    expect(DONE_REPORT.test('beat margit')).toBe(false)
  })
})
