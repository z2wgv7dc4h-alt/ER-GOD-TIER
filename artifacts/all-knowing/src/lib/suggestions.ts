import { approachingGates } from '../knowledge/gates'
import { stillAvailable } from '../knowledge/storylines'
import type { Character, ModuleId } from '../types'
import { coopAvoids, isCoop } from './coop'
import { labelOf, moduleFor, nextMoves } from './links'
import { currentRegion, leftovers } from './leftovers'
import { regionLeftovers } from './regionLeftovers'

/**
 * Proactive next-action suggestions for Gideon (Task 42). Presentation only:
 * every entry is derived from data that already exists for *this* character —
 * `stillAvailable()`, `approachingGates()`, `nextMoves()` and `leftovers()` — and
 * each carries a `prompt` that goes through the existing `askGideon`/`run()` path
 * (the same shape as `GideonAct.offer`). No new matcher, no router changes.
 */
export type Suggestion = {
  id: string
  label: string
  /** Ask this through the existing Gideon flow. */
  prompt: string
  /** Optional pin the caller can navigate to directly. */
  factId?: string
  module?: ModuleId
  /** Where it came from, for grouping/debug. */
  source: 'line' | 'gate' | 'move' | 'leftover'
}

export function idleSuggestions(character: Character, limit = 3): Suggestion[] {
  const out: Suggestion[] = []
  const seen = new Set<string>()
  const push = (s: Suggestion) => {
    if (seen.has(s.id)) return
    seen.add(s.id)
    out.push(s)
  }

  // 1. The next unbeaten beat of the lines already in progress. The shared
  //    Ranni/stars step array appears under two line ids, so dedupe by the step's
  //    fact id rather than the line name.
  const survey = stillAvailable(character)
  let lineBeats = 0
  for (const row of [...survey.active, ...survey.open]) {
    const step = row.current
    if (!step) continue
    const key = step.factId || `step:${step.id}`
    const before = out.length
    push({
      id: `line:${key}`,
      label: `${row.line.name}: ${step.do}`,
      prompt: `I want to continue ${row.line.name}. What do I do next?`,
      factId: step.factId,
      module: step.module,
      source: 'line',
    })
    if (out.length > before) lineBeats += 1
    if (lineBeats >= 2) break
  }

  // 2. A world-state gate the character is one beat away from.
  for (const gate of approachingGates(character)) {
    push({
      id: gate.id,
      label: `Before it locks — ${gate.name}`,
      prompt: 'if I keep going, what do I miss?',
      source: 'gate',
    })
  }

  // 2b. Region-scoped "missed here" chip when the current region is known
  //     (Task 75). Same helper the Gideon intent answers with.
  const region = currentRegion(character)
  if (region) {
    const top = regionLeftovers(character, region, 1).items[0]
    if (top) {
      push({
        id: `region:${region}:${top.id}`,
        label: `Missed in ${region}: ${top.name}`,
        prompt: `what did I miss in ${region}`,
        factId: top.id,
        module: top.source === 'line' ? undefined : 'map',
        source: 'leftover',
      })
    }
  }

  // 3. Facts one step past what this character already proved.
  for (const move of nextMoves(character, 4)) {
    push({
      id: `move:${move.id}`,
      label: `Next: ${labelOf(move.id)}`,
      prompt: `where is ${labelOf(move.id)}`,
      factId: move.id,
      module: moduleFor(move.id),
      source: 'move',
    })
  }

  // 4. A nearby outstanding item for the current region.
  for (const entry of leftovers(character)) {
    push({
      id: `leftover:${entry.id}`,
      label: `Nearby: ${entry.name}`,
      prompt: `where is ${entry.name}`,
      factId: entry.grace,
      module: 'map',
      source: 'leftover',
    })
  }

  // Task 81: co-op players get no solo summon tools.
  const shown = isCoop(character)
    ? out.filter((s) => !coopAvoids(character, s.id, s.label, s.prompt))
    : out
  return shown.slice(0, limit)
}
