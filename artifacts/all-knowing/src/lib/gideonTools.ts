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
import { loadWikiPageByEntity, searchWiki } from './wikiSearch'
import { loadSecrets, matchSecrets } from './secrets'
import { loadGameTextTable } from './gameText'
import { quoteFor } from './dialogueQuote'
import { advise, planRespec } from './advisor'
import { edges, entityName, getEntity, status } from './entityGraph'
import { enrichmentFor } from './entityEnrich'
import { searchRecordIds } from './entityIndex'
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

/** A string parameter; the description is dropped when it only restates the name. */
const str = (description?: string) => (description ? { type: 'string', description } : { type: 'string' })

/** Task 153 §2 — one-sentence descriptions and name-only parameters keep the
 * tool schema small; the array order below is the canonical, cache-stable order. */
export const GIDEON_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Resolve a name (item, boss, grace, quest, region) to real fact ids.',
      parameters: {
        type: 'object',
        properties: { q: str(), kind: str('entity kind filter, e.g. boss, grace, weapon') },
        required: ['q'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'here',
      description: 'What is still open in the current or named region.',
      parameters: { type: 'object', properties: { q: str() }, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'level_check',
      description: 'Recommended level band for a region and whether the character is over/under-levelled.',
      parameters: { type: 'object', properties: { q: str() }, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'boss',
      description: 'A boss: HP, locations, drops and its fight strategy.',
      parameters: { type: 'object', properties: { name: str() }, required: ['name'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'guide',
      description: 'Mechanics or guide text (upgrades, smithing, status effects, stats, damage types).',
      parameters: { type: 'object', properties: { q: str() }, required: ['q'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upgrade',
      description: 'Weapon upgrade/AR advice for this character; omit weapon to list the best wieldable weapons.',
      parameters: { type: 'object', properties: { weapon: str('weapon name') }, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enemy',
      description: 'Combat profile for a boss or enemy: HP, poise, damage negation and status resistances.',
      parameters: { type: 'object', properties: { name: str() }, required: ['name'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_item',
      description: 'Where to find a named item: nearest grace, how it is obtained, and whether it is missable.',
      parameters: { type: 'object', properties: { name: str() }, required: ['name'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'secrets',
      description: 'Illusory or hidden walls by area, and what is behind them.',
      parameters: { type: 'object', properties: { q: str() }, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wiki',
      description: 'Search the bundled wiki text for a mechanic, enemy, location, boss detail or term.',
      parameters: { type: 'object', properties: { q: str() }, required: ['q'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wiki_search',
      description: 'Full-text search of the wiki; returns top sections with page, heading and entity id.',
      parameters: { type: 'object', properties: { q: str() }, required: ['q'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wiki_page',
      description: 'The full wiki page for a fact id or wiki:<slug> id.',
      parameters: { type: 'object', properties: { id: str() }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recipe',
      description: 'Crafting recipe for a named craftable item: its materials and quantities.',
      parameters: { type: 'object', properties: { name: str() }, required: ['name'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quest_steps',
      description: 'Step-by-step walkthrough for a named NPC quest.',
      parameters: { type: 'object', properties: { npc: str() }, required: ['npc'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'dialogue',
      description: 'Verbatim attributed in-game dialogue for a named NPC.',
      parameters: { type: 'object', properties: { speaker: str() }, required: ['speaker'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_entity',
      description: 'One entity by fact id: name, kind, summary, status and key graph edges.',
      parameters: { type: 'object', properties: { id: str() }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edges',
      description: 'The relationship edges of an entity (drops, locks, weakTo, quest beats, …).',
      parameters: {
        type: 'object',
        properties: { id: str(), rel: str('edge relation to filter by') },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'where',
      description: 'Where an entity is: acquisition text and the map target when known.',
      parameters: { type: 'object', properties: { id: str() }, required: ['id'], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'character',
      description: 'The current Tarnished: level, stats, loadout, owned facts, progress and goals.',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'advise',
      description: 'The advisor for this character: kind upgrades | gear | todo | respec.',
      parameters: {
        type: 'object',
        properties: { kind: str('upgrades | gear | todo | respec'), build: str('build id for respec') },
        required: ['kind'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quest',
      description: 'A quest line by id: its beats with done / next / locked state.',
      parameters: { type: 'object', properties: { id: str() }, required: ['id'], additionalProperties: false },
    },
  },
]

/** Task 153 §2 — the intent flags `askGideon` already computes, used to trim the
 * tool list to a per-question subset. */
export type GideonIntent = {
  combat?: boolean
  placements?: boolean
  guides?: boolean
  weapons?: boolean
  levels?: boolean
  dialogue?: boolean
  medusa?: boolean
  quests?: boolean
}

/** Always present: entity search + lookup + the open-ended wiki search. */
const CORE_TOOLS = ['search', 'get_entity', 'wiki_search']

const TOOLS_BY_INTENT: { key: keyof GideonIntent; tools: string[] }[] = [
  { key: 'combat', tools: ['boss', 'enemy'] },
  { key: 'placements', tools: ['find_item', 'where', 'here'] },
  { key: 'guides', tools: ['guide', 'wiki'] },
  { key: 'weapons', tools: ['upgrade', 'advise'] },
  { key: 'levels', tools: ['level_check', 'here', 'advise'] },
  { key: 'dialogue', tools: ['dialogue'] },
  { key: 'medusa', tools: ['quest', 'quest_steps'] },
  { key: 'quests', tools: ['quest', 'quest_steps', 'recipe'] },
]

/** Max tools in one request (Task 153 §2). */
export const MAX_GIDEON_TOOLS = 8

/**
 * The tool subset for a question: the always-on core plus the groups its intent
 * flags select, capped at 8. The result is filtered back through `GIDEON_TOOLS`
 * so the order is always the canonical one — identical intent sets produce an
 * identical array and the request prefix stays cacheable.
 */
export function selectGideonTools(intents: GideonIntent = {}): ToolDef[] {
  const wanted = new Set<string>(CORE_TOOLS)
  for (const { key, tools } of TOOLS_BY_INTENT) {
    if (intents[key]) for (const name of tools) wanted.add(name)
  }
  const selected = new Set<string>(CORE_TOOLS)
  for (const tool of GIDEON_TOOLS) {
    if (selected.size >= MAX_GIDEON_TOOLS) break
    if (wanted.has(tool.function.name)) selected.add(tool.function.name)
  }
  return GIDEON_TOOLS.filter((tool) => selected.has(tool.function.name))
}

export type ToolContext = { character: Character; memory: GideonMemory; area?: AreaSignal | null }

/** Run one tool call against the real data. Always returns a JSON-serializable value. */
export async function runGideonTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  const q = typeof args.q === 'string' ? args.q : ''
  switch (name) {
    case 'search': {
      const kind = typeof args.kind === 'string' ? args.kind.trim().toLowerCase() : ''
      const hits = searchSync(q).slice(0, 20).map((h) => ({ id: h.id, name: h.name, module: h.module, kind: getEntity(h.id).kind }))
      const seen = new Set(hits.map((h) => h.id))
      // Task 132 §4 — the enrichment index carries the kinds the authored graph
      // does not (wiki NPCs, locations, enemies, the full item plane).
      const indexHits = searchRecordIds(q, kind || undefined, 8)
        .filter((r) => !seen.has(r.id))
        .map((r) => ({
          id: r.id,
          name: r.name,
          module: r.kind === 'region' || r.kind === 'grace' || r.kind === 'enemy' ? 'map' : 'codex',
          kind: r.kind,
        }))
      const merged = kind ? [...hits, ...indexHits].filter((h) => h.kind === kind) : [...hits, ...indexHits]
      return merged.slice(0, 8)
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
        ? { name: hit.name, listedHp: hit.hp, hpNote: 'Fextralife listed HP, not NpcParam base HP', locations: hit.locations, drops: hit.drops, guide: (hit.sections ?? []).find((s) => /guide/i.test(s.heading))?.text?.slice(0, 700) }
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
      if (hit) {
        const neg = hit.negation ?? {}
        const weakest = Object.entries(neg).sort((a, b) => a[1] - b[1])[0]
        return { name: hit.name, baseHp: hit.baseHp, poise: hit.poise, negation: neg, resist: hit.resist, weakest: weakest ? weakest[0] : null }
      }
      // Task 132 §4 — fall back to the enriched enemy index (wiki-only enemies).
      const rec = searchRecordIds(String(args.name ?? ''), 'enemy', 1)[0]
      if (rec) return { id: rec.id, name: rec.name, baseHp: rec.stats?.HP ?? null, stats: rec.stats ?? {}, location: rec.location ?? null, drops: rec.drops ?? [] }
      return { error: 'no enemy by that name' }
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
    case 'wiki_search': {
      if (!q.trim()) return { error: 'empty query' }
      const hits = await searchWiki(q, 4).catch(() => [])
      return hits.map((hit) => ({
        id: hit.entityId,
        page: hit.title,
        heading: hit.heading,
        excerpt: hit.markdown.slice(0, 600),
        entityIds: [...new Set([hit.entityId, ...[...hit.markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1])])],
      }))
    }
    case 'wiki_page': {
      const found = await loadWikiPageByEntity(String(args.id ?? '')).catch(() => null)
      if (!found) return { error: 'no wiki page for that id' }
      return {
        id: found.page.entityId,
        title: found.page.title,
        url: found.page.url,
        sections: found.page.sections.map((section) => ({ heading: section.heading, markdown: section.markdown.slice(0, 2000) })),
      }
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
      const enriched = enrichmentFor(entity.id)
      return {
        id: entity.id,
        kind: entity.kind,
        name: entity.name,
        summary: entity.summary,
        status: st.state,
        why: st.why,
        enriched: enriched
          ? {
              description: enriched.description,
              location: enriched.location,
              map: enriched.map,
              stats: enriched.stats,
              drops: enriched.drops,
              strategy: enriched.strategy,
              sources: enriched.sources,
            }
          : undefined,
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
      // Task 132 §4 — index records (NPCs, locations, enemies) carry their own
      // region + plate coords when no acquisition/engine row matches.
      const enriched = enrichmentFor(entity.id)
      return {
        id: entity.id,
        name: entity.name,
        kind: entity.kind,
        region: pin?.world ?? enriched?.region ?? enriched?.location ?? entity.summary,
        acquisition: acq
          ? { method: acq.method, where: acq.location.slice(0, 300), near: acq.near, missable: acq.missable }
          : null,
        map: pin ? { world: pin.world, x: pin.x, y: pin.y } : (enriched?.map ?? null),
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
