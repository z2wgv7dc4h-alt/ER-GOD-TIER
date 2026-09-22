import { canonicalFactId } from '../lib/aliases'
import { knownFactIds } from '../lib/infer'
import type { Character, ModuleId } from '../types'
import { warpGraces } from './graces'

/**
 * Task 80: one authored dungeon checklist — Stormveil Castle.
 *
 * A short, ordered set of key beats and the legacy-dungeon graces, not an
 * exhaustive loot sweep. Every `factId` is an existing catalog fact and every
 * `graceId` is an existing `graces.ts` warp, so ticking runs through the same
 * `applyFacts` / `clearFact` the rest of the app uses and "Show on map" only
 * appears when a real grace pin exists. Raya Lucaria, Volcano Manor and the
 * Haligtree are deliberately not authored here.
 */
export type DungeonStep = {
  id: string
  do: string
  detail: string
  /** The catalog fact this beat reads and writes. */
  factId: string
  module?: ModuleId
  /** An existing `grace:` slug to pin, when this beat has one. */
  graceId?: string
}

export type Dungeon = {
  id: string
  name: string
  region: string
  /** Block title suffix; says out loud that the list is not exhaustive. */
  scope: string
  steps: DungeonStep[]
}

export const dungeons: Dungeon[] = [
  {
    id: 'stormveil',
    name: 'Stormveil Castle',
    region: 'Stormveil',
    scope: 'Key beats and graces — not every corpse or chest.',
    steps: [
      { id: 'sv1', do: 'Enter Stormveil by the Castleward Tunnel', detail: 'The gate route past the ballistae. The first grace inside is Castleward Tunnel.', factId: 'grace:castleward', module: 'map', graceId: 'grace:castleward' },
      { id: 'sv2', do: 'Beat Margit, the Fell Omen', detail: 'The gatehouse boss. Summon signs before the fog gate.', factId: 'boss:margit', module: 'map' },
      { id: 'sv3', do: 'Rest at the Rampart Tower', detail: 'Inside the castle proper, past the crossbowmen and the rooftop path.', factId: 'grace:rampart-tower', module: 'map', graceId: 'grace:rampart-tower' },
      { id: 'sv4', do: 'Meet Nepheli Loux before the lift', detail: 'A side room past the Stormhawks. Exhaust her dialogue to unlock her summon for Godrick.', factId: 'quest:nepheli:met', module: 'quests' },
      { id: 'sv5', do: 'Recover the Chrysalids’ Memento', detail: 'On the grafted corpses in the grafting grounds, just before Godrick’s fog gate.', factId: 'item:chrysalids-memento', module: 'codex' },
      { id: 'sv6', do: 'Rest at the Godrick the Grafted grace', detail: 'The grace inside the boss arena, before you commit to the fight.', factId: 'grace:godrick-grace', module: 'map', graceId: 'grace:godrick-grace' },
      { id: 'sv7', do: 'Beat Godrick the Grafted', detail: 'The castle lord. His remembrance is the real reward.', factId: 'boss:godrick', module: 'map' },
      { id: 'sv8', do: 'Trade the Remembrance of the Grafted at Enia', detail: 'Finger Reader Enia at the Roundtable trades it for the Grafted Dragon or Godrick’s Axe.', factId: 'item:remembrance-grafted', module: 'codex' },
    ],
  },
]

export type DungeonPlan = {
  done: DungeonStep[]
  current?: DungeonStep
  todo: DungeonStep[]
  total: number
}

export function stepKnown(character: Character, step: DungeonStep): boolean {
  return knownFactIds(character).has(canonicalFactId(step.factId))
}

export function dungeonPlan(character: Character, dungeon: Dungeon): DungeonPlan {
  const have = knownFactIds(character)
  const done = dungeon.steps.filter((s) => have.has(canonicalFactId(s.factId)))
  const todo = dungeon.steps.filter((s) => !have.has(canonicalFactId(s.factId)))
  return { done, current: todo[0], todo, total: dungeon.steps.length }
}

/** True only when the beat points at a grace that actually exists as a warp. */
export function dungeonGrace(step: DungeonStep) {
  return step.graceId ? warpGraces.find((g) => g.id === step.graceId) : undefined
}
