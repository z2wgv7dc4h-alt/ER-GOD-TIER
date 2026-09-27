import { labelOf } from '../lib/links'
import type { Character, EvidenceSource } from '../types'

/**
 * Task 112 §4 — the Journal.
 *
 * Every logged fact already carries an `Evidence` row with a source and a
 * timestamp; the journal is a read-only timeline over those rows (newest first),
 * filterable by source and exportable as Markdown. No new persistence: the
 * evidence array is the record.
 */

export type JournalFilter = 'all' | EvidenceSource

export type JournalEntry = {
  id: string
  fact: string
  label: string
  source: EvidenceSource
  claim: 'true' | 'false'
  at: number
  detail?: string
}

export const JOURNAL_FILTERS: { id: JournalFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'save', label: 'Save' },
  { id: 'answer', label: 'Answer' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'inference', label: 'Inferred' },
]

/** Newest-first timeline, optionally filtered by evidence source. */
export function buildJournal(character: Character, filter: JournalFilter = 'all'): JournalEntry[] {
  return [...character.evidence]
    .filter((e) => filter === 'all' || e.source === filter)
    .sort((a, b) => b.at - a.at)
    .map((e) => ({
      id: e.id,
      fact: e.fact,
      label: labelOf(e.fact),
      source: e.source,
      claim: e.claim ?? 'true',
      at: e.at,
      detail: e.detail,
    }))
}

/** The sources actually present, so the filter row only offers real choices. */
export function journalSources(character: Character): EvidenceSource[] {
  return [...new Set(character.evidence.map((e) => e.source))].sort()
}

function dayOf(at: number): string {
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

/** A portable Markdown timeline. Deterministic given `now`. */
export function exportJournalMarkdown(
  entries: JournalEntry[],
  opts: { name?: string; now?: number } = {},
): string {
  const name = opts.name || 'Tarnished'
  const now = opts.now ?? Date.now()
  const lines = [
    `# Journal — ${name}`,
    '',
    `_Exported ${new Date(now).toISOString()}_`,
    '',
  ]
  if (!entries.length) {
    lines.push('_Nothing logged yet._')
    return lines.join('\n')
  }
  for (const e of entries) {
    const date = dayOf(e.at)
    const prefix = e.claim === 'true' ? '' : '✗ '
    const detail = e.detail ? ` — ${e.detail}` : ''
    lines.push(`- ${date} · ${prefix}${e.label} _(${e.source})_${detail}`)
  }
  return lines.join('\n')
}
