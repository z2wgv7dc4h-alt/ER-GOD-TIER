import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { markers } from './data/seed'
import type { EngineMarker, EngineState, EngineStatus } from './lib/mapEngine'
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
import type { Character, FactState, MapMarker, ModuleId } from './types'

type LayerId = MapMarker['kind']

type Workspace = {
  module: ModuleId
  setModule: (id: ModuleId) => void
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
  sitMode: boolean
  setSitMode: (v: boolean) => void
  helpOpen: boolean
  setHelpOpen: (v: boolean) => void
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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const boot = useRef(loadVault()).current
  const [vault, setVault] = useState<Vault>(boot)
  const bootProfile = activeProfile(boot)
  const [module, setModule] = useState<ModuleId>(bootProfile.ui.module)
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
  const [sitMode, setSitMode] = useState(bootProfile.ui.sitMode)
  const [helpOpen, setHelpOpen] = useState(false)
  const [recentFacts, setRecentFacts] = useState<string[]>([])

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

  useEffect(() => {
    const next = upsertActive(vaultRef.current, {
      character: { ...character, shots: [] },
      label: character.name || activeProfile(vaultRef.current).label,
      ui: { module, missingOnly, sitMode, selectedMarkerId },
    })
    vaultRef.current = next
    setVault(next)
    saveVault(next)
  }, [character, module, missingOnly, sitMode, selectedMarkerId])

  function applyVault(next: Vault) {
    const p = activeProfile(next)
    setVault(next)
    saveVault(next)
    setCharacter(p.character)
    setModule(p.ui.module)
    setMissingOnly(p.ui.missingOnly)
    setSitMode(p.ui.sitMode)
    setSelectedMarkerId(p.ui.selectedMarkerId)
    setHistory([])
    // Recents are derived from the previous Tarnished's pins; don't let one
    // profile's fact history leak into another's rail.
    setRecentFacts([])
  }

  const value = useMemo<Workspace>(
    () => ({
      module,
      setModule,
      character,
      setCharacter: commitCharacter,
      selectedMarkerId,
      setSelectedMarkerId: (id) => {
        setSelectedMarkerId(id)
        if (id) setRecentFacts((r) => [id, ...r.filter((x) => x !== id)].slice(0, 8))
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
      sitMode,
      setSitMode,
      helpOpen,
      setHelpOpen,
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
    [module, character, selectedMarkerId, layers, showLeftovers, showGates, missingOnly, query, engineStatus, engineState, engineMarkers, history, sitMode, helpOpen, recentFacts, vault],
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
