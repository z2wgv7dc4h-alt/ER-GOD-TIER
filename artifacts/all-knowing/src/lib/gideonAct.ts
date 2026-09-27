import type { Character, GearSlot, LoadoutSlot } from '../types'
import { canonicalFactId } from './aliases'
import { entityName, getEntity, resolveEntityId } from './entityGraph'
import type { GideonAction } from './gideon'
import { clearFact } from './infer'
import { nextMoves } from './links'
import { lockoutWarningsFor, type LockWarning } from './lockWarnings'
import { planQuickLog } from './quickLog'

/**
 * Task 101 — the pure half of grounded Gideon answers.
 *
 * `say` markers (`[[id]]` / `[[id|label]]`) become link segments for the
 * renderer; action chips and their labels come from `describeAction`; and
 * `applyGideonActions` turns a set of proposed actions into the next character
 * (via the existing quick-log/inference engine). Nothing here is React, so both
 * the model path and the deterministic router render and apply identically.
 */

export type SaySegment =
  | { type: 'text'; text: string }
  | { type: 'link'; id: string; label?: string }

const MARKER = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/**
 * Split a `say` string into text and link segments. A marker whose id does not
 * resolve renders as plain text (its label, or the raw id), never a dead link.
 */
export function parseSayMarkers(say: string): SaySegment[] {
  const out: SaySegment[] = []
  let last = 0
  for (const m of say.matchAll(MARKER)) {
    const index = m.index ?? 0
    if (index > last) out.push({ type: 'text', text: say.slice(last, index) })
    const rawId = (m[1] ?? '').trim()
    const label = (m[2] ?? '').trim()
    const id = resolveEntityId(rawId)
    if (id) out.push({ type: 'link', id, label: label || undefined })
    else out.push({ type: 'text', text: label || rawId })
    last = index + m[0].length
  }
  if (last < say.length) out.push({ type: 'text', text: say.slice(last) })
  return out.length ? out : [{ type: 'text', text: say }]
}

/** The resolved ids inlined in `say`, for the renderer's "Mentioned" row. */
export function inlineIds(say: string): string[] {
  const ids: string[] = []
  for (const seg of parseSayMarkers(say)) {
    if (seg.type === 'link' && !ids.includes(seg.id)) ids.push(seg.id)
  }
  return ids
}

/** A fact id referenced by an action, for chip labels / presentation. */
export function actionIds(action: GideonAction): string[] {
  if ('ids' in action) return action.ids
  if ('id' in action) return [action.id]
  return []
}

/** True for actions that mutate the character rather than just navigate. */
export function isCharacterAction(action: GideonAction): boolean {
  return action.type !== 'showOnMap' && action.type !== 'open'
}

/** A confirm-chip label naming the real entities, e.g. "Mark Margit done". */
export function describeAction(action: GideonAction): string {
  switch (action.type) {
    case 'markDone':
      return `Mark ${action.ids.map(entityName).join(', ')} done`
    case 'markNotDone':
      return `Un-mark ${action.ids.map(entityName).join(', ')}`
    case 'addOwned':
      return `Add ${action.ids.map(entityName).join(', ')} to owned`
    case 'removeOwned':
      return `Remove ${action.ids.map(entityName).join(', ')} from owned`
    case 'setGoal':
      return `Set goal: ${entityName(action.id)}`
    case 'equip':
      return `Equip ${entityName(action.id)}`
    case 'setStats':
      return `Apply stats${action.level != null ? ` · Lv ${action.level}` : ''}`
    case 'showOnMap':
      return `Show ${entityName(action.id)} on map`
    case 'open':
      return `Open ${entityName(action.id)}`
  }
}

function equipKind(id: string): LoadoutSlot['kind'] {
  switch (getEntity(id).kind) {
    case 'weapon':
      return 'armament'
    case 'shield':
      return 'shield'
    case 'armor':
      return 'armor'
    case 'talisman':
      return 'talisman'
    case 'spell':
      return 'spell'
    case 'ash':
      return 'ash'
    default:
      return 'armament'
  }
}

function equip(character: Character, slot: string, id: string): Character {
  const entity = getEntity(id)
  const row: LoadoutSlot = { id: entity.id, name: entity.name, kind: equipKind(id) }
  const idx = character.loadout.findIndex((s) => s.slot === slot)
  const loadout = [...character.loadout]
  if (idx >= 0) loadout[idx] = { ...loadout[idx], ...row, slot: slot as GearSlot }
  else loadout.push({ ...row, slot: slot as GearSlot })
  return { ...character, loadout }
}

export type ApplyResult = {
  character: Character
  /** Positive ids applied (markDone / addOwned). */
  applied: string[]
  /** Ids cleared (markNotDone / removeOwned). */
  removed: string[]
  /** Facts inference added on its own because of the applied ids. */
  inferred: string[]
  /** What to chase next, from the existing graph walk. */
  next: string[]
  /** Non-empty when applying would foreclose a line (Task 50 gate prompt). */
  warnings: LockWarning[]
}

/**
 * Apply proposed actions to a character. Positive marks run through the shared
 * quick-log engine so inference and "unlocked / next" come from the one place;
 * removes clear the fact; setGoal/setStats/equip write the sheet directly. The
 * caller decides *when* to call this (after a lockout confirm).
 */
export function applyGideonActions(character: Character, actions: GideonAction[], detail = 'Gideon applied'): ApplyResult {
  const positives = actions
    .filter((a) => a.type === 'markDone' || a.type === 'addOwned')
    .flatMap((a) => (a as { ids: string[] }).ids)
  const negatives = actions
    .filter((a) => a.type === 'markNotDone' || a.type === 'removeOwned')
    .flatMap((a) => (a as { ids: string[] }).ids)

  const warnings = lockoutWarningsFor(character, positives)
  const base = positives.length ? planQuickLog(character, positives, detail) : null
  let next = base ? base.character : character

  for (const id of negatives) next = clearFact(next, canonicalFactId(id))

  for (const action of actions) {
    if (action.type === 'setGoal') {
      next = { ...next, answers: { ...next.answers, gideonGoal: action.id } }
    } else if (action.type === 'setStats') {
      next = {
        ...next,
        stats: { ...next.stats, ...action.stats },
        level: action.level ?? next.level,
      }
    } else if (action.type === 'equip') {
      next = equip(next, action.slot, action.id)
    }
  }

  return {
    character: next,
    applied: base?.applied ?? [],
    removed: negatives.map((id) => canonicalFactId(id)),
    inferred: base ? base.inferred.map((t) => t.id) : [],
    next: base ? base.next.map((t) => t.id) : nextMoves(next, 3).map((m) => m.id),
    warnings,
  }
}

/** A short follow-up line after an apply: what unlocked, what is next. */
export function applyFollowUp(result: ApplyResult): string {
  const parts: string[] = []
  if (result.applied.length) parts.push(`Applied ${result.applied.map(entityName).join(', ')}.`)
  if (result.removed.length) parts.push(`Cleared ${result.removed.map(entityName).join(', ')}.`)
  if (result.inferred.length) parts.push(`Unlocked: ${result.inferred.map(entityName).join(', ')}.`)
  if (result.next.length) parts.push(`Next: ${result.next.map(entityName).join(', ')}.`)
  return parts.join(' ')
}
