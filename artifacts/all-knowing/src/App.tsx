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
import { allLines } from './knowledge/storylines'
import { QuestWorkspace } from './Quests'
import { ReckonWorkspace } from './Reckon'
import { WorkspaceProvider, useWorkspace } from './state'
import { art } from './art'
import type { MapMarker, ModuleId } from './types'

const modules: { id: ModuleId; label: string }[] = [
  { id: 'reckon', label: 'Reckoning' },
  { id: 'map', label: 'Atlas' },
  { id: 'build', label: 'Build lab' },
  { id: 'quests', label: 'Quest graph' },
  { id: 'codex', label: 'Codex' },
]

const layerOrder: MapMarker['kind'][] = ['grace', 'boss', 'item', 'npc', 'fragment', 'spirit-ash', 'dungeon']

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
  return (
    <div className={w.sitMode ? 'app sit' : 'app'}>
      <EngineBridge />
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div>
            <h1>All-Knowing</h1>
            <p>All things conjoined</p>
          </div>
        </div>
        <nav className="nav">
          {modules.map((m) => (
            <button key={m.id} className={w.module === m.id ? 'active' : ''} onClick={() => w.setModule(m.id)}>
              <img src={art.room[m.id]} alt="" />
              {m.label}
            </button>
          ))}
        </nav>
        <CharacterCard />
        <PacketBar />
        <SaveDrop />
      </aside>
      <main className="workspace">
        <header className="topbar">
          <h2>{modules.find((m) => m.id === w.module)?.label}</h2>
          <input
            className="search"
            placeholder="Search · / Ctrl+K · 1–5 rooms · S sit · paste shot"
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
              {layerOrder.map((id) => (
                <button key={id} className={w.layers[id] ? 'chip on' : 'chip'} onClick={() => w.toggleLayer(id)}>
                  {id}
                </button>
              ))}
            </div>
          )}
          <SitToggle />
        </header>
        <WorldRibbon />
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
    </div>
  )
}

function WorldRibbon() {
  const { character, setSelectedMarkerId, setModule } = useWorkspace()
  const banners = worldBanners(character)
  const spoil = character.answers.spoil !== '0'
  const miss = spoil ? leftovers(character) : []
  if (!banners.length && !miss.length) return null
  return (
    <div className="world-ribbon">
      {banners.map((b) => (
        <span key={b.id} className={b.tone === 'warn' ? 'warn chip' : 'chip on'}>{b.text}</span>
      ))}
      {miss.slice(0, 2).map((e) => (
        <button key={e.id} type="button" className="chip" onClick={() => { if (e.grace) setSelectedMarkerId(e.grace); setModule('map') }}>
          Still in {e.region}: {e.name}
        </button>
      ))}
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
