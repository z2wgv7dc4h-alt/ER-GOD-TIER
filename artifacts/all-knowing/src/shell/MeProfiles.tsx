import { engineBanner, engineChipLabel } from '../lib/mapEngine'
import { gideonModel, hasGideonKey } from '../lib/muse'
import { ProfileSwitcher } from '../ProfileSwitcher'
import { SpoilerToggle } from '../QoL'
import { useWorkspace } from '../state'

/** Compact engine status chip: live / connecting / plates, plus live-memory. */
function EngineChip() {
  const { engineStatus, engineState } = useWorkspace()
  const banner = engineBanner(engineStatus, engineState)
  return (
    <div className="opts" style={{ margin: '6px 0' }} title={banner.detail}>
      <span className={banner.tone === 'ok' ? 'chip on' : 'chip'}>map: {engineChipLabel(engineStatus)}</span>
      {banner.liveMemory && <span className="warn chip">live-memory on</span>}
    </div>
  )
}

/** Task 81: solo / co-op chip. Anything but an explicit `'yes'` is solo. */
function CoopChip() {
  const { character, setCharacter } = useWorkspace()
  const coop = character.answers.coop === 'yes'
  return (
    <div className="opts" style={{ margin: '6px 0' }}>
      <button
        type="button"
        className={coop ? 'chip on' : 'chip'}
        aria-pressed={coop}
        title={coop ? 'Co-op: no Mimic Tear or Torrent advice.' : 'Solo: normal advice.'}
        onClick={() =>
          setCharacter({ ...character, answers: { ...character.answers, coop: coop ? 'no' : 'yes' } })
        }
      >
        co-op: {coop ? 'yes' : 'no'}
      </button>
    </div>
  )
}

/** `me/profiles`: switch Tarnished, co-op, spoilers, engine status. */
export function MeProfiles() {
  return (
    <div className="me-profiles">
      <h2 className="shell-page-title">Profiles &amp; settings</h2>
      <ProfileSwitcher />
      <section className="me-card">
        <div className="kicker">Advice mode</div>
        <CoopChip />
        <SpoilerToggle />
      </section>
      <section className="me-card">
        <div className="kicker">Map engine</div>
        <EngineChip />
      </section>
      <section className="me-card">
        <div className="kicker">Gideon</div>
        <div className="opts" style={{ margin: '6px 0' }}>
          <span className={hasGideonKey() ? 'chip on' : 'chip'}>
            LLM: {hasGideonKey() ? `${gideonModel()} key configured` : 'router only — no key'}
          </span>
        </div>
        <p className="note">
          The deterministic router always works. The optional model is used only for open-ended
          questions when a key is configured.
        </p>
      </section>
    </div>
  )
}
