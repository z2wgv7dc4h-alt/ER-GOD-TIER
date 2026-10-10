import tipsJson from '../data/player-tips.json'

/**
 * Task 195 §1/§2 — the curated player-tip corpus.
 *
 * Built by `scripts/curate-player-tips.mjs` from the Reddit/forum corpus
 * (`public/sourced/open/player-knowledge.json`), reduced to the reviewed,
 * actionable rows and committed at `src/data/player-tips.json`. Each tip is
 * keyed to a resolved entity id and one placement kind, so the existing pages
 * can show it in place — boss strategy, item usage, PvP tech, mechanics,
 * region warnings, or a Guides topic — with the "Player tip" tag. Read-only:
 * nothing here is invented, every string comes from the JSON on disk.
 */

export type PlayerTipKind = 'boss' | 'item' | 'pvp' | 'mechanic' | 'region' | 'general'

export type PlayerTip = {
  id: string
  entityId: string
  kind: PlayerTipKind
  text: string
  patch: string
  score: number
}

export const playerTips: PlayerTip[] = tipsJson.tips as PlayerTip[]

const byEntity = new Map<string, PlayerTip[]>()
for (const tip of playerTips) {
  const list = byEntity.get(tip.entityId) ?? []
  list.push(tip)
  byEntity.set(tip.entityId, list)
}

/** Tips attached to one entity, optionally narrowed to a placement kind. */
export function tipsFor(entityId: string, kind?: PlayerTipKind): PlayerTip[] {
  const list = byEntity.get(entityId) ?? []
  return kind ? list.filter((tip) => tip.kind === kind) : list
}

/** Every tip that belongs to one placement. */
export function tipsByKind(kind: PlayerTipKind): PlayerTip[] {
  return playerTips.filter((tip) => tip.kind === kind)
}

function fold(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Region tips whose entity's area matches the character's current region. The
 * tip entities are `region:*` / `dungeon:*` / `grace:*`, so the id tail is the
 * place name to compare (e.g. `region:limgrave` for the Limgrave area).
 */
export function regionTipsFor(area: string | null | undefined): PlayerTip[] {
  if (!area) return []
  const target = fold(area)
  if (target.length < 3) return []
  return tipsByKind('region').filter((tip) => {
    const place = fold(tip.entityId.slice(tip.entityId.indexOf(':') + 1).replace(/-/g, ' '))
    return place === target || place.includes(target) || target.includes(place)
  })
}
