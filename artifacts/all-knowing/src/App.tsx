import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { demoCharacter } from './data/seed'
import {
  characterFromEngine,
  engineBanner,
  engineChipLabel,
  fetchEngineMarkers,
  shownEngineCharacter,
  subscribeEngine,
} from './lib/mapEngine'
import { mergeCharacter } from './lib/merge'
import { ingestSave } from './lib/save'
import { Help } from './Help'
import { leftovers } from './lib/leftovers'
import { summarize } from './lib/infer'
import { worldBanners } from './lib/worldState'
import { CommandHits, PacketBar, Recents, SpoilerToggle, softCapMark, useClipboardShots, useHotkeys } from './QoL'
import { ProfileSwitcher } from './ProfileSwitcher'
import { GoodsPaste } from './GoodsPaste'
import { allLines } from './knowledge/storylines'
import { WorkspaceProvider, useWorkspace } from './state'

// Each room is a separate chunk, loaded only when its tab is opened. Atlas in
// particular carries the map/engine plumbing, so this keeps the initial
// mobile bundle to the shell + whichever room the user actually lands on.
const ReckonWorkspace = lazy(() => import('./Reckon').then((m) => ({ default: m.ReckonWorkspace })))
const AtlasWorkspace = lazy(() => import('./Atlas').then((m) => ({ default: m.AtlasWorkspace })))
const BuildWorkspace = lazy(() => import('./Build').then((m) => ({ default: m.BuildWorkspace })))
const QuestWorkspace = lazy(() => import('./Quests').then((m) => ({ default: m.QuestWorkspace })))
const CodexWorkspace = lazy(() => import('./Codex').then((m) => ({ default: m.CodexWorkspace })))
const Gideon = lazy(() => import('./Gideon').then((m) => ({ default: m.Gideon })))
import { art } from './art'
import { layerOrder, modules } from './lib/nav'
import type { ModuleId } from './types'

function EngineBridge() {
  const w = useWorkspace()
  const characterRef = useRef(w.character)
  characterRef.current = w.character
  useEffect(() => {
    let cancelled = false
    void fetchEngineMarkers()
      .then((list) => { if (!cancelled) w.setEngineMarkers(list) })
      .catch(() => { /* engine not up yet */ })
    const stop = subscribeEngine(
      (state) => {
        w.setEngineState(state)
        const shown = shownEngineCharacter(state)
        if (shown) {
          w.setCharacter(mergeCharacter(characterRef.current, characterFromEngine(shown, state.savePath)))
        }
      },
      w.setEngineStatus,
    )
    return () => {
      cancelled = true
      stop()
    }
    // Subscribe once for the life of the shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/** Compact rail chip: engine live / connecting / plates, plus live-memory when the API says so. */
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

function AppShell() {
  const w = useWorkspace()
  useHotkeys()
  useClipboardShots()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mobileNow, setMobileNow] = useState(false)
  const [ribbonOpen, setRibbonOpen] = useState(false)

  const className = [
    'app',
    sheetOpen ? 'sheet-open' : '',
    mobileNow ? 'now-open' : '',
  ].filter(Boolean).join(' ')

  function openRoom(id: ModuleId) {
    w.setModule(id)
    setSheetOpen(false)
    setMobileNow(false)
  }

  function openNow() {
    setSheetOpen(false)
    setMobileNow(true)
  }

  // The Now panel's "N open · M locked" line opens the Quests archive. Quests
  // is a link in the Tarnished sheet, never a play tab (Task 84).
  function openArchive() {
    w.setModule('quests')
    setMobileNow(false)
    setSheetOpen(false)
  }

  // Exactly three play tabs; Reckon/Quests/Codex are links in the sheet.
  const tab = mobileNow ? 'now' : w.module === 'map' ? 'map' : w.module === 'build' ? 'kit' : null

  return (
    <div className={className}>
      <EngineBridge />
      <aside className="rail" id="tarnished-sheet">
        <div className="sheet-head">
          <span className="kicker">Tarnished</span>
          <button type="button" className="sheet-close" onClick={() => setSheetOpen(false)}>Done</button>
        </div>
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <h1>All-Knowing</h1>
            <p>All things conjoined</p>
          </div>
        </div>
        <ProfileSwitcher />
        <EngineChip />
        <CoopChip />
        <nav className="nav">
          {modules.map((m) => (
            <button key={m.id} className={w.module === m.id ? 'active' : ''} onClick={() => openRoom(m.id)}>
              <img src={art.room[m.id]} alt="" />
              {m.label}
            </button>
          ))}
        </nav>
        <CharacterCard />
        <Recents />
        <PacketBar />
        <SaveDrop />
        <GoodsPaste />
        <div className="opts">
          <SpoilerToggle />
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <h2>{modules.find((m) => m.id === w.module)?.label}</h2>
          <button
            type="button"
            className="tarnished-toggle"
            onClick={() => setSheetOpen(true)}
            aria-controls="tarnished-sheet"
            aria-expanded={sheetOpen}
          >
            {w.character.name} · Lv.{w.character.level}
          </button>
          <input
            id="command-search"
            className="search"
            placeholder="Search · / Ctrl+K · 1–5 rooms · paste shot · ? help"
            value={w.query}
            onChange={(e) => w.setQuery(e.target.value)}
          />
          {w.module === 'map' && (
            <div className="toggles">
              <button className={w.missingOnly ? 'chip on' : 'chip'} onClick={() => w.setMissingOnly(!w.missingOnly)}>
                Missing only
              </button>
              <button className={w.showLeftovers ? 'chip on' : 'chip'} onClick={() => w.toggleLeftovers()}>
                leftovers
              </button>
              <button className={w.showGates ? 'chip on' : 'chip'} onClick={() => w.toggleGates()}>
                locks
              </button>
              {layerOrder.map((id) => (
                <button key={id} className={w.layers[id] ? 'chip on' : 'chip'} onClick={() => w.toggleLayer(id)}>
                  {id}
                </button>
              ))}
            </div>
          )}
          <Help />
        </header>
        <WorldRibbon open={ribbonOpen} onToggle={() => setRibbonOpen((v) => !v)} />
        <CommandHits />
        <div className="stage">
          <Suspense fallback={null}>
            {/* Task 86: the Now tab mounts no room, so the Codex (and its FanAPI
                / gathering grids) can never mount behind Map / Now / Kit. The
                Codex is opened only from the Tarnished sheet or a "/" hit. */}
            {!mobileNow && (
              <>
                {w.module === 'reckon' && <ReckonWorkspace />}
                {w.module === 'map' && <AtlasWorkspace />}
                {w.module === 'build' && <BuildWorkspace />}
                {w.module === 'quests' && <QuestWorkspace />}
                {w.module === 'codex' && <CodexWorkspace />}
              </>
            )}
          </Suspense>
        </div>
      </main>

      <aside className="guide">
        <Suspense fallback={null}>
          <Gideon onOpenArchive={openArchive} />
        </Suspense>
      </aside>

      <nav className="tabbar" aria-label="Play">
        <button type="button" className={tab === 'map' ? 'active' : ''} onClick={() => openRoom('map')}>
          <img src={art.room.map} alt="" />
          <span>Map</span>
        </button>
        <button type="button" className={tab === 'now' ? 'active' : ''} onClick={openNow}>
          <img src={art.guide} alt="" />
          <span>Gideon</span>
        </button>
        <button type="button" className={tab === 'kit' ? 'active' : ''} onClick={() => openRoom('build')}>
          <img src={art.room.build} alt="" />
          <span>Kit</span>
        </button>
      </nav>

      <button
        type="button"
        className="sheet-backdrop"
        aria-label="Close Tarnished panel"
        onClick={() => setSheetOpen(false)}
      />
    </div>
  )
}

function WorldRibbon({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { character, setSelectedMarkerId, setModule } = useWorkspace()
  const banners = worldBanners(character)
  const spoil = character.answers.spoil !== '0'
  const miss = spoil ? leftovers(character) : []
  if (!banners.length && !miss.length) return null
  const count = banners.length + miss.length
  return (
    <div className={open ? 'world-ribbon open' : 'world-ribbon'}>
      <button
        type="button"
        className="ribbon-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span>{count} story flag{count === 1 ? '' : 's'}</span>
        <span aria-hidden>{open ? '▴' : '▾'}</span>
      </button>
      <div className="ribbon-items">
        {banners.map((b) => (
          <span key={b.id} className={b.tone === 'warn' ? 'warn chip' : 'chip on'}>{b.text}</span>
        ))}
        {miss.slice(0, 2).map((e) => (
          <button key={e.id} type="button" className="chip" onClick={() => { if (e.grace) setSelectedMarkerId(e.grace); setModule('map') }}>
            Still in {e.region}: {e.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function CharacterCard() {
  const { character, engineStatus, setSelectedMarkerId, setModule } = useWorkspace()
  const s = character.stats
  const tot = summarize(character)
  const recent = [...character.evidence].slice(-3).reverse()
  return (
    <section className="char-card">
      <div className="label">
        {engineStatus === 'live'
          ? 'Map engine · live save'
          : engineStatus === 'connecting'
            ? 'Map engine · connecting'
            : character.source === 'empty'
              ? 'No save bound'
              : character.source === 'demo'
                ? 'Demo character'
                : 'Save (local)'}
      </div>
      <h2>{character.name}</h2>
      <div className="meta">
        Lv. {character.level} · {character.startingClass.replace('-', ' ')}
        {typeof character.answers.gideonGoal === 'string' && (
          <> · {allLines.find((l) => l.id === character.answers.gideonGoal)?.name ?? character.answers.gideonGoal}</>
        )}
      </div>
      <div className="stats">
        <div><span>Vig</span> <strong>{s.vigor}{softCapMark('vigor', s.vigor)}</strong></div>
        <div><span>Mnd</span> <strong>{s.mind}{softCapMark('mind', s.mind)}</strong></div>
        <div><span>End</span> <strong>{s.endurance}{softCapMark('endurance', s.endurance)}</strong></div>
        <div><span>Str</span> <strong>{s.strength}{softCapMark('strength', s.strength)}</strong></div>
        <div><span>Dex</span> <strong>{s.dexterity}{softCapMark('dexterity', s.dexterity)}</strong></div>
        <div><span>Int</span> <strong>{s.intelligence}{softCapMark('intelligence', s.intelligence)}</strong></div>
        <div><span>Fth</span> <strong>{s.faith}{softCapMark('faith', s.faith)}</strong></div>
        <div><span>Arc</span> <strong>{s.arcane}{softCapMark('arcane', s.arcane)}</strong></div>
      </div>
      <div className="tally">
        <span>{tot.graces} graces</span>
        <span>{tot.bosses} bosses</span>
        <span>{tot.items} items</span>
      </div>
      {recent.map((e) => (
        <button
          key={e.id}
          type="button"
          className="chip"
          style={{ marginTop: 4 }}
          onClick={() => { setSelectedMarkerId(e.fact); setModule('map') }}
        >
          {e.fact.replace(/^[a-z]+:/, '')}
        </button>
      ))}
    </section>
  )
}

function SaveDrop() {
  const { setCharacter, setModule } = useWorkspace()
  const inputRef = useRef<HTMLInputElement>(null)
  const [hot, setHot] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(file?: File) {
    if (!file) return
    setError(null)
    try {
      const character = await ingestSave(file)
      setCharacter(character)
      setModule('map')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read save')
    }
  }

  return (
    <div
      className={hot ? 'drop hot' : 'drop'}
      onDragOver={(e) => { e.preventDefault(); setHot(true) }}
      onDragLeave={() => setHot(false)}
      onDrop={(e) => {
        e.preventDefault()
        setHot(false)
        void onFile(e.dataTransfer.files[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".sl2,.co2"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <div>
        Drop a PC <code>ER0000.sl2</code> to read it locally — stats, bosses, graces. It is parsed
        in your browser and never uploaded. PS5: use Reckoning — questions + screenshots.
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
        <button className="ghost" type="button" onClick={() => inputRef.current?.click()}>Open save (.sl2)</button>
        <button
          className="ghost gold"
          type="button"
          onClick={() => {
            setCharacter(demoCharacter)
            setModule('map')
          }}
        >
          Load demo
        </button>
      </div>
      {error && <div className="warn" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  )
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  )
}
