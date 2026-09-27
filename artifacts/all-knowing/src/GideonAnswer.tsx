import { EntityLink } from './EntityLink'
import { WikiText } from './WikiText'
import type { GideonAction, GideonSource } from './lib/gideon'
import { describeAction, inlineIds, isCharacterAction, parseSayMarkers } from './lib/gideonAct'

/**
 * Task 101 presentation for a grounded Gideon answer, split out so it can be
 * rendered and asserted on its own: `say` markers become EntityLinks, `links`
 * not already inline become a "Mentioned" row, `sources` a small external row,
 * and `actions` either confirm chips (character changes) or plain nav buttons.
 * All decisions are pure (`parseSayMarkers` / `describeAction` / the action
 * category), so the router and the model render through the same code.
 */
export function GideonSay({ text }: { text: string }) {
  return (
    <>
      {parseSayMarkers(text).map((seg, i) =>
        seg.type === 'link' ? (
          <EntityLink key={i} id={seg.id} className="wikilink">
            {seg.label}
          </EntityLink>
        ) : (
          <WikiText key={i} text={seg.text} />
        ),
      )}
    </>
  )
}

export function GideonAnswer({
  text,
  links,
  actions,
  sources,
  showActions,
  onApply,
  onApplyAll,
  onNav,
  onSkip,
}: {
  text: string
  links?: string[]
  actions?: GideonAction[]
  sources?: GideonSource[]
  showActions: boolean
  onApply: () => void
  onApplyAll: () => void
  onNav: (action: GideonAction) => void
  onSkip: () => void
}) {
  const inline = new Set(inlineIds(text))
  const mentioned = (links ?? []).filter((id) => !inline.has(id))
  const charActions = (actions ?? []).filter(isCharacterAction)
  const navActions = (actions ?? []).filter((a) => !isCharacterAction(a))
  if (!mentioned.length && !sources?.length && !actions?.length) return null
  return (
    <>
      {mentioned.length > 0 && (
        <div className="opts" style={{ marginBottom: 6 }}>
          <span className="kicker">Mentioned</span>
          {mentioned.map((id) => (
            <EntityLink key={id} id={id} className="chip" />
          ))}
        </div>
      )}
      {sources?.length ? (
        <p className="note">
          Sources:{' '}
          {sources.map((s, si) => (
            <span key={s.url}>
              {si > 0 ? ' · ' : ''}
              <a href={s.url} target="_blank" rel="noreferrer noopener">
                {s.title}
              </a>
            </span>
          ))}
        </p>
      ) : null}
      {showActions && charActions.length > 0 && (
        <div className="opts" style={{ marginBottom: 6 }}>
          <span className="kicker">Gideon suggests:</span>
          {charActions.map((a, ai) => (
            <span key={ai} className="chip">
              {describeAction(a)}
            </span>
          ))}
          <button type="button" className="chip on" onClick={onApply}>
            Apply
          </button>
          <button type="button" className="chip" onClick={onApplyAll}>
            Apply all
          </button>
          <button type="button" className="chip" onClick={onSkip}>
            Skip
          </button>
        </div>
      )}
      {showActions && navActions.length > 0 && (
        <div className="opts" style={{ marginBottom: 6 }}>
          {navActions.map((a, ai) => (
            <button key={ai} type="button" className="chip" onClick={() => onNav(a)}>
              {describeAction(a)}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
