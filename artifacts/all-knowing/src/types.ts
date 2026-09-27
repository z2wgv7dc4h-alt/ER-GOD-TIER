/**
 * The five legacy room ids. Kept as the persistence + compat key (Task 91): the
 * new shell is four sections, but every old caller still navigates by module and
 * `w.setModule(id)` still works. See `src/lib/sections.ts` for the mapping.
 */
export type ModuleId = 'reckon' | 'map' | 'build' | 'quests' | 'codex'

/** The four top-level sections of the redesigned shell (Task 91). */
export type Section = 'me' | 'journey' | 'library' | 'gideon'

/** Every sub-view each section exposes via its segmented control. */
export type SectionSubs = {
  /**
   * Task 94: Tarnished is Overview · Gear · Setup · Profiles. `update` is kept
   * in the union only as a legacy alias the URL layer resolves to `setup`.
   */
  me: 'overview' | 'gear' | 'setup' | 'profiles' | 'update'
  journey: 'now' | 'area' | 'map' | 'quests'
  /**
   * Task 117: Library is Search · Builds · PvP · Guides. `kit` and `reference`
   * are kept in the union only as legacy aliases the URL/vault layer resolves to
   * `builds` and `guides` respectively.
   */
  library: 'search' | 'builds' | 'pvp' | 'guides' | 'kit' | 'reference'
  gideon: never
}

/** Union of all real sub-view ids (`never` drops out of the gideon slot). */
export type Sub = SectionSubs[keyof SectionSubs]

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

/**
 * Task 94 — where an equipped row sits in the Gear sheet. Legacy loadouts (a
 * save dump, an OP kit, the demo) have no `slot`, so the sheet auto-arranges
 * them by kind until the player taps a slot and assigns one.
 */
export type GearSlot =
  | 'right-1' | 'right-2' | 'right-3'
  | 'left-1' | 'left-2' | 'left-3'
  | 'head' | 'chest' | 'arms' | 'legs'
  | 'talisman-1' | 'talisman-2' | 'talisman-3' | 'talisman-4'
  | 'spell-1' | 'spell-2' | 'spell-3' | 'spell-4' | 'spell-5' | 'spell-6' | 'spell-7' | 'spell-8'

export type LoadoutSlot = {
  id: string
  name: string
  kind: 'armament' | 'catalyst' | 'shield' | 'armor' | 'talisman' | 'spell' | 'ash'
  affinity?: string
  upgrade?: number
  /** Gear-sheet position (Task 94). Optional for backwards compatibility. */
  slot?: GearSlot
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
  /** Part of the Task 112/113 watchlist layer (starred entities). */
  watch?: boolean
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
