import type { Campaign } from '../types'

export type LootKind = 'sorcery' | 'incantation' | 'item' | 'weapon' | 'talisman' | 'ash' | 'spirit'

export type Loot = {
  id: string
  name: string
  aliases: string[]
  kind: LootKind
  region: string
  campaign: Campaign
  grace?: string
  how: string
  missable?: boolean
}

/** Places people actually ask. Full param dump still comes from extract. */
export const loot: Loot[] = [
  { id: 'loot:night-comet', name: 'Night Comet', aliases: ['night comet', 'invisible comet'], kind: 'sorcery', region: 'Sellia', campaign: 'base', grace: 'grace:rotview', how: 'Sellia Town of Sorcery — chest after lighting the braziers. Need the Sellia sealed-town puzzle.' },
  { id: 'loot:comet-azur', name: 'Comet Azur', aliases: ['azur', 'comet azure'], kind: 'sorcery', region: 'Mt. Gelmir', campaign: 'base', how: 'Primeval Sorcerer Azur on the cliff after Hermit Village. Starts Sellen’s primeval ending.' },
  { id: 'loot:stars-of-ruin', name: 'Stars of Ruin', aliases: ['lusat stars'], kind: 'sorcery', region: 'Caelid', campaign: 'base', how: 'Lusat in Sellia Hideaway after Sellen’s quest reaches him.' },
  { id: 'loot:adula', name: "Adula's Moonblade", aliases: ['adula', 'moonblade'], kind: 'sorcery', region: 'Moonlight Altar', campaign: 'base', grace: 'grace:lake-shore', how: 'Drop from Glintstone Dragon Adula at the Cathedral of Manus Celes. Ranni’s late line.' },
  { id: 'loot:carian-slicer', name: 'Carian Slicer', aliases: ['slicer'], kind: 'sorcery', region: 'Liurnia', campaign: 'base', grace: 'grace:lake-shore', how: 'Sold by Sellen, or her corpse if her line is finished.' },
  { id: 'loot:knights-lightning', name: "Knight's Lightning Spear", aliases: ['lightning spear dlc', 'knights lightning'], kind: 'incantation', region: 'Scorpion River', campaign: 'sote', how: 'Scorpion River Catacombs chest, Realm of Shadow.' },
  { id: 'loot:pest-threads-plus', name: 'Pest-Thread Spears', aliases: ['pest threads', 'pest thread'], kind: 'incantation', region: 'Church of the Bud', campaign: 'sote', how: 'Church of the Bud, after crossing the sealed woods approach.' },
  { id: 'loot:giantsflame', name: "Giant's Flame Take Thee", aliases: ['giants flame', 'take thee'], kind: 'incantation', region: 'Mountaintops', campaign: 'base', grace: 'grace:forge-giants', how: 'Giant-Conquering Hero’s Grave, after the fire prelate.' },
  { id: 'loot:blessing-boon', name: "Blessing's Boon", aliases: ['blessings boon'], kind: 'incantation', region: 'Liurnia', campaign: 'base', how: 'Sold by Miriel at the Church of Vows, or found on a corpse in the minor erdtree vicinity.' },
  { id: 'loot:golden-vow', name: 'Golden Vow', aliases: ['golden vow incant'], kind: 'incantation', region: 'Altus', campaign: 'base', grace: 'grace:ergtree-grazing', how: 'Corpse-finger ruins north of the Altus highway, or the shared ash of war version from Knight Bernahl.' },
  { id: 'loot:flame-grant', name: 'Flame, Grant Me Strength', aliases: ['fgms', 'flame grant me strength'], kind: 'incantation', region: 'Fort Gael', campaign: 'base', how: 'Behind Fort Gael, two flame pillars. Caelid.' },
  { id: 'loot:bloodflame-blade', name: 'Bloodflame Blade', aliases: ['bloodflame'], kind: 'incantation', region: 'Liurnia', campaign: 'base', how: 'Dropped by the scarab west of Rose Church after talking to Varre.' },
  { id: 'loot:rivers', name: 'Rivers of Blood', aliases: ['rob', 'rivers'], kind: 'weapon', region: 'Church of Repose', campaign: 'base', grace: 'grace:zamor', how: 'Invader Okina on the Mountaintops, Church of Repose.' },
  { id: 'loot:moonveil', name: 'Moonveil', aliases: ['moon veil'], kind: 'weapon', region: 'Gael Tunnel', campaign: 'base', how: 'Magma Wyrm in Gael Tunnel, Caelid side.' },
  { id: 'loot:blasphemous', name: 'Blasphemous Blade', aliases: ['blasphemous'], kind: 'weapon', region: 'Mt. Gelmir', campaign: 'base', how: 'Trade Remembrance of the Blasphemous at Enia after Rykard.' },
  { id: 'loot:dark-moon-gs', name: 'Dark Moon Greatsword', aliases: ['dmgs', 'moonlight greatsword'], kind: 'weapon', region: 'Cathedral of Manus Celes', campaign: 'base', how: 'Finish Ranni. Chest after placing the Dark Moon Ring.' },
  { id: 'loot:bolt-gransax', name: 'Bolt of Gransax', aliases: ['gransax'], kind: 'weapon', region: 'Leyndell', campaign: 'base', grace: 'grace:east-capital', how: 'Spear lodged in the capital spear monument. Missable after the city turns to ash.', missable: true },
  { id: 'loot:sacred-relic', name: 'Sacred Relic Sword', aliases: ['relic sword'], kind: 'weapon', region: 'Ashen Capital', campaign: 'base', how: 'Trade Elden Remembrance after Radagon / Elden Beast.' },
  { id: 'loot:poleblade', name: "Loretta's War Sickle / Ensis", aliases: ['ensis greatsword', 'lorettas poleblade'], kind: 'weapon', region: 'Castle Ensis', campaign: 'sote', grace: 'grace:ensis', how: 'Rellana drops her twin blades. War Sickle is Loretta at Carian Manor / Haligtree.' },
  { id: 'loot:anvil-hammer', name: 'Anvil Hammer', aliases: ['anvil'], kind: 'weapon', region: 'Ruined Forge', campaign: 'sote', how: 'Ruined Forge of Starfall Past — Tarnished Pack / SotE forge puzzle.' },
  { id: 'loot:idus-sword', name: 'Idus Sword', aliases: ['idus'], kind: 'weapon', region: 'Liurnia', campaign: 'tarnished-pack', how: 'Idus Knight starting armament, or the pack’s Liurnia stash near the academy approach.' },
  { id: 'loot:leontiel-gs', name: "Leontiel's Greatsword", aliases: ['leontiel', 'matador sword'], kind: 'weapon', region: 'Wailing Dunes', campaign: 'tarnished-pack', how: 'Defeat Knight Leontiel in Radahn’s arena after the festival.' },
  { id: 'loot:radagon-icon', name: "Radagon Icon", aliases: ['radagon icon'], kind: 'talisman', region: 'Raya Lucaria', campaign: 'base', grace: 'grace:debate-parlor', how: 'Debate Parlor side path, argument hall upstairs chest.' },
  { id: 'loot:godfrey-icon', name: 'Godfrey Icon', aliases: ['godfrey icon'], kind: 'talisman', region: 'Liurnia', campaign: 'base', how: 'Goldfrey (Golden Lineage) at the Village of the Albinaurics plateau, charged-attack/spell talisman.' },
  { id: 'loot:shard-alexander', name: 'Shard of Alexander', aliases: ['alexander shard'], kind: 'talisman', region: 'Farum Azula', campaign: 'base', how: 'Finish Alexander in Farum. Missable if you never free him.', missable: true },
  { id: 'loot:lord-blood-exul', name: "Lord of Blood's Exultation", aliases: ['exultation', 'mohg talisman'], kind: 'talisman', region: 'Leyndell sewers', campaign: 'base', how: 'Esgar, Priest of Blood in Leyndell Catacombs.' },
  { id: 'loot:ritual-sword', name: 'Ritual Sword Talisman', aliases: ['ritual sword'], kind: 'talisman', region: 'Lux Ruins', campaign: 'base', how: 'Altus, Lux Ruins chest after the demi-human queen.' },
  { id: 'loot:dragoncrest-gc', name: 'Dragoncrest Greatshield Talisman', aliases: ['dragoncrest greatshield'], kind: 'talisman', region: 'Haligtree', campaign: 'base', grace: 'grace:drainage', how: 'Elphael drainage beam run. Best physical absorb in the game.' },
  { id: 'loot:two-head-turtle', name: 'Two-Headed Turtle Talisman', aliases: ['turtle talisman dlc'], kind: 'talisman', region: 'Castle Ensis', campaign: 'sote', grace: 'grace:ensis', how: 'Waterfall cave under the Ensis bridge.' },
  { id: 'loot:cragblade', name: 'Ash of War: Cragblade', aliases: ['cragblade'], kind: 'ash', region: 'Gael Tunnel', campaign: 'base', how: 'Teardrop scarab on the Caelid / Limgrave border near the tunnel.' },
  { id: 'loot:bloodhound-step', name: 'Ash of War: Bloodhound’s Step', aliases: ['bloodhound step', 'bhs'], kind: 'ash', region: 'Lenne’s Rise', campaign: 'base', how: 'Night scarab on the Caelid cliff by Lenne’s Rise.' },
  { id: 'loot:mimic', name: 'Mimic Tear Ashes', aliases: ['mimic', 'mimic tear'], kind: 'spirit', region: 'Nokron', campaign: 'base', grace: 'grace:nokron', how: 'Night’s Sacred Ground chest behind the mimic fight. Needs Radahn.' },
  { id: 'loot:tiche', name: 'Black Knife Tiche', aliases: ['tiche'], kind: 'spirit', region: 'Moonlight Altar', campaign: 'base', how: 'Ringleader’s Evergaol after Ranni opens the altar.' },
  { id: 'loot:therolina', name: 'Finger Maiden Therolina Puppet', aliases: ['therolina'], kind: 'spirit', region: 'Seluvis loft', campaign: 'base', how: 'Seluvis’s puppet cellar. Locks Ranni if you finish his line.', missable: true },
  { id: 'loot:gold-pickle', name: 'Gold-Pickled Fowl Foot', aliases: ['gold foot', 'pickle foot'], kind: 'item', region: 'craft', campaign: 'base', how: 'Crafted. Rowa fruit + gold firefly + fowl foot. Farm Lake of Rot / Siofra fireflies.' },
  { id: 'loot:larval', name: 'Larval Tear', aliases: ['larval', 'respec'], kind: 'item', region: 'Village of the Albinaurics', campaign: 'base', how: 'Silver sphere enemies and a few static corpses. Needed for Rennala respec and Boc.' },
  { id: 'loot:somber-ancient', name: 'Somber Ancient Dragon Smithing Stone', aliases: ['sads', 'somber ancient'], kind: 'item', region: 'various', campaign: 'base', how: 'One from Gurranq after deathroot 9, one in Mohgwyn, others in Farum / Haligtree / SotE.' },
]

export function matchLoot(text: string): Loot[] {
  const n = text.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
  if (n.length < 3) return []
  return loot.filter((l) => {
    const names = [l.name, ...l.aliases].map((s) => s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim())
    return names.some((name) => name && (n.includes(name) || name.includes(n)))
  })
}
