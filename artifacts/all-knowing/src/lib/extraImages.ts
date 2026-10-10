import extraIndex from '../data/image-index-extra.json'
import { fanImage, normalizeName } from './fanImage'

/**
 * Task 184 — the local picture plane for the kinds the FanAPI index misses.
 *
 * `src/data/image-index.json` (Task 36/154) predates Shadow of the Erdtree, so
 * enemies, NPCs, graces, regions, merchants and quests mostly had no picture.
 * `src/data/image-index-extra.json` (built by `scripts/build-image-index-extra.py`)
 * maps their normalised names and record ids to locally cached WebP thumbnails
 * under `public/sourced/images/`:
 *
 *  - `creatures/` / `npcs/` — wiki-dump portraits (`scripts/ingest-entity-images.py`);
 *  - `places/` — map-plate crops centred on a grace's / region's coords;
 *  - npc/creature portraits for merchants and quests, taken from their owner.
 *
 * This is the same normalisation `fanImage` uses, so the UI can try the FanAPI
 * plane first and fall back here (`fanImage(name) ?? extraImage(name)`). It is
 * deliberately a separate module: Task 182 owns `fanImage.ts`.
 */
const index = extraIndex as { names: Record<string, string>; ids: Record<string, string> }

/**
 * Resolve a local picture for an entity the FanAPI index has none for. Tries
 * the full name, each alias, then the slash-separated halves of a phase name,
 * exactly like `fanImage`.
 */
export function extraImage(name: string, aliases: string[] = []): string | undefined {
  const candidates = [name, ...aliases, ...name.split('/')]
  for (const candidate of candidates) {
    const key = normalizeName(candidate)
    const hit = key ? index.names[key] : undefined
    if (hit) return hit
  }
  return undefined
}

/** The exact picture for a record id (`kind:slug`), when the name is not unique. */
export function extraImageById(id: string): string | undefined {
  return index.ids[id]
}

/**
 * Task 193 §4 — the brand category artwork, one `cat-<kind>` WebP per kind.
 *
 * When an entity has no real picture (neither the FanAPI plane nor the local
 * extra plane resolves one), the matching category icon is shown instead of a
 * generic seal, so a mechanic still reads as a mechanic and a grace as a grace.
 * Real pictures always win: call `entityImage` or try `fanImage ?? extraImage`
 * before reaching for this map.
 */
const BRAND_CATEGORY_ICON: Record<string, string> = {
  mechanic: '/brand/cat-mechanic.webp',
  gate: '/brand/cat-gate.webp',
  build: '/brand/cat-build.webp',
  pvp: '/brand/cat-pvp.webp',
  quest: '/brand/cat-quest.webp',
  ending: '/brand/cat-ending.webp',
  guide: '/brand/cat-guide.webp',
  region: '/brand/cat-region.webp',
  grace: '/brand/cat-grace.webp',
  merchant: '/brand/cat-merchant.webp',
  npc: '/brand/cat-npc.webp',
  enemy: '/brand/cat-enemy.webp',
}

/** The brand fallback picture for a kind (or library category), if one exists. */
export function brandCategoryIcon(kind: string | undefined): string | undefined {
  return kind ? BRAND_CATEGORY_ICON[kind] : undefined
}

/**
 * The full picture lookup: the FanAPI plane, then the local extra plane, then
 * (Task 193) the brand category icon for `kind`. Real pictures always win.
 */
export function entityImage(name: string, aliases: string[] = [], kind?: string): string | undefined {
  return fanImage(name, aliases) ?? extraImage(name, aliases) ?? brandCategoryIcon(kind)
}

/** Number of names with a cached extra picture — used by tests and status copy. */
export function extraImageCount(): number {
  return Object.keys(index.names).length
}
