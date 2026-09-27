import { EntityLink } from './EntityLink'
import { linkIndex, linkify } from './lib/interlink'

/**
 * Renders prose with known entities turned into links. Clicking a mention opens
 * the universal entity panel overlay (Task 97), using `src/lib/interlink.ts` —
 * exact-name matches only, so nothing is over-linked.
 */
export function WikiText({ text, className }: { text: string; className?: string }) {
  const spans = linkify(text, linkIndex())
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
