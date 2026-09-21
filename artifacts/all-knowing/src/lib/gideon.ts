import { opBuilds } from '../knowledge/builds'
import { planRoute, type EndingRoute } from '../knowledge/endings'
import { medusaChapters } from '../knowledge/medusa'
import { allLines, findLine, stillAvailable } from '../knowledge/storylines'
import { facts, matchMany } from '../knowledge/catalog'
import { matchLoot } from '../knowledge/loot'
import { fieldHunts } from '../knowledge/completion'
import { findBossPin } from '../knowledge/bossPins'
import { mapFragments, scadutreeFragments } from '../knowledge/collectibles'
import { findSellers } from '../knowledge/merchants'
import { matchConditionalStock } from '../knowledge/merchantConditions'
import { missables } from '../knowledge/missables'
import { matchAllWarps } from './aliases'
import { searchSync } from './search'
import { labelOf, nextMoves } from './links'
import { summarize } from './infer'
import {
  bossCombatFor,
  cachedBossCombat,
  damageTypeLabels,
  damageTypes,
  loadBossCombat,
  type BossCombat,
} from './enemy'
import { factState } from '../state'
import { callDeepSeekJson, hasDeepSeekKey } from './deepseek'
import { buildGrounding, gideonMessages, validateGideonAct } from './gideonLlm'
import type { Character, ModuleId } from '../types'

export type GideonAct = {
  say: string
  module?: ModuleId
  factId?: string
  buildId?: string
  offer?: { label: string; prompt: string }
  goal?: string
  navigateNow?: boolean
}

export type GideonMemory = {
  goalId?: string
  lastFact?: string
  lastModule?: ModuleId
}

function routeById(id: string) {
  return allLines.find((e) => e.id === id)
}

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
  return {
    say: `${route.name} (${kind}) is still open (${plan.done.length}/${plan.total}). Next: ${plan.current.do}. ${plan.current.detail}${extra}${tail} Want the map pin and the short instruction list?`,
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

  if (/\b(available|still (open|available)|what can i|what have i (got|left)|mid[- ]?play|pick up)\b/.test(q)) {
    const s = stillAvailable(character)
    const fmt = (rows: typeof s.open) => rows.map((r) => `${r.line.name}: ${r.note}`).join('\n')
    return {
      say: `Mid-run survey.\nActive:\n${fmt(s.active) || '—'}\nOpen:\n${fmt(s.open) || '—'}\nLocked:\n${fmt(s.locked) || '—'}\nDone:\n${fmt(s.done) || '—'}\nSay a name to pick up that line, or Blitz Elden Lord to skip flavour.`,
      module: 'quests',
    }
  }

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

  const line = findLine(q) || (memory.goalId && /\b(what next|what now|continue|plan|blitz)\b/.test(q) ? routeById(memory.goalId) : undefined)
  if (line && (/\b(ending|want|get|do|how|path|route|finish|plan|next|blitz|story|quest|line)\b/.test(q) || findLine(q))) {
    return speakPlan(character, line)
  }

  if (/\b(what next|what now|where to|what do i do|continue)\b/.test(q)) {
    if (memory.goalId) {
      const route = routeById(memory.goalId)
      if (route) return speakPlan(character, route)
    }
    const s = stillAvailable(character)
    const pick = s.active[0] || s.open[0]
    const moves = nextMoves(character, 3)
    if (pick) {
      return {
        say: `No goal set. You already have ${pick.line.name} ${pick.state}: ${pick.note} Say “blitz” for the shortest Lord path, or “what is still available.”`,
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

  if (/\b(build|op|meta|bleed|sorcer|bonk|faith|arcane)\b/.test(q) || opBuilds.some((b) => q.includes(b.name.toLowerCase()))) {
    const pick =
      /\b(bleed|river|rob)\b/.test(q) ? opBuilds.find((b) => b.id === 'build:rivers')
        : /\b(azur|comet)\b/.test(q) ? opBuilds.find((b) => b.id === 'build:azur')
          : /\b(blasphem)\b/.test(q) ? opBuilds.find((b) => b.id === 'build:blasphemous')
            : /\b(night comet)\b/.test(q) ? opBuilds.find((b) => b.id === 'build:night-comet')
              : /\b(leont|matador|pack)\b/.test(q) ? opBuilds.find((b) => b.id === 'build:leontiel')
                : /\b(bonk|strength|heavy)\b/.test(q) ? opBuilds.find((b) => b.id === 'build:heavy-bonk')
                  : opBuilds[0]
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
    const pick = opBuilds.find((b) => q.includes(b.name.toLowerCase())) || opBuilds[0]
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

  if (/\b(ranni|seluvis|alexander|boc|leda|millicent|quest)\b/.test(q) && !findLine(q)) {
    return { say: 'Quest graph. If this is for an ending, say the ending name so I can order the beats.', module: 'quests' }
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
    say: 'Say an ending, a grace, a boss, or who sells a spell.',
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
 * "can I still", questions over ~10 words — goes to DeepSeek, then falls back to
 * this router if the key is absent, the call fails, or validation rejects it.
 */
const REASONING_MARKER =
  /\b(and|but|if|before|after|or|should|which|why|better|instead|versus|vs|because|while|when|can i|priorit|worth|advice|recommend|difference|between|both|even though|already)\b/

export function isFastLookup(question: string, memory: GideonMemory = {}): boolean {
  const q = question.toLowerCase().trim()
  if (!q) return true

  const affirm =
    /^(y|yes|yeah|ok|okay|sure|do it|show( me)?|give (me )?(the )?(steps|instructions)|navigate|take me)\b/.test(q) ||
    /\b(show (it|me) on the map|give instructions|take me there)\b/.test(q)
  if (affirm && memory.goalId) return true

  if (/^(what is still available|what'?s still available|still available|what next|what now|what do i do|where to|continue|i am stuck|i'?m stuck|stuck|help with this wall)\b/.test(q)) return true
  if (/\b100\s*%|\b(completionist|everything in|full clear|medusa)\b/.test(q)) return true
  if (/\b(blitz|speedrun|rush the game|fast ending)\b/.test(q)) return true

  // A conjunction or conditional means the question crosses concepts: reason.
  if (REASONING_MARKER.test(q)) return false

  // An exact single-entity lookup is still fast even when phrased as a question
  // ("I want the Age of Stars ending. What do I do next?").
  if (findLine(question)) return true
  if (matchAllWarps(question).length) return true
  if (matchLoot(question).length) return true
  if (opBuilds.some((b) => q.includes(b.name.toLowerCase()))) return true
  if (findBossPin(question)) return true
  if (matchMany(question).length) return true

  // Nothing matched and the query is a bare fragment: let the router answer.
  if (!q.includes('?') && q.split(/\s+/).length < 4) return true
  return false
}

let warnedNoKey = false

/**
 * Front for Gideon. Returns the same `GideonAct` as the old router so the UI and
 * the shell are unchanged. Fast/confident lookups stay deterministic; open-ended
 * questions go to DeepSeek with a grounding pack and are validated before use.
 */
export async function askGideon(
  question: string,
  character: Character,
  memory: GideonMemory = {},
): Promise<GideonAct> {
  // The "stuck" handler needs the real NpcParam table, which is loaded async by
  // the UI. Warm it here so a first-ask still gets specific resists, and let the
  // router fall back to generic advice if the fetch fails.
  const wantsCombat = /\b(stuck|wipe|cannot|can't beat|help with)\b/.test(question.toLowerCase())
  const combat = wantsCombat ? await loadBossCombat().catch(() => []) : undefined
  const router = askGideonRouter(question, character, memory, combat)
  if (isFastLookup(question, memory)) return router

  if (!hasDeepSeekKey()) {
    if (!warnedNoKey) {
      warnedNoKey = true
      console.info('[gideon] VITE_DEEPSEEK_API_KEY is not set — using the deterministic router only.')
    }
    return router
  }

  try {
    const grounding = buildGrounding(question, character, memory)
    const raw = await callDeepSeekJson(gideonMessages(question, grounding))
    const { act, rejected } = validateGideonAct(raw, grounding)
    if (!act) {
      console.warn('[gideon] DeepSeek response rejected (invented or invalid ids); using the router.', rejected)
      return router
    }
    return act
  } catch (err) {
    console.warn('[gideon] DeepSeek call failed; using the deterministic router.', err)
    return router
  }
}
