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
import { loadGameTextTable } from './gameText'
import { quoteFor } from './dialogueQuote'
import { opBuilds } from '../knowledge/builds'
import { pvpBuilds } from '../knowledge/pvp'
import type { Character } from '../types'
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
      parameters: { type: 'object', properties: { q: str('name to look up') }, required: ['q'], additionalProperties: false },
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
      description: 'Where a named item/pickup is: its nearest Site of Grace and region, from the engine map data.',
      parameters: { type: 'object', properties: { name: str('item name') }, required: ['name'], additionalProperties: false },
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
]

export type ToolContext = { character: Character; memory: GideonMemory }

/** Run one tool call against the real data. Always returns a JSON-serializable value. */
export async function runGideonTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  const q = typeof args.q === 'string' ? args.q : ''
  switch (name) {
    case 'search':
      return searchSync(q).slice(0, 8).map((h) => ({ id: h.id, name: h.name, module: h.module }))
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
      const doc = await loadEngineMarkers().catch(() => null)
      const hits = doc ? matchEngineItems(String(args.name ?? ''), doc.items, 3) : []
      return hits.map((h) => ({ name: h.name, near: h.near, region: h.map, cat: h.cat }))
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
    default:
      return { error: `unknown tool ${name}` }
  }
}
