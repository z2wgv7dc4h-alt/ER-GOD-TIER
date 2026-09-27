import { byId, facts, type Fact } from '../knowledge/catalog'
import { warpGraces } from '../knowledge/graces'
import { inferChains } from '../knowledge/inferChains'
import { remembrances } from '../knowledge/remembrances'
import type { Character } from '../types'
import { canonicalFactId } from './aliases'
import { clearFact, knownFactIds } from './infer'
import { GEAR_SLOT_COUNT } from './gearSheet'
import { labelOf } from './links'

/**
 * Task 94 — Set up my Tarnished. The wizard's pure logic: the step list, the
 * vault-backed resume point, "what we learned" per step, the inference reason
 * chain the Review step shows, the per-category completeness meter, and the
 * boss / questline groupings the checklist renders.
 *
 * The resume point rides on `character.answers.setupStep`, which is part of the
 * profile the vault persists — no new storage layer.
 */

export type SetupStepId = 'status' | 'equipment' | 'inventory' | 'graces' | 'bosses' | 'review'

export type SetupStep = {
  id: SetupStepId
  label: string
  blurb: string
}

export const setupSteps: SetupStep[] = [
  { id: 'status', label: 'Status', blurb: 'Level, the eight stats and your starting class.' },
  { id: 'equipment', label: 'Equipment', blurb: 'What you are wearing right now.' },
  { id: 'inventory', label: 'Inventory', blurb: 'Key items, Great Runes and the pages only you can see.' },
  { id: 'graces', label: 'Map & graces', blurb: 'The warp list or map that shows how far the world is open.' },
  { id: 'bosses', label: 'Bosses & progress', blurb: 'The fights that matter and the NPC beats.' },
  { id: 'review', label: 'Review', blurb: 'Everything we inferred, with the reason — remove anything wrong.' },
]

const STEP_IDS = setupSteps.map((s) => s.id)

export function isSetupStep(value: unknown): value is SetupStepId {
  return typeof value === 'string' && (STEP_IDS as string[]).includes(value)
}

/** The step the vault last left the player on (defaults to the first). */
export function readSetupStep(character: Character): SetupStepId {
  const value = character.answers.setupStep
  return isSetupStep(value) ? value : 'status'
}

/** Return a character with the resume step recorded in the vault-backed answers. */
export function withSetupStep(character: Character, step: SetupStepId): Character {
  return { ...character, answers: { ...character.answers, setupStep: step } }
}

export function setupStepIndex(step: SetupStepId): number {
  const i = STEP_IDS.indexOf(step)
  return i < 0 ? 0 : i
}

export function nextSetupStep(step: SetupStepId): SetupStepId {
  return STEP_IDS[Math.min(setupStepIndex(step) + 1, STEP_IDS.length - 1)]
}

export function previousSetupStep(step: SetupStepId): SetupStepId {
  return STEP_IDS[Math.max(setupStepIndex(step) - 1, 0)]
}

/**
 * "What we learned" for one step: every fact whose evidence was recorded with
 * that step's detail tag, plus the live status/equipment summary that never
 * needs a receipt.
 */
export function stepLearnings(character: Character, step: SetupStepId): string[] {
  const out: string[] = []
  if (step === 'status') {
    const known = Object.entries(character.stats).filter(([, v]) => v > 1).length
    if (character.level > 1) out.push(`Level ${character.level}`)
    out.push(`${known}/8 stats on the grid`)
    if (character.startingClass !== 'unknown') out.push(character.startingClass.replace('-', ' '))
  }
  if (step === 'equipment' && character.loadout.length) {
    out.push(`${character.loadout.length} equipped piece${character.loadout.length === 1 ? '' : 's'}`)
  }
  for (const e of character.evidence) {
    if (e.detail?.includes(`setup:${step}`)) out.push(labelOf(e.fact))
  }
  return [...new Set(out)]
}

export type InferredFact = {
  fact: string
  /** The known fact this was derived from, when a rule names one. */
  from?: string
  why: string
}

/**
 * Every fact the app inferred (never a direct read) with the reason chain.
 * A rule chain (`inferChains`) is preferred over the catalog edge, and both are
 * preferred over the raw "implied by" evidence detail.
 */
export function inferenceReasons(character: Character): InferredFact[] {
  const known = knownFactIds(character)
  const inferred = [...new Set(character.evidence.filter((e) => e.source === 'inference').map((e) => e.fact))]
  const out: InferredFact[] = []
  for (const to of inferred) {
    const target = canonicalFactId(to)
    let hit: InferredFact | undefined
    for (const chain of inferChains) {
      if (!chain.implies.some((x) => canonicalFactId(x) === target)) continue
      if (!known.has(canonicalFactId(chain.whenFact))) continue
      if (chain.allOf?.some((x) => !known.has(canonicalFactId(x)))) continue
      if (chain.unless?.some((x) => known.has(canonicalFactId(x)))) continue
      hit = { fact: to, from: chain.whenFact, why: chain.why }
      break
    }
    if (!hit) {
      for (const f of facts) {
        if (!known.has(canonicalFactId(f.id))) continue
        if (f.implies.some((x) => canonicalFactId(x) === target)) {
          hit = { fact: to, from: f.id, why: `${f.name} requires ${labelOf(to)}.` }
          break
        }
      }
    }
    if (!hit) {
      const e = character.evidence.find((ev) => ev.fact === to && ev.source === 'inference')
      hit = { fact: to, why: e?.detail?.replace(/^implied by\s*/i, 'implied by ') ?? 'inferred from what you already had.' }
    }
    out.push(hit)
  }
  return out.sort((a, b) => labelOf(a.fact).localeCompare(labelOf(b.fact)))
}

/** Drop an inferred fact (and its evidence) without touching a direct read of the same id. */
export function removeInferredFact(character: Character, fact: string): Character {
  return clearFact(character, fact)
}

export type CompletenessCategory = {
  id: 'stats' | 'gear' | 'inventory' | 'graces' | 'bosses' | 'quests'
  label: string
  have: number
  total: number
  step: SetupStepId
}

const countKind = (kind: string) => facts.filter((f) => f.kind === kind).length

export function completeness(character: Character): CompletenessCategory[] {
  const statKnown = character.level > 1 || character.evidence.some((e) => e.detail?.includes('setup:status'))
  return [
    { id: 'stats', label: 'Stats', have: statKnown ? 1 : 0, total: 1, step: 'status' },
    { id: 'gear', label: 'Gear', have: Math.min(character.loadout.length, GEAR_SLOT_COUNT), total: GEAR_SLOT_COUNT, step: 'equipment' },
    { id: 'inventory', label: 'Inventory', have: character.collectedItems.length, total: countKind('item'), step: 'inventory' },
    { id: 'graces', label: 'Graces', have: character.discoveredGraces.length, total: warpGraces.length, step: 'graces' },
    { id: 'bosses', label: 'Bosses', have: character.defeatedBosses.length, total: countKind('boss'), step: 'bosses' },
    { id: 'quests', label: 'Quests', have: character.completedQuestSteps.length, total: countKind('quest'), step: 'bosses' },
  ]
}

/** The step with the lowest completion ratio — where Overview sends the player. */
export function weakestStep(character: Character): SetupStepId {
  const rows = completeness(character)
  let weakest = rows[0]
  let lowest = Number.POSITIVE_INFINITY
  for (const row of rows) {
    const ratio = row.total > 0 ? row.have / row.total : 1
    if (ratio < lowest) {
      lowest = ratio
      weakest = row
    }
  }
  return weakest.step
}

export type BossGroup = { region: string; bosses: Fact[] }

/** Boss facts grouped by region, remembrance/shardbearer fights first. */
export function bossGroups(): BossGroup[] {
  const major = new Set(remembrances.map((r) => r.bossFactId).filter((x): x is string => Boolean(x)))
  const groups = new Map<string, Fact[]>()
  for (const f of facts) {
    if (f.kind !== 'boss') continue
    const list = groups.get(f.region) ?? []
    list.push(f)
    groups.set(f.region, list)
  }
  return [...groups.entries()]
    .map(([region, list]) => ({
      region,
      bosses: list.sort((a, b) => {
        const am = major.has(a.id) ? 0 : 1
        const bm = major.has(b.id) ? 0 : 1
        return am !== bm ? am - bm : a.name.localeCompare(b.name)
      }),
    }))
    .sort((a, b) => a.region.localeCompare(b.region))
}

export function isMajorBoss(id: string): boolean {
  return remembrances.some((r) => r.bossFactId === id)
}

export type QuestLineGroup = { line: string; label: string; beats: Fact[] }

/** Questline beats grouped by NPC line (the middle segment of `quest:<line>:…`). */
export function questLineGroups(): QuestLineGroup[] {
  const groups = new Map<string, Fact[]>()
  for (const f of facts) {
    if (f.kind !== 'quest') continue
    const line = f.id.split(':')[1] ?? 'other'
    const list = groups.get(line) ?? []
    list.push(f)
    groups.set(line, list)
  }
  return [...groups.entries()]
    .map(([line, beats]) => ({
      line,
      label: line.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      beats: beats.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => b.beats.length - a.beats.length)
}

/** Facts a boss row implies, for the checklist's "why" hint. */
export function factName(id: string): string {
  return byId.get(id)?.name ?? labelOf(id)
}
