import { opBuilds, type OpBuild } from '../knowledge/builds'
import { pvpBuilds, pvpMatchups } from '../knowledge/pvp'
import { techTips } from '../knowledge/tech'
import { planRoute, type EndingRoute } from '../knowledge/endings'
import { medusaChapters } from '../knowledge/medusa'
import { allLines, findLine, findNpcLine, npcLines, stillAvailable, type Line } from '../knowledge/storylines'
import { approachingGates, findGate, gateState, triggeredGates } from '../knowledge/gates'
import { byId, facts, matchMany } from '../knowledge/catalog'
import { matchLoot } from '../knowledge/loot'
import { fieldHunts } from '../knowledge/completion'
import { findBossPin } from '../knowledge/bossPins'
import { mapFragments, scadutreeFragments } from '../knowledge/collectibles'
import { findSellers, merchants } from '../knowledge/merchants'
import { remembrances, findRemembrance } from '../knowledge/remembrances'
import { matchConditionalStock } from '../knowledge/merchantConditions'
import { missables } from '../knowledge/missables'
import { matchAllWarps, matchGeneratedAliases } from './aliases'
import { searchSync } from './search'
import { labelOf, moduleFor, nextMoves } from './links'
import { applyFacts, summarize } from './infer'
import {
  bossCombatFor,
  cachedBossCombat,
  damageTypeLabels,
  damageTypes,
  loadBossCombat,
  type BossCombat,
} from './enemy'
import { factState } from '../state'
import { callGideonLlm, hasGideonKey } from './muse'
import { buildGrounding, gideonMessages, validateGideonAct } from './gideonLlm'
import { buildHunt } from './buildHunt'
import type { Character, ModuleId } from '../types'

export type GideonAct = {
  say: string
  module?: ModuleId
  factId?: string
  buildId?: string
  offer?: { label: string; prompt: string }
  goal?: string
  navigateNow?: boolean
  /**
   * Fact ids the router determined the player just reported as true (e.g.
   * "I killed Margit"), not merely asked about. The caller must actually
   * apply these (applyFacts) — the router itself is pure and cannot mutate
   * the character, it only computes its "what next" answer as if they were
   * already applied.
   */
  markDone?: string[]
  /**
   * Loot ids the router wants added to the character's watchlist (the Task 33
   * leftovers layer). Used by the build-hunt "show the X kit" answer so the
   * missing pieces appear as pins without marking them collected. The caller
   * mutates via `toggleWatch`; the router itself stays pure.
   */
  watch?: string[]
}

export type GideonMemory = {
  goalId?: string
  lastFact?: string
  lastModule?: ModuleId
}

function routeById(id: string) {
  return allLines.find((e) => e.id === id)
}

/**
 * Keyword → build id for the deterministic build branch. First match wins, so
 * more specific patterns come first. Covers the original six plus the Task 40
 * additions; an unmatched build question falls back to `opBuilds[0]`.
 */
const BUILD_ROUTES: { re: RegExp; id: string }[] = [
  { re: /\b(bleed|river|rob)\b/, id: 'build:rivers' },
  { re: /\b(azur|comet)\b/, id: 'build:azur' },
  { re: /\b(blasphem)/, id: 'build:blasphemous' },
  { re: /\b(night comet)\b/, id: 'build:night-comet' },
  { re: /\b(leont|matador)\b/, id: 'build:leontiel' },
  { re: /\b(heavy|bonk)\b/, id: 'build:heavy-bonk' },
  { re: /\b(strength|colossal|lion)/, id: 'build:greatsword-lions-claw' },
  { re: /\b(dark moon|moonlight)\b/, id: 'build:dark-moon' },
  { re: /\bmoonveil\b/, id: 'build:moonveil' },
  { re: /\b(black ?flame|godslayer|incant)\b/, id: 'build:blackflame' },
  { re: /\bfaith\b/, id: 'build:blackflame' },
  { re: /\b(dragon|communion)\b/, id: 'build:dragon-communion' },
  { re: /\b(gransax|lightning|sniper)\b/, id: 'build:bolt-gransax' },
  { re: /\b(twinblade|status|frost)\b/, id: 'build:frost-bleed' },
  { re: /\b(shield|poke|tank|greatshield)\b/, id: 'build:greatshield-poke' },
  { re: /\b(int|intelligence|sorcer|mage)\b/, id: 'build:dark-moon' },
]

function speakPlan(character: Character, route: EndingRoute): GideonAct {
  const plan = planRoute(character, route)
  if (plan.locked) {
    return {
      say: `${route.name} looks locked on this character. ${plan.locked} We can still chase another ending.`,
      module: 'quests',
      goal: route.id,
    }
  }
  if (!plan.current) {
    if (plan.foreclosed.length || plan.blocked.length) {
      const fore = plan.foreclosed.map((s) => s.do).join('; ')
      const gate = plan.blocked.map((s) => s.do).join('; ')
      return {
        say: `${route.name} has no reachable beat left on this character.${fore ? ` Foreclosed: ${fore}.` : ''}${gate ? ` Blocked until earlier beats are done: ${gate}.` : ''}`,
        module: 'quests',
        goal: route.id,
      }
    }
    return {
      say: `${route.name} — every seeded beat is ticked. Go to the Elden Beast and pick the matching sign or rune.`,
      module: 'map',
      factId: 'boss:radagon',
      goal: route.id,
    }
  }
  const extra = plan.detours.length ? ` ${plan.detours.join(' ')}` : ''
  const later = plan.todo.slice(1, 3).map((s) => s.do)
  const tail = later.length ? ` After that: ${later.join('; ')}.` : ''
  const kind = 'kind' in route ? String((route as { kind?: string }).kind) : 'ending'
  const warn = plan.gateWarning ? `${plan.gateWarning} ` : ''
  return {
    say: `${warn}${route.name} (${kind}) is still open (${plan.done.length}/${plan.total}). Next: ${plan.current.do}. ${plan.current.detail}${extra}${tail} Want the map pin and the short instruction list?`,
    module: 'quests',
    factId: plan.current.factId,
    goal: route.id,
    offer: { label: 'Show it', prompt: 'yes show me on the map and give instructions' },
  }
}

/** Qualitative read of a NpcParam status resistance: lower means easier to inflict. */
function resistTag(value: number): string {
  if (value >= 500) return 'immune'
  if (value <= 154) return 'soft'
  return 'hard'
}

/**
 * Turn real NpcParam negation/resist values into one short line of advice plus a
 * build-sheet action. Deliberately terse — Gideon offers a sheet, not a stat dump.
 */
function bossResistAdvice(boss: BossCombat): { line: string; sheet: string; offer: { label: string; prompt: string } } {
  const weak = damageTypes
    .filter((t) => boss.negation[t] < 0)
    .sort((a, b) => boss.negation[a] - boss.negation[b])
  const resist = damageTypes
    .filter((t) => boss.negation[t] > 0)
    .sort((a, b) => boss.negation[b] - boss.negation[a])

  const bits: string[] = []
  if (weak.length) bits.push(`weak to ${weak.map((t) => damageTypeLabels[t]).join('/')}`)
  if (resist.length) {
    bits.push(`resists ${resist.slice(0, 3).map((t) => `${damageTypeLabels[t]} ${boss.negation[t]}%`).join(', ')}`)
  }
  if (!bits.length) bits.push('even across damage types')
  const bleed = boss.resist.bleed
  bits.push(`bleed ${resistTag(bleed)} (${bleed})`)
  if (boss.resist.scarletRot <= 154) bits.push('rots')

  const weakest = damageTypes.reduce((a, t) => (boss.negation[t] < boss.negation[a] ? t : a), damageTypes[0])
  const sheet = bleed <= 154
    ? 'bleed'
    : weakest === 'magic'
      ? 'comet'
      : weakest === 'holy' || weakest === 'fire'
        ? 'faith'
        : 'bonk'
  const labels: Record<string, { label: string; prompt: string }> = {
    bleed: { label: 'Bleed sheet', prompt: 'use the Rivers of Blood build' },
    comet: { label: 'Comet sheet', prompt: 'use the Comet Azur glass build' },
    faith: { label: 'Faith sheet', prompt: 'use the Blasphemous Blade build' },
    bonk: { label: 'Bonk sheet', prompt: 'use the Heavy Knight bonk build' },
  }
  return { line: `${bits.join('; ')}.`, sheet, offer: labels[sheet] }
}

/** First catalog fact whose prerequisites are already met — the honest empty-run start. */
function firstOpenFact(character: Character): string | undefined {
  const have = new Set([
    ...character.defeatedBosses,
    ...character.discoveredGraces,
    ...character.collectedItems,
    ...character.completedQuestSteps,
  ])
  const f = facts.find((x) => x.kind !== 'region' && !have.has(x.id) && x.implies.every((i) => have.has(i)))
  return f?.name
}

// ---------------------------------------------------------------------------
// Comparison handling ("is X better than Y", "X vs Y", "build A or build B")
// ---------------------------------------------------------------------------

type Comparison = { a: string; b: string; boss?: string }

/** Pull the two things being compared out of the common question shapes. */
function parseComparison(q: string): Comparison | undefined {
  const betterFor = q.match(/\b(?:is|are)\s+(.+?)\s+(?:better|worse|stronger|weaker)\s+than\s+(.+?)\s+for\s+(.+?)[?.!]*$/)
  if (betterFor) return { a: betterFor[1], b: betterFor[2], boss: betterFor[3] }
  const better = q.match(/\b(?:is|are)\s+(.+?)\s+(?:better|worse|stronger|weaker)\s+than\s+(.+?)[?.!]*$/)
  if (better) return { a: better[1], b: better[2] }
  const versusFor = q.match(/\b(?:is\s+|are\s+)?(.+?)\s+(?:vs\.?|versus)\s+(.+?)\s+for\s+(.+?)[?.!]*$/)
  if (versusFor) return { a: versusFor[1], b: versusFor[2], boss: versusFor[3] }
  const versus = q.match(/\b(?:is\s+|are\s+)?(.+?)\s+(?:vs\.?|versus)\s+(.+?)[?.!]*$/)
  if (versus) return { a: versus[1], b: versus[2] }
  const orUse = q.match(/\b(?:should i (?:use|wear|pick)|use|wear|pick)\s+(.+?)\s+or\s+(.+?)[?.!]*$/)
  if (orUse) return { a: orUse[1], b: orUse[2] }
  const either = q.match(/^(?:is\s+|are\s+)?(.+?)\s+or\s+(.+?)[?.!]*$/)
  if (either) return { a: either[1], b: either[2] }
  return undefined
}

const BUILD_KEYWORDS: [RegExp, string][] = [
  [/\b(rivers|rob|bleed|arcane|exultation)\b/, 'build:rivers'],
  [/\b(azur|comet|glass|intelligence)\b/, 'build:azur'],
  [/\b(blasphem|taker.?s flames|faith|holy)\b/, 'build:blasphemous'],
  [/\b(night comet|sellia|staff of loss)\b/, 'build:night-comet'],
  [/\b(leontiel|matador|idus)\b/, 'build:leontiel'],
  [/\b(bonk|heavy knight|giant.?crusher|anvil|cragblade)\b/, 'build:heavy-bonk'],
]

function buildFromText(text: string): OpBuild | undefined {
  const n = text.toLowerCase()
  const byName = opBuilds.find((b) => n.includes(b.name.toLowerCase()))
  if (byName) return byName
  for (const [re, id] of BUILD_KEYWORDS) {
    if (re.test(n)) return opBuilds.find((b) => b.id === id)
  }
  return undefined
}

type DamageKey = 'bleed' | 'rot' | 'poison' | 'magic' | 'fire' | 'lightning' | 'holy' | 'physical'

const DAMAGE_KEYWORDS: [RegExp, DamageKey][] = [
  [/\bbleed\w*/, 'bleed'],
  [/\b(scarlet rot|rot)\b/, 'rot'],
  [/\bpoison\w*/, 'poison'],
  [/\b(sorcer\w*|magic\w*|intelligence|\bint\b|glintstone|comet)\b/, 'magic'],
  [/\b(fire|flame\w*|blasphem\w*)\b/, 'fire'],
  [/\b(lightning|dragon cult)\b/, 'lightning'],
  [/\b(holy|faith\w*|golden order|incant\w*)\b/, 'holy'],
  [/\b(physical|strength|bonk|strike|slash|pierce)\b/, 'physical'],
]

function damageFromText(text: string): DamageKey | undefined {
  const n = text.toLowerCase()
  for (const [re, key] of DAMAGE_KEYWORDS) {
    if (re.test(n)) return key
  }
  return undefined
}

/** How well a build's target stat line matches the character's current sheet. */
function buildFit(build: OpBuild, c: Character): number {
  let fit = 0
  for (const key of Object.keys(c.stats) as (keyof typeof c.stats)[]) {
    fit += Math.min(c.stats[key], build.stats[key])
  }
  return fit
}

/**
 * Higher score = better for the player. Status resistance (0–1000, lower is
 * better) and damage negation (percent, negative is better) are on different
 * scales, so each is bucketed — soft/weak, hard/neutral, immune/resist — with
 * the raw value only breaking ties inside a bucket.
 */
const STATUS_LABELS: Record<'bleed' | 'rot' | 'poison', string> = {
  bleed: 'bleed',
  rot: 'scarlet rot',
  poison: 'poison',
}

function damageScore(boss: BossCombat, key: DamageKey): { score: number; label: string } {
  if (key === 'bleed' || key === 'rot' || key === 'poison') {
    const value = key === 'bleed' ? boss.resist.bleed : key === 'rot' ? boss.resist.scarletRot : boss.resist.poison
    const tag = resistTag(value)
    return { score: tag === 'soft' ? 3 : tag === 'hard' ? 1 : 0, label: `${STATUS_LABELS[key]} ${tag} (${value})` }
  }
  const neg = boss.negation[key]
  const label = neg > 0 ? `${damageTypeLabels[key]} ${neg}% resist` : neg < 0 ? `${damageTypeLabels[key]} ${-neg}% weak` : `${damageTypeLabels[key]} neutral`
  return { score: neg < 0 ? 3 : neg === 0 ? 2 : 0, label }
}

/**
 * A real two-sided comparison. Builds are compared against the character's
 * current stats; damage types against the named boss's real NpcParam row.
 * Returns undefined when the question is not a comparison the router can ground.
 */
function compareAct(question: string, character: Character, combat: BossCombat[]): GideonAct | undefined {
  const q = question.toLowerCase()
  const cmp = parseComparison(q)
  if (!cmp) return undefined

  const buildA = buildFromText(cmp.a)
  const buildB = buildFromText(cmp.b)
  if (buildA && buildB && buildA.id !== buildB.id) {
    const fitA = buildFit(buildA, character)
    const fitB = buildFit(buildB, character)
    const winner = fitA >= fitB ? buildA : buildB
    const loser = winner === buildA ? buildB : buildA
    const gap = Math.abs(fitA - fitB)
    return {
      say: `${buildA.name} (${buildA.tag}, L${buildA.level}) vs ${buildB.name} (${buildB.tag}, L${buildB.level}). ${buildA.why} ${buildB.why} On this sheet ${winner.name} fits better (${gap} stat points closer to its target line), but ${loser.name} is the swap if you want its payoff.`,
      module: 'build',
      buildId: winner.id,
      offer: { label: `Wear ${winner.name}`, prompt: `use the ${winner.name} build` },
    }
  }

  const dmgA = damageFromText(cmp.a)
  const dmgB = damageFromText(cmp.b)
  if (dmgA && dmgB && dmgA !== dmgB && cmp.boss) {
    const bossFact = matchMany(cmp.boss)[0]
    const boss = bossCombatFor(combat, bossFact?.id) || bossCombatFor(combat, findBossPin(cmp.boss)?.id)
    if (boss) {
      const a = damageScore(boss, dmgA)
      const b = damageScore(boss, dmgB)
      // Buckets are coarse on purpose; only call a winner when the gap is real
      // (soft/weak vs neutral, or neutral vs resisted), not hard vs resisted.
      const diff = a.score - b.score
      const winner: DamageKey | undefined = Math.abs(diff) >= 2 ? (diff > 0 ? dmgA : dmgB) : undefined
      const advice = bossResistAdvice(boss)
      const head = `${boss.name}: ${a.label} vs ${b.label}.`
      const verdict = winner
        ? `${winner === dmgA ? a.label : b.label} is the better line here — ${winner === dmgA ? b.label : a.label} is the harder ask.`
        : 'Neither is a clean win — both are resisted, so pick by the build you already have.'
      return {
        say: `${head} ${verdict} ${advice.line}`,
        module: 'build',
        factId: bossFact?.id,
        offer: advice.offer,
      }
    }
  }
  return undefined
}

/** True when `compareAct` would produce a grounded answer for this question. */
function isComparable(question: string, combat: BossCombat[]): boolean {
  const q = question.toLowerCase()
  const cmp = parseComparison(q)
  if (!cmp) return false
  const buildA = buildFromText(cmp.a)
  const buildB = buildFromText(cmp.b)
  if (buildA && buildB && buildA.id !== buildB.id) return true
  const dmgA = damageFromText(cmp.a)
  const dmgB = damageFromText(cmp.b)
  if (dmgA && dmgB && dmgA !== dmgB && cmp.boss) {
    const bossFact = matchMany(cmp.boss)[0]
    return Boolean(bossCombatFor(combat, bossFact?.id) || bossCombatFor(combat, findBossPin(cmp.boss)?.id))
  }
  return false
}

/**
 * "I've done X" / "I killed X" — a completion report, not a question.
 * `beat` alone is deliberately excluded unless it has a completion auxiliary
 * ('ve/have) or `just` in front: "beat" is its own past tense in English, so
 * a bare "I beat" is indistinguishable from "how do I beat X" / "I [will]
 * beat X". "beaten", "killed", "defeated", "finished", "cleared", and "done"
 * are unambiguous past tense on their own.
 */
const DONE_REPORT = /\b(i(?:'ve| have) (?:done|beat(?:en)?|killed|defeated|finished|cleared)|i (?:beaten|killed|defeated|finished|cleared|done)\b|just (?:beat(?:en)?|killed|defeated|finished|cleared))\b/

/**
 * "If I keep walking, what do I lock?" — the Task 52 gate prompts. Kept narrow:
 * an explicit point-of-no-return phrase or a named transition, so a plain
 * location lookup never turns into a wall of warnings.
 */
const GATE_ASK =
  /\b(keep (going|walking)|if i (?:continue|proceed|keep|walk)|what (?:do|will) i (?:miss|lock)|what am i locking|am i locking|before (?:the )?(?:forge|fire giant|maliketh|sealing tree|shadow keep|capital|ashen capital|erdtree)|walk(?:ing)? into (?:leyndell|the capital|the forge|shadow keep|farum|the erdtree))\b/

/** NPC-flavoured label for a line (Ranni, not "Age of Stars"). */
function threadLabel(line: Line): string {
  const npc = npcLines.find((n) => n.line === line.id)
  if (npc) return npc.alias.replace(/\b[a-z]/g, (m) => m.toUpperCase())
  return line.name
}

/**
 * Answer a gate question from *this* character: the named gate's honest lock
 * list, the things that survive it, and the lines still open. Never claims a
 * lock that does not actually fire.
 */
function speakGates(character: Character, question: string): GideonAct {
  const named = findGate(question)
  const approaching = approachingGates(character)
  const fired = triggeredGates(character)
  const bits: string[] = []

  if (named) {
    const state = gateState(character, named)
    if (state === 'fired') bits.push(`${named.name} has already fired on this character.`)
    else if (state === 'approaching') bits.push(`${named.name} is one beat away.`)
    else bits.push(`${named.name} is still ahead.`)
    if (named.locks.length) {
      bits.push(`If you commit, it locks: ${named.locks.map((l) => `${l.name} — ${l.why}`).join('; ')}.`)
    } else {
      bits.push(`Nothing is hard-locked by ${named.name} itself.`)
    }
    if (named.stillOk?.length) {
      bits.push(`It does not lock: ${named.stillOk.map((s) => s.name).join('; ')}.`)
    }
  } else if (approaching.length) {
    bits.push(
      `Gates one beat away on this run: ${approaching
        .map((g) => `${g.name} — locks ${g.locks.map((l) => l.name).join(', ') || 'nothing already'}`)
        .join(' | ')}.`,
    )
  } else if (fired.length) {
    bits.push(`Gates already passed: ${fired.map((g) => g.name).join(', ')}. No new gate is one beat away.`)
  } else {
    bits.push(
      'No world-state gate is one beat away. Nothing you are about to walk into is a point of no return on this character.',
    )
  }

  const s = stillAvailable(character)
  const threads = [...s.active, ...s.open].slice(0, 12).map((r) => `${threadLabel(r.line)} — ${r.note}`)
  if (threads.length) bits.push(`Still open on this run (finish before you commit): ${threads.join('; ')}.`)

  return { say: bits.join(' '), module: 'quests', goal: named?.id }
}

/** Short "gate ahead" line for plain what-next answers. Empty when none is near. */
function approachingGateLine(character: Character): string {
  const approaching = approachingGates(character)
  if (!approaching.length) return ''
  const top = approaching[0]
  const names = top.locks.map((l) => l.name)
  return names.length
    ? `Gate ahead — ${top.name}: continuing locks ${names.join(', ')}. `
    : `Gate ahead — ${top.name}. `
}

/**
 * Deterministic keyword router. This is the fallback and the fast path: it
 * answers lookups (a named ending, a warp, a build, still-available, "I'm
 * stuck") without a network round-trip.
 */
export function askGideonRouter(
  question: string,
  character: Character,
  memory: GideonMemory = {},
  combat: BossCombat[] = cachedBossCombat(),
): GideonAct {
  const q = question.toLowerCase().trim()
  if (!q) return { say: 'Name an ending, or ask what to do next.' }

  const affirm = /^(y|yes|yeah|ok|okay|sure|do it|show( me)?|give (me )?(the )?(steps|instructions)|navigate|take me)\b/.test(q)
    || /\b(show (it|me) on the map|give instructions|take me there)\b/.test(q)

  const allBuilds = [...opBuilds, ...pvpBuilds]

  if (affirm && memory.goalId) {
    const route = routeById(memory.goalId)
    if (route) {
      const plan = planRoute(character, route)
      if (plan.locked) return { say: plan.locked, goal: route.id }
      if (!plan.current) {
        if (plan.foreclosed.length || plan.blocked.length) {
          return { say: `${route.name} has no reachable beat left on this character.`, module: 'quests', goal: route.id }
        }
        return { say: 'Nothing left on the seeded path.', module: 'map', factId: 'boss:radagon', goal: route.id, navigateNow: true }
      }
      const list = plan.todo.slice(0, 4).map((s, i) => `${i + 1}. ${s.do} — ${s.detail}`).join('\n')
      return {
        say: `Pinning ${plan.current.do}.\n${list}`,
        module: plan.current.module || 'map',
        factId: plan.current.factId || memory.lastFact,
        goal: route.id,
        navigateNow: true,
      }
    }
  }

  if (/\b(enia|finger reader|remembrance|rememberance)\b/.test(q)) {
    const rem = findRemembrance(q)
    if (rem) {
      const rewards = rem.rewards.map((r) => r.name).join(' or ')
      const source = rem.bossFactId ? `Drops from ${rem.bossName}.` : `From ${rem.bossName}.`
      return {
        say: `${rem.name}: hand it to Finger Reader Enia for ${rewards}. ${source} A Walking Mausoleum lets you duplicate it for the other option, but you only keep one copy at a time.`,
        module: 'codex',
        factId: rem.bossFactId || rem.id,
        offer: { label: 'Show the boss', prompt: `where is ${rem.bossName}` },
      }
    }
    const eniaArmour = merchants.filter((m) => /^enia\b/i.test(m.vendor)).length
    const list = remembrances.slice(0, 6).map((r) => `${r.name} → ${r.rewards.map((x) => x.name).join(' / ')}`).join('\n')
    return {
      say: `Finger Reader Enia trades remembrances one-for-one at the Roundtable Hold:\n${list}\n…${remembrances.length} in total, base game and Shadow of the Erdtree.${eniaArmour ? ` She also sells ${eniaArmour} boss armour pieces after each kill.` : ''} Name a remembrance for its two rewards.`,
      module: 'codex',
    }
  }

  if (/\b(available|still (open|available)|what can i|what have i (got|left)|mid[- ]?play|pick up)\b/.test(q)) {
    const s = stillAvailable(character)
    const fmt = (rows: typeof s.open) => rows.map((r) => `${r.line.name}: ${r.note}`).join('\n')
    return {
      say: `Mid-run survey.\nActive:\n${fmt(s.active) || '—'}\nOpen:\n${fmt(s.open) || '—'}\nLocked:\n${fmt(s.locked) || '—'}\nDone:\n${fmt(s.done) || '—'}\nSay a name to pick up that line, or Blitz Elden Lord to skip flavour.`,
      module: 'quests',
    }
  }

  // "If I keep going / what do I lock" — world-state gates, answered from this
  // character. Checked before the quest matchers so "before the forge" is not
  // mistaken for a location.
  if (GATE_ASK.test(q)) return speakGates(character, q)

  // Merchant stock questions ("who sells X", "what does X sell after I give Y")
  // outrank the questline matcher: "sellen" names both a questline and a vendor.
  if (/\b(buy|buys|shop|shops|sells?|sold|merchant|merchants|stock|give|gave|unlock)\b/.test(q)) {
    const conditional = matchConditionalStock(q)
    if (conditional.length) {
      const top = conditional[0]
      const items = top.items.slice(0, 6).join(', ')
      const more = top.items.length > 6 ? ` (+${top.items.length - 6} more)` : ''
      const others = conditional.slice(1, 3).map((c) => c.soldBy)
      const also = others.length ? ` Also: ${[...new Set(others)].join(', ')}.` : ''
      return {
        say: `${top.soldBy} — ${top.trigger}. Stock: ${items}${more}. ${top.note}${also}`,
        module: 'codex',
        factId: top.triggerId,
        offer: top.triggerId ? { label: 'Log it', prompt: top.trigger } : undefined,
      }
    }
  }

  const compared = compareAct(question, character, combat)
  if (compared) return compared

  const npcLine = findNpcLine(q)
  const questIntent = /\b(quest|questline|story|line|want|need|next|now|continue|step|steps|do|how|path|route|finish|plan|blitz|guide|help)\b/.test(q)
  if (npcLine && (questIntent || q.split(/\s+/).length <= 2)) {
    return speakPlan(character, npcLine)
  }

  // "I've done X" / "I killed X" — the player is reporting a fact as true,
  // not just asking a question. Resolve X, answer "what next" as if it were
  // already applied, and carry it home in markDone so the caller actually
  // persists it. Checked before the generic "what next" handler below, so
  // "I killed margit, what now" doesn't quietly ignore the first half and
  // answer from stale state. Ask a real clarifying question rather than
  // silently doing nothing when the report can't be resolved to anything.
  if (DONE_REPORT.test(q)) {
    const factHit = matchMany(q)[0]
    const bossHit = findBossPin(q)
    const aliasHit = matchGeneratedAliases(q)[0]
    const warpHit = matchAllWarps(q)[0]
    const reported = factHit
      ? { id: factHit.id, name: factHit.name }
      : bossHit
        ? { id: bossHit.id, name: bossHit.name }
        : aliasHit
          ? { id: aliasHit.slug, name: aliasHit.fmgName }
          : warpHit
            ? { id: warpHit.id, name: warpHit.name }
            : undefined
    if (!reported) {
      return {
        say: 'Which one? Name the boss, grace, or item you just finished and I\'ll mark it and line up what\'s next.',
      }
    }
    const name = reported.name || labelOf(reported.id)
    const updated = applyFacts(character, [reported.id], 'answer', `reported: ${question}`)
    const ack = `Marked ${name} done.`
    if (memory.goalId) {
      const route = routeById(memory.goalId)
      if (route) {
        const plan = speakPlan(updated, route)
        return { ...plan, say: `${ack} ${plan.say}`, markDone: [reported.id] }
      }
    }
    const s = stillAvailable(updated)
    const pick = s.active[0] || s.open[0]
    const moves = nextMoves(updated, 3)
    if (pick) {
      return {
        say: `${ack} ${pick.line.name} ${pick.state}: ${pick.note} Say “blitz” for the shortest Lord path, or “what is still available.”`,
        goal: pick.line.id,
        factId: pick.current?.factId,
        module: 'quests',
        markDone: [reported.id],
        offer: { label: pick.line.name, prompt: `I want to continue ${pick.line.name}. What do I do next?` },
      }
    }
    if (!moves.length) {
      return {
        say: `${ack} Nothing else seeded to chase yet — say "what is still available" or name an ending.`,
        module: 'quests',
        markDone: [reported.id],
      }
    }
    return {
      say: `${ack} Nearest thread: ${moves[0].id}. ${moves[0].reason}`,
      module: 'reckon',
      factId: moves[0].id,
      markDone: [reported.id],
    }
  }

  const line = findLine(q) || (memory.goalId && /\b(what next|what now|what should i do|continue|plan|blitz)\b/.test(q) ? routeById(memory.goalId) : undefined)
  if (line && (/\b(ending|want|get|do|how|path|route|finish|plan|next|blitz|story|quest|line)\b/.test(q) || findLine(q))) {
    return speakPlan(character, line)
  }

  if (/\b(what next|what now|what should i do|where to|what do i do|continue)\b/.test(q)) {
    if (memory.goalId) {
      const route = routeById(memory.goalId)
      if (route) {
        const act = speakPlan(character, route)
        const hint = approachingGateLine(character)
        return hint ? { ...act, say: `${hint}${act.say}` } : act
      }
    }
    const s = stillAvailable(character)
    const pick = s.active[0] || s.open[0]
    const moves = nextMoves(character, 3)
    if (pick) {
      return {
        say: `${approachingGateLine(character)}No goal set. You already have ${pick.line.name} ${pick.state}: ${pick.note} Say “blitz” for the shortest Lord path, or “what is still available.”`,
        goal: pick.line.id,
        factId: pick.current?.factId,
        module: 'quests',
        offer: { label: pick.line.name, prompt: `I want to continue ${pick.line.name}. What do I do next?` },
      }
    }
    if (!moves.length) {
      return {
        say: 'Log a grace or a shardbearer so I can see the run. Or say “what is still available.”',
        module: 'reckon',
      }
    }
    return {
      say: `Nearest thread: ${moves[0].id}. ${moves[0].reason}`,
      module: 'reckon',
      factId: moves[0].id,
    }
  }

  // PvP is its own concern: poise, stance, invade-vs-host asymmetry. It must be
  // tested before the generic build branch, or "how do I beat a bleed build in
  // PvP" would just re-recommend Rivers of Blood.
  if (/\b(pvp|invasion|invade|invader|duel|colosseum|badredman|gank|host of fingers)\b/.test(q)) {
    const wantsMatchup = /\b(beat|counter|how do i|how to|against|vs|versus|deal with|stop|shut down|fight|turtle)\b/.test(q)
    const matchup = pvpMatchups.find(
      (m) => m.aliases.some((a) => q.includes(a)) || q.includes(m.threat.toLowerCase()),
    )
    if (matchup && wantsMatchup) {
      const counters = matchup.counters.slice(0, 3).join(' ')
      return {
        say: `${matchup.threat}. ${matchup.tell} ${counters} ${matchup.note}`,
        module: 'build',
        offer: { label: 'PvP kits', prompt: 'what are good pvp builds' },
      }
    }
    const pick =
      (/\b(duel|colosseum)\b/.test(q) ? pvpBuilds.find((b) => b.mode === 'duel') : undefined)
      || (/\binva/.test(q) ? pvpBuilds.find((b) => b.mode === 'invade') : undefined)
      || pvpBuilds.find((b) => q.includes(b.name.toLowerCase()))
      || pvpBuilds.find((b) => b.keywords.some((k) => q.includes(k)))
      || pvpBuilds.find((b) => b.mode === 'both')
      || pvpBuilds[0]
    return {
      say: `${pick.name} (${pick.mode}, ${pick.bracket}) — ${pick.why} Beats: ${pick.beats} Watch out for: ${pick.losesTo}`,
      module: 'build',
      buildId: pick.id,
      offer: { label: 'Wear it', prompt: `use the ${pick.name} build` },
    }
  }

  // Real tips / tech, kept distinct from builds. Specific keyword first, then a
  // short list so "show me tips and tricks" is still a real, non-generic answer.
  if (/\b(tips?|tricks?|tech|broken|jump attack|jumping attack|stance break|buff stack|spirit ash|combo|cheese)\b/.test(q)) {
    // Prefer a named entry over a shared tag, or "is mimic tear a good spirit ash"
    // would match the earlier Tiche row on its `spirit ash` tag.
    const hit = techTips.find((t) => q.includes(t.name.toLowerCase()))
      || techTips.find((t) => t.tags.some((tag) => q.includes(tag)))
    if (hit) {
      const patch = hit.patch ? ` (${hit.patch})` : ''
      return {
        say: `${hit.name} — ${hit.what} ${hit.why} How: ${hit.how}${patch}`,
        module: 'codex',
        offer: { label: 'More tech', prompt: 'show me tips and tricks' },
      }
    }
    const top = techTips.slice(0, 4)
    return {
      say: `Strong tech worth knowing:\n${top.map((t) => `${t.name} — ${t.what}`).join('\n')} Ask about any one for the how.`,
      module: 'codex',
    }
  }

  // Build hunt (Task 64): "how do I build X" / "show the X kit" turns the kit into a
  // checklist of missing pieces. The show branch reuses the leftover pin layer by
  // adding the placeable loot ids to the watchlist; nothing is marked collected.
  if (/\b(kit|how (do|can|should) i (build|make|get)|what do i need|missing (pieces|gear))\b/.test(q)) {
    const pick =
      allBuilds.find((b) => q.includes(b.name.toLowerCase())) ||
      buildFromText(q) ||
      opBuilds[0]
    if (pick) {
      const hunt = buildHunt(character, pick)
      const wantsMap = /\b(show|pin|map|where)\b/.test(q)
      if (wantsMap) {
        const watch = hunt.pins.map((p) => p.id)
        if (watch.length) {
          return {
            say: `${pick.name} — placing ${watch.length} piece${watch.length === 1 ? '' : 's'} we can pin (${hunt.pins.map((p) => p.name).join(', ')}). The rest are listed in the Build lab.`,
            module: 'map',
            buildId: pick.id,
            factId: watch[0],
            navigateNow: true,
            watch,
          }
        }
        return {
          say: `${pick.name} — no piece of this kit has a grounded pin yet. The full list is in the Build lab.`,
          module: 'build',
          buildId: pick.id,
        }
      }
      const missing = hunt.missing.map((m) => m.name)
      const tail = hunt.unresolved.length
        ? ` ${hunt.unresolved.length} id${hunt.unresolved.length === 1 ? '' : 's'} not in our data yet (${hunt.unresolved.map((u) => u.id).join(', ')}), listed not dropped.`
        : ''
      return {
        say: missing.length
          ? `${pick.name} — still missing ${missing.length}: ${missing.join(', ')}.${tail}${hunt.pins.length ? ' Want the atlas pins for the ones we can place?' : ''}`
          : `Every seeded piece of ${pick.name} is already logged on this character.${tail}`,
        module: 'build',
        buildId: pick.id,
        offer: hunt.pins.length ? { label: 'Show on map', prompt: `show the ${pick.name} kit` } : undefined,
      }
    }
  }

  if (/\b(build|op|meta|bleed|sorcer|bonk|faith|arcane)\b/.test(q) || allBuilds.some((b) => q.includes(b.name.toLowerCase()))) {
    const byName = allBuilds.find((b) => q.includes(b.name.toLowerCase()))
    const route = BUILD_ROUTES.find((r) => r.re.test(q))
    const pick = byName || (route ? allBuilds.find((b) => b.id === route.id) : undefined) || opBuilds[0]
    if (pick) {
      return {
        say: `${pick.name} — ${pick.why} I can put those stats on this sheet.`,
        module: 'build',
        buildId: pick.id,
        offer: { label: 'Wear it', prompt: `use the ${pick.name} build` },
      }
    }
  }

  if (/\buse the .+ build\b/.test(q) || /\bwear it\b/.test(q)) {
    const pick = allBuilds.find((b) => q.includes(b.name.toLowerCase())) || allBuilds[0]
    return { say: `Sheet set to ${pick.name}.`, module: 'build', buildId: pick.id, navigateNow: true }
  }

  const bossPin = findBossPin(q)
  if (bossPin && /\b(where|map|pin|find|kill|boss)\b/.test(q)) {
    return {
      say: `${bossPin.name} is on the ${bossPin.world} plate (${bossPin.x}, ${bossPin.y}).`,
      module: 'map',
      factId: bossPin.id,
      navigateNow: true,
    }
  }

  if (/\b(stuck|wipe|cannot|can't beat|help with)\b/.test(q)) {
    const hunt = fieldHunts.find((h) => q.includes(h.name.toLowerCase()) || h.aliases.some((a) => q.includes(a)))
    const named = matchMany(q)[0]
    const who = hunt?.name || named?.name || 'that foe'
    const huntBossId = hunt ? `boss:${hunt.id.slice(hunt.id.indexOf(':') + 1)}` : undefined
    const boss = bossCombatFor(combat, named?.id) || bossCombatFor(combat, huntBossId)
    if (boss) {
      const advice = bossResistAdvice(boss)
      return {
        say: `${who}. Level ${character.level}. Real NpcParam absorb: ${advice.line} Want a ${advice.sheet} sheet instead?`,
        module: 'build',
        factId: named?.id || hunt?.id,
        offer: advice.offer,
      }
    }
    return {
      say: `${who}. Level ${character.level}. If this is a wall: summon, swap to strike/slash/pierce you have not tried, or leave and come back two shardbearers later. Want a bleed or comet sheet instead?`,
      module: 'build',
      factId: hunt?.id || named?.id,
      offer: { label: 'Bleed sheet', prompt: 'use the Rivers of Blood build' },
    }
  }

  if (/\b100\s*%|\b(completionist|everything in|full clear|medusa)\b/.test(q)) {
    const done = summarize(character)
    const pct = done.catalog ? Math.round((done.known / done.catalog) * 100) : 0
    // medusaChapters stays the structural backbone; its ordering maps the run's
    // completion fraction onto a playthrough chapter rather than narrating chapter one.
    const chapterIndex = Math.min(
      medusaChapters.length - 1,
      Math.floor((pct / 100) * medusaChapters.length),
    )
    const chapter = medusaChapters[chapterIndex]
    const moves = nextMoves(character, 3)
    const top = moves[0]
    const nextLine = top
      ? `Next actionable: ${moves.map((m) => labelOf(m.id)).join(', ')}.`
      : `Nothing seeded is one step away. Start with ${firstOpenFact(character) || chapter.goal}.`
    return {
      say: `100% — ${done.known}/${done.catalog} catalog facts (${pct}%). Bosses ${done.bosses}/${done.totalBosses} · graces ${done.graces}/${done.totalGraces} · items ${done.items}/${done.totalItems} · quests ${done.quests}/${done.totalQuests}. ${nextLine} Spine chapter ${chapterIndex + 1}/${medusaChapters.length}: ${chapter.name}.`,
      module: 'quests',
      goal: 'line:blitz-lord',
      factId: top?.id,
      offer: top
        ? { label: labelOf(top.id), prompt: `where is ${labelOf(top.id)}` }
        : { label: chapter.name, prompt: `what next after ${chapter.name}` },
    }
  }

  const huntHit = fieldHunts.find((h) => q.includes(h.name.toLowerCase()) || h.aliases.some((a) => q.includes(a)))
  if (huntHit && /\b(where|kill|hunt|mark|field)\b/.test(q)) {
    const st = factState(character, huntHit.id)
    return {
      say: `${huntHit.name} · ${huntHit.region} · ${st === 'true' ? 'already down on this sheet' : 'open-world hunt. 9974 ticks this after the kill.'}`,
      module: 'map',
      factId: huntHit.id,
      offer: st === 'true' ? undefined : { label: 'Mark down', prompt: huntHit.name },
    }
  }

  const sellers = findSellers(q)
  if (sellers.length && (/\b(buy|shop|sells|merchant|stock|who sells)\b/.test(q) || sellers.some((s) => s.item.toLowerCase() === q))) {
    const lines = sellers.slice(0, 5).map((s) => (s.condition ? `${s.item} — ${s.vendor} (after: ${s.condition})` : `${s.item} — ${s.vendor}`)).join('\n')
    return { say: `Shop dump:\n${lines}`, module: 'codex' }
  }

  const miss = missables.find((m) => q.includes(m.id.replace(/^[a-z]+-/, '').replace(/-/g, ' ')) || q.includes(m.lockedBy.toLowerCase()))
  if (miss || /\b(missable|locked out|too late)\b/.test(q)) {
    const row = miss || missables[0]
    return {
      say: `${row.id} locks behind ${row.lockedBy}. ${row.note}`,
      module: 'quests',
    }
  }

  if (/\b(scadu|fragment|map fragment|fog)\b/.test(q)) {
    const row = [...scadutreeFragments, ...mapFragments].find((e) => q.includes(e.region.toLowerCase())) || scadutreeFragments[0]
    return {
      say: `${row.name} — ${row.note} (${row.region}). Mark it when the blessing ticks.`,
      module: 'codex',
      factId: row.id,
      offer: { label: 'Log it', prompt: row.name },
    }
  }

  const lootHits = matchLoot(q)
  if (lootHits.length) {
    const l = lootHits[0]
    return {
      say: `${l.name} — ${l.how}${l.missable ? ' Missable.' : ''} Want that grace on the atlas?`,
      module: 'map',
      factId: l.grace,
      offer: l.grace ? { label: 'Show pin', prompt: 'yes show me on the map and give instructions' } : undefined,
    }
  }

  const warps = matchAllWarps(q)
  if (warps.length) {
    return { say: `${warps[0].name} · ${warps[0].region} · ${warps[0].world}.`, module: 'map', factId: warps[0].id, navigateNow: true }
  }

  const factsHit = matchMany(q)
  if (factsHit.length) {
    const f = factsHit[0]
    return { say: `${f.name} — ${f.kind} in ${f.region}.`, module: 'map', factId: f.id }
  }

  // The generated alias plane (Task 23) indexes every fact category by engine id
  // and name, including alias spellings the hand-curated matchers above miss
  // ("night cavalry" for Night's Cavalry, "pureblood knight medal", "giant
  // prayerbook"). Consult it before the generic search so the router returns a
  // real entity + module instead of a bare search dump.
  const genHits = matchGeneratedAliases(question)
  if (genHits.length) {
    const g = genHits[0]
    const module = moduleFor(g.slug)
    const region = byId.get(g.slug)?.region
    return {
      say: `${g.fmgName} — ${g.kind}${region ? ` · ${region}` : ''}.`,
      module,
      factId: g.slug,
      navigateNow: module === 'map',
    }
  }

  if (/\b(quest|questline|storyline|npc|companion)\b/.test(q)) {
    const names = allLines.filter((l) => l.kind === 'story').map((l) => l.name).join(', ')
    return { say: `Seeded companion lines: ${names}. Name one and I will give its next beat.`, module: 'quests' }
  }

  const found = searchSync(question)
  if (found.length) {
    const top = found[0]
    return {
      say: found.slice(0, 4).map((h) => `${h.name} — ${h.detail}`).join('\n'),
      module: top.module,
      factId: top.id,
    }
  }

  return {
    say: 'Say an ending, a companion NPC (Ranni, Millicent, Alexander…), a grace, a boss, or who sells a spell.',
    module: 'quests',
  }
}

/**
 * Cost/latency heuristic: when to skip the LLM and let the router answer.
 *
 * The router is free, instant, and exact at single-entity lookups. The LLM earns
 * its round-trip only when the question needs reasoning across the grounding
 * pack. So we send these straight to the router:
 *  - a follow-up "yes / show it" when a goal is already in memory
 *  - the fixed command phrases the UI chips emit (still-available, what-next,
 *    stuck, 100% spine, blitz)
 *  - a short query naming exactly one known entity (line, warp, loot, build,
 *    boss pin, catalog fact) with no reasoning markers
 * Everything else — multiple concepts, comparisons, conditionals, "should I",
 * "can I still", questions over ~10 words — goes to the Muse model, then falls
 * back to this router if the key is absent, the call fails, or validation rejects
 * it.
 */
const REASONING_MARKER =
  /\b(and|but|if|before|after|or|should|which|why|better|instead|versus|vs|because|while|when|can i|priorit|worth|advice|recommend|difference|between|both|even though|already)\b/

export function isFastLookup(
  question: string,
  memory: GideonMemory = {},
  combat: BossCombat[] = cachedBossCombat(),
): boolean {
  const q = question.toLowerCase().trim()
  if (!q) return true

  const affirm =
    /^(y|yes|yeah|ok|okay|sure|do it|show( me)?|give (me )?(the )?(steps|instructions)|navigate|take me)\b/.test(q) ||
    /\b(show (it|me) on the map|give instructions|take me there)\b/.test(q)
  if (affirm && memory.goalId) return true

  if (/^(what is still available|what'?s still available|still available|what next|what now|what should i do|what do i do|where to|continue|i am stuck|i'?m stuck|stuck|help with this wall)\b/.test(q)) return true
  if (/\b100\s*%|\b(completionist|everything in|full clear|medusa)\b/.test(q)) return true
  if (/\b(blitz|speedrun|rush the game|fast ending)\b/.test(q)) return true
  if (GATE_ASK.test(q)) return true

  // Deterministic knowledge questions that would otherwise trip the reasoning
  // markers ("better than", "or", "should"): a comparison between two known
  // builds, or two damage types against a boss whose NpcParam row we hold, is
  // grounded and exact. Same for the remembrance table and companion questlines.
  if (/\b(enia|finger reader|remembrance|rememberance)\b/.test(q)) return true
  if (isComparable(question, combat)) return true

  // PvP and tips/tech are answered deterministically from authored knowledge, so
  // they stay on the fast path even when phrased as a multi-word question.
  if (/\b(pvp|invasion|invade|invader|duel|colosseum|badredman|gank)\b/.test(q)) return true
  if (/\b(tips?|tricks?|tech|jump attack|jumping attack|stance break|buff stack|spirit ash|cheese)\b/.test(q)) return true

  // A conjunction or conditional means the question crosses concepts: reason.
  if (REASONING_MARKER.test(q)) return false

  // "I've done X" / "I killed X" reports are handled deterministically, but
  // only once a question has cleared the reasoning-marker gate above: a
  // report embedded in an otherwise multi-concept question ("...and I killed
  // Seluvis?") still needs the LLM for the rest of the question, so this
  // can't short-circuit before that gate the way the other fast-path checks
  // above it do.
  if (DONE_REPORT.test(q)) return true

  // An exact single-entity lookup is still fast even when phrased as a question
  // ("I want the Age of Stars ending. What do I do next?").
  if (findNpcLine(q)) return true
  if (findLine(question)) return true
  if (matchAllWarps(question).length) return true
  if (matchLoot(question).length) return true
  if (opBuilds.some((b) => q.includes(b.name.toLowerCase()))) return true
  if (findBossPin(question)) return true
  if (matchMany(question).length) return true
  if (matchGeneratedAliases(question).length) return true

  // Nothing matched and the query is a bare fragment: let the router answer.
  if (!q.includes('?') && q.split(/\s+/).length < 4) return true
  return false
}

let warnedNoKey = false

/**
 * Front for Gideon. Returns the same `GideonAct` as the old router so the UI and
 * the shell are unchanged. Fast/confident lookups stay deterministic; open-ended
 * questions go to the optional Meta Muse Spark 1.3 Contributor model with a
 * grounding pack and are validated before use.
 */
export async function askGideon(
  question: string,
  character: Character,
  memory: GideonMemory = {},
): Promise<GideonAct> {
  // The "stuck" handler needs the real NpcParam table, which is loaded async by
  // the UI. Warm it here so a first-ask still gets specific resists, and let the
  // router fall back to generic advice if the fetch fails.
  const wantsCombat =
    /\b(stuck|wipe|cannot|can't beat|help with)\b/.test(question.toLowerCase()) ||
    parseComparison(question.toLowerCase()) !== undefined
  const combat = wantsCombat ? await loadBossCombat().catch(() => []) : undefined
  const router = askGideonRouter(question, character, memory, combat)
  if (isFastLookup(question, memory, combat ?? cachedBossCombat())) return router

  if (!hasGideonKey()) {
    if (!warnedNoKey) {
      warnedNoKey = true
      console.info('[gideon] VITE_GIDEON_API_KEY is not set — using the deterministic router only.')
    }
    return router
  }

  try {
    const grounding = buildGrounding(question, character, memory)
    const raw = await callGideonLlm(gideonMessages(question, grounding))
    const { act, rejected } = validateGideonAct(raw, grounding)
    if (!act) {
      console.warn('[gideon] Muse response rejected (invented or invalid ids); using the router.', rejected)
      return router
    }
    return act
  } catch (err) {
    console.warn('[gideon] Muse call failed; using the deterministic router.', err)
    return router
  }
}
