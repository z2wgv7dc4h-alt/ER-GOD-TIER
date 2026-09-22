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
  { id: 'loot:golden-vow', name: 'Golden Vow', aliases: ['golden vow incant'], kind: 'incantation', region: 'Altus', campaign: 'base', how: 'Corpse-finger ruins north of the Altus highway, or the shared ash of war version from Knight Bernahl.' },
  { id: 'loot:flame-grant', name: 'Flame, Grant Me Strength', aliases: ['fgms', 'flame grant me strength'], kind: 'incantation', region: 'Fort Gael', campaign: 'base', how: 'Behind Fort Gael, two flame pillars. Caelid.' },
  { id: 'loot:bloodflame-blade', name: 'Bloodflame Blade', aliases: ['bloodflame'], kind: 'incantation', region: 'Liurnia', campaign: 'base', how: 'Dropped by the scarab west of Rose Church after talking to Varre.' },
  { id: 'loot:rivers', name: 'Rivers of Blood', aliases: ['rob', 'rivers'], kind: 'weapon', region: 'Church of Repose', campaign: 'base', grace: 'grace:zamor', how: 'Invader Okina on the Mountaintops, Church of Repose.' },
  { id: 'loot:moonveil', name: 'Moonveil', aliases: ['moon veil'], kind: 'weapon', region: 'Gael Tunnel', campaign: 'base', how: 'Magma Wyrm in Gael Tunnel, Caelid side.' },
  { id: 'loot:blasphemous', name: 'Blasphemous Blade', aliases: ['blasphemous'], kind: 'weapon', region: 'Mt. Gelmir', campaign: 'base', how: 'Trade Remembrance of the Blasphemous at Enia after Rykard.' },
  { id: 'loot:dark-moon-gs', name: 'Dark Moon Greatsword', aliases: ['dmgs', 'moonlight greatsword'], kind: 'weapon', region: 'Cathedral of Manus Celes', campaign: 'base', how: 'Finish Ranni. Chest after placing the Dark Moon Ring.' },
  { id: 'loot:bolt-gransax', name: 'Bolt of Gransax', aliases: ['gransax'], kind: 'weapon', region: 'Leyndell', campaign: 'base', grace: 'grace:east-capital', how: 'Spear lodged in the capital spear monument. Missable after the city turns to ash.', missable: true },
  { id: 'loot:sacred-relic', name: 'Sacred Relic Sword', aliases: ['relic sword'], kind: 'weapon', region: 'Ashen Capital', campaign: 'base', how: 'Trade Elden Remembrance after Radagon / Elden Beast.' },
  { id: 'loot:rellanas-twin-blades', name: "Rellana's Twin Blades", aliases: ['rellana twin blades', 'twin blades'], kind: 'weapon', region: 'Castle Ensis', campaign: 'sote', grace: 'grace:ensis', how: 'Trade the Remembrance of the Twin Moon Knight at Enia after Rellana.' },
  { id: 'loot:lorettas-war-sickle', name: "Loretta's War Sickle", aliases: ['lorettas war sickle', 'war sickle'], kind: 'weapon', region: 'Haligtree', campaign: 'base', how: 'Dropped by Loretta, Knight of the Haligtree in Elphael.' },
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

  // --- Task 65 additions. Every English name below exists in public/sourced/open/names.json;
  // `how` is a single original sentence. No lat/lng, no event flags, no grace slug unless it
  // already exists in graces.ts.
  { id: 'loot:uchigatana', name: 'Uchigatana', aliases: ['uchi'], kind: 'weapon', region: 'Limgrave', campaign: 'base', how: 'Corpse in the Deathtouched Catacombs on the Stormhill road; also the Samurai starting katana.' },
  { id: 'loot:sword-night-flame', name: 'Sword of Night and Flame', aliases: ['sonaf', 'night and flame'], kind: 'weapon', region: 'Liurnia', campaign: 'base', how: 'Chest in Caria Manor past Loretta, in the manor grounds.' },
  { id: 'loot:deaths-poker', name: "Death's Poker", aliases: ['poker'], kind: 'weapon', region: 'Caelid', campaign: 'base', how: 'Dropped by a Death Rite Bird.' },
  { id: 'loot:wing-of-astel', name: 'Wing of Astel', aliases: ['wing astel'], kind: 'weapon', region: 'Ainsel River', campaign: 'base', how: 'Chest in the Uhl Palace Ruins along the Ainsel River.' },
  { id: 'loot:giant-crusher', name: 'Giant-Crusher', aliases: ['crusher'], kind: 'weapon', region: 'Altus', campaign: 'base', how: 'Chest at the back of a carriage directly south of the Outer Wall Phantom Tree site of grace.' },
  { id: 'loot:bloodfiends-arm', name: "Bloodfiend's Arm", aliases: ['bloodfiend arm'], kind: 'weapon', region: 'Realm of Shadow', campaign: 'sote', how: 'SotE bloodfiend weapon dropped in the Realm of Shadow.' },
  { id: 'loot:great-stars', name: 'Great Stars', aliases: ['great stars'], kind: 'weapon', region: 'Altus', campaign: 'base', how: 'Chest in the Writheblood Ruins on the Altus Plateau.' },
  { id: 'loot:starscourge-greatsword', name: 'Starscourge Greatsword', aliases: ['starscourge gs'], kind: 'weapon', region: 'Caelid', campaign: 'base', how: 'Trade the Remembrance of the Starscourge at Enia.' },
  { id: 'loot:ancient-meteoric-ore-gs', name: 'Ancient Meteoric Ore Greatsword', aliases: ['meteoric ore gs'], kind: 'weapon', region: 'Realm of Shadow', campaign: 'sote', how: 'SotE greatsword found in the Realm of Shadow.' },
  { id: 'loot:ripple-crescent-halberd', name: 'Ripple Crescent Halberd', aliases: ['ripple halberd'], kind: 'weapon', region: 'Liurnia', campaign: 'base', how: 'Dropped by a Ripple Albinauric in Liurnia.' },
  { id: 'loot:eleonora-poleblade', name: "Eleonora's Poleblade", aliases: ['eleonora poleblade'], kind: 'weapon', region: 'Altus', campaign: 'base', how: 'Dropped by Eleonora, Violet Bloody Finger, at the Second Church of Marika.' },
  { id: 'loot:helphens-steeple', name: "Helphen's Steeple", aliases: ['helphen'], kind: 'weapon', region: 'Consecrated Snowfield', campaign: 'base', how: 'Dropped by the Death Rite Bird in the Consecrated Snowfield.' },
  { id: 'loot:marais-executioner-sword', name: "Marais Executioner's Sword", aliases: ['marais sword'], kind: 'weapon', region: 'Altus', campaign: 'base', how: 'Dropped by Elemer of the Briar at the Shaded Castle.' },
  { id: 'loot:greatsword', name: 'Greatsword', aliases: ['guts sword'], kind: 'weapon', region: 'Dragonbarrow', campaign: 'base', how: 'Chest on the Dragonbarrow caravan.' },
  { id: 'loot:godskin-peeler', name: 'Godskin Peeler', aliases: ['peeler'], kind: 'weapon', region: 'Caelid', campaign: 'base', how: 'Dropped by the Godskin Apostle beneath the Divine Tower of Caelid.' },
  { id: 'loot:fingerprint-shield', name: 'Fingerprint Stone Shield', aliases: ['fingerprint shield'], kind: 'weapon', region: 'Leyndell sewers', campaign: 'base', how: 'Found in the Subterranean Shunning-Grounds beneath Leyndell.' },
  { id: 'loot:antspur-rapier', name: 'Antspur Rapier', aliases: ['antspur'], kind: 'weapon', region: 'Altus', campaign: 'base', how: 'Dropped by Maleigh Marais at the Shaded Castle.' },
  { id: 'loot:reduvia', name: 'Reduvia', aliases: ['reduvia dagger'], kind: 'weapon', region: 'Limgrave', campaign: 'base', how: 'Dropped by Bloody Finger Nerijus in Limgrave.' },
  { id: 'loot:sword-st-trina', name: 'Sword of St. Trina', aliases: ['st trina sword', 'trina sword'], kind: 'weapon', region: 'Caelid', campaign: 'base', how: 'Chest in the Sellia Crystal Tunnel, Caelid.' },
  { id: 'loot:godslayer-seal', name: "Godslayer's Seal", aliases: ['godslayer seal'], kind: 'weapon', region: 'Farum Azula', campaign: 'base', how: 'Chest in Crumbling Farum Azula.' },
  { id: 'loot:dragon-communion-seal', name: 'Dragon Communion Seal', aliases: ['dc seal'], kind: 'weapon', region: 'Limgrave', campaign: 'base', how: 'Fringefolk Hero\u2019s Grave — up the tunnel past the chariot, from the Banished Knight beyond the imp seal; needs two Stonesword Keys.' },
  { id: 'loot:coded-sword', name: 'Coded Sword', aliases: ['coded sword'], kind: 'weapon', region: 'Leyndell', campaign: 'base', how: 'Chest in the Fortified Manor in Leyndell.' },
  { id: 'loot:erdtree-seal', name: 'Erdtree Seal', aliases: ['erdtree seal'], kind: 'weapon', region: 'Mountaintops', campaign: 'base', how: 'Found on a corpse in the Mountaintops of the Giants.' },
  { id: 'loot:zamor-curved-sword', name: 'Zamor Curved Sword', aliases: ['zamor sword'], kind: 'weapon', region: 'Mountaintops', campaign: 'base', how: 'Dropped by the Ancient Hero of Zamor.' },
  { id: 'loot:cross-naginata', name: 'Cross-Naginata', aliases: ['naginata'], kind: 'weapon', region: 'Caelid', campaign: 'base', how: 'Found in a chest in Caelid.' },
  { id: 'loot:finger-seal', name: 'Finger Seal', aliases: ['finger seal'], kind: 'weapon', region: 'Roundtable', campaign: 'base', how: 'Bought from the Twin Maiden Husks at the Roundtable Hold.' },
  { id: 'loot:parrying-dagger', name: 'Parrying Dagger', aliases: ['parry dagger'], kind: 'weapon', region: 'Limgrave', campaign: 'base', how: 'Bought from Patches, or found in Limgrave.' },
  { id: 'loot:buckler', name: 'Buckler', aliases: ['buckler'], kind: 'weapon', region: 'Limgrave', campaign: 'base', how: 'Bought from Patches after his cave, Limgrave.' },
  { id: 'loot:dragonmaw', name: 'Dragonmaw', aliases: ['dragon maw'], kind: 'incantation', region: 'Dragon Communion', campaign: 'base', how: 'Bought at the Cathedral of Dragon Communion with a dragon heart.' },
  { id: 'loot:black-flame', name: 'Black Flame', aliases: ['black flame incant'], kind: 'incantation', region: 'Roundtable', campaign: 'base', how: 'Godskin Prayerbook, found at the Roundtable Hold.' },
  { id: 'loot:scouring-black-flame', name: 'Scouring Black Flame', aliases: ['scouring flame'], kind: 'incantation', region: 'Roundtable', campaign: 'base', how: 'Godskin Prayerbook, found at the Roundtable Hold.' },
  { id: 'loot:unendurable-frenzy', name: 'Unendurable Frenzy', aliases: ['frenzy'], kind: 'incantation', region: 'Liurnia', campaign: 'base', how: 'Frenzied Flame incantation from the Frenzied Flame Village.' },
  { id: 'loot:black-flames-protection', name: "Black Flame's Protection", aliases: ['black flame protection'], kind: 'incantation', region: 'Roundtable', campaign: 'base', how: 'Godskin Prayerbook, found at the Roundtable Hold.' },
  { id: 'loot:lions-claw', name: "Ash of War: Lion's Claw", aliases: ['lions claw'], kind: 'ash', region: 'Fort Gael', campaign: 'base', how: 'Scarab behind Fort Gael in Caelid.' },
  { id: 'loot:magic-scorpion', name: 'Magic Scorpion Charm', aliases: ['magic scorpion'], kind: 'talisman', region: 'Liurnia', campaign: 'base', how: 'Given by Preceptor Seluvis after his quest.' },
  { id: 'loot:graven-mass', name: 'Graven-Mass Talisman', aliases: ['graven mass'], kind: 'talisman', region: 'Raya Lucaria', campaign: 'base', how: 'Reward from the Raya Lucaria sorcery chain.' },
  { id: 'loot:graven-school', name: 'Graven-School Talisman', aliases: ['graven school'], kind: 'talisman', region: 'Raya Lucaria', campaign: 'base', how: 'Found in Raya Lucaria.' },
  { id: 'loot:old-lords-talisman', name: "Old Lord's Talisman", aliases: ['old lords'], kind: 'talisman', region: 'Farum Azula', campaign: 'base', how: 'Found on a corpse in Crumbling Farum Azula.' },
  { id: 'loot:claw-talisman', name: 'Claw Talisman', aliases: ['claw talisman'], kind: 'talisman', region: 'Stormveil', campaign: 'base', how: 'Found on a corpse on the Stormveil cliffside route.' },
  { id: 'loot:axe-talisman', name: 'Axe Talisman', aliases: ['axe talisman'], kind: 'talisman', region: 'Limgrave', campaign: 'base', how: 'Cellar beneath the Mistwood Ruins in eastern Limgrave.' },
  { id: 'loot:great-jar', name: "Great-Jar's Arsenal", aliases: ['great jar'], kind: 'talisman', region: 'Caelid', campaign: 'base', how: 'Reward for the three Great-Jar duels in Dragonbarrow.' },
  { id: 'loot:bullgoat', name: "Bull-Goat's Talisman", aliases: ['bullgoat'], kind: 'talisman', region: 'Mountaintops', campaign: 'base', how: 'Found in the Mountaintops of the Giants.' },
  { id: 'loot:white-mask', name: 'White Mask', aliases: ['white mask'], kind: 'item', region: 'Mohgwyn', campaign: 'base', how: 'Dropped by the White Mask invaders at Mohgwyn Palace.' },
  { id: 'loot:winged-sword-insignia', name: 'Winged Sword Insignia', aliases: ['winged insignia'], kind: 'talisman', region: 'Altus', campaign: 'base', how: 'Reward for helping Millicent at Dominula.' },
  { id: 'loot:concealing-veil', name: 'Concealing Veil', aliases: ['concealing veil'], kind: 'talisman', region: 'Liurnia', campaign: 'base', how: 'Dropped by a Black Knife Assassin in Liurnia.' },
  { id: 'loot:greatshield-talisman', name: 'Greatshield Talisman', aliases: ['greatshield talisman'], kind: 'talisman', region: 'Altus', campaign: 'base', how: 'Carriage chest east of the Erdtree-Gazing Hill site of grace, watched by three fire-arrow ballistae.' },
  { id: 'loot:spear-talisman', name: 'Spear Talisman', aliases: ['spear talisman'], kind: 'talisman', region: 'Liurnia', campaign: 'base', how: 'Chest inside the Lakeside Crystal Cave, by a demi-human campfire.' },
  { id: 'loot:carian-filigreed-crest', name: 'Carian Filigreed Crest', aliases: ['filigreed crest'], kind: 'talisman', region: 'Liurnia', campaign: 'base', how: 'Bought from Iji, or found at the Kingsrealm Ruins.' },
  { id: 'loot:green-turtle-talisman', name: 'Green Turtle Talisman', aliases: ['green turtle'], kind: 'talisman', region: 'Limgrave', campaign: 'base', how: 'Found at Summonwater Village, Limgrave.' },
  { id: 'loot:ritual-shield-talisman', name: 'Ritual Shield Talisman', aliases: ['ritual shield'], kind: 'talisman', region: 'Leyndell', campaign: 'base', how: 'Found in Leyndell.' },

  // --- Task 66 additions: the kit items Task 64's audit still showed unresolved.
  // English names verified against public/sourced/open/names.json; locations verified
  // against the Fextralife pages (no map HTML committed). One original sentence each.
  { id: 'loot:lusats-staff', name: "Lusat's Glintstone Staff", aliases: ['lusat'], kind: 'weapon', region: 'Caelid', campaign: 'base', how: 'Sellia Hideaway, past the sealed door opened with the Sellian Sealbreaker.' },
  { id: 'loot:staff-of-loss', name: 'Staff of Loss', aliases: ['loss staff'], kind: 'weapon', region: 'Caelid', campaign: 'base', how: 'On a corpse leaning over a balcony in west Sellia, reached by jumping the rooftops.' },
  { id: 'loot:carian-regal-scepter', name: 'Carian Regal Scepter', aliases: ['regal scepter'], kind: 'weapon', region: 'Roundtable', campaign: 'base', how: 'Trade the Remembrance of the Full Moon Queen at Enia.' },
  { id: 'loot:azurs-staff', name: "Azur's Glintstone Staff", aliases: ['azur staff'], kind: 'weapon', region: 'Mt. Gelmir', campaign: 'base', how: 'On the ground beside the Primeval Sorcerer Azur, past the Hermit Village.' },
  { id: 'loot:dragon-king-cragblade', name: "Dragon King's Cragblade", aliases: ['cragblade dragon'], kind: 'weapon', region: 'Farum Azula', campaign: 'base', how: 'Trade the Remembrance of the Dragonlord at Enia.' },
  { id: 'loot:fire-scorpion-charm', name: 'Fire Scorpion Charm', aliases: ['fire scorpion'], kind: 'talisman', region: 'Mt. Gelmir', campaign: 'base', how: 'Found inside Fort Laiedd on Mt. Gelmir.' },
  { id: 'loot:lightning-scorpion-charm', name: 'Lightning Scorpion Charm', aliases: ['lightning scorpion'], kind: 'talisman', region: 'Altus', campaign: 'base', how: 'Wyndham Catacombs, in a room sealed by an imp statue — bring a Stonesword Key.' },
  { id: 'loot:curved-sword-talisman', name: 'Curved Sword Talisman', aliases: ['curved talisman'], kind: 'talisman', region: 'Stormveil', campaign: 'base', how: 'Found on a corpse inside Stormveil Castle.' },
  { id: 'loot:greyolls-roar', name: "Greyoll's Roar", aliases: ['greyoll roar'], kind: 'incantation', region: 'Dragon Communion', campaign: 'base', how: 'Bought at the Cathedral of Dragon Communion with a dragon heart.' },
  { id: 'loot:rotten-breath', name: 'Rotten Breath', aliases: ['rotten breath incant'], kind: 'incantation', region: 'Dragon Communion', campaign: 'base', how: 'Bought at the Cathedral of Dragon Communion with a dragon heart.' },
  { id: 'loot:faithfuls-canvas', name: "Faithful's Canvas Talisman", aliases: ['faithful canvas'], kind: 'talisman', region: 'Caelid', campaign: 'base', how: 'Sellia Crystal Tunnel, on a corpse guarded by two Lesser Kindred of Rot.' },
  { id: 'loot:warhawks-talon', name: "Warhawk's Talon", aliases: ['warhawk talon'], kind: 'weapon', region: 'Stormveil', campaign: 'base', how: 'Dropped by the Warhawks in Stormveil Castle.' },
  { id: 'loot:cane-sword', name: 'Cane Sword', aliases: ['cane sword'], kind: 'weapon', region: 'Leyndell', campaign: 'base', how: 'West Capital Rampart in Leyndell — down the stairs and a U-turn room, on a corpse.' },
  { id: 'loot:pulley-crossbow', name: 'Pulley Crossbow', aliases: ['pulley bow'], kind: 'weapon', region: 'Caelid', campaign: 'base', how: 'Next to the site of grace at the Craftsman\u2019s Shack.' },
  { id: 'loot:radagons-soreseal', name: "Radagon's Soreseal", aliases: ['soreseal'], kind: 'talisman', region: 'Dragonbarrow', campaign: 'base', how: 'Chest inside Fort Faroth in Dragonbarrow.' },
  { id: 'loot:okina-mask', name: 'Okina Mask', aliases: ['okina mask'], kind: 'item', region: 'Mountaintops', campaign: 'base', how: 'Dropped by Bloody Finger Okina at the Church of Repose on the Mountaintops.' },
  { id: 'loot:swift-glintstone-shard', name: 'Swift Glintstone Shard', aliases: ['swift shard'], kind: 'sorcery', region: 'Raya Lucaria', campaign: 'base', how: 'Bought from Miriel or Sellen once the Academy Scroll is handed in.' },
  { id: 'loot:stargazer-heirloom', name: 'Stargazer Heirloom', aliases: ['stargazer'], kind: 'talisman', region: 'Liurnia', campaign: 'base', how: 'Found in the Divine Tower of Liurnia.' },
  { id: 'loot:bullgoat-armor', name: 'Bull-Goat Armor', aliases: ['bullgoat set', 'bull goat set', 'bull goat armor'], kind: 'item', region: 'Mountaintops', campaign: 'base', how: 'Found in the Mountaintops of the Giants.' },
  { id: 'loot:dagger', name: 'Dagger', aliases: ['plain dagger'], kind: 'weapon', region: 'Roundtable', campaign: 'base', how: 'Bought from the Twin Maiden Husks at the Roundtable Hold.' },
]

export function matchLoot(text: string): Loot[] {
  const n = text.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
  if (n.length < 3) return []
  return loot.filter((l) => {
    const names = [l.name, ...l.aliases].map((s) => s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim())
    return names.some((name) => name && (n.includes(name) || name.includes(n)))
  })
}
