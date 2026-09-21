/** Rules taken from XArckX “Location And Field's Boss Completion Check” (Nexus 9974).
 *  The zip is a game patch (regulation.bin + map gfx). We keep the meaning, not the binaries.
 */
import huntsJson from '../../public/sourced/checklists/hunts.json'

export type CompleteHow = 'chest' | 'final-boss' | 'named-boss' | 'skip'

export const completionRules: { kind: string; how: CompleteHow; note: string }[] = [
  { kind: 'ruins', how: 'chest', note: 'Chest looted. The map icon ticks even if you never fought the ruin’s trash.' },
  { kind: 'cave', how: 'final-boss', note: 'Last boss in the hole is dead.' },
  { kind: 'tunnel', how: 'final-boss', note: 'Last boss is dead.' },
  { kind: 'catacombs', how: 'final-boss', note: 'Last boss is dead.' },
  { kind: 'hero-grave', how: 'final-boss', note: 'Last boss is dead.' },
  { kind: 'legacy', how: 'final-boss', note: 'Legacy dungeon tick is the remembrance / area boss.' },
  { kind: 'field-boss', how: 'named-boss', note: 'The open-world hunt itself. Icon only after the kill — no spoil pin.' },
  { kind: 'church', how: 'skip', note: '9974 does not tick churches.' },
  { kind: 'shack', how: 'skip', note: '9974 does not tick shacks.' },
]

export type FieldHunt = {
  id: string
  name: string
  aliases: string[]
  /** Canonical spawn the curated entry points at (a shared id can have several). */
  place: string
  region: string
  campaign: 'base' | 'sote'
}

/** One row of the canonical BuLEEto field-hunt dump. A boss with several spawns
 *  shares one `id` across several rows (one per `place`/`flag`). */
type CanonicalHunt = {
  id: string
  name: string
  place: string
  region: string
  flag: number
  campaign: 'base' | 'sote'
}

/**
 * The canonical field-hunt dataset is `public/sourced/checklists/hunts.json` — the
 * same file Codex fetches at runtime and the save parser reads flags from. There is
 * no second, independently-authored hunt table: `fieldHunts` below is only the
 * curated alias layer Gideon matches on, and every id/name/region/campaign on it is
 * derived from this dump (see `docs/research/hunt-data-cleanup.md`).
 */
export const canonicalHunts = huntsJson as CanonicalHunt[]

/** Curated hunts Gideon knows by short alias, keyed to the canonical `hunt:` id.
 *  `place` disambiguates an id shared by several spawns (first row wins otherwise). */
const HUNT_CURATION: { id: string; aliases: string[]; place?: string }[] = [
  { id: 'hunt:flying-dragon-agheel', aliases: ['agheel'] },
  { id: 'hunt:glintstone-dragon-smarag', aliases: ['smarag'] },
  { id: 'hunt:glintstone-dragon-adula', aliases: ['adula'] },
  { id: 'hunt:ancient-dragon-lansseax', aliases: ['lansseax'] },
  { id: 'hunt:flying-dragon-greyll', aliases: ['greyll'] },
  { id: 'hunt:decaying-ekzykes', aliases: ['ekzykes'] },
  { id: 'hunt:borealis-the-freezing-fog', aliases: ['borealis'] },
  { id: 'hunt:great-wyrm-theodorix', aliases: ['theodorix'] },
  { id: 'hunt:commander-o-neil', aliases: ['oneil', "o'neil"] },
  { id: 'hunt:fallingstar-beast', place: 'Sellia Crystal Tunnel', aliases: ['fallingstar', 'fingerstone'] },
  { id: 'hunt:godskin-apostle', place: 'Dominula, Windmill Village', aliases: ['windmill apostle'] },
  { id: 'hunt:tibia-mariner', aliases: ['tibia'] },
  { id: 'hunt:tree-sentinel', place: 'Church of Elleh', aliases: ['tree sentinel', 'shaman sentinels'] },
  { id: 'hunt:bell-bearing-hunter', aliases: ['bell bearing'] },
  { id: 'hunt:black-blade-kindred', aliases: ['kindred'] },
  { id: 'hunt:draconic-tree-sentinel', aliases: ['draconic'] },
  { id: 'hunt:dragonkin-soldier', aliases: ['dragonkin'] },
  { id: 'hunt:ralva-the-great-red-bear', aliases: ['ralva'] },
  { id: 'hunt:rugalea-the-great-red-bear', aliases: ['rugalea'] },
  { id: 'hunt:ghostflame-dragon', aliases: ['ghostflame dragon'] },
  { id: 'hunt:jagged-peak-drake', aliases: ['jagged peak drake'] },
  { id: 'hunt:demi-human-queen-marigga', aliases: ['marigga'] },
]

function canonicalRow(id: string, place?: string): CanonicalHunt | undefined {
  return canonicalHunts.find((row) => row.id === id && (!place || row.place === place))
}

export const fieldHunts: FieldHunt[] = HUNT_CURATION.map(({ id, aliases, place }) => {
  const row = canonicalRow(id, place)
  if (!row) throw new Error(`fieldHunts: ${id} is not in hunts.json — the canonical dump changed`)
  return { id: row.id, name: row.name, aliases, place: row.place, region: row.region, campaign: row.campaign }
})
