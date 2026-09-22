export type ModuleId = 'reckon' | 'map' | 'build' | 'quests' | 'codex'

export type Platform = 'ps5' | 'pc' | 'both'

export type Campaign = 'base' | 'sote' | 'tarnished-pack'

export type StartingClass =
  | 'vagabond'
  | 'warrior'
  | 'hero'
  | 'bandit'
  | 'astrologer'
  | 'prophet'
  | 'samurai'
  | 'prisoner'
  | 'confessor'
  | 'wretch'
  | 'heavy-knight'
  | 'idus-knight'
  | 'unknown'

export type Stats = {
  vigor: number
  mind: number
  endurance: number
  strength: number
  dexterity: number
  intelligence: number
  faith: number
  arcane: number
}

export type LoadoutSlot = {
  id: string
  name: string
  kind: 'armament' | 'catalyst' | 'shield' | 'armor' | 'talisman' | 'ash'
  affinity?: string
  upgrade?: number
}

export type MarkerKind = 'grace' | 'boss' | 'item' | 'npc' | 'fragment' | 'spirit-ash' | 'dungeon'

export type MapMarker = {
  id: string
  name: string
  kind: MarkerKind
  region: string
  campaign: 'base' | 'sote'
  x: number
  y: number
  missable?: boolean
  note?: string
  /** Part of the leftover/watchlist layer, not a seed/coords pin. */
  leftover?: boolean
  /** Part of the "locks if you continue" gate layer (Task 52). */
  gate?: boolean
}

export type QuestStep = {
  id: string
  text: string
  location?: string
  optional?: boolean
  lockout?: string
  flagHint?: string
}

export type Questline = {
  id: string
  npc: string
  campaign: Campaign
  ending?: boolean
  summary: string
  steps: QuestStep[]
}

export type CodexEntry = {
  id: string
  name: string
  category: string
  campaign: Campaign
  snippet: string
}

export type EvidenceSource = 'save' | 'answer' | 'screenshot' | 'inference'

/**
 * What an evidence entry asserts about its fact. `true` (the default when
 * absent, for backwards compatibility) means the fact happened/was collected;
 * `false` means a photographed absence or an explicit “no”.
 */
export type EvidenceClaim = 'true' | 'false'

export type Evidence = {
  id: string
  fact: string
  source: EvidenceSource
  confidence: number
  /** Defaults to `true` when omitted (pre-Task-24 evidence had no polarity). */
  claim?: EvidenceClaim
  detail?: string
  at: number
}

/** Three-state fact, matching `factState()` in `state.tsx` / SCOPE item #1. */
export type FactState = 'true' | 'false' | 'unknown'

export type ShotKind = 'map' | 'warp-list' | 'inventory' | 'equipment' | 'pickup' | 'boss' | 'unknown'

export type Shot = {
  id: string
  kind: ShotKind
  name: string
  url: string
  notes: string
  hits: string[]
}

export type Character = {
  source: 'empty' | 'demo' | 'save' | 'reckon'
  platform: Platform
  /** Regulation line every fact in this character is keyed to. See `src/lib/regulation.ts`. */
  regulation: string
  fileName?: string
  name: string
  level: number
  startingClass: StartingClass
  stats: Stats
  loadout: LoadoutSlot[]
  defeatedBosses: string[]
  discoveredGraces: string[]
  collectedItems: string[]
  completedQuestSteps: string[]
  /** Explicitly false — photographed absence or player said no. Not the same as unknown. */
  deniedFacts: string[]
  answers: Record<string, string | string[]>
  evidence: Evidence[]
  shots: Shot[]
}
