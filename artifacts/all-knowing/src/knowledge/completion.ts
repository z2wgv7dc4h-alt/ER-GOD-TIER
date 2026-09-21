/** Rules taken from XArckX “Location And Field's Boss Completion Check” (Nexus 9974).
 *  The zip is a game patch (regulation.bin + map gfx). We keep the meaning, not the binaries.
 */
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
  region: string
  campaign: 'base' | 'sote'
}

export const fieldHunts: FieldHunt[] = [
  { id: 'hunt:agheel', name: 'Flying Dragon Agheel', aliases: ['agheel'], region: 'Limgrave', campaign: 'base' },
  { id: 'hunt:smarag', name: 'Glintstone Dragon Smarag', aliases: ['smarag'], region: 'Liurnia', campaign: 'base' },
  { id: 'hunt:adula', name: 'Glintstone Dragon Adula', aliases: ['adula'], region: 'Moonlight Altar', campaign: 'base' },
  { id: 'hunt:lansseax', name: 'Ancient Dragon Lansseax', aliases: ['lansseax'], region: 'Altus', campaign: 'base' },
  { id: 'hunt:greyll', name: 'Flying Dragon Greyll', aliases: ['greyll'], region: 'Caelid', campaign: 'base' },
  { id: 'hunt:ekzykes', name: 'Decaying Ekzykes', aliases: ['ekzykes'], region: 'Caelid', campaign: 'base' },
  { id: 'hunt:borealis', name: 'Borealis the Freezing Fog', aliases: ['borealis'], region: 'Mountaintops', campaign: 'base' },
  { id: 'hunt:theodorix', name: 'Great Wyrm Theodorix', aliases: ['theodorix'], region: 'Consecrated Snowfield', campaign: 'base' },
  { id: 'hunt:oneil', name: "Commander O'Neil", aliases: ['oneil', "o'neil"], region: 'Swamp of Aeonia', campaign: 'base' },
  { id: 'hunt:fallingstar-limgrave', name: 'Fallingstar Beast', aliases: ['fallingstar'], region: 'Limgrave / Sellia Crystal', campaign: 'base' },
  { id: 'hunt:godskin-windmill', name: 'Godskin Apostle (Windmill)', aliases: ['windmill apostle'], region: 'Dominula', campaign: 'base' },
  { id: 'hunt:tibia', name: 'Tibia Mariner', aliases: ['tibia'], region: 'Several', campaign: 'base' },
  { id: 'hunt:tree-sentinel-limgrave', name: 'Tree Sentinel (Limgrave)', aliases: ['tree sentinel'], region: 'Limgrave', campaign: 'base' },
  { id: 'hunt:bell-hunter', name: 'Bell Bearing Hunter', aliases: ['bell bearing'], region: 'Several', campaign: 'base' },
  { id: 'hunt:kindred', name: 'Black Blade Kindred', aliases: ['kindred'], region: 'Bestial Sanctum / Forbidden Lands', campaign: 'base' },
  { id: 'hunt:draconic-capital', name: 'Draconic Tree Sentinel', aliases: ['draconic'], region: 'Capital Outskirts', campaign: 'base' },
  { id: 'hunt:dragonkin', name: 'Dragonkin Soldier', aliases: ['dragonkin'], region: 'Siofra / Lake of Rot', campaign: 'base' },
  { id: 'hunt:ralva', name: 'Ralva the Great Red Bear', aliases: ['ralva'], region: 'Scadu Altus', campaign: 'sote' },
  { id: 'hunt:rugalea', name: 'Rugalea the Great Red Bear', aliases: ['rugalea'], region: 'Rauh', campaign: 'sote' },
  { id: 'hunt:ghostflame', name: 'Ghostflame Dragon', aliases: ['ghostflame dragon'], region: 'Gravesite / Scadu', campaign: 'sote' },
  { id: 'hunt:jagged-drake', name: 'Jagged Peak Drake', aliases: ['jagged peak drake'], region: 'Jagged Peak', campaign: 'sote' },
  { id: 'hunt:marigga', name: 'Demi-Human Queen Marigga', aliases: ['marigga'], region: 'Cerulean Coast', campaign: 'sote' },
  { id: 'hunt:fingerstone-beast', name: 'Fallingstar Beast (Fingerstone Hill)', aliases: ['fingerstone'], region: 'Fingerstone Hill', campaign: 'sote' },
  { id: 'hunt:shaman-sentinels', name: 'Tree Sentinel duo (Shaman Village)', aliases: ['shaman sentinels'], region: 'Hinterland', campaign: 'sote' },
]
