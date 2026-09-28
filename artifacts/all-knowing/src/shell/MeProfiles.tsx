import { engineBanner, engineChipLabel } from '../lib/mapEngine'
import { REGULATION_STAMP } from '../lib/regulation'
import { packStatus } from '../lib/sourcePack'
import { ProfileSwitcher } from '../ProfileSwitcher'
import { SpoilerToggle } from '../QoL'
import { Journal } from '../settings/JournalPanel'
import {
  DisplaySettings,
  GideonSettings,
  OfflineSettings,
  SettingItem,
  SpoilerSettings,
} from '../settings/SettingsPanel'
import { useWorkspace } from '../state'
import { Card } from '../ui'

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
        Co-op: {coop ? 'yes' : 'no'}
      </button>
    </div>
  )
}

/** `me/profiles`: profiles, display, spoilers, Gideon AI, data & offline. */
export function MeProfiles() {
  const pack = packStatus()
  return (
    <div className="me-profiles">
      <h2 className="shell-page-title">Profiles &amp; settings</h2>

      <Card kicker="Profiles" title="Your Tarnished">
        <ProfileSwitcher />
      </Card>

      <Card kicker="Display" title="Display">
        <div className="settings-list">
          <SettingItem label="Co-op" hint="Affects Mimic Tear and Torrent advice.">
            <CoopChip />
          </SettingItem>
        </div>
        <DisplaySettings />
      </Card>

      <Card kicker="Spoilers" title="Spoilers">
        <SpoilerSettings />
        <div className="settings-list">
          <SettingItem label="Missable ribbon" hint="Show the world-change ribbon with what is still missable.">
            <SpoilerToggle />
          </SettingItem>
        </div>
      </Card>

      <Card kicker="Gideon AI" title="Gideon AI">
        <GideonSettings />
      </Card>

      <Card kicker="Data & offline" title="Data & offline">
        <div className="settings-list">
          <SettingItem label="Map engine" hint="Live when the engine is running; plates otherwise.">
            <EngineChip />
          </SettingItem>
          <SettingItem label="Data pack">
            <span className="chip">regulation {REGULATION_STAMP}</span>
            <span className={pack.ready ? 'chip on' : 'chip'}>{pack.hint}</span>
          </SettingItem>
        </div>
        <OfflineSettings />
        <Journal />
      </Card>
    </div>
  )
}
