import { useState } from 'react'
import { hasSeenHelp, markHelpSeen, SHORTCUT_GROUPS } from './lib/shortcuts'
import { useWorkspace } from './state'

/**
 * Reachable help surface for every real shortcut/gesture in the app.
 *
 * Opens from the `?` key (handled in `useHotkeys`), this button, or the
 * first-visit hint. The button is always visible, so it also works on phones
 * where there is no keyboard.
 */
export function Help() {
  const { helpOpen, setHelpOpen } = useWorkspace()
  const [hint, setHint] = useState(() => !hasSeenHelp())

  // Opening the help (including via the `?` key) retires the first-visit hint.
  if (helpOpen && hint) setHint(false)

  function dismissHint() {
    setHint(false)
    markHelpSeen()
  }

  return (
    <>
      <button
        type="button"
        className={helpOpen ? 'chip on help-open' : 'chip help-open'}
        aria-label="Keyboard shortcuts and help"
        aria-haspopup="dialog"
        title="Shortcuts & help (?)"
        onClick={() => {
          dismissHint()
          setHelpOpen(true)
        }}
      >
        ?
      </button>

      {hint && !helpOpen && (
        <div className="help-hint" role="status">
          <span>
            New here? Press <kbd>?</kbd> — or tap the <strong>?</strong> above — for every shortcut.
          </span>
          <button type="button" className="help-hint-x" aria-label="Dismiss hint" onClick={dismissHint}>
            ×
          </button>
        </div>
      )}

      {helpOpen && <HelpSheet onClose={() => setHelpOpen(false)} />}
    </>
  )
}

/** The overlay itself, split out so it can be rendered and asserted in tests. */
export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="help-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Shortcuts and help"
      onClick={onClose}
    >
      <div className="help-sheet" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <p className="kicker">All-Knowing</p>
            <h2>Shortcuts &amp; help</h2>
          </div>
          <button type="button" className="chip" onClick={onClose}>
            Close · Esc
          </button>
        </header>
        <div className="help-groups">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.items.map((s) => (
                  <li key={group.title + s.keys + s.label}>
                    <kbd>{s.keys}</kbd>
                    <span>
                      {s.label}
                      {s.note ? <em> · {s.note}</em> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="note" style={{ marginTop: 18 }}>
          Everything here is live — if it is listed, it works. Nothing is uploaded; your
          character never leaves this device.
        </p>
      </div>
    </div>
  )
}
