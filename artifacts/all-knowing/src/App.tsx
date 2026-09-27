import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  characterFromEngine,
  fetchEngineMarkers,
  shownEngineCharacter,
  subscribeEngine,
} from './lib/mapEngine'
import { mergeCharacter } from './lib/merge'
import { CommandHits, useClipboardShots, useHotkeys } from './QoL'
import { FirstVisitHint } from './Help'
import { EntityOverlay } from './library/EntityOverlay'
import { Header } from './shell/Header'
import { JourneyNow } from './shell/JourneyNow'
import { MapControls } from './shell/MapControls'
import { MeOverview } from './shell/MeOverview'
import { MeProfiles } from './shell/MeProfiles'
import { MeSetup } from './shell/MeSetup'
import { SubTabs } from './shell/SubTabs'
import { TabBar } from './shell/TabBar'
import { WorkspaceProvider, useWorkspace } from './state'

// Each room is a separate chunk, loaded only when its section/sub is opened.
const AtlasWorkspace = lazy(() => import('./Atlas').then((m) => ({ default: m.AtlasWorkspace })))
const BuildWorkspace = lazy(() => import('./Build').then((m) => ({ default: m.BuildWorkspace })))
const BuildPlanner = lazy(() => import('./library/BuildPlanner').then((m) => ({ default: m.BuildPlanner })))
const KitWorkspace = lazy(() => import('./Build').then((m) => ({ default: m.KitWorkspace })))
// The Gear sheet resolves entity details through the library catalogue, so it
// stays a lazy chunk rather than dragging FanAPI/regulation into the shell.
const MeGear = lazy(() => import('./shell/MeGear').then((m) => ({ default: m.MeGear })))
const QuestWorkspace = lazy(() => import('./Quests').then((m) => ({ default: m.QuestWorkspace })))
const CodexWorkspace = lazy(() => import('./Codex').then((m) => ({ default: m.CodexWorkspace })))
const LegacyCodex = lazy(() => import('./library/LegacyCodex').then((m) => ({ default: m.LegacyCodex })))
const Gideon = lazy(() => import('./Gideon').then((m) => ({ default: m.Gideon })))

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

/** The section/sub switch. Rooms stay React.lazy; the shell owns the mount. */
function ShellContent() {
  const { section, sub } = useWorkspace()
  if (section === 'me') {
    if (sub === 'gear') return <MeGear />
    if (sub === 'setup' || sub === 'update') return <MeSetup />
    if (sub === 'profiles') return <MeProfiles />
    return <MeOverview />
  }
  if (section === 'journey') {
    if (sub === 'map') return <AtlasWorkspace />
    if (sub === 'quests') return <QuestWorkspace />
    return <JourneyNow />
  }
  if (section === 'library') {
    if (sub === 'builds') return (<div className="builds-page"><BuildPlanner /><BuildWorkspace /></div>)
    if (sub === 'kit') return <KitWorkspace />
    if (sub === 'reference') return <LegacyCodex />
    return <CodexWorkspace />
  }
  return (
    <div className="gideon-page">
      <Gideon />
    </div>
  )
}

function AppShell() {
  const w = useWorkspace()
  useHotkeys()
  useClipboardShots()
  const [searchOpen, setSearchOpen] = useState(false)

  // Phone search opens the command palette full-width.
  useEffect(() => {
    if (searchOpen) document.querySelector<HTMLInputElement>('#command-search')?.focus()
  }, [searchOpen])

  const dockVisible = w.dockOpen && w.section !== 'gideon'
  const className = [
    'app',
    w.section === 'gideon' ? 'gideon-active' : '',
    dockVisible ? 'with-dock' : '',
    searchOpen ? 'search-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <EngineBridge />
      <Header
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen((v) => !v)}
        dockOpen={w.dockOpen}
        onToggleDock={w.toggleDock}
      />
      <div className="shell-body">
        <main className="workspace">
          <FirstVisitHint />
          <SubTabs />
          {w.section === 'journey' && w.sub === 'map' && <MapControls />}
          <CommandHits />
          <div className="stage">
            <Suspense fallback={null}>
              <ShellContent />
            </Suspense>
          </div>
        </main>
        {dockVisible && (
          <aside className="guide" aria-label="Gideon">
            <Suspense fallback={null}>
              <Gideon />
            </Suspense>
          </aside>
        )}
      </div>
      <TabBar />
      <EntityOverlay />
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
