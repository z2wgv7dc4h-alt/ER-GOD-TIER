import { useMemo, useRef, useState } from 'react'
import { BuildCodeCard } from '../BuildCodeCard'
import { GoodsPaste } from '../GoodsPaste'
import { PacketBar } from '../QoL'
import { applyAnswers, applyFacts, denyFacts } from '../lib/infer'
import { parseEquipmentText } from '../lib/equipmentOcr'
import { matchArmors, matchSpells, matchTalismans, useFanapiData } from '../lib/fanapiData'
import type { GuideItem } from '../lib/guide'
import { useGuide } from '../lib/guide'
import { hasGideonKey } from '../lib/muse'
import { readCharacterScreen } from '../lib/museVision'
import { applyOcrRead, matchBulkLines, readImage, type OcrOutcome } from '../lib/ocr'
import {
  bossGroups,
  completeness,
  inferenceReasons,
  nextSetupStep,
  previousSetupStep,
  questLineGroups,
  readSetupStep,
  removeInferredFact,
  setupSteps,
  stepLearnings,
  weakestStep,
  withSetupStep,
  type SetupStepId,
} from '../lib/setupWizard'
import { bossRoster, isRosterMajor, TIER_LABEL, type BossEncounter } from '../lib/bossRoster'
import { factState, useWorkspace } from '../state'
import type { LoadoutSlot, StartingClass } from '../types'
import { SaveDrop } from './MeUpdate'

const STAT_KEYS = [
  ['vigor', 'Vig'],
  ['mind', 'Mnd'],
  ['endurance', 'End'],
  ['strength', 'Str'],
  ['dexterity', 'Dex'],
  ['intelligence', 'Int'],
  ['faith', 'Fth'],
  ['arcane', 'Arc'],
] as const

const CLASSES: StartingClass[] = [
  'unknown', 'vagabond', 'warrior', 'hero', 'bandit', 'astrologer', 'prophet', 'samurai', 'prisoner', 'confessor', 'wretch', 'heavy-knight', 'idus-knight',
]

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(file)
  })
}

/** A guide-catalog hit for a name the OCR/paste read (cookbooks, bell bearings, tears…). */
function guideMatches(text: string, items: GuideItem[]): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = []
  const seen = new Set<string>()
  for (const raw of text.split(/\r?\n/)) {
    const n = norm(raw)
    if (n.length < 3) continue
    for (const item of items) {
      const target = norm(item.name)
      if (!target) continue
      if (n === target || n.includes(target)) {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          out.push({ id: item.id, name: item.name })
        }
        break
      }
    }
  }
  return out
}

function kindFor(name: string, fan: ReturnType<typeof useFanapiData>): LoadoutSlot['kind'] {
  const n = norm(name)
  if (matchArmors(name, fan.armors).some((a) => norm(a.name) === n)) return 'armor'
  if (matchTalismans(name, fan.talismans).some((t) => norm(t.name) === n)) return 'talisman'
  if (matchSpells(name, fan.spells).some((s) => norm(s.name) === n)) return 'spell'
  return 'armament'
}

const AFFINITIES = ['Heavy', 'Keen', 'Quality', 'Fire', 'Flame Art', 'Lightning', 'Sacred', 'Magic', 'Cold', 'Poison', 'Blood', 'Occult']

/** Split an OCR gear line into name / upgrade / affinity when the print allows it. */
function gearToSlot(name: string, fan: ReturnType<typeof useFanapiData>, idx: number): LoadoutSlot {
  const plus = name.match(/^(.*?)\s*\+(\d{1,2})\s*$/)
  let base = (plus ? plus[1] : name).trim()
  const upgrade = plus ? Number(plus[2]) : undefined
  const affinity = AFFINITIES.find((a) => base.toLowerCase().startsWith(`${a.toLowerCase()} `))
  if (affinity) base = base.slice(affinity.length + 1).trim()
  return { id: `setup-gear-${idx}`, name: base, kind: kindFor(base, fan), upgrade, affinity }
}

function ProgressDots({ step, onPick }: { step: SetupStepId; onPick: (id: SetupStepId) => void }) {
  const index = setupSteps.findIndex((s) => s.id === step)
  return (
    <div className="setup-dots" role="tablist" aria-label="Setup steps">
      {setupSteps.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={s.id === step}
          aria-label={`Step ${i + 1}: ${s.label}`}
          className={`setup-dot${s.id === step ? ' on' : ''}${i < index ? ' done' : ''}`}
          onClick={() => onPick(s.id)}
        />
      ))}
    </div>
  )
}

function OutcomeView({ outcome, onAccept }: { outcome: OcrOutcome; onAccept?: () => void }) {
  const lines = outcome.lines.length ? outcome.lines : matchBulkLines(outcome.text)
  return (
    <div className="setup-outcome">
      <p className="note">{outcome.message}</p>
      {lines.length > 0 && (
        <ul className="warp-lines">
          {lines.map((l, i) => (
            <li key={`${i}:${l.line}`} className={l.matches.length ? 'ok' : 'miss'}>
              <span className="line-text">{l.line}</span>
              <span className="line-hit">{l.matches.length ? l.matches.map((m) => m.name).join(' · ') : 'no match'}</span>
            </li>
          ))}
        </ul>
      )}
      {outcome.status === 'low-confidence' && onAccept && lines.some((l) => l.matches.length) && (
        <div className="opts">
          <button type="button" className="chip on" onClick={onAccept}>
            Accept {lines.reduce((n, l) => n + l.matches.length, 0)} low-confidence matches
          </button>
        </div>
      )}
    </div>
  )
}

export function MeSetup() {
  const { character, setCharacter } = useWorkspace()
  const fan = useFanapiData()
  const { items: guideItems } = useGuide()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const step = readSetupStep(character)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState<OcrOutcome | null>(null)
  const [blob, setBlob] = useState('')
  const [bossQuery, setBossQuery] = useState('')
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({})

  const learnings = stepLearnings(character, step)
  const reasons = useMemo(() => inferenceReasons(character), [character])
  const meters = useMemo(() => completeness(character), [character])

  function goto(next: SetupStepId) {
    setOutcome(null)
    setError('')
    setCharacter(withSetupStep(character, next))
  }

  function setStat(key: typeof STAT_KEYS[number][0], raw: string) {
    const n = Math.max(1, Math.min(99, Number(raw) || 1))
    setCharacter({ ...character, stats: { ...character.stats, [key]: n }, level: character.level })
  }

  function setAnswer(id: string, value: string) {
    setCharacter(applyAnswers({ ...character, answers: { ...character.answers, [id]: value } }))
  }

  /** OCR a batch of images for the current step; equipment gets its stat/gear pass. */
  async function onFiles(files: FileList | File[] | null) {
    if (!files?.length) return
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    setBusy(true)
    setError('')
    let next = character
    try {
      for (const image of images) {
        const read = await readImage(image)
        if (step === 'equipment') {
          const parsed = parseEquipmentText(read.text)
          const vision = hasGideonKey() ? await readCharacterScreen(await fileToDataUrl(image)) : null
          const stats = { ...parsed.stats, ...(vision?.stats ?? {}) }
          const level = vision?.level ?? parsed.level
          const gear = vision?.gear?.length ? vision.gear : parsed.gear
          const loadout: LoadoutSlot[] = gear.length
            ? gear.map((name, idx) => gearToSlot(name, fan, idx))
            : next.loadout
          next = {
            ...next,
            source: next.source === 'save' ? next.source : 'reckon',
            level: level ?? next.level,
            stats: { ...next.stats, ...stats },
            loadout,
          }
          if (gear.length) {
            const g = applyOcrRead(next, { text: gear.join('\n'), confidence: 0.9 }, `setup:${step}`)
            if (g.status === 'applied') next = g.character
          }
          setCharacter(next)
          setOutcome({ ...applyOcrRead(next, read, `setup:${step}`), status: 'applied', message: `Equipment read: Lv ${level ?? '?'} · ${Object.keys(stats).length} stats · ${gear.length} gear` })
          continue
        }
        let result = applyOcrRead(next, read, `setup:${step}`)
        if (step === 'inventory') {
          const hits = guideMatches(read.text, guideItems)
          if (hits.length) {
            const guided = applyFacts(result.status === 'applied' ? result.character : next, hits.map((h) => h.id), 'screenshot', `setup:${step}`)
            result = { ...result, character: guided, status: 'applied', message: `${result.message} · ${hits.length} guide item${hits.length === 1 ? '' : 's'}` }
          }
        }
        if (result.status === 'applied') {
          next = result.character
          setCharacter(next)
        }
        setOutcome(result)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that image.')
    } finally {
      setBusy(false)
    }
  }

  function scanText(text: string) {
    let result = applyOcrRead(character, { text, confidence: 1 }, `setup:${step}`)
    if (step === 'inventory') {
      const hits = guideMatches(text, guideItems)
      if (hits.length) {
        result = { ...result, character: applyFacts(result.character, hits.map((h) => h.id), 'screenshot', `setup:${step}`), status: 'applied' }
      }
    }
    setOutcome(result)
    if (result.status === 'applied') setCharacter(result.character)
    setBlob('')
  }

  function acceptLowConfidence() {
    if (!outcome) return
    const result = applyOcrRead(character, { text: outcome.text, confidence: 0.9 }, `setup:${step}`)
    if (result.status === 'applied') setCharacter(result.character)
    setOutcome(result)
  }

  const equipment = character.loadout

  // Task 130 §2 — the full roster is ~290 encounters. The step keeps the major
  // fights as tiles and collapses the rest per region, with a search box and a
  // "mark all in this region" action, so it stays fast.
  const bossQ = bossQuery.trim().toLowerCase()
  const bossMatches = bossQ
    ? bossRoster.filter((b) => `${b.name} ${b.region} ${b.location} ${b.tier}`.toLowerCase().includes(bossQ))
    : null

  function bossRow(b: BossEncounter, showRegion = false) {
    const state = factState(character, b.id)
    const major = isRosterMajor(b.tier)
    return (
      <div key={`${b.id}:${b.location}`} className={major ? 'setup-boss major' : 'setup-boss'}>
        <span className="setup-boss-name">
          {b.name}
          {showRegion && <em className="note"> · {b.region}</em>}
          <span className="note">
            {' '}· {TIER_LABEL[b.tier]}
            {b.location ? ` · ${b.location}` : ''}
            {b.grace ? ` · ${b.grace}` : ''}
          </span>
        </span>
        <span className="opts">
          <button type="button" className={state === 'true' ? 'chip on' : 'chip'} onClick={() => setCharacter(applyFacts(character, [b.id], 'answer', 'setup:bosses'))}>yes</button>
          <button type="button" className={state === 'false' ? 'chip on' : 'chip'} onClick={() => setCharacter(denyFacts(character, [b.id], 'setup:bosses'))}>no</button>
          <button type="button" className={state === 'unknown' ? 'chip on' : 'chip'} onClick={() => setCharacter(removeInferredFact(character, b.id))}>not sure</button>
        </span>
      </div>
    )
  }

  function markRegion(rows: BossEncounter[]) {
    setCharacter(applyFacts(character, [...new Set(rows.map((r) => r.id))], 'answer', 'setup:bosses'))
  }

  return (
    <div className="me-setup">
      <header className="setup-head">
        <div>
          <div className="kicker">Guided PS5 setup · about five minutes</div>
          <h2 className="shell-page-title">Set up your Tarnished</h2>
        </div>
        <ProgressDots step={step} onPick={goto} />
      </header>

      <section className="panel setup-step">
        <div className="kicker">Step {setupSteps.findIndex((s) => s.id === step) + 1} of {setupSteps.length}</div>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '4px 0 6px' }}>{setupSteps.find((s) => s.id === step)?.label}</h3>
        <p className="note">{setupSteps.find((s) => s.id === step)?.blurb} Every step is optional and you can come back.</p>

        {step === 'status' && (
          <div className="setup-status">
            <div className="opts">
              <button type="button" className="chip" disabled={busy} onClick={() => cameraRef.current?.click()}>📷 Photo of the status screen</button>
              <button type="button" className="chip" disabled={busy} onClick={() => fileRef.current?.click()}>Open screenshot</button>
            </div>
            <div className="setup-row">
              <label>Level <input className="search" inputMode="numeric" value={character.level} onChange={(e) => setCharacter({ ...character, level: Math.max(1, Math.min(713, Number(e.target.value) || 1)) })} /></label>
              <label>Class
                <select className="search" value={character.startingClass} onChange={(e) => setCharacter({ ...character, startingClass: e.target.value as StartingClass })}>
                  {CLASSES.map((c) => <option key={c} value={c}>{c.replace('-', ' ')}</option>)}
                </select>
              </label>
            </div>
            <div className="stats setup-stats">
              {STAT_KEYS.map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input className="search" inputMode="numeric" value={character.stats[key]} onChange={(e) => setStat(key, e.target.value)} />
                </label>
              ))}
            </div>
            <div className="opts">
              <span className="note">Answering where you are also seeds regions:</span>
              {['limgrave', 'liurnia', 'altus', 'mountaintops', 'sote', 'finished'].map((v) => (
                <button key={v} type="button" className={character.answers.dlc === v ? 'chip on' : 'chip'} onClick={() => setAnswer('dlc', character.answers.dlc === v ? '' : v)}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'equipment' && (
          <div className="setup-equipment">
            <div className="opts">
              <button type="button" className="chip" disabled={busy} onClick={() => cameraRef.current?.click()}>📷 Equipment screen</button>
              <button type="button" className="chip" disabled={busy} onClick={() => fileRef.current?.click()}>Open screenshot</button>
            </div>
            <p className="note">
              {equipment.length ? `On file: ${equipment.map((s) => s.name).join(' · ')}` : 'No loadout yet — a photo or the Gear sheet fills it in.'}
            </p>
          </div>
        )}

        {step === 'inventory' && (
          <div className="setup-inventory">
            <p className="note">Key Items, Great Runes, Bell Bearings, Crystal Tears, Cookbooks, Spirit Ashes, Weapons, Armor, Talismans — multiple photos at once.</p>
            <div className="opts">
              <button type="button" className="chip" disabled={busy} onClick={() => cameraRef.current?.click()}>📷 Take photo</button>
              <button type="button" className="chip" disabled={busy} onClick={() => fileRef.current?.click()}>Open screenshots</button>
            </div>
            <textarea
              className="search"
              style={{ width: '100%', minHeight: 72, marginTop: 8, resize: 'vertical' }}
              aria-label="Paste item list"
              placeholder={'Godrick’s Great Rune\nSellen’s Bell Bearing\nCrystal Tear'}
              value={blob}
              onChange={(e) => setBlob(e.target.value)}
            />
            <div className="opts">
              <button type="button" className="chip on" disabled={!blob.trim()} onClick={() => scanText(blob)}>Read these names</button>
            </div>
            <GoodsPaste />
          </div>
        )}

        {step === 'graces' && (
          <div className="setup-graces">
            <p className="note">A warp list or an open map with gold grace icons. Only the pins you can actually see count.</p>
            <div className="opts">
              <button type="button" className="chip" disabled={busy} onClick={() => cameraRef.current?.click()}>📷 Map or warp list</button>
              <button type="button" className="chip" disabled={busy} onClick={() => fileRef.current?.click()}>Open screenshots</button>
            </div>
            <p className="note">Known graces: {character.discoveredGraces.length}</p>
          </div>
        )}

        {step === 'bosses' && (
          <div className="setup-bosses">
            <div className="opts" style={{ marginBottom: 8 }}>
              <input
                className="search"
                type="search"
                placeholder={`Search ${bossRoster.length} boss encounters…`}
                aria-label="Search bosses"
                value={bossQuery}
                onChange={(e) => setBossQuery(e.target.value)}
              />
            </div>
            {bossMatches ? (
              <div className="setup-region">
                <div className="kicker">{bossMatches.length} match{bossMatches.length === 1 ? '' : 'es'}</div>
                <div className="setup-boss-list">{bossMatches.map((b) => bossRow(b, true))}</div>
              </div>
            ) : (
              bossGroups().map((group) => {
                const all = [...group.major, ...group.rest]
                const done = all.filter((b) => factState(character, b.id) === 'true').length
                const open = Boolean(openRegions[group.region])
                return (
                  <div key={group.region} className="setup-region">
                    <div className="kicker">
                      {group.region} · {done}/{all.length}
                      {group.campaign === 'sote' ? ' · DLC' : ''}
                    </div>
                    {group.major.length > 0 && <div className="setup-boss-list">{group.major.map((b) => bossRow(b))}</div>}
                    {group.rest.length > 0 && (
                      <>
                        <div className="opts" style={{ margin: '4px 0' }}>
                          <button type="button" className="chip" onClick={() => markRegion(all)}>
                            Mark all in this region
                          </button>
                        </div>
                        <details
                          className="setup-questline"
                          open={open}
                          onToggle={(e) => setOpenRegions((prev) => ({ ...prev, [group.region]: (e.target as HTMLDetailsElement).open }))}
                        >
                          <summary>{group.rest.length} more in {group.region}</summary>
                          {open && <div className="setup-boss-list">{group.rest.map((b) => bossRow(b))}</div>}
                        </details>
                      </>
                    )}
                  </div>
                )
              })
            )}
            <div className="kicker" style={{ marginTop: 12 }}>NPC questlines</div>
            {questLineGroups().map((group) => (
              <details key={group.line} className="setup-questline">
                <summary>{group.label} · {group.beats.filter((b) => factState(character, b.id) === 'true').length}/{group.beats.length}</summary>
                <ul className="setup-quest-beats">
                  {group.beats.map((b) => {
                    const state = factState(character, b.id)
                    return (
                      <li key={b.id}>
                        <span>{b.name}</span>
                        <span className="opts">
                          <button type="button" className={state === 'true' ? 'chip on' : 'chip'} onClick={() => setCharacter(applyFacts(character, [b.id], 'answer', 'setup:bosses'))}>yes</button>
                          <button type="button" className={state === 'false' ? 'chip on' : 'chip'} onClick={() => setCharacter(denyFacts(character, [b.id], 'setup:bosses'))}>no</button>
                          <button type="button" className={state === 'unknown' ? 'chip on' : 'chip'} onClick={() => setCharacter(removeInferredFact(character, b.id))}>not sure</button>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </details>
            ))}
          </div>
        )}

        {step === 'review' && (
          <div className="setup-review">
            <div className="kicker">Completeness</div>
            <div className="meters">
              {meters.map((m) => {
                const pct = m.total > 0 ? Math.min(100, Math.round((m.have / m.total) * 100)) : 0
                return (
                  <div className="meter" key={m.id}>
                    <label>
                      <span>{m.label}</span>
                      <span>{m.have}/{m.total}</span>
                    </label>
                    <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                  </div>
                )
              })}
            </div>
            <div className="opts" style={{ marginTop: 8 }}>
              <button type="button" className="chip" onClick={() => goto(weakestStep(character))}>Fill the weakest step</button>
            </div>

            <div className="kicker" style={{ marginTop: 14 }}>What we inferred</div>
            {reasons.length === 0 && <p className="note">Nothing inferred yet — every fact here is something you told us directly.</p>}
            <ul className="list setup-inferred">
              {reasons.map((r) => (
                <li key={r.fact}>
                  <span>
                    <strong>{r.fact.replace(/^[a-z]+:/, '').replace(/-/g, ' ')}</strong>
                    <span className="note"> — {r.why}</span>
                  </span>
                  <button type="button" className="chip" onClick={() => setCharacter(removeInferredFact(character, r.fact))}>remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="note" style={{ color: 'var(--danger, #c66)' }}>OCR failed: {error}</p>}
        {outcome && (
          <OutcomeView
            outcome={outcome}
            onAccept={outcome.status === 'low-confidence' ? acceptLowConfidence : undefined}
          />
        )}

        {learnings.length > 0 && (
          <div className="setup-learned">
            <div className="kicker">What we learned in this step</div>
            <div className="opts">
              {learnings.map((l) => <span key={l} className="chip">{l}</span>)}
            </div>
          </div>
        )}

        <div className="opts setup-nav">
          <button type="button" className="chip" disabled={step === 'status'} onClick={() => goto(previousSetupStep(step))}>Back</button>
          <button type="button" className="chip" onClick={() => goto(nextSetupStep(step))}>Skip</button>
          <button type="button" className="chip on" onClick={() => goto(nextSetupStep(step))}>
            {step === 'review' ? 'Done' : 'Next'}
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFiles(e.target.files)} />
      </section>

      <details className="me-card setup-other">
        <summary>Other update sources</summary>
        <div className="kicker" style={{ marginTop: 8 }}>PC save file</div>
        <SaveDrop />
        <div className="kicker" style={{ marginTop: 12 }}>Share / import</div>
        <PacketBar />
        <div className="kicker" style={{ marginTop: 12 }}>Build codes</div>
        <BuildCodeCard />
      </details>
    </div>
  )
}
