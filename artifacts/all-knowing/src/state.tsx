import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { markers } from './data/seed'
import type { EngineMarker, EngineState, EngineStatus } from './lib/mapEngine'
import { pushRecent, recentAfterProfileSwitch } from './lib/recent'
import {
  defaultSub,
  hashToLocation,
  locationToHash,
  locationToModule,
  moduleToLocation,
} from './lib/sections'
import {
  activeProfile,
  addProfile,
  deleteProfile,
  loadVault,
  saveVault,
  switchProfile,
  upsertActive,
  type Profile,
  type Vault,
} from './lib/vault'
import type { Character, FactState, MapMarker, ModuleId, Section, Sub } from './types'

type LayerId = MapMarker['kind']

type Workspace = {
  /** Legacy room id (kept for every pre-Task-91 caller). */
  module: ModuleId
  setModule: (id: ModuleId) => void
  /** New shell location. */
  section: Section
  sub: Sub | null
  go: (section: Section, sub?: Sub) => void
  character: Character
  setCharacter: (c: Character) => void
  selectedMarkerId: string | null
  setSelectedMarkerId: (id: string | null) => void
  layers: Record<LayerId, boolean>
  toggleLayer: (id: LayerId) => void
  showLeftovers: boolean
  toggleLeftovers: () => void
  showGates: boolean
  toggleGates: () => void
  missingOnly: boolean
  setMissingOnly: (v: boolean) => void
  query: string
  setQuery: (q: string) => void
  engineStatus: EngineStatus
  setEngineStatus: (s: EngineStatus) => void
  engineState: EngineState | null
  setEngineState: (s: EngineState | null) => void
  engineMarkers: EngineMarker[]
  setEngineMarkers: (m: EngineMarker[]) => void
  undo: () => void
  canUndo: boolean
  helpOpen: boolean
  setHelpOpen: (v: boolean) => void
  /** Gideon dock open/closed; default from viewport width, persisted. */
  dockOpen: boolean
  toggleDock: () => void
  recentFacts: string[]
  vault: Vault
  profile: Profile
  newProfile: (label: string) => void
  loadProfile: (id: string) => void
  removeProfile: (id: string) => void
  renameProfile: (label: string) => void
}

const WorkspaceContext = createContext<Workspace | null>(null)

const defaultLayers: Record<LayerId, boolean> = {
  grace: true,
  boss: true,
  item: true,
  npc: true,
  fragment: true,
  'spirit-ash': true,
  dungeon: true,
}

function bootLocation(hash: string, module: ModuleId): { section: Section; sub: Sub | null } {
  const fromHash = hashToLocation(hash)
  if (fromHash) return fromHash
  return moduleToLocation(module)
}

const DOCK_KEY = 'all-knowing.dock.open.v1'

/** Gideon dock default: open at ≥1200px, closed below; persisted thereafter. */
function readDockOpen(): boolean {
  try {
    const raw = localStorage.getItem(DOCK_KEY)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch { /* storage disabled */ }
  return typeof window !== 'undefined' ? window.innerWidth >= 1200 : false
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const boot = useRef(loadVault()).current
  const [vault, setVault] = useState<Vault>(boot)
  const bootProfile = activeProfile(boot)
  const start = bootLocation(typeof window !== 'undefined' ? window.location.hash : '', bootProfile.ui.module)

  const [module, setModuleState] = useState<ModuleId>(bootProfile.ui.module)
  const [section, setSection] = useState<Section>(start.section)
  const [sub, setSub] = useState<Sub | null>(start.sub)
  const [character, setCharacter] = useState<Character>(bootProfile.character)
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(bootProfile.ui.selectedMarkerId)
  const [layers, setLayers] = useState(defaultLayers)
  const [showLeftovers, setShowLeftovers] = useState(false)
  const [showGates, setShowGates] = useState(false)
  const [missingOnly, setMissingOnly] = useState(bootProfile.ui.missingOnly)
  const [query, setQuery] = useState('')
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('offline')
  const [engineState, setEngineState] = useState<EngineState | null>(null)
  const [engineMarkers, setEngineMarkers] = useState<EngineMarker[]>([])
  const [history, setHistory] = useState<Character[]>([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [dockOpen, setDockOpen] = useState(readDockOpen)
  const [recentFacts, setRecentFacts] = useState<string[]>([])

  useEffect(() => {
    try { localStorage.setItem(DOCK_KEY, dockOpen ? '1' : '0') } catch { /* storage disabled */ }
  }, [dockOpen])

  function commitCharacter(next: Character) {
    setHistory((h) => [...h.slice(-19), character])
    setCharacter(next)
  }

  function undo() {
    setHistory((h) => {
      const prev = h[h.length - 1]
      if (prev) setCharacter(prev)
      return h.slice(0, -1)
    })
  }

  const vaultRef = useRef(vault)
  vaultRef.current = vault

  /** Compat shim: `setModule(oldId)` lands on the mapped section/sub. */
  function navigateModule(id: ModuleId) {
    const loc = moduleToLocation(id)
    setSection(loc.section)
    setSub(loc.sub)
    setModuleState(id)
  }

  /** New navigation entry point. Missing sub defaults to the section's first. */
  function go(next: Section, nextSub?: Sub) {
    setSection(next)
    const subId = next === 'gideon' ? null : (nextSub ?? defaultSub(next))
    setSub(subId)
    setModuleState(locationToModule(next, subId))
  }

  // Hash routing: the URL is `#/section/sub`, so reloads and the back button work.
  useEffect(() => {
    const hash = locationToHash(section, sub)
    if (window.location.hash !== hash) window.location.hash = hash
  }, [section, sub])

  useEffect(() => {
    function onHashChange() {
      const loc = hashToLocation(window.location.hash)
      if (!loc) return
      setSection(loc.section)
      setSub(loc.sub)
      setModuleState(locationToModule(loc.section, loc.sub))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const next = upsertActive(vaultRef.current, {
      character: { ...character, shots: [] },
      label: character.name || activeProfile(vaultRef.current).label,
      ui: { module: locationToModule(section, sub), missingOnly, selectedMarkerId },
    })
    vaultRef.current = next
    setVault(next)
    saveVault(next)
  }, [character, section, sub, missingOnly, selectedMarkerId])

  function applyVault(next: Vault) {
    const p = activeProfile(next)
    setVault(next)
    saveVault(next)
    setCharacter(p.character)
    const loc = moduleToLocation(p.ui.module)
    setSection(loc.section)
    setSub(loc.sub)
    setModuleState(p.ui.module)
    setMissingOnly(p.ui.missingOnly)
    setSelectedMarkerId(p.ui.selectedMarkerId)
    setHistory([])
    // Recents are derived from the previous Tarnished's pins; don't let one
    // profile's fact history leak into another's rail.
    setRecentFacts(recentAfterProfileSwitch())
  }

  const value = useMemo<Workspace>(
    () => ({
      module,
      setModule: navigateModule,
      section,
      sub,
      go,
      character,
      setCharacter: commitCharacter,
      selectedMarkerId,
      setSelectedMarkerId: (id) => {
        setSelectedMarkerId(id)
        if (id) setRecentFacts((r) => pushRecent(r, id))
      },
      layers,
      toggleLayer: (id) => setLayers((prev) => ({ ...prev, [id]: !prev[id] })),
      showLeftovers,
      toggleLeftovers: () => setShowLeftovers((v) => !v),
      showGates,
      toggleGates: () => setShowGates((v) => !v),
      missingOnly,
      setMissingOnly,
      query,
      setQuery,
      engineStatus,
      setEngineStatus,
      engineState,
      setEngineState,
      engineMarkers,
      setEngineMarkers,
      undo,
      canUndo: history.length > 0,
      helpOpen,
      setHelpOpen,
      dockOpen,
      toggleDock: () => setDockOpen((v) => !v),
      recentFacts,
      vault,
      profile: activeProfile(vault),
      newProfile: (label) => applyVault(addProfile(vault, label)),
      loadProfile: (id) => applyVault(switchProfile(vault, id)),
      removeProfile: (id) => applyVault(deleteProfile(vault, id)),
      renameProfile: (label) => {
        const next = upsertActive(vault, { label, character: { ...character, name: label } })
        setVault(next)
        saveVault(next)
        setCharacter({ ...character, name: label })
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module, section, sub, character, selectedMarkerId, layers, showLeftovers, showGates, missingOnly, query, engineStatus, engineState, engineMarkers, history, helpOpen, dockOpen, recentFacts, vault],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}

export type { FactState }

export function factState(character: Character, id: string): FactState {
  const known = new Set([
    ...character.defeatedBosses,
    ...character.discoveredGraces,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ])
  if (known.has(id)) return 'true'
  if ((character.deniedFacts || []).includes(id)) return 'false'
  return 'unknown'
}

export function isCollected(character: Character, marker: MapMarker) {
  return factState(character, marker.id) === 'true'
}

export function visibleMarkers(character: Character, layers: Record<LayerId, boolean>, missingOnly: boolean, query: string) {
  const q = query.trim().toLowerCase()
  return markers.filter((m) => {
    if (!layers[m.kind]) return false
    if (q && !`${m.name} ${m.region} ${m.note ?? ''}`.toLowerCase().includes(q)) return false
    if (missingOnly && factState(character, m.id) === 'true') return false
    return true
  })
}
