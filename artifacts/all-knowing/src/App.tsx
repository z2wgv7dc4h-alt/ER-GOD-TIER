import { useEffect, useRef, useState } from 'react'
import { demoCharacter } from './data/seed'
import {
  characterFromEngine,
  fetchEngineMarkers,
  shownEngineCharacter,
  subscribeEngine,
} from './lib/mapEngine'
import { mergeCharacter } from './lib/merge'
import { ingestSave } from './lib/save'
import { AtlasWorkspace } from './Atlas'
import { BuildWorkspace } from './Build'
import { CodexWorkspace } from './Codex'
import { FirstSit } from './FirstSit'
import { Gideon } from './Gideon'
import { leftovers } from './lib/leftovers'
import { summarize } from './lib/infer'
import { worldBanners } from './lib/worldState'
import { CommandHits, PacketBar, SitToggle, softCapMark, useClipboardShots, useHotkeys } from './QoL'
import { ProfileSwitcher } from './ProfileSwitcher'
import { allLines } from './knowledge/storylines'
import { QuestWorkspace } from './Quests'
import { ReckonWorkspace } from './Reckon'
import { WorkspaceProvider, useWorkspace } from './state'
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

function AppShell() {
  const w = useWorkspace()
  useHotkeys()
  useClipboardShots()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [ribbonOpen, setRibbonOpen] = useState(false)

  const className = [
    'app',
    w.sitMode ? 'sit' : '',
    sheetOpen ? 'sheet-open' : '',
    guideOpen ? 'guide-open' : '',
  ].filter(Boolean).join(' ')

  function openRoom(id: ModuleId) {
    w.setModule(id)
    setGuideOpen(false)
    setSheetOpen(false)
  }

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
        <nav className="nav">
          {modules.map((m) => (
            <button key={m.id} className={w.module === m.id ? 'active' : ''} onClick={() => openRoom(m.id)}>
              <img src={art.room[m.id]} alt="" />
              {m.label}
            </button>
          ))}
        </nav>
        <CharacterCard />
        <PacketBar />
        <SaveDrop />
        <div className="sheet-sit">
          <SitToggle />
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
            className="search"
            placeholder="Search · / Ctrl+K · paste shot"
            value={w.query}
            onChange={(e) => w.setQuery(e.target.value)}
          />
          {w.module === 'map' && (
            <div className="toggles">
              <button className={w.missingOnly ? 'chip on' : 'chip'} onClick={() => w.setMissingOnly(!w.missingOnly)}>
                Missing only
              </button>
              {layerOrder.map((id) => (
                <button key={id} className={w.layers[id] ? 'chip on' : 'chip'} onClick={() => w.toggleLayer(id)}>
                  {id}
                </button>
              ))}
            </div>
          )}
          <div className="topbar-sit">
            <SitToggle />
          </div>
        </header>
        <WorldRibbon open={ribbonOpen} onToggle={() => setRibbonOpen((v) => !v)} />
        <CommandHits />
        <div className="stage">
          <FirstSit />
          {w.module === 'reckon' && <ReckonWorkspace />}
          {w.module === 'map' && <AtlasWorkspace />}
          {w.module === 'build' && <BuildWorkspace />}
          {w.module === 'quests' && <QuestWorkspace />}
          {w.module === 'codex' && <CodexWorkspace />}
        </div>
      </main>

      <aside className="guide">
        <Gideon />
      </aside>

      <nav className="tabbar" aria-label="Rooms">
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            className={!guideOpen && w.module === m.id ? 'active' : ''}
            onClick={() => openRoom(m.id)}
          >
            <img src={art.room[m.id]} alt="" />
            <span>{m.short}</span>
          </button>
        ))}
        <button
          type="button"
          className={guideOpen ? 'active' : ''}
          onClick={() => { setGuideOpen((v) => !v); setSheetOpen(false) }}
        >
          <img src={art.guide} alt="" />
          <span>Gideon</span>
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
