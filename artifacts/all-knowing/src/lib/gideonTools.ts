import { searchSync } from './search'
import { regionLeftovers } from './regionLeftovers'
import { beforeYouGo } from './beforeYouGo'
import { loadRegionLevels } from './regionLevels'
import { loadBossDrops, matchBossDrops } from './bosses'
import { guideExcerpts, loadGuides, matchGuides } from './guides'
import { loadWeapons } from './ar'
import { dominantAttributes, earlyWeaponRanking, weaponAdvice } from './upgradeAdvice'
import { loadBossCombat, loadEnemyCombat } from './enemy'
import { loadDialogueOwners } from './dialogueOwners'
import { loadEngineMarkers, matchEngineItems } from './engineMarkers'
import { loadAcquisition, matchAcquisition } from './acquisition'
import { matchCoords, type CoordPin } from './coords'
import { findQuest, loadNpcQuests } from './npcQuests'
import { loadRecipes, matchRecipes } from './recipes'
import { loadWikiText, matchWiki } from './wikiText'
import { loadSecrets, matchSecrets } from './secrets'
import { loadGameTextTable } from './gameText'
import { quoteFor } from './dialogueQuote'
import { advise, planRespec } from './advisor'
import { edges, entityName, getEntity, status } from './entityGraph'
import { summarize } from './infer'
import { findLine, stillAvailable, survey } from '../knowledge/storylines'
import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import type { Character } from '../types'
import type { AreaSignal } from './areaContext'
import type { GideonMemory } from './gideon'

/**
 * The harness: the deterministic functions Gideon already owns, exposed to the
 * model as callable tools. Muse picks one, we run it locally against the real
 * data, and it answers from the result — so every id it names is real and
 * hyperlinkable, and we stop stuffing a static grounding blob every turn.
 *
 * Chat Completions tool shape (nested under `function`).
 */
export type ToolDef = {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

const str = (description: string) => ({ type: 'string', description })

export const GIDEON_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Resolve a name (item, boss, grace, quest, region) to real fact ids. Use before naming any entity.',
      parameters: {
        type: 'object',
        properties: { q: str('name to look up'), kind: str('optional entity kind filter, e.g. boss, grace, item, weapon, npc') },
        required: ['q'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'here',
      description: 'What is still open in the current or named region (quests, loot, gates). Use for "what did I miss / before I go".',
      parameters: { type: 'object', properties: { q: str('optional region or question') }, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'level_check',
      description: 'Recommended level band for a region plus whether the character is over/under-levelled, and what to do before leaving.',
      parameters: { type: 'object', properties: { q: str('optional region') }, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'boss',
      description: 'A boss: hp, locations, drops, and its fight guide/strategy.',
      parameters: { type: 'object', properties: { name: str('boss name') }, required: ['name'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'guide',
      description: 'Mechanics/guide text (upgrades, smithing, status effects, stats, damage types, …).',
      parameters: { type: 'object', properties: { q: str('what you want to know') }, required: ['q'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upgrade',
      description: 'Weapon upgrade/AR advice for this character, on-archetype with their active kit. Omit weapon to list best wieldable weapons.',
      parameters: { type: 'object', properties: { weapon: str('optional weapon name') }, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enemy',
      description: 'Combat profile for a boss or enemy: HP, poise, damage-negation (weak/strong), status resistances.',
      parameters: { type: 'object', properties: { name: str('boss/enemy name') }, required: ['name'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_item',
      description: 'Where to find a named item: nearest Site of Grace, how it is obtained (drop/chest/merchant/ground/quest), and whether it is missable.',
      parameters: { type: 'object', properties: { name: str('item name') }, required: ['name'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'secrets',
      description: 'Illusory / hidden walls by area, and what is behind them.',
      parameters: { type: 'object', properties: { q: str('optional area or text') }, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wiki',
      description: 'Search the full Elden Ring wiki text for anything else — a mechanic, an enemy, a location, a boss detail, a term.',
      parameters: { type: 'object', properties: { q: str('what to look up') }, required: ['q'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recipe',
      description: 'Crafting recipe for a named craftable item: the materials and quantities required.',
      parameters: { type: 'object', properties: { name: str('craftable item name') }, required: ['name'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quest_steps',
      description: 'Step-by-step walkthrough for a named NPC quest (ordered locations + actions, and which step breaks it).',
      parameters: { type: 'object', properties: { npc: str('NPC name') }, required: ['npc'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dialogue',
      description: 'Verbatim in-game dialogue for a named NPC (only lines that are attributed).',
      parameters: { type: 'object', properties: { speaker: str('NPC name') }, required: ['speaker'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_entity',
      description: 'One entity by fact id: name, kind, summary, this character’s status, and its key graph edges. Use to ground any [[id]] you cite.',
      parameters: { type: 'object', properties: { id: str('fact id, e.g. boss:godrick') }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edges',
      description: 'The relationship edges of an entity: drops / soldBy / foundIn / requires / unlocks / locks / weakTo / resists / partOfQuest / nextBeat / craftedFrom / tradedFor / upgradeMaterial / goodForBuild / relatedLore (and inverses like droppedBy, sells, contains).',
      parameters: {
        type: 'object',
        properties: { id: str('fact id'), rel: str('optional edge relation to filter by') },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'where',
      description: 'Where an entity is: acquisition text (method, location, nearest grace, missable) and the map target (region/world + plate x,y) when known.',
      parameters: { type: 'object', properties: { id: str('fact id') }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'character',
      description: 'The current Tarnished: level, stats, loadout, owned facts, progress summary, current area, and current goals.',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'advise',
      description: 'The Task 96 advisor for this character: kind upgrades | gear | todo | respec. respec also takes a build id.',
      parameters: {
        type: 'object',
        properties: { kind: str('upgrades | gear | todo | respec'), build: str('optional build id for respec') },
        required: ['kind'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quest',
      description: 'A quest line by id (e.g. line:ranni or ranni): its beats with done / next / locked state.',
      parameters: { type: 'object', properties: { id: str('quest line id or name') }, required: ['id'], additionalProperties: false },
    },
  },
]

export type ToolContext = { character: Character; memory: GideonMemory; area?: AreaSignal | null }

/** Run one tool call against the real data. Always returns a JSON-serializable value. */
export async function runGideonTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  const q = typeof args.q === 'string' ? args.q : ''
  switch (name) {
    case 'search': {
      const kind = typeof args.kind === 'string' ? args.kind.trim().toLowerCase() : ''
      const hits = searchSync(q).slice(0, 20).map((h) => ({ id: h.id, name: h.name, module: h.module, kind: getEntity(h.id).kind }))
      return (kind ? hits.filter((h) => h.kind === kind) : hits).slice(0, 8)
    }
    case 'here': {
      const r = regionLeftovers(ctx.character, q, 8)
      return { region: r.region, scoped: r.scoped, items: r.items.map((i) => ({ name: i.name, source: i.source })) }
    }
    case 'level_check': {
      const areas = await loadRegionLevels().then((d) => d.areas).catch(() => [])
      const by = beforeYouGo(ctx.character, q || 'here', areas)
      return { region: by.region, band: by.band, status: by.status, open: by.open, advice: by.advice }
    }
    case 'boss': {
      const doc = await loadBossDrops().catch(() => null)
      const hit = doc ? matchBossDrops(String(args.name ?? ''), doc.bosses, 1)[0] : null
      return hit
        ? { name: hit.name, hp: hit.hp, locations: hit.locations, drops: hit.drops, guide: (hit.sections ?? []).find((s) => /guide/i.test(s.heading))?.text?.slice(0, 700) }
        : { error: 'no boss by that name' }
    }
    case 'guide': {
      const doc = await loadGuides().catch(() => null)
      const hits = doc ? matchGuides(q, guideExcerpts(doc), 2) : []
      return hits.map((h) => ({ page: h.page, heading: h.heading, text: h.text.slice(0, 700) }))
    }
    case 'upgrade': {
      const weapons = await loadWeapons().catch(() => null)
      if (!weapons) return { error: 'weapon data unavailable' }
      const kitId = typeof ctx.character.answers.buildKit === 'string' ? ctx.character.answers.buildKit : ''
      const kit = [...opBuilds, ...pvpBuilds].find((b) => b.id === kitId)
      const prefer = dominantAttributes(kit ? kit.stats : ctx.character.stats)
      const weapon = typeof args.weapon === 'string' ? args.weapon : ''
      const adv = weapon ? weaponAdvice(weapons, weapon, ctx.character.stats) : null
      if (adv) return { weapon: adv.name, arNow: adv.arNow, arMax: adv.arMax, primary: adv.primary, kit: kit?.name ?? null, prefer }
      return { kit: kit?.name ?? null, prefer, best: earlyWeaponRanking(weapons, ctx.character.stats, 6, prefer) }
    }
    case 'enemy': {
      const [bosses, enemies] = await Promise.all([
        loadBossCombat().catch(() => []),
        loadEnemyCombat().catch(() => []),
      ])
      const q = String(args.name ?? '').toLowerCase()
      const hit = [...bosses, ...enemies].find((x) => x.name.toLowerCase().includes(q))
      if (!hit) return { error: 'no enemy by that name' }
      const neg = hit.negation ?? {}
      const weakest = Object.entries(neg).sort((a, b) => a[1] - b[1])[0]
      return { name: hit.name, baseHp: hit.baseHp, poise: hit.poise, negation: neg, resist: hit.resist, weakest: weakest ? weakest[0] : null }
    }
    case 'find_item': {
      const name = String(args.name ?? '')
      const [doc, acq] = await Promise.all([
        loadEngineMarkers().catch(() => null),
        loadAcquisition().catch(() => null),
      ])
      const items = doc ? matchEngineItems(name, doc.items, 3) : []
      const a = acq ? matchAcquisition(name, acq.rows, 1)[0] : null
      return {
        items: items.map((h) => ({ name: h.name, near: h.near, region: h.map })),
        acquisition: a
          ? { method: a.method, where: a.location.slice(0, 300), near: a.near, missable: a.missable, prereqs: a.prereqs }
          : null,
      }
    }
    case 'secrets': {
      const doc = await loadSecrets().catch(() => null)
      const hits = doc ? matchSecrets(q, doc.walls, 8) : []
      return hits.map((w) => ({ area: w.area, heading: w.heading, text: w.text }))
    }
    case 'wiki': {
      const doc = await loadWikiText().catch(() => null)
      const hits = doc ? matchWiki(q, doc.sections, 3) : []
      return hits.map((h) => ({ page: h.page, heading: h.heading, text: h.text.slice(0, 600) }))
    }
    case 'recipe': {
      const doc = await loadRecipes().catch(() => null)
      const hits = doc ? matchRecipes(String(args.name ?? ''), doc.recipes, 3) : []
      return hits.map((r) => ({ name: r.name, materials: r.materials }))
    }
    case 'quest_steps': {
      const doc = await loadNpcQuests().catch(() => null)
      const hit = doc ? findQuest(String(args.npc ?? ''), doc.quests) : undefined
      return hit
        ? { npc: hit.npc, steps: hit.steps.slice(0, 12).map((s) => ({ order: s.order, location: s.location, action: s.action.slice(0, 220), breaks: s.breaks })) }
        : { error: 'no quest by that npc' }
    }
    case 'dialogue': {
      const [owners, talkmsg] = await Promise.all([
        loadDialogueOwners().catch(() => null),
        loadGameTextTable('TalkMsg').catch(() => null),
      ])
      if (!owners || !talkmsg) return { error: 'dialogue unavailable' }
      const quote = quoteFor(String(args.speaker ?? ''), owners, talkmsg, 3)
      return quote ?? { error: 'no attributed lines for that speaker' }
    }
    case 'get_entity': {
      const entity = getEntity(String(args.id ?? ''))
      const st = status(entity.id, ctx.character)
      return {
        id: entity.id,
        kind: entity.kind,
        name: entity.name,
        summary: entity.summary,
        status: st.state,
        why: st.why,
        edges: edges(entity.id)
          .slice(0, 12)
          .map((e) => ({ rel: e.rel, to: e.to, label: e.label, name: entityName(e.to) })),
      }
    }
    case 'edges': {
      const id = String(args.id ?? '')
      const rel = typeof args.rel === 'string' ? args.rel.trim() : ''
      const all = edges(id)
      const list = rel ? all.filter((e) => e.rel === rel) : all
      return list.slice(0, 24).map((e) => ({
        rel: e.rel,
        to: e.to,
        label: e.label,
        name: entityName(e.to),
        source: e.source,
      }))
    }
    case 'where': {
      const entity = getEntity(String(args.id ?? ''))
      const [acqDoc, coordRows] = await Promise.all([
        loadAcquisition().catch(() => null),
        loadCoordRows().catch(() => [] as CoordPin[]),
      ])
      const acq = acqDoc ? matchAcquisition(entity.name, acqDoc.rows, 1)[0] : null
      const pin = matchCoords(entity.name, coordRows)[0] ?? null
      return {
        id: entity.id,
        name: entity.name,
        kind: entity.kind,
        region: pin?.world ?? entity.summary,
        acquisition: acq
          ? { method: acq.method, where: acq.location.slice(0, 300), near: acq.near, missable: acq.missable }
          : null,
        map: pin ? { world: pin.world, x: pin.x, y: pin.y } : null,
      }
    }
    case 'character': {
      const p = summarize(ctx.character)
      const avail = stillAvailable(ctx.character)
      const goals = ctx.memory.goalId
        ? [ctx.memory.goalId]
        : [...avail.active, ...avail.open].slice(0, 3).map((r) => `line:${r.line.id}`)
      return {
        name: ctx.character.name,
        level: ctx.character.level,
        startingClass: ctx.character.startingClass,
        stats: ctx.character.stats,
        loadout: ctx.character.loadout,
        owned: {
          defeatedBosses: ctx.character.defeatedBosses,
          discoveredGraces: ctx.character.discoveredGraces,
          collectedItems: ctx.character.collectedItems,
          completedQuestSteps: ctx.character.completedQuestSteps,
        },
        progress: p,
        currentArea: ctx.area
          ? { region: ctx.area.region, place: ctx.area.place ?? null, source: ctx.area.source }
          : null,
        goals,
      }
    }
    case 'advise': {
      const kind = String(args.kind ?? 'todo').trim().toLowerCase()
      const [weapons, areas] = await Promise.all([
        loadWeapons().catch(() => undefined),
        loadRegionLevels().then((d) => d.areas).catch(() => undefined),
      ])
      if (kind === 'respec') {
        const plan = planRespec(ctx.character, String(args.build ?? ''), { weapons })
        return plan ?? { error: 'no build by that id' }
      }
      const adv = advise(ctx.character, { weapons, areas })
      if (kind === 'upgrades') {
        return adv.upgrades.slice(0, 6).map((u) => ({
          name: u.name,
          ar: u.ar,
          gainPct: u.gainPct,
          owned: u.owned,
          obtainableNow: u.obtainableNow,
          requirement: u.requirement,
          factId: u.factId,
        }))
      }
      if (kind === 'gear') {
        return adv.gear.map((g) => ({
          name: g.name,
          kind: g.kind,
          why: g.why,
          owned: g.owned,
          obtainableNow: g.obtainableNow,
          factId: g.factId,
        }))
      }
      return adv.todo.map((t) => ({ kind: t.kind, title: t.title, reason: t.reason, action: t.action, factId: t.factId, module: t.module }))
    }
    case 'quest': {
      const key = String(args.id ?? '').trim()
      const line = findLine(key)
      if (!line) return { error: 'no quest line by that id' }
      const row = survey(ctx.character).find((r) => r.line.id === line.id)
      const done = new Set(ctx.character.completedQuestSteps)
      const beats = line.steps.map((s, i) => ({
        order: i + 1,
        do: s.do,
        factId: s.factId ?? null,
        location: s.detail,
        state: s.factId && done.has(s.factId) ? 'done' : 'pending',
      }))
      const nextIndex = row?.current ? line.steps.findIndex((s) => s.factId === row.current?.factId) : -1
      return {
        line: line.id,
        name: line.name,
        state: row?.state ?? 'open',
        note: row?.note ?? '',
        next: row?.current?.factId ?? (nextIndex >= 0 ? line.steps[nextIndex]?.factId ?? null : null),
        nextBeat: row?.current?.do ?? null,
        beats,
      }
    }
    default:
      return { error: `unknown tool ${name}` }
  }
}

let coordCache: CoordPin[] | null = null

/** Static-plate pins (coords + boss projections) for the `where` tool. Best-effort. */
async function loadCoordRows(): Promise<CoordPin[]> {
  if (coordCache) return coordCache
  const [list, bosses] = await Promise.all([
    fetch('/sourced/open/coords.json').then((r) => r.json() as Promise<CoordPin[]>),
    fetch('/sourced/open/boss-pins.json').then((r) => r.json() as Promise<CoordPin[]>).catch(() => [] as CoordPin[]),
  ])
  coordCache = [...list, ...bosses]
  return coordCache
}
