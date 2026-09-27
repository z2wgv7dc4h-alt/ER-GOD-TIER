import { matchMany } from '../knowledge/catalog'
import { findBossPin } from '../knowledge/bossPins'
import { matchLoot } from '../knowledge/loot'
import type { Section, Sub } from '../types'
import { matchAllWarps, matchGeneratedAliases } from './aliases'
import { SECTIONS, defaultSub } from './sections'
import { searchSync, type SearchHit } from './search'

/**
 * Task 99 — the one omnibox classifier.
 *
 * `docs/USAGE-MODEL.md` §2: the header search (and the quick-log sheet) asks one
 * pure question of the typed text — is it a **log report**, a **question**, a
 * **command**, or an **entity search**? The UI then renders the matching rows
 * grouped as Do · Things · Ask. This module is pure data-in/decision-out: no
 * React, no character mutation, so the phrasing table is unit-testable on its own.
 *
 * `DONE_REPORT` lives here now and `gideon.ts` imports it, so the router and the
 * omnibox share exactly one definition of "the player is reporting a completion".
 */

/**
 * Completion reports. `beat` alone is deliberately excluded unless it has a
 * completion auxiliary ('ve/have) or `just` in front: "beat" is its own past
 * tense in English, so a bare "I beat" is indistinguishable from "how do I beat
 * X". "beaten", "killed", "defeated", "finished", "cleared", and "done" are
 * unambiguous past tense on their own.
 */
export const DONE_REPORT = /\b(i(?:'ve| have) (?:done|beat(?:en)?|killed|defeated|finished|cleared)|i (?:beaten|killed|defeated|finished|cleared|done)\b|just (?:beat(?:en)?|killed|defeated|finished|cleared))\b/

/** The log verbs the quick log understands. First match wins. */
export type LogVerb =
  | 'killed'
  | 'beat'
  | 'defeated'
  | 'got'
  | 'found'
  | 'picked up'
  | 'bought'
  | 'rested at'
  | 'reached'
  | 'gave'
  | 'talked to'
  | 'finished'
  | 'logged'

const LOG_VERBS: { re: RegExp; verb: LogVerb }[] = [
  { re: /\b(gave|give|handed|hand over|handed over)\b/i, verb: 'gave' },
  { re: /\b(talked to|spoke to|spoke with)\b/i, verb: 'talked to' },
  { re: /\b(picked up|pick up)\b/i, verb: 'picked up' },
  { re: /\b(rested at|rest at)\b/i, verb: 'rested at' },
  { re: /\b(reached|arrived at)\b/i, verb: 'reached' },
  { re: /\b(bought|purchased)\b/i, verb: 'bought' },
  { re: /\b(killed|slew|slain|kill|fight|fought)\b/i, verb: 'killed' },
  { re: /\b(beat|beaten|defeated|defeat)\b/i, verb: 'beat' },
  { re: /\b(found|discovered)\b/i, verb: 'found' },
  { re: /\b(got|obtained|acquired|picked)\b/i, verb: 'got' },
  { re: /\b(finished|completed|cleared|done)\b/i, verb: 'finished' },
  { re: /\b(logged?|log)\b/i, verb: 'logged' },
]

const QUESTION_START =
  /^\s*(where|how|what|why|should|best|which|who|whose|when|whether|can i|can you|can we|do i|does|did i|is |are |am i|will |would |could |have i|may i)\b/i
const QUESTION_ANY =
  /\b(what now|what next|what should i|what do i|what to do|how do i|how to|where do i|where is|where are|should i|can i|best\b.*\b(build|weapon|boss|item)|what am i|what did i miss)\b/i

export type OmniboxTarget = { id: string; name: string }

export type OmniboxCommand = {
  id: string
  label: string
  section: Section
  sub: Sub | null
  /** `glance` is the fast, chrome-free map view (Usage model moment 15). */
  glance?: boolean
}

export type OmniboxLog = {
  kind: 'log'
  text: string
  verb: LogVerb
  targets: OmniboxTarget[]
  factIds: string[]
}

export type OmniboxQuestion = { kind: 'question'; text: string }

export type OmniboxCommandResult = { kind: 'command'; text: string; command: OmniboxCommand }

export type OmniboxEntity = { kind: 'entity'; text: string; hits: SearchHit[] }

export type OmniboxResult = OmniboxLog | OmniboxQuestion | OmniboxCommandResult | OmniboxEntity

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

let cachedCommands: { command: OmniboxCommand; alias: string }[] | null = null

function commandTable(): { command: OmniboxCommand; alias: string }[] {
  if (cachedCommands) return cachedCommands
  const out: { command: OmniboxCommand; alias: string }[] = []
  const seen = new Set<string>()
  const add = (command: OmniboxCommand, aliases: string[]) => {
    for (const alias of aliases) {
      const key = norm(alias)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push({ command, alias: key })
    }
  }

  for (const section of SECTIONS) {
    const sub = defaultSub(section.id)
    add({ id: `go:${section.id}`, label: section.label, section: section.id, sub }, [section.label])
    for (const view of section.subs) {
      add(
        { id: `go:${section.id}:${view.id}`, label: view.label, section: section.id, sub: view.id },
        [view.label, `${section.label} ${view.label}`],
      )
    }
  }

  add({ id: 'go:me:setup', label: 'Setup', section: 'me', sub: 'setup' }, ['setup', 'set up'])
  add({ id: 'go:journey:map', label: 'Map', section: 'journey', sub: 'map' }, ['map'])
  add({ id: 'go:journey:map:glance', label: 'Glance', section: 'journey', sub: 'map', glance: true }, [
    'glance',
    'glance mode',
  ])

  cachedCommands = out
  return out
}

/** Every section, sub-view, and named shortcut, as exact-match commands. */
export function omniboxCommands(): OmniboxCommand[] {
  const seen = new Set<string>()
  const out: OmniboxCommand[] = []
  for (const { command } of commandTable()) {
    if (seen.has(command.id)) continue
    seen.add(command.id)
    out.push(command)
  }
  return out
}

/** The command a query names exactly, if any. Never fuzzy-matches an entity. */
export function matchCommand(text: string): OmniboxCommand | undefined {
  const n = norm(text)
  if (!n) return undefined
  return commandTable().find((entry) => entry.alias === n)?.command
}

// ---------------------------------------------------------------------------
// Log targets
// ---------------------------------------------------------------------------

/**
 * Resolve the entity names inside a log statement. Reuses the same sources the
 * search palette already trusts (`matchMany` + the alias plane + warp/boss pins
 * + loot), so a logged name is one the rest of the app can open.
 */
export function resolveOmniboxTargets(text: string): OmniboxTarget[] {
  const out: OmniboxTarget[] = []
  const seen = new Set<string>()
  const push = (id: string, name: string) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    out.push({ id, name })
  }
  for (const f of matchMany(text)) push(f.id, f.name)
  for (const g of matchAllWarps(text)) push(g.id, g.name)
  for (const b of matchLoot(text)) push(b.id, b.name)
  for (const a of matchGeneratedAliases(text)) push(a.slug, a.fmgName)
  const boss = findBossPin(text)
  if (boss) push(boss.id, boss.name)
  return out
}

/** The log verb in the text, if any (first specific match wins). */
export function logVerbOf(text: string): LogVerb | undefined {
  return LOG_VERBS.find((v) => v.re.test(text))?.verb
}

function isQuestion(text: string): boolean {
  if (/\?\s*$/.test(text)) return true
  if (QUESTION_START.test(text)) return true
  return QUESTION_ANY.test(text)
}

// ---------------------------------------------------------------------------
// Classify
// ---------------------------------------------------------------------------

/**
 * The one classifier. Command > completion report > question > log verb >
 * entity search, in that order, so "how do I beat Margit" stays a question and
 * "killed Margit" stays a log.
 */
export function classify(raw: string): OmniboxResult {
  const text = raw.trim()
  if (!text) return { kind: 'entity', text, hits: [] }

  const command = matchCommand(text)
  if (command) return { kind: 'command', text, command }

  if (DONE_REPORT.test(text.toLowerCase())) {
    const targets = resolveOmniboxTargets(text)
    if (targets.length) {
      return { kind: 'log', text, verb: logVerbOf(text) ?? 'finished', targets, factIds: targets.map((t) => t.id) }
    }
    // A report we cannot resolve is a question back to the player.
    return { kind: 'question', text }
  }

  if (isQuestion(text)) return { kind: 'question', text }

  const verb = logVerbOf(text)
  if (verb) {
    const targets = resolveOmniboxTargets(text)
    if (targets.length) return { kind: 'log', text, verb, targets, factIds: targets.map((t) => t.id) }
  }

  return { kind: 'entity', text, hits: searchSync(text) }
}
