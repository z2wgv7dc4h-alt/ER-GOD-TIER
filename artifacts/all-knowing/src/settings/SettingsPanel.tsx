import { useEffect, useState } from 'react'
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

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string; hint?: string }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="settings-row">
      <div className="kicker">{label}</div>
      <div className="opts" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={value === o.id ? 'chip on' : 'chip'}
            aria-pressed={value === o.id}
            title={o.hint}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({
  label,
  on,
  onChange,
  title,
}: {
  label: string
  on: boolean
  onChange: (next: boolean) => void
  title?: string
}) {
  return (
    <button
      type="button"
      className={on ? 'chip on' : 'chip'}
      aria-pressed={on}
      title={title}
      onClick={() => onChange(!on)}
    >
      {label}: {on ? 'on' : 'off'}
    </button>
  )
}

function GideonTest() {
  const [result, setResult] = useState<ConnectionResult | null>(null)
  const [busy, setBusy] = useState(false)
  const configured = hasGideonKey()
  return (
    <div className="settings-row">
      <div className="kicker">Gideon AI key</div>
      <div className="opts">
        <span className={configured ? 'chip on' : 'chip'}>
          LLM: {configured ? `${gideonModel()} key configured` : 'router only — no key'}
        </span>
        <button
          type="button"
          className="chip"
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
        </button>
      </div>
      {result && (
        <p className={result.ok ? 'note settings-ok' : 'note settings-bad'} role="status">
          {result.detail}
        </p>
      )}
      <p className="note">
        The deterministic router always works. The model is used only for open-ended questions.
      </p>
    </div>
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

  return (
    <div className="settings-row">
      <div className="kicker">Data freshness</div>
      <ul className="settings-datasets">
        {DATASETS.map((d) => (
          <li key={d.id}>
            <span>{d.label}</span>
            <span className={cached?.includes(d.id) ? 'chip on' : 'chip'}>
              {cached === null ? '…' : cached.includes(d.id) ? 'cached' : 'not cached'}
            </span>
          </li>
        ))}
      </ul>
      <div className="opts">
        <button type="button" className="chip on" disabled={busy} onClick={() => void downloadAll()}>
          {busy ? 'Downloading…' : 'Download all for offline'}
        </button>
      </div>
      {note && <p className="note" role="status">{note}</p>}
    </div>
  )
}

/**
 * Task 112 §1 — the Settings block under Tarnished › Profiles. Device-level
 * preferences plus the two diagnostics that belong with them (Gideon key test,
 * dataset freshness).
 */
export function SettingsPanel() {
  const settings = useSettings()
  return (
    <section className="me-card settings-card">
      <div className="kicker">Settings</div>
      <Segmented
        label="Text size"
        value={settings.textSize}
        options={TEXT_SIZES}
        onChange={(id) => setSettings({ textSize: id })}
      />
      <Toggle
        label="Reduce motion"
        on={settings.reduceMotion}
        onChange={(next) => setSettings({ reduceMotion: next })}
        title="Stop pulses and transitions."
      />
      <Toggle
        label="Haptics"
        on={settings.haptics}
        onChange={(next) => setSettings({ haptics: next })}
        title="Short vibration on log, mark and apply (supported phones)."
      />
      <div className="settings-row">
        <label className="kicker" htmlFor="settings-landing">Default landing section</label>
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
        <p className="note">Only used for a fresh Tarnished; a remembered location always wins.</p>
      </div>
      <Segmented
        label="Spoilers"
        value={settings.spoiler}
        options={SPOILER_LEVELS}
        onChange={(id) => setSettings({ spoiler: id })}
      />
      <p className="note">{SPOILER_LEVELS.find((s) => s.id === settings.spoiler)?.hint}</p>
      <GideonTest />
      <DataFreshness />
    </section>
  )
}
