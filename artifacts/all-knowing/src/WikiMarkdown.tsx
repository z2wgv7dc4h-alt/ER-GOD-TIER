import type { ReactNode } from 'react'
import { EntityLink } from './EntityLink'
import { WikiText } from './WikiText'

/**
 * Task 133 §2 — render exported wiki markdown.
 *
 * The corpus rewrites cross-page links to `[[entityId|label]]` markers, so the
 * reader can turn each into the same `EntityLink` every other name uses; the
 * remaining prose goes through `WikiText`'s glossary autolinking. Lines are kept
 * so walkthrough steps and loot lists stay readable.
 */
const MARKER = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export type WikiInlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'entity'; id: string; label: string }

/** Split one line into plain text and `[[entityId|label]]` link tokens. */
export function parseWikiMarkdown(text: string): WikiInlineToken[] {
  const tokens: WikiInlineToken[] = []
  let last = 0
  for (const match of text.matchAll(MARKER)) {
    const at = match.index ?? 0
    if (at > last) tokens.push({ kind: 'text', text: text.slice(last, at) })
    tokens.push({ kind: 'entity', id: match[1], label: match[2] ?? match[1] })
    last = at + match[0].length
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) })
  return tokens
}

function inline(text: string, keyPrefix: string) {
  const parts: ReactNode[] = []
  let index = 0
  for (const token of parseWikiMarkdown(text)) {
    if (token.kind === 'text') {
      parts.push(<WikiText key={`${keyPrefix}-t${index++}`} text={token.text} />)
    } else {
      parts.push(
        <EntityLink key={`${keyPrefix}-l${index++}`} id={token.id} className="wikilink">
          {token.label}
        </EntityLink>,
      )
    }
  }
  return parts
}

export function WikiMarkdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split('\n')
  return (
    <div className={className}>
      {lines.map((line, i) => (line.trim() ? <p key={i}>{inline(line, `l${i}`)}</p> : null))}
    </div>
  )
}
