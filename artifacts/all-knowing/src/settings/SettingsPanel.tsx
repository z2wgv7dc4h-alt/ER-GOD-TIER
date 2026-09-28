import { useEffect, useState, type ReactNode } from 'react'
import { gideonModel, hasGideonKey } from '../lib/muse'
import { testGideonConnection, type ConnectionResult } from './gideonTest'
import {
  browserCacheLookup,
  cachedDatasetIds,
  DATASETS,
  downloadEverything,
} from './dataFreshness'
import { LANDING_SECTIONS, setSettings, type TextSize, type SpoilerLevel } from './store'
import { useSettings } from './useSettings'
import { Button, Chip } from '../ui'

const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: 'S', label: 'Small' },
  { id: 'M', label: 'Medium' },
  { id: 'L', label: 'Large' },
]

const SPOILER_LEVELS: { id: SpoilerLevel; label: string; hint: string }[] = [
  { id: 'none', label: 'None', hint: 'Hide lore tabs and blur unreached boss, NPC-fate and ending names.' },
  { id: 'light', label: 'Light', hint: 'Blur unreached boss, NPC-fate and ending names until tapped.' },
  { id: 'full', label: 'Full', hint: 'Show everything, including names and lore for content you have not reached.' },
]

/** One settings line: label left, control right. */
export function SettingItem({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="settings-item">
      <div className="settings-item-label">
        <strong>{label}</strong>
        {hint && <span className="note">{hint}</span>}
      </div>
      <div className="settings-item-control">{children}</div>
    </div>
  )
}

function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { id: T; label: string; hint?: string }[]
  onChange: (id: T) => void
  label: string
}) {
  return (
    <div className="opts" role="group" aria-label={label}>
      {options.map((o) => (
        <Chip key={o.id} on={value === o.id} aria-pressed={value === o.id} title={o.hint} onClick={() => onChange(o.id)}>
          {o.label}
        </Chip>
      ))}
    </div>
  )}

function Toggle({ label, on, onChange, title }: { label: string; on: boolean; onChange: (next: boolean) => void; title?: string }) {
  return (
    <Chip on={on} aria-pressed={on} aria-label={label} title={title} onClick={() => onChange(!on)}>
      {on ? 'On' : 'Off'}
    </Chip>
  )
}

function GideonTest() {
  const [result, setResult] = useState<ConnectionResult | null>(null)
  const [busy, setBusy] = useState(false)
  const configured = hasGideonKey()
  return (
    <>
      <SettingItem label="Gideon AI key" hint="The deterministic router always works; the model is used only for open-ended questions.">
        <span className={configured ? 'chip on' : 'chip'}>
          LLM: {configured ? `${gideonModel()} key configured` : 'router only — no key'}
        </span>
        <Button
          variant="secondary"
          small
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void testGideonConnection().then((r) => {
              setResult(r)
              setBusy(false)
            })
          }}
        >
          {busy ? 'Testing…' : 'Test connection'}
        </Button>
      </SettingItem>
      {result && (
        <p className={result.ok ? 'note settings-ok' : 'note settings-bad'} role="status">
          {result.detail}
        </p>
      )}
    </>
  )
}

function DataFreshness() {
  const [cached, setCached] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function refresh() {
    const lookup = browserCacheLookup()
    if (!lookup) {
      setCached([])
      return
    }
    setCached(await cachedDatasetIds(lookup))
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function downloadAll() {
    setBusy(true)
    setNote('')
    const result = await downloadEverything()
    await refresh()
    setBusy(false)
    setNote(
      result.failed.length
        ? `Cached ${result.downloaded}; ${result.failed.length} unavailable.`
        : `Cached ${result.downloaded} dataset files for offline.`,
    )
  }

  const allCached = cached !== null && cached.length === DATASETS.length
  return (
    <SettingItem label="Offline data" hint={`${cached?.length ?? 0} of ${DATASETS.length} datasets cached on this device.`}>
      <Button variant={allCached ? 'ghost' : 'primary'} small disabled={busy} onClick={() => void downloadAll()}>
        {busy ? 'Downloading…' : allCached ? 'Refresh offline data' : 'Download all for offline'}
      </Button>
      {note && <span className="note" role="status">{note}</span>}
    </SettingItem>
  )
}

export function DisplaySettings() {
  const settings = useSettings()
  return (
    <div className="settings-list">
      <SettingItem label="Text size">
        <Choice label="Text size" value={settings.textSize} options={TEXT_SIZES} onChange={(id) => setSettings({ textSize: id })} />
      </SettingItem>
      <SettingItem label="Reduce motion" hint="Stop pulses and transitions.">
        <Toggle label="Reduce motion" on={settings.reduceMotion} onChange={(next) => setSettings({ reduceMotion: next })} />
      </SettingItem>
      <SettingItem label="Haptics" hint="Short vibration on log, mark and apply.">
        <Toggle label="Haptics" on={settings.haptics} onChange={(next) => setSettings({ haptics: next })} />
      </SettingItem>
      <SettingItem label="Default landing section" hint="Only used for a fresh Tarnished; a remembered location always wins.">
        <select
          id="settings-landing"
          className="search"
          value={settings.landing}
          onChange={(e) => setSettings({ landing: e.target.value as typeof settings.landing })}
        >
          {LANDING_SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </SettingItem>
    </div>
  )
}

export function SpoilerSettings() {
  const settings = useSettings()
  return (
    <div className="settings-list">
      <SettingItem label="Spoilers" hint={SPOILER_LEVELS.find((s) => s.id === settings.spoiler)?.hint}>
        <Choice label="Spoilers" value={settings.spoiler} options={SPOILER_LEVELS} onChange={(id) => setSettings({ spoiler: id })} />
      </SettingItem>
    </div>
  )
}

export function GideonSettings() {
  return (
    <div className="settings-list">
      <GideonTest />
    </div>
  )
}

export function OfflineSettings() {
  return (
    <div className="settings-list">
      <DataFreshness />
    </div>
  )
}

/** Back-compat single-card export (kept for any older importer). */
export function SettingsPanel() {
  return (
    <section className="me-card settings-card">
      <DisplaySettings />
      <SpoilerSettings />
      <GideonSettings />
      <OfflineSettings />
    </section>
  )
}
