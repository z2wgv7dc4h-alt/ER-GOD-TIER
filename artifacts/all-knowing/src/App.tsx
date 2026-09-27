import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  characterFromEngine,
  fetchEngineMarkers,
  shownEngineCharacter,
  subscribeEngine,
} from './lib/mapEngine'
import { mergeCharacter } from './lib/merge'
import { CommandHits, useClipboardShots, useHotkeys } from './QoL'
import { QuickLog } from './QuickLog'
import { FirstVisitHint } from './Help'
import { EntityOverlay } from './library/EntityOverlay'
import { GlanceMode } from './shell/GlanceMode'
import { Header } from './shell/Header'
import { JourneyArea } from './shell/JourneyArea'
import { JourneyNow } from './shell/JourneyNow'
import { MapControls } from './shell/MapControls'
import { MeOverview } from './shell/MeOverview'
import { MeProfiles } from './shell/MeProfiles'
import { MeSetup } from './shell/MeSetup'
import { SectionSkeleton, DockSkeleton } from './shell/Skeletons'
import { SubTabs } from './shell/SubTabs'
import { TabBar } from './shell/TabBar'
import { SettingsEffects } from './settings/SettingsEffects'
import { WorkspaceProvider, useWorkspace } from './state'

// Each room is a separate chunk, loaded only when its section/sub is opened.
const AtlasWorkspace = lazy(() => import('./Atlas').then((m) => ({ default: m.AtlasWorkspace })))
const BuildWorkspace = lazy(() => import('./Build').then((m) => ({ default: m.BuildWorkspace })))
const BuildKits = lazy(() => import('./Build').then((m) => ({ default: m.BuildKits })))
const PvpWorkspace = lazy(() => import('./Build').then((m) => ({ default: m.PvpWorkspace })))
const BuildPlanner = lazy(() => import('./library/BuildPlanner').then((m) => ({ default: m.BuildPlanner })))
// The Gear sheet resolves entity details through the library catalogue, so it
// stays a lazy chunk rather than dragging FanAPI/regulation into the shell.
const MeGear = lazy(() => import('./shell/MeGear').then((m) => ({ default: m.MeGear })))
const QuestWorkspace = lazy(() => import('./Quests').then((m) => ({ default: m.QuestWorkspace })))
const CodexWorkspace = lazy(() => import('./Codex').then((m) => ({ default: m.CodexWorkspace })))
const Guides = lazy(() => import('./library/Guides').then((m) => ({ default: m.Guides })))
const Tour = lazy(() => import('./tour/Tour').then((m) => ({ default: m.Tour })))
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
    // Close the stream before a full navigation/reload so the browser does not
    // record the in-flight `/engine/api/events` request as aborted.
    const closeOnHide = () => stop()
    window.addEventListener('pagehide', closeOnHide)
    return () => {
      cancelled = true
      window.removeEventListener('pagehide', closeOnHide)
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
    if (sub === 'area') return <JourneyArea />
    if (sub === 'map') return <AtlasWorkspace />
    if (sub === 'quests') return <QuestWorkspace />
    return <JourneyNow />
  }
  if (section === 'library') {
    if (sub === 'builds') {
      return (
        <div className="builds-page">
          <BuildPlanner />
          <BuildWorkspace />
          <BuildKits />
        </div>
      )
    }
    if (sub === 'pvp') return <PvpWorkspace />
    if (sub === 'guides') return <Guides />
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
  const [logOpen, setLogOpen] = useState(false)
  const [logSeed, setLogSeed] = useState<string[]>([])

  // Quick log's near-me suggestions take the grace id when known, else the region name.
  const currentArea = w.currentArea?.factId ?? w.currentArea?.region ?? null

  function openLog(seed: string[] = []) {
    setLogSeed(seed)
    setLogOpen(true)
  }

  // Phone search opens the command palette full-width.
  useEffect(() => {
    if (searchOpen) document.querySelector<HTMLInputElement>('#command-search')?.focus()
  }, [searchOpen])

  // Task 108 §2 — the phone search row is transient. Moving section/sub, pressing
  // Escape or tapping outside the field/results collapses it back to the icon.
  useEffect(() => {
    setSearchOpen(false)
  }, [w.section, w.sub])

  useEffect(() => {
    if (!searchOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    function onDown(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      if (target?.closest('.shell-header, .command-hits')) return
      setSearchOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [searchOpen])

  const dockVisible = w.dockOpen && w.section !== 'gideon'
  const className = [
    'app',
    w.section === 'gideon' ? 'gideon-active' : '',
    w.glance ? 'glance-active' : '',
    dockVisible ? 'with-dock' : '',
    searchOpen ? 'search-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <EngineBridge />
      <SettingsEffects />
      <Header
        searchOpen={searchOpen}
        onToggleSearch={() => setSearchOpen((v) => !v)}
        dockOpen={w.dockOpen}
        onToggleDock={w.toggleDock}
        onOpenLog={() => openLog()}
      />
      <div className="shell-body">
        <main className="workspace">
          <FirstVisitHint />
          <SubTabs />
          {w.section === 'journey' && w.sub === 'map' && <MapControls />}
          <CommandHits onLog={(ids) => openLog(ids)} onCloseSearch={() => setSearchOpen(false)} />
          <div className="stage">
            <Suspense fallback={<SectionSkeleton />}>
              <ShellContent />
            </Suspense>
          </div>
        </main>
        {dockVisible && (
          <aside className="guide" aria-label="Gideon">
            <Suspense fallback={<DockSkeleton />}>
              <Gideon />
            </Suspense>
          </aside>
        )}
      </div>
      <TabBar />
      <EntityOverlay />
      <Suspense fallback={null}>
        <Tour />
      </Suspense>
      {w.glance && <GlanceMode onLog={() => openLog()} />}
      <QuickLog
        open={logOpen}
        seed={logSeed}
        currentArea={currentArea}
        onOpen={() => openLog()}
        onClose={() => setLogOpen(false)}
      />
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
