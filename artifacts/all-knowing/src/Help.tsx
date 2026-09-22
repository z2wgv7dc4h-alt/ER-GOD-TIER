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
        <p className="kicker" style={{ marginTop: 20 }}>What this does</p>
        <p className="note">
          <strong>Lockout confirm.</strong> Ticking a beat that would foreclose a line you have
          already started opens a lockout confirm first — nothing is applied until you agree.
        </p>
        <p className="note">
          <strong>Packet QR / SHA-256.</strong> Share a run by clipboard or file: a small packet
          renders a scannable QR, and one too big for a QR becomes a filename + SHA-256 handoff
          card instead of a truncated code.
        </p>
        <p className="note">
          <strong>Hunt list + Show on map.</strong> Choosing a build shows its hunt list of missing
          pieces, and Show on map pins the ones that already have a grounded position. It never
          marks them collected for you.
        </p>
        <p className="note">
          <strong>Blessing meters.</strong> Scadutree Fragment and Revered Spirit Ash levels are
          tracked in the Codex.
        </p>
        <p className="note">
          <strong>Live memory is off by default.</strong> The normal map reads your save file; the
          optional process-memory player dot is opt-in and offline-only.
        </p>
        <p className="note">
          <strong>FanAPI is reference, not AR.</strong> The Codex reference data (armor poise,
          talisman effects, spell costs, boss HP/drops) comes from the FanAPI; attack rating is
          computed from the in-repo regulation data, and pin coordinates come from in-repo coord
          data, never a wiki.
        </p>
        <p className="note" style={{ marginTop: 18 }}>
          Everything here is live — if it is listed, it works. Nothing is uploaded; your
          character never leaves this device.
        </p>
        <p className="note" style={{ marginTop: 8 }}>
          Install / available offline: use your browser's “Install” or “Add to Home
          Screen”, and the app keeps working with no connection — the shell, fonts and
          the small critical data set are cached on first load. The live map still needs
          the local engine; without it the atlas just draws the static plates.
        </p>
      </div>
    </div>
  )
}
