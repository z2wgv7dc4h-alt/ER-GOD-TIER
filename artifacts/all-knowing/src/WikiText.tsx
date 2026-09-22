import { linkIndex, linkify } from './lib/interlink'
import { targetModule } from './lib/related'
import { useWorkspace } from './state'

/**
 * Renders prose with known entities turned into links. Clicking a mention opens
 * that entity wherever it lives (Codex detail for items/bosses, Quests for a
 * quest beat, Atlas for a pin), reusing the same `setSelectedMarkerId` /
 * `setModule` contract `Related` uses. Uses `src/lib/interlink.ts` — exact-name
 * matches only, so nothing is over-linked.
 */
export function WikiText({ text, className }: { text: string; className?: string }) {
  const { setSelectedMarkerId, setModule } = useWorkspace()
  const spans = linkify(text, linkIndex())
  return (
    <span className={className}>
      {spans.map((s, i) =>
        s.id ? (
          <button
            key={i}
            type="button"
            className="wikilink"
            onClick={() => {
              setSelectedMarkerId(s.id!)
              setModule(targetModule(s.id!))
            }}
          >
            {s.text}
          </button>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  )
}
