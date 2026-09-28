import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ScanItem, ScanResult } from '../lib/ps5Scanner'
import { CameraInventoryScanner } from '../lib/ps5ScannerBrowser'

/**
 * Task 136 §3 — Tarnished › Setup "Scan with camera".
 *
 * Full-screen camera (or recorded-video) view. The player steps the inventory
 * cursor with the D-pad while the engine watches; recognised items tick up live.
 * Stopping opens a review grouped by category, where low-confidence rows need a
 * tap before "Add to my Tarnished" writes them through the normal fact path.
 */

const CATEGORY_LABEL: Record<string, string> = {
  spirit: 'Spirit Ashes',
  material: 'Bolstering Materials',
  'key-item': 'Key Items',
  sorcery: 'Sorceries',
  incantation: 'Incantations',
  'ash-of-war': 'Ashes of War',
  tool: 'Tools',
  cookbook: 'Cookbooks',
  crafting: 'Crafting',
  talisman: 'Talismans',
  weapon: 'Weapons',
  armor: 'Armor',
}

const SCAN_TIPS = [
  'Step one item at a time with the D-pad — not L2/R2 page jumps.',
  'Hold the phone steady and keep the whole menu inside the frame.',
  'Avoid lamp glare; tilt the phone until the reflection slides off the screen.',
]

function itemKey(item: ScanItem): string {
  return item.factId ?? item.name.toLowerCase()
}

export function InventoryScanOverlay({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (items: ScanItem[]) => void | Promise<void>
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<CameraInventoryScanner | null>(null)
  const startedRef = useRef(false)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<'live' | 'review'>('live')
  const [result, setResult] = useState<ScanResult>({ items: [], pending: [] })
  const [frames, setFrames] = useState(0)
  const [error, setError] = useState('')
  const [hasTorch, setHasTorch] = useState(false)
  const [torch, setTorch] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  const ensureScanner = useCallback(() => {
    if (!scannerRef.current) {
      scannerRef.current = new CameraInventoryScanner({
        onFrame: (next, n) => {
          setResult(next)
          setFrames(n)
        },
        onError: (err) => setError(err.message),
      })
    }
    return scannerRef.current
  }, [])

  const startCamera = useCallback(async () => {
    setError('')
    setPhase('live')
    const video = videoRef.current
    if (!video) return
    try {
      await ensureScanner().startCamera(video)
      setHasTorch(ensureScanner().hasTorch())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera unavailable. Pick a recorded video instead.')
    }
  }, [ensureScanner])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void startCamera()
    return () => {
      scannerRef.current?.stop()
      scannerRef.current = null
    }
  }, [startCamera])

  function startVideo(file: File) {
    const video = videoRef.current
    if (!video) return
    setError('')
    setPhase('live')
    setResult({ items: [], pending: [] })
    setFrames(0)
    ensureScanner().startVideoFile(video, file)
  }

  function stop() {
    const scanner = scannerRef.current
    if (scanner) setResult(scanner.result())
    scanner?.stop()
    setPhase('review')
  }

  function scanAgain() {
    setResult({ items: [], pending: [] })
    setFrames(0)
    setSelected({})
    void startCamera()
  }

  async function toggleTorch() {
    const scanner = scannerRef.current
    if (!scanner) return
    const next = !torch
    setTorch(next)
    await scanner.setTorch(next).catch(() => setTorch(false))
  }

  const allItems = useMemo(() => [...result.items, ...result.pending], [result])
  const grouped = useMemo(() => {
    const map = new Map<string, ScanItem[]>()
    for (const item of allItems) {
      const key = item.category ?? result.category ?? 'other'
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [allItems, result.category])

  function review() {
    setSelected(Object.fromEntries(allItems.map((item) => [itemKey(item), item.confirmed])))
    const scanner = scannerRef.current
    if (scanner) setResult(scanner.result())
    scanner?.stop()
    setPhase('review')
  }

  async function add() {
    const chosen = allItems.filter((item) => selected[itemKey(item)])
    if (!chosen.length) return
    setBusy(true)
    await onAdd(chosen)
    setBusy(false)
    onClose()
  }

  const chosenCount = allItems.filter((item) => selected[itemKey(item)]).length

  return (
    <div className="scan-overlay" role="dialog" aria-modal="true" aria-label="Scan inventory with camera">
      <header className="scan-head">
        <div>
          <div className="kicker">Live inventory scanner</div>
          <h2 className="shell-page-title">
            {phase === 'live' ? `${result.items.length} item${result.items.length === 1 ? '' : 's'} found` : 'Review scanned items'}
          </h2>
        </div>
        <button type="button" className="chip" onClick={phase === 'live' ? review : onClose}>
          {phase === 'live' ? 'Stop' : 'Close'}
        </button>
      </header>

      {phase === 'live' && (
        <div className="scan-stage">
          <video ref={videoRef} className="scan-video" playsInline muted />
          <div className="scan-guide" aria-hidden="true">
            <span>Fit the menu inside the frame</span>
          </div>
          <div className="scan-hud">
            <div className="opts">
              <button type="button" className="chip on" onClick={stop}>Stop</button>
              <button type="button" className="chip" onClick={() => videoFileRef.current?.click()}>Or pick a recorded video</button>
              {hasTorch && (
                <button type="button" className={torch ? 'chip on' : 'chip'} onClick={() => void toggleTorch()}>
                  {torch ? 'Torch on' : 'Torch off'}
                </button>
              )}
            </div>
            <div className="scan-tips">
              <span className="note">· {frames} frames watched</span>
              {SCAN_TIPS.map((tip) => <span key={tip} className="note">· {tip}</span>)}
            </div>
            <ul className="scan-live-list">
              {result.items.map((item) => (
                <li key={itemKey(item)}>
                  <span className="ok">✓</span> {item.name}
                  {item.held !== undefined && <em className="note"> ×{item.held}</em>}
                </li>
              ))}
            </ul>
            {result.pending.length > 0 && (
              <p className="note">{result.pending.length} more read once — stop to review them.</p>
            )}
          </div>
          {error && <p className="scan-error">{error}</p>}
          <input
            ref={videoFileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) startVideo(file)
            }}
          />
        </div>
      )}

      {phase === 'review' && (
        <div className="scan-review">
          {allItems.length === 0 && <p className="note">Nothing was recognised. Try again with the menu filling the frame.</p>}
          {grouped.map(([category, items]) => (
            <section key={category} className="scan-group">
              <div className="kicker">{CATEGORY_LABEL[category] ?? category} · {items.length}</div>
              <ul className="scan-review-list">
                {items.map((item) => {
                  const key = itemKey(item)
                  const disabled = !item.factId
                  return (
                    <li key={key} className={item.confirmed ? '' : 'low'}>
                      <label>
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={Boolean(selected[key])}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [key]: e.target.checked }))}
                        />
                        <span>{item.name}</span>
                        {item.held !== undefined && <em className="note"> ×{item.held}</em>}
                        {!item.confirmed && <em className="note"> · low confidence — tap to accept</em>}
                        {disabled && <em className="note"> · not in the catalogue</em>}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          <div className="opts scan-actions">
            <button type="button" className="chip" onClick={scanAgain}>Scan again</button>
            <button type="button" className="chip on" disabled={busy || chosenCount === 0} onClick={() => void add()}>
              Add {chosenCount} to my Tarnished
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
