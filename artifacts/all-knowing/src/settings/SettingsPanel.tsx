import { useEffect, useState, type ReactNode } from 'react'
import { gideonModel, hasGideonKey } from '../lib/muse'
import { testGideonConnection, type ConnectionResult } from './gideonTest'
import {
  downloadEverythingForOffline,
  formatBytes,
  loadOfflineManifest,
  offlineStorageEstimate,
  removeOfflineData,
  requestPersistentStorage,
  type OfflineManifest,
  type OfflineProgress,
  type StorageEstimate,
} from './dataFreshness'
import { SOURCED_OFFLINE_CACHE } from '../lib/pwa'
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
  const [manifest, setManifest] = useState<OfflineManifest | null>(null)
  const [cachedCount, setCachedCount] = useState<number | null>(null)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)
  const [progress, setProgress] = useState<OfflineProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function refresh() {
    const doc = await loadOfflineManifest()
    setManifest(doc)
    setEstimate(await offlineStorageEstimate())
    if (!doc) {
      setCachedCount(null)
      return
    }
    const lookup = typeof caches !== 'undefined' ? await caches.open(SOURCED_OFFLINE_CACHE) : null
    if (!lookup) {
      setCachedCount(0)
      return
    }
    let cached = 0
    for (const file of doc.files) {
      if (await lookup.match(file.path)) cached += 1
    }
    setCachedCount(cached)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function downloadAll() {
    setBusy(true)
    setNote('')
    setProgress(null)
    try {
      await requestPersistentStorage()
      const result = await downloadEverythingForOffline((p) => setProgress(p))
      await refresh()
      const mb = formatBytes(result.bytes)
      setNote(
        result.failed.length
          ? `Saved ${result.downloaded} files (${mb}); ${result.failed.length} unavailable — tap again to retry.`
          : result.skipped === result.total
            ? `All ${result.total} files already offline (${mb} this run).`
            : `Saved ${result.downloaded} files (${mb}) for offline.`,
      )
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  async function removeAll() {
    setBusy(true)
    setNote('')
    try {
      const ok = await removeOfflineData()
      await refresh()
      setNote(ok ? 'Offline data removed.' : 'Nothing to remove.')
    } finally {
      setBusy(false)
    }
  }

  const total = manifest?.fileCount ?? 0
  const totalMb = formatBytes(manifest?.totalBytes ?? 0)
  const haveAll = cachedCount !== null && total > 0 && cachedCount >= total
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <>
      <SettingItem
        label="Offline data"
        hint={
          manifest
            ? `${cachedCount ?? 0} of ${total} files cached · ${totalMb} total`
            : 'Manifest not installed in this build.'
        }
      >
        <Button
          variant={haveAll ? 'ghost' : 'primary'}
          small
          disabled={busy || !manifest}
          onClick={() => void downloadAll()}
        >
          {busy ? 'Downloading…' : haveAll ? 'Refresh offline data' : 'Download everything for offline'}
        </Button>
        {total > 0 && (
          <Button variant="secondary" small disabled={busy || !cachedCount} onClick={() => void removeAll()}>
            Remove offline data
          </Button>
        )}
      </SettingItem>

      {busy && progress && (
        <div className="settings-progress" role="status" aria-live="polite">
          <div className="settings-progress-label">
            <span>
              {progress.done} / {progress.total} files · {formatBytes(progress.bytes)} / {formatBytes(progress.totalBytes)}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          <span className="note">{progress.current}</span>
        </div>
      )}
      {!busy && note && <p className="note" role="status">{note}</p>}
      {estimate && (
        <p className="note">
          Storage used {formatBytes(estimate.usage)} of {formatBytes(estimate.quota)} available to this site.
        </p>
      )}
    </>
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
