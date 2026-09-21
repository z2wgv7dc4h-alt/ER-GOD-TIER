import { opBuilds } from '../knowledge/builds'
import { planRoute, type EndingRoute } from '../knowledge/endings'
import { medusaChapters } from '../knowledge/medusa'
import { allLines, findLine, stillAvailable } from '../knowledge/storylines'
import { matchMany } from '../knowledge/catalog'
import { matchLoot } from '../knowledge/loot'
import { fieldHunts } from '../knowledge/completion'
import { findBossPin } from '../knowledge/bossPins'
import { mapFragments, scadutreeFragments } from '../knowledge/collectibles'
import { findSellers } from '../knowledge/merchants'
import { missables } from '../knowledge/missables'
import { matchAllWarps } from './aliases'
import { searchSync } from './search'
import { nextMoves } from './links'
import { factState } from '../state'
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

export function askGideon(question: string, character: Character, memory: GideonMemory = {}): GideonAct {
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
    return {
      say: `${who}. Level ${character.level}. If this is a wall: summon, swap to strike/slash/pierce you have not tried, or leave and come back two shardbearers later. Want a bleed or comet sheet instead?`,
      module: 'build',
      factId: hunt?.id || named?.id,
      offer: { label: 'Bleed sheet', prompt: 'use the Rivers of Blood build' },
    }
  }

  if (/\b(100%|completionist|everything in|full clear|medusa)\b/.test(q)) {
    const next = medusaChapters.find(() => !q.includes('skip')) || medusaChapters[0]
    return {
      say: `100% spine is Medusa’s chapters, goals only. Now: ${next.act} — ${next.name}. ${next.goal} Say the chapter name when that slice is done.`,
      module: 'quests',
      goal: 'line:blitz-lord',
      offer: { label: next.name, prompt: `what next after ${next.name}` },
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
    const lines = sellers.slice(0, 5).map((s) => `${s.item} — ${s.vendor}`).join('\n')
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
