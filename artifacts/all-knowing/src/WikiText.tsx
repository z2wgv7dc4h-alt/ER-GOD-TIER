import { EntityLink } from './EntityLink'
import { autolink } from './lib/glossary'

/**
 * Renders prose with known entities turned into links and authored mechanics
 * terms (poise, stance break, Rune Arc, …) turned into their reference pages.
 * Clicking a mention opens the universal entity panel overlay (Task 97) through
 * `src/lib/glossary.ts` — matched by longest known name/alias on word boundaries,
 * at most one link per term per paragraph, so nothing is over-linked.
 */
export function WikiText({ text, className }: { text: string; className?: string }) {
  const spans = autolink(text)
  return (
    <span className={className}>
      {spans.map((s, i) =>
        s.id ? (
          <EntityLink key={i} id={s.id} className="wikilink">
            {s.text}
          </EntityLink>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  )
}
