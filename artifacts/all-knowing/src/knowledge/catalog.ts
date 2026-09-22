import type { Campaign } from '../types'
import { REGULATION_STAMP } from '../lib/regulation.ts'

/**
 * The regulation line every catalog fact is keyed to. Kept in sync with
 * `Character.regulation` and the Build lab AR data — see `src/lib/regulation.ts`.
 */
export const regulation = REGULATION_STAMP

export type FactKind = 'grace' | 'boss' | 'item' | 'quest' | 'region'

export type Fact = {
  id: string
  kind: FactKind
  name: string
  aliases: string[]
  region: string
  campaign: Campaign
  /** Other fact ids that must already be true if this one is. */
  implies: string[]
  /** Facts this typically produces (drops, unlocks). */
  drops?: string[]
  /** Quests or steps that consume this item. */
  usedIn?: string[]
  note?: string
}

export const facts: Fact[] = [
  // Regions as milestones
  { id: 'region:limgrave', kind: 'region', name: 'Limgrave', aliases: ['west limgrave', 'the first step'], region: 'Limgrave', campaign: 'base', implies: ['grace:first-step'] },
  { id: 'region:weeping', kind: 'region', name: 'Weeping Peninsula', aliases: ['weeping'], region: 'Weeping Peninsula', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'region:liurnia', kind: 'region', name: 'Liurnia of the Lakes', aliases: ['liurnia', 'the lakes'], region: 'Liurnia', campaign: 'base', implies: ['boss:godrick'] },
  { id: 'region:caelid', kind: 'region', name: 'Caelid', aliases: ['scarlet rot', 'redmane'], region: 'Caelid', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'region:altus', kind: 'region', name: 'Altus Plateau', aliases: ['altus', 'ergtree grazing'], region: 'Altus', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'region:leyndell', kind: 'region', name: 'Leyndell, Royal Capital', aliases: ['leyndell', 'royal capital'], region: 'Leyndell', campaign: 'base', implies: ['region:altus'] },
  { id: 'region:mountaintops', kind: 'region', name: 'Mountaintops of the Giants', aliases: ['mountaintops', 'forge of the giants'], region: 'Mountaintops', campaign: 'base', implies: ['boss:morgott'] },
  { id: 'region:farum', kind: 'region', name: 'Crumbling Farum Azula', aliases: ['farum azula', 'farum'], region: 'Farum Azula', campaign: 'base', implies: ['grace:forge-giants'] },
  { id: 'region:haligtree', kind: 'region', name: 'Miquella’s Haligtree', aliases: ['haligtree', 'elphael'], region: 'Haligtree', campaign: 'base', implies: ['item:haligtree-secret-medallion'] },
  { id: 'region:shadow', kind: 'region', name: 'Realm of Shadow', aliases: ['sote', 'shadow of the erdtree', 'land of shadow', 'gravesite'], region: 'Gravesite Plain', campaign: 'sote', implies: ['item:shadow-realm-blessing'] },

  // Graces — warp-list OCR targets
  { id: 'grace:first-step', kind: 'grace', name: 'The First Step', aliases: ['first step'], region: 'Limgrave', campaign: 'base', implies: [] },
  { id: 'grace:elleh', kind: 'grace', name: 'Church of Elleh', aliases: ['elleh', 'ellah', 'church of ellah'], region: 'Limgrave', campaign: 'base', implies: ['grace:first-step'] },
  { id: 'grace:gatefront', kind: 'grace', name: 'Gatefront', aliases: ['gatefront ruins'], region: 'Limgrave', campaign: 'base', implies: ['grace:elleh'] },
  { id: 'grace:stormhill-shack', kind: 'grace', name: 'Stormhill Shack', aliases: ['stormhill'], region: 'Stormhill', campaign: 'base', implies: ['grace:gatefront'] },
  { id: 'grace:castleward', kind: 'grace', name: 'Castleward Tunnel', aliases: ['margit fog', 'stormveil gate'], region: 'Stormveil', campaign: 'base', implies: ['grace:stormhill-shack'] },
  { id: 'grace:rampart-tower', kind: 'grace', name: 'Rampart Tower', aliases: [], region: 'Stormveil', campaign: 'base', implies: ['boss:margit'] },
  { id: 'grace:limgrave-tower', kind: 'grace', name: 'Limgrave Tower Bridge', aliases: [], region: 'Stormveil', campaign: 'base', implies: ['boss:godrick'] },
  { id: 'grace:lake-shore', kind: 'grace', name: 'Liurnia Lake Shore', aliases: ['lake shore'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'grace:academy-gate', kind: 'grace', name: 'South Raya Lucaria Gate', aliases: ['raya lucaria gate', 'academy gate'], region: 'Liurnia', campaign: 'base', implies: ['item:academy-glintstone-key'] },
  { id: 'grace:debate-parlor', kind: 'grace', name: 'Debate Parlor', aliases: [], region: 'Raya Lucaria', campaign: 'base', implies: ['boss:red-wolf'] },
  { id: 'grace:redmane', kind: 'grace', name: 'Chamber Outside the Plaza', aliases: ['redmane plaza', 'radahn festival'], region: 'Redmane Castle', campaign: 'base', implies: ['region:caelid'] },
  { id: 'grace:ergtree-grazing', kind: 'grace', name: 'Erdtree-Gazing Hill', aliases: ['erdtree gazing hill'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'grace:capital-outskirts', kind: 'grace', name: 'Capital Rampart', aliases: ['outer wall battleground'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'grace:east-capital', kind: 'grace', name: 'East Capital Rampart', aliases: [], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'grace:queen-bedchamber', kind: 'grace', name: 'Queen’s Bedchamber', aliases: ["queen's bedchamber"], region: 'Leyndell', campaign: 'base', implies: ['boss:godfrey-golden'] },
  { id: 'grace:forge-giants', kind: 'grace', name: 'Foot of the Forge', aliases: ['forge of the giants'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'grace:beside-forge', kind: 'grace', name: 'Giant’s Gravepost', aliases: [], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'grace:farum-balcony', kind: 'grace', name: 'Dragon Temple Altar', aliases: ['farum altar'], region: 'Farum Azula', campaign: 'base', implies: ['region:farum'] },
  { id: 'grace:haligtree-town', kind: 'grace', name: 'Haligtree Town Plaza', aliases: [], region: 'Haligtree', campaign: 'base', implies: ['region:haligtree'] },
  { id: 'grace:drainage', kind: 'grace', name: 'Drainage Channel', aliases: ['elphael drainage'], region: 'Elphael', campaign: 'base', implies: ['region:haligtree'] },
  { id: 'grace:deeproot', kind: 'grace', name: 'Deeproot Depths', aliases: ['deeproot', 'prince of deaths throne'], region: 'Deeproot Depths', campaign: 'base', implies: ['boss:radahn'] },
  // Task 54 hotfix: the dump-verified Nokron beat the Black Whetblade actually proves.
  // Name from public/sourced/checklists/graces.json (grace:120208) and open/names.json.
  // No authored warp x/y, so it is not added to `graces.ts` (no invented coordinates).
  { id: 'grace:night-sacred-ground', kind: 'grace', name: "Night's Sacred Ground", aliases: ['night sacred ground', 'nights sacred ground'], region: 'Nokron', campaign: 'base', implies: [] },
  { id: 'grace:gravesite', kind: 'grace', name: 'Gravesite Plain', aliases: ['scorched ruins', 'three-path cross'], region: 'Gravesite Plain', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'grace:belurat', kind: 'grace', name: 'Belurat, Tower Settlement', aliases: ['belurat'], region: 'Belurat', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'grace:shadow-keep', kind: 'grace', name: 'Main Gate Plaza', aliases: ['shadow keep plaza'], region: 'Shadow Keep', campaign: 'sote', implies: ['region:shadow'] },

  // Bosses
  { id: 'boss:margit', kind: 'boss', name: 'Margit, the Fell Omen', aliases: ['margit', 'fell omen'], region: 'Stormveil', campaign: 'base', implies: ['grace:castleward'] },
  { id: 'boss:godrick', kind: 'boss', name: 'Godrick the Grafted', aliases: ['godrick'], region: 'Stormveil', campaign: 'base', implies: ['boss:margit'], drops: ['item:godrick-great-rune', 'item:remembrance-grafted'] },
  { id: 'boss:red-wolf', kind: 'boss', name: 'Red Wolf of Radagon', aliases: ['red wolf'], region: 'Raya Lucaria', campaign: 'base', implies: ['item:academy-glintstone-key'] },
  { id: 'boss:rennala', kind: 'boss', name: 'Rennala, Queen of the Full Moon', aliases: ['rennala'], region: 'Raya Lucaria', campaign: 'base', implies: ['boss:red-wolf'], drops: ['item:rennala-great-rune', 'item:remembrance-full-moon-queen'] },
  { id: 'boss:radahn', kind: 'boss', name: 'Starscourge Radahn', aliases: ['radahn', 'general radahn'], region: 'Caelid', campaign: 'base', implies: ['quest:ranni:festival'], drops: ['item:radahn-great-rune', 'item:remembrance-starscourge'] },
  { id: 'boss:rykard', kind: 'boss', name: 'Rykard, Lord of Blasphemy', aliases: ['rykard', 'god-devouring serpent'], region: 'Mt. Gelmir', campaign: 'base', implies: [], drops: ['item:rykard-great-rune', 'item:remembrance-blasphemous'] },
  { id: 'boss:godfrey-golden', kind: 'boss', name: 'Godfrey, First Elden Lord (golden shade)', aliases: ['golden godfrey', 'godfrey shade'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'boss:morgott', kind: 'boss', name: 'Morgott, the Omen King', aliases: ['morgott', 'omen king'], region: 'Leyndell', campaign: 'base', implies: ['boss:godfrey-golden'], drops: ['item:morgott-great-rune', 'item:remembrance-omen-king'] },
  { id: 'boss:fire-giant', kind: 'boss', name: 'Fire Giant', aliases: [], region: 'Mountaintops', campaign: 'base', implies: ['grace:forge-giants'], drops: ['item:remembrance-fire-giant'] },
  { id: 'boss:godskin-duo', kind: 'boss', name: 'Godskin Duo', aliases: [], region: 'Farum Azula', campaign: 'base', implies: ['region:farum'] },
  { id: 'boss:maliketh', kind: 'boss', name: 'Maliketh, the Black Blade', aliases: ['maliketh', 'gurranq', 'beast clergyman'], region: 'Farum Azula', campaign: 'base', implies: ['boss:godskin-duo'], drops: ['item:remembrance-black-blade'], note: 'Phase one of this fight is the Beast Clergyman; the two names are one encounter, not two.' },
  { id: 'boss:gideon', kind: 'boss', name: 'Sir Gideon Ofnir, the All-Knowing', aliases: ['gideon', 'ofnir'], region: 'Ashen Capital', campaign: 'base', implies: ['boss:maliketh'] },
  { id: 'boss:godfrey', kind: 'boss', name: 'Godfrey, First Elden Lord / Hoarah Loux', aliases: ['hoarah loux', 'hoarah loux warrior', 'godfrey', 'godfrey first elden lord'], region: 'Ashen Capital', campaign: 'base', implies: ['boss:gideon'], drops: ['item:remembrance-hoarah-loux'], note: 'Second phase is Hoarah Loux, Warrior; the tracker’s “Hourah” spelling is a typo, not a separate fight.' },
  { id: 'boss:radagon', kind: 'boss', name: 'Radagon of the Golden Order / Elden Beast', aliases: ['radagon', 'elden beast', 'elden lord'], region: 'Ashen Capital', campaign: 'base', implies: ['boss:godfrey'], drops: ['item:elden-remembrance'] },
  { id: 'boss:mohg', kind: 'boss', name: 'Mohg, Lord of Blood', aliases: ['mohg', 'lord of blood'], region: 'Mohgwyn', campaign: 'base', implies: [], drops: ['item:mohg-great-rune', 'item:remembrance-blood-lord'] },
  { id: 'boss:malenia', kind: 'boss', name: 'Malenia, Blade of Miquella', aliases: ['malenia'], region: 'Elphael', campaign: 'base', implies: ['grace:drainage'], drops: ['item:malenia-great-rune', 'item:remembrance-rot-goddess'] },
  { id: 'boss:divine-beast', kind: 'boss', name: 'Divine Beast Dancing Lion', aliases: ['dancing lion'], region: 'Belurat', campaign: 'sote', implies: ['grace:belurat'] },
  { id: 'boss:rennala-sote', kind: 'boss', name: 'Rellana, Twin Moon Knight', aliases: ['rellana'], region: 'Castle Ensis', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'boss:messmer', kind: 'boss', name: 'Messmer the Impaler', aliases: ['messmer'], region: 'Shadow Keep', campaign: 'sote', implies: ['grace:shadow-keep'] },
  { id: 'boss:midra', kind: 'boss', name: 'Midra, Lord of Frenzied Flame', aliases: ['midra'], region: 'Abyssal Woods', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'boss:bayle', kind: 'boss', name: 'Bayle the Dread', aliases: ['bayle'], region: 'Jagged Peak', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'boss:consort', kind: 'boss', name: 'Promised Consort Radahn / Radahn, Consort of Miquella', aliases: ['consort radahn', 'promised consort', 'radahn consort of miquella'], region: 'Enir-Ilim', campaign: 'sote', implies: ['boss:messmer'] },
  { id: 'boss:leontiel', kind: 'boss', name: 'Knight Leontiel', aliases: ['leontiel', 'matador'], region: 'Wailing Dunes', campaign: 'tarnished-pack', implies: ['boss:radahn'], drops: ['item:leontiel-greatsword'] },

  // Items that reconstruct the run
  { id: 'item:godrick-great-rune', kind: 'item', name: "Godrick's Great Rune", aliases: ['godrick rune'], region: 'Limgrave', campaign: 'base', implies: ['boss:godrick'], usedIn: ['grace:limgrave-tower'] },
  { id: 'item:rennala-great-rune', kind: 'item', name: "Rennala's Great Rune", aliases: ['rennala rune'], region: 'Liurnia', campaign: 'base', implies: ['boss:rennala'] },
  { id: 'item:radahn-great-rune', kind: 'item', name: "Radahn's Great Rune", aliases: ['radahn rune'], region: 'Caelid', campaign: 'base', implies: ['boss:radahn'] },
  { id: 'item:rykard-great-rune', kind: 'item', name: "Rykard's Great Rune", aliases: ['rykard rune'], region: 'Mt. Gelmir', campaign: 'base', implies: ['boss:rykard'] },
  { id: 'item:morgott-great-rune', kind: 'item', name: "Morgott's Great Rune", aliases: ['morgott rune'], region: 'Leyndell', campaign: 'base', implies: ['boss:morgott'] },
  { id: 'item:mohg-great-rune', kind: 'item', name: "Mohg's Great Rune", aliases: ['mohg rune'], region: 'Mohgwyn', campaign: 'base', implies: ['boss:mohg'] },
  { id: 'item:malenia-great-rune', kind: 'item', name: "Malenia's Great Rune", aliases: ['malenia rune'], region: 'Elphael', campaign: 'base', implies: ['boss:malenia'] },
  { id: 'item:academy-glintstone-key', kind: 'item', name: 'Academy Glintstone Key', aliases: ['glintstone key'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'item:dark-moon-ring', kind: 'item', name: 'Dark Moon Ring', aliases: ['moon ring'], region: 'Cathedral of Manus Celes', campaign: 'base', implies: ['boss:astel'], usedIn: ['quest:ranni:ring'] },
  { id: 'item:fingerslayer', kind: 'item', name: 'Fingerslayer Blade', aliases: ['fingerslayer'], region: 'Nokron', campaign: 'base', implies: ['boss:radahn'], usedIn: ['quest:ranni:nokron'] },
  { id: 'item:carian-inverted', kind: 'item', name: 'Carian Inverted Statue', aliases: ['inverted statue'], region: 'Liurnia', campaign: 'base', implies: ['quest:ranni:service'], usedIn: ['quest:ranni:statue'] },
  { id: 'item:sewing-needle', kind: 'item', name: 'Gold Sewing Needle', aliases: ['sewing needle', 'golden sewing needle'], region: 'Church of Vows', campaign: 'base', implies: [], usedIn: ['quest:boc:needle'] },
  { id: 'item:haligtree-secret-medallion', kind: 'item', name: 'Haligtree Secret Medallion', aliases: ['secret medallion', 'haligtree medallion'], region: 'Consecrated Snowfield', campaign: 'base', implies: ['region:haligtree'] },
  { id: 'item:dusk-medallion', kind: 'item', name: 'Dectus Medallion', aliases: ['dectus', 'grand lift of dectus'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'item:rotted-wing', kind: 'item', name: 'Unalloyed Gold Needle', aliases: ['unalloyed needle', 'millicent needle'], region: 'Caelid', campaign: 'base', implies: ['quest:millicent:needle'] },
  { id: 'item:serpent-amnion', kind: 'item', name: "Serpent's Amnion", aliases: ['amnion'], region: 'Volcano Manor', campaign: 'base', implies: ['quest:rya:amnion'] },
  { id: 'item:blade-of-calling', kind: 'item', name: 'Blade of Calling', aliases: [], region: 'Forbidden Lands', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'item:shadow-realm-blessing', kind: 'item', name: 'Scadutree Fragment', aliases: ['scadutree', 'scadu fragment', 'skadu', 'skadutree', 'scadu tree'], region: 'Gravesite Plain', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'item:revered-ash', kind: 'item', name: 'Revered Spirit Ash', aliases: ['revered ash'], region: 'Gravesite Plain', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'item:idus-sword', kind: 'item', name: 'Idus Sword', aliases: ['idus'], region: 'Liurnia', campaign: 'tarnished-pack', implies: [] },
  { id: 'item:hefty-scimitar', kind: 'item', name: 'Hefty Scimitar', aliases: ['heavy knight sword'], region: 'Limgrave', campaign: 'tarnished-pack', implies: [] },
  { id: 'item:leontiel-greatsword', kind: 'item', name: "Leontiel's Greatsword", aliases: ['leontiel sword', 'matador sword'], region: 'Caelid', campaign: 'tarnished-pack', implies: ['boss:leontiel'] },
  { id: 'item:golden-order-flail', kind: 'item', name: 'Golden Order Flail', aliases: ['order flail'], region: 'Leyndell', campaign: 'tarnished-pack', implies: ['region:leyndell'] },
  { id: 'item:reverse-bladed', kind: 'item', name: 'Reverse-Bladed Sword', aliases: ['backhand blade tarnished'], region: 'Roundtable', campaign: 'tarnished-pack', implies: [] },

  { id: 'boss:astel', kind: 'boss', name: 'Astel, Naturalborn of the Void', aliases: ['astel'], region: 'Lake of Rot', campaign: 'base', implies: ['item:fingerslayer'], drops: ['item:remembrance-naturalborn'] },

  { id: 'quest:ranni:festival', kind: 'quest', name: 'Ranni — Radahn festival opened Nokron', aliases: [], region: 'Caelid', campaign: 'base', implies: ['quest:ranni:service'] },
  { id: 'quest:ranni:service', kind: 'quest', name: 'Ranni — entered her service', aliases: ['ranni rise'], region: 'Liurnia', campaign: 'base', implies: ['grace:lake-shore'] },
  { id: 'quest:ranni:nokron', kind: 'quest', name: 'Ranni — Fingerslayer Blade recovered', aliases: [], region: 'Nokron', campaign: 'base', implies: ['quest:ranni:festival'] },
  { id: 'quest:ranni:statue', kind: 'quest', name: 'Ranni — Carian Study Hall inverted', aliases: [], region: 'Liurnia', campaign: 'base', implies: ['quest:ranni:service'] },
  { id: 'quest:ranni:ring', kind: 'quest', name: 'Ranni — Dark Moon Ring placed', aliases: ['age of stars'], region: 'Moonlight Altar', campaign: 'base', implies: ['item:dark-moon-ring'] },
  { id: 'quest:boc:needle', kind: 'quest', name: 'Boc — gold sewing needle given', aliases: ['boc'], region: 'Altus', campaign: 'base', implies: [] },
  { id: 'quest:millicent:needle', kind: 'quest', name: 'Millicent — unalloyed needle', aliases: ['millicent'], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'quest:rya:amnion', kind: 'quest', name: 'Rya — Serpent’s Amnion', aliases: ['rya'], region: 'Volcano Manor', campaign: 'base', implies: [] },

  // Legend-tier bosses the tracker listed that the seed catalog skipped (Task 18, diff §2a).
  // Beast Clergyman is *not* a separate row — it is phase one of boss:maliketh (alias above).
  // Hoarah Loux, Warrior is the second phase of boss:godfrey (alias above).
  { id: 'boss:placidusax', kind: 'boss', name: 'Dragonlord Placidusax', aliases: ['placidusax', 'dragonlord'], region: 'Farum Azula', campaign: 'base', implies: ['grace:farum-balcony'], drops: ['item:remembrance-dragonlord'] },
  { id: 'boss:fortissax', kind: 'boss', name: 'Lichdragon Fortissax', aliases: ['fortissax', 'lichdragon'], region: 'Deeproot Depths', campaign: 'base', implies: ['grace:deeproot'], drops: ['item:remembrance-lichdragon'] },
  { id: 'boss:regal-ancestor', kind: 'boss', name: 'Regal Ancestor Spirit', aliases: ['regal ancestor', 'ancestor spirit regal'], region: 'Nokron', campaign: 'base', implies: ['boss:radahn'], drops: ['item:remembrance-regal-ancestor'] },

  // Great-Enemy-tier fights (Task 18, diff §2b). Names match hosted-bosses.json so the
  // Task 06 alias table links each fact to its real bossflag id without parallel ids.
  { id: 'boss:agheel', kind: 'boss', name: 'Flying Dragon Agheel', aliases: ['agheel'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:leonine-misbegotten', kind: 'boss', name: 'Leonine Misbegotten', aliases: ['leonine'], region: 'Weeping Peninsula', campaign: 'base', implies: ['region:weeping'] },
  { id: 'boss:elemer', kind: 'boss', name: 'Elemer of the Briar', aliases: ['elemer', 'briar'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:magma-wyrm-makar', kind: 'boss', name: 'Magma Wyrm Makar', aliases: ['makar'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'boss:commander-niall', kind: 'boss', name: 'Commander Niall', aliases: ['niall'], region: 'Mountaintops', campaign: 'base', implies: ['item:haligtree-secret-medallion'] },
  { id: 'boss:loretta-haligtree', kind: 'boss', name: 'Loretta, Knight of the Haligtree', aliases: ['loretta haligtree'], region: 'Haligtree', campaign: 'base', implies: ['grace:haligtree-town'] },
  { id: 'boss:adula', kind: 'boss', name: 'Glintstone Dragon Adula', aliases: ['adula'], region: 'Liurnia', campaign: 'base', implies: ['grace:academy-gate'] },
  { id: 'boss:mimic-tear', kind: 'boss', name: 'Mimic Tear', aliases: ['mimic tear'], region: 'Nokron', campaign: 'base', implies: ['boss:radahn'] },
  { id: 'boss:valiant-gargoyle', kind: 'boss', name: 'Valiant Gargoyle', aliases: ['valiant gargoyle duo', 'valiant gargoyles'], region: 'Nokron', campaign: 'base', implies: ['boss:radahn'] },
  { id: 'boss:mohg-omen', kind: 'boss', name: 'Mohg, the Omen', aliases: ['mohg the omen', 'omen mohg'], region: 'Leyndell', campaign: 'base', implies: ['grace:east-capital'] },
  { id: 'boss:godskin-apostle', kind: 'boss', name: 'Godskin Apostle', aliases: ['godskin apostle'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'boss:godskin-noble', kind: 'boss', name: 'Godskin Noble', aliases: ['godskin noble'], region: 'Mt. Gelmir', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:ekzykes', kind: 'boss', name: 'Decaying Ekzykes', aliases: ['ekzykes'], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'boss:borealis', kind: 'boss', name: 'Borealis the Freezing Fog', aliases: ['borealis'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'boss:theodorix', kind: 'boss', name: 'Great Wyrm Theodorix', aliases: ['theodorix'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'boss:commander-oneil', kind: 'boss', name: "Commander O'Neil", aliases: ["o'neil", 'oneil'], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'boss:siluria', kind: 'boss', name: 'Crucible Knight Siluria', aliases: ['siluria'], region: 'Nokron', campaign: 'base', implies: ['boss:radahn'] },
  { id: 'boss:fia-champions', kind: 'boss', name: "Fia's Champions", aliases: ['fia champions'], region: 'Deeproot Depths', campaign: 'base', implies: ['grace:deeproot'] },
  { id: 'boss:ancestor-spirit', kind: 'boss', name: 'Ancestor Spirit', aliases: ['ancestral spirit'], region: 'Siofra River', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:dragonkin-soldier', kind: 'boss', name: 'Dragonkin Soldier', aliases: ['dragonkin'], region: 'Siofra River', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:dragonkin-nokstella', kind: 'boss', name: 'Dragonkin Soldier of Nokstella', aliases: ['dragonkin nokstella'], region: 'Nokstella', campaign: 'base', implies: ['boss:radahn'] },
  { id: 'boss:cemetery-shade', kind: 'boss', name: 'Cemetery Shade', aliases: ['cemetary shade'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:stray-mimic-tear', kind: 'boss', name: 'Stray Mimic Tear', aliases: ['stray mimic'], region: 'Mountaintops', campaign: 'base', implies: ['item:haligtree-secret-medallion'] },
  { id: 'boss:magma-wyrm', kind: 'boss', name: 'Magma Wyrm', aliases: ['magma wyrm'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:godskin-apostle-noble', kind: 'boss', name: 'Godskin Apostle & Godskin Noble', aliases: ['apostle and noble', 'spiritcaller godskins'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'boss:royal-knight-loretta', kind: 'boss', name: 'Royal Knight Loretta', aliases: ['royal loretta', 'loretta caria'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'boss:lansseax', kind: 'boss', name: 'Ancient Dragon Lansseax', aliases: ['lansseax'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:black-blade-kindred', kind: 'boss', name: 'Black Blade Kindred', aliases: ['black blade kindred'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'boss:full-grown-fallingstar', kind: 'boss', name: 'Full-Grown Fallingstar Beast', aliases: ['full grown fallingstar'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'boss:ulcerated-tree-spirit', kind: 'boss', name: 'Ulcerated Tree Spirit', aliases: ['ulcerated spirit'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },

  // Field bosses (Task 18, diff §2c). A partial pass only: the tracker's 71-name list lived
  // in the deleted .scratch/diff.json and re-scraping the sheet is out of scope, so these are
  // the recurring base-game field bosses named in hosted-bosses.json that were still missing.
  // Names match hosted rows exactly so the alias table links real bossflag ids.
  { id: 'boss:tree-sentinel', kind: 'boss', name: 'Tree Sentinel', aliases: ['tree sentinels'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:nights-cavalry', kind: 'boss', name: "Night's Cavalry", aliases: ['nights cavalry'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:deathbird', kind: 'boss', name: 'Deathbird', aliases: [], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:death-rite-bird', kind: 'boss', name: 'Death Rite Bird', aliases: ['death rite'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'boss:bell-bearing-hunter', kind: 'boss', name: 'Bell Bearing Hunter', aliases: ['bell bearing hunter'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:erdtree-avatar', kind: 'boss', name: 'Erdtree Avatar', aliases: ['erdtree avatars'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:putrid-avatar', kind: 'boss', name: 'Putrid Avatar', aliases: [], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'boss:tibia-mariner', kind: 'boss', name: 'Tibia Mariner', aliases: ['tibia mariners'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:black-knife-assassin', kind: 'boss', name: 'Black Knife Assassin', aliases: ['black knife assassins'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:cleanrot-knight', kind: 'boss', name: 'Cleanrot Knight', aliases: ['cleanrot knights'], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'boss:crystalian-duo', kind: 'boss', name: 'Crystalian Duo', aliases: ['crystalian'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'boss:grave-warden-duelist', kind: 'boss', name: 'Grave Warden Duelist', aliases: ['grave warden'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:runebear', kind: 'boss', name: 'Runebear', aliases: [], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:omenkiller', kind: 'boss', name: 'Omenkiller', aliases: ['omenkillers'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'boss:wormface', kind: 'boss', name: 'Wormface', aliases: [], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:onyx-lord', kind: 'boss', name: 'Onyx Lord', aliases: [], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'boss:fallingstar-beast', kind: 'boss', name: 'Fallingstar Beast', aliases: ['fallingstar'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:grafted-scion', kind: 'boss', name: 'Grafted Scion', aliases: ['grafted scions'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:spiritcaller-snail', kind: 'boss', name: 'Spiritcaller Snail', aliases: ['spiritcaller'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'boss:darriwil', kind: 'boss', name: 'Bloodhound Knight Darriwil', aliases: ['darriwil', 'bloodhound knight'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:mad-pumpkin-head', kind: 'boss', name: 'Mad Pumpkin Head', aliases: ['mad pumpkin'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:godefroy', kind: 'boss', name: 'Godefroy the Grafted', aliases: ['godefroy'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:erdtree-burial-watchdog', kind: 'boss', name: 'Erdtree Burial Watchdog', aliases: ['burial watchdog'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:perfumer-tricia', kind: 'boss', name: 'Perfumer Tricia & Misbegotten Warrior', aliases: ['perfumer tricia'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:red-wolf-champion', kind: 'boss', name: 'Red Wolf of the Champion', aliases: ['red wolf champion'], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'boss:crucible-ordovis', kind: 'boss', name: 'Crucible Knight Ordovis', aliases: ['ordovis'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'boss:ancient-hero-zamor', kind: 'boss', name: 'Ancient Hero of Zamor', aliases: ['zamor'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'boss:demi-human-chiefs', kind: 'boss', name: 'Demi-Human Chiefs', aliases: ['demi human chiefs'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:guardian-golem', kind: 'boss', name: 'Guardian Golem', aliases: [], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'boss:stonedigger-troll', kind: 'boss', name: 'Stonedigger Troll', aliases: ['stonedigger'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },

  // NPC invaders (Task 18, diff §2d). Deliberately `kind: 'boss'` and boss-bucketed in
  // prefixKind: an invader is a defeatable named encounter that belongs on defeatedBosses,
  // and adding a fourth Character list would change the kernel (see HANDOFF §5). The
  // `invader:` id prefix keeps them separable from true `boss:` facts. The tracker's 31
  // rows collapse to 24 unique encounters (several repeat ×2/×3); Fia's Champions is
  // encoded above as a boss, not an invader.
  { id: 'invader:great-horned-targoth', kind: 'boss', name: 'Great Horned Targoth', aliases: ['targoth'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'invader:knight-bernahl', kind: 'boss', name: 'Knight Bernahl', aliases: ['recusant bernahl', 'bernahl'], region: 'Farum Azula', campaign: 'base', implies: ['region:farum'] },
  { id: 'invader:millicents-sisters', kind: 'boss', name: "Millicent's Sisters", aliases: ['millicent sisters'], region: 'Elphael', campaign: 'base', implies: ['grace:drainage'] },
  { id: 'invader:nameless-white-mask', kind: 'boss', name: 'Nameless White Mask', aliases: ['white mask invader'], region: 'Mohgwyn', campaign: 'base', implies: ['boss:mohg'] },
  { id: 'invader:ensha', kind: 'boss', name: 'Ensha of the Royal Remains', aliases: ['ensha'], region: 'Roundtable', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'invader:mad-tongue-alberich', kind: 'boss', name: 'Mad Tongue Alberich', aliases: ['alberich'], region: 'Roundtable', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'invader:anastasia', kind: 'boss', name: 'Anastasia, Tarnished-Eater', aliases: ['anastasia'], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'invader:nerijus', kind: 'boss', name: 'Bloody Finger Nerijus', aliases: ['nerijus'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'invader:recusant-henricus', kind: 'boss', name: 'Recusant Henricus', aliases: ['henricus'], region: 'Limgrave', campaign: 'base', implies: ['region:limgrave'] },
  { id: 'invader:edgar-revenger', kind: 'boss', name: 'Edgar the Revenger', aliases: ['edgar revenger', 'revenger'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'invader:vyke', kind: 'boss', name: 'Festering Fingerprint Vyke', aliases: ['vyke'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'invader:preceptor-miriam', kind: 'boss', name: 'Preceptor Miriam', aliases: ['miriam'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'invader:inquisitor-ghiza', kind: 'boss', name: 'Inquisitor Ghiza', aliases: ['ghiza'], region: 'Volcano Manor', campaign: 'base', implies: ['region:altus'] },
  { id: 'invader:millicent', kind: 'boss', name: 'Millicent', aliases: ['millicent invader'], region: 'Elphael', campaign: 'base', implies: ['grace:drainage'] },
  { id: 'invader:eleonora', kind: 'boss', name: 'Eleonora, Violet Bloody Finger', aliases: ['eleonora'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'invader:dung-eater', kind: 'boss', name: 'Dung Eater', aliases: ['dung eater invasion', 'defiler'], region: 'Leyndell', campaign: 'base', implies: ['quest:dungeater:freed'] },
  { id: 'invader:maleigh-marais', kind: 'boss', name: 'Maleigh Marais, Shaded Castle Castellan', aliases: ['maleigh marais', 'marais'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'invader:rileigh', kind: 'boss', name: 'Rileigh the Idle', aliases: ['rileigh'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'invader:vargram', kind: 'boss', name: 'Vargram the Raging Wolf', aliases: ['vargram'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'invader:wilhelm', kind: 'boss', name: 'Errant Sorcerer Wilhelm', aliases: ['wilhelm'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'invader:okina', kind: 'boss', name: 'Bloody Finger Okina', aliases: ['okina'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'invader:juno-hoslow', kind: 'boss', name: 'Juno Hoslow, Knight of Blood', aliases: ['juno hoslow', 'hoslow'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'invader:sanguine-noble', kind: 'boss', name: 'Sanguine Noble', aliases: ['sanguine noble invader'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'invader:varre', kind: 'boss', name: 'White Mask Varré', aliases: ['varre invasion', 'white mask varre'], region: 'Mohgwyn', campaign: 'base', implies: ['boss:mohg'] },

  // Remembrances (Task 18, diff §2f). Same drop-on-death convention as the Great Runes:
  // the boss lists the item in `drops`, the item `implies` the boss.
  { id: 'item:remembrance-grafted', kind: 'item', name: 'Remembrance of the Grafted', aliases: ['grafted remembrance'], region: 'Stormveil', campaign: 'base', implies: ['boss:godrick'] },
  { id: 'item:remembrance-full-moon-queen', kind: 'item', name: 'Remembrance of the Full Moon Queen', aliases: ['full moon queen remembrance'], region: 'Raya Lucaria', campaign: 'base', implies: ['boss:rennala'] },
  { id: 'item:remembrance-starscourge', kind: 'item', name: 'Remembrance of the Starscourge', aliases: ['starscourge remembrance'], region: 'Caelid', campaign: 'base', implies: ['boss:radahn'] },
  { id: 'item:remembrance-regal-ancestor', kind: 'item', name: 'Remembrance of the Regal Ancestor', aliases: ['regal ancestor remembrance'], region: 'Nokron', campaign: 'base', implies: ['boss:regal-ancestor'] },
  { id: 'item:remembrance-naturalborn', kind: 'item', name: 'Remembrance of the Naturalborn', aliases: ['naturalborn remembrance'], region: 'Lake of Rot', campaign: 'base', implies: ['boss:astel'] },
  { id: 'item:remembrance-blasphemous', kind: 'item', name: 'Remembrance of the Blasphemous', aliases: ['blasphemous remembrance'], region: 'Mt. Gelmir', campaign: 'base', implies: ['boss:rykard'] },
  { id: 'item:remembrance-omen-king', kind: 'item', name: 'Remembrance of the Omen King', aliases: ['omen king remembrance'], region: 'Leyndell', campaign: 'base', implies: ['boss:morgott'] },
  { id: 'item:remembrance-rot-goddess', kind: 'item', name: 'Remembrance of the Rot Goddess', aliases: ['rot goddess remembrance'], region: 'Elphael', campaign: 'base', implies: ['boss:malenia'] },
  { id: 'item:remembrance-blood-lord', kind: 'item', name: 'Remembrance of the Blood Lord', aliases: ['blood lord remembrance'], region: 'Mohgwyn', campaign: 'base', implies: ['boss:mohg'] },
  { id: 'item:remembrance-lichdragon', kind: 'item', name: 'Remembrance of the Lichdragon', aliases: ['lichdragon remembrance'], region: 'Deeproot Depths', campaign: 'base', implies: ['boss:fortissax'] },
  { id: 'item:remembrance-fire-giant', kind: 'item', name: 'Remembrance of the Fire Giant', aliases: ['fire giant remembrance'], region: 'Mountaintops', campaign: 'base', implies: ['boss:fire-giant'] },
  { id: 'item:remembrance-dragonlord', kind: 'item', name: 'Remembrance of the Dragonlord', aliases: ['dragonlord remembrance'], region: 'Farum Azula', campaign: 'base', implies: ['boss:placidusax'] },
  { id: 'item:remembrance-black-blade', kind: 'item', name: 'Remembrance of the Black Blade', aliases: ['black blade remembrance'], region: 'Farum Azula', campaign: 'base', implies: ['boss:maliketh'] },
  { id: 'item:remembrance-hoarah-loux', kind: 'item', name: 'Remembrance of Hoarah Loux', aliases: ['hoarah loux remembrance'], region: 'Ashen Capital', campaign: 'base', implies: ['boss:godfrey'] },
  { id: 'item:elden-remembrance', kind: 'item', name: 'Elden Remembrance', aliases: ['elden remembrance'], region: 'Ashen Capital', campaign: 'base', implies: ['boss:radagon'] },

  // Quest-item keys (Task 18, diff §2e).
  { id: 'item:rold-medallion', kind: 'item', name: 'Rold Medallion', aliases: ['rold'], region: 'Leyndell', campaign: 'base', implies: ['boss:morgott'], note: 'Opens the Grand Lift of Rold to the Mountaintops.' },
  { id: 'item:cursemark-of-death', kind: 'item', name: 'Cursemark of Death', aliases: ['cursemark'], region: 'Liurnia', campaign: 'base', implies: ['quest:ranni:statue'], usedIn: ['quest:fia:cursemark'] },
  { id: 'item:miniature-ranni', kind: 'item', name: 'Miniature Ranni', aliases: ['mini ranni'], region: 'Liurnia', campaign: 'base', implies: ['quest:ranni:service'], usedIn: ['quest:ranni:ring'] },
  { id: 'item:valkyries-prosthesis', kind: 'item', name: "Valkyrie's Prosthesis", aliases: ['prosthesis'], region: 'Caelid', campaign: 'base', implies: ['quest:millicent:cured'], usedIn: ['quest:millicent:aid'] },
  { id: 'item:black-knifeprint', kind: 'item', name: 'Black Knifeprint', aliases: ['knifeprint'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'], usedIn: ['quest:ranni:service'] },
  { id: 'item:weathered-dagger', kind: 'item', name: 'Weathered Dagger', aliases: ['weathered dagger'], region: 'Roundtable', campaign: 'base', implies: ['quest:fia:met'], usedIn: ['quest:fia:dagger', 'quest:d:dagger-choice'] },
  { id: 'item:sellian-sealbreaker', kind: 'item', name: 'Sellian Sealbreaker', aliases: ['sealbreaker'], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'item:ryas-necklace', kind: 'item', name: "Rya's Necklace", aliases: ['rya necklace'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'], usedIn: ['quest:rya:necklace'] },
  { id: 'item:volcano-manor-invitation', kind: 'item', name: 'Volcano Manor Invitation', aliases: ['manor invitation'], region: 'Liurnia', campaign: 'base', implies: ['quest:rya:necklace'], usedIn: ['quest:rya:manor'] },
  { id: 'item:lord-of-blood-favor', kind: 'item', name: "Lord of Blood's Favor", aliases: ['blood favor'], region: 'Liurnia', campaign: 'base', implies: ['quest:varre:cloth'], usedIn: ['quest:varre:cloth'] },

  // Prayerbooks and scrolls (Task 18, diff §2e).
  { id: 'item:prayerbook-ancient-dragon', kind: 'item', name: 'Ancient Dragon Prayerbook', aliases: ['ancient dragon prayerbook'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'item:prayerbook-giants', kind: 'item', name: "Giant's Prayerbook", aliases: ['giants prayerbook'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'item:prayerbook-assassins', kind: 'item', name: "Assassin's Prayerbook", aliases: ['assassins prayerbook'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'item:prayerbook-dragon-cult', kind: 'item', name: 'Dragon Cult Prayerbook', aliases: ['dragon cult prayerbook'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'item:prayerbook-fire-monks', kind: 'item', name: "Fire Monks' Prayerbook", aliases: ['fire monks prayerbook'], region: 'Mountaintops', campaign: 'base', implies: ['region:mountaintops'] },
  { id: 'item:prayerbook-godskin', kind: 'item', name: 'Godskin Prayerbook', aliases: ['godskin prayerbook'], region: 'Altus', campaign: 'base', implies: ['region:altus'] },
  { id: 'item:prayerbook-two-fingers', kind: 'item', name: 'Two Fingers Prayerbook', aliases: ['two fingers prayerbook'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'item:golden-order-principia', kind: 'item', name: 'Golden Order Principia', aliases: ['principia', 'golden order prayerbook'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'item:scroll-academy', kind: 'item', name: 'Academy Scroll', aliases: ['academy scroll'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'item:scroll-royal-house', kind: 'item', name: 'Royal House Scroll', aliases: ['royal house scroll'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },
  { id: 'item:scroll-conspectus', kind: 'item', name: 'Conspectus Scroll', aliases: ['conspectus scroll'], region: 'Liurnia', campaign: 'base', implies: ['region:liurnia'] },

  // Item facts that storylines.ts / endings.ts already reference by id (Task 18 item 5):
  // these were dangling references — a quest step naming a fact that did not exist.
  { id: 'item:miquella-needle', kind: 'item', name: "Miquella's Needle", aliases: ['miquella needle'], region: 'Elphael', campaign: 'base', implies: ['quest:millicent:aid'], usedIn: ['quest:frenzy:taken'] },
  { id: 'item:shard-of-alexander', kind: 'item', name: 'Shard of Alexander', aliases: ['alexander shard'], region: 'Farum Azula', campaign: 'base', implies: ['quest:alexander:complete'] },
  { id: 'item:pureblood-medal', kind: 'item', name: "Pureblood Knight's Medal", aliases: ['pureblood medal'], region: 'Liurnia', campaign: 'base', implies: ['quest:varre:cloth'] },
  { id: 'item:ancient-dragon-smithing-stone', kind: 'item', name: 'Ancient Dragon Smithing Stone', aliases: ['ancient dragon stone'], region: 'Stormveil', campaign: 'base', implies: ['quest:nepheli:ruler'] },
  { id: 'item:sword-of-milos', kind: 'item', name: 'Sword of Milos', aliases: ['milos'], region: 'Leyndell', campaign: 'base', implies: ['quest:dungeater:invasion'] },
  { id: 'item:mending-rune-fell-curse', kind: 'item', name: 'Mending Rune of the Fell Curse', aliases: ['fell curse rune'], region: 'Leyndell', campaign: 'base', implies: ['quest:dungeater:invasion'] },
  { id: 'item:mending-rune-death-prince', kind: 'item', name: 'Mending Rune of the Death-Prince', aliases: ['death prince rune'], region: 'Deeproot Depths', campaign: 'base', implies: ['boss:fortissax'] },
  { id: 'item:mending-rune-order', kind: 'item', name: 'Mending Rune of Perfect Order', aliases: ['perfect order rune'], region: 'Mountaintops', campaign: 'base', implies: ['quest:goldmask:regression'] },
  { id: 'item:stars-of-ruin', kind: 'item', name: 'Stars of Ruin', aliases: ['stars ruin'], region: 'Raya Lucaria', campaign: 'base', implies: ['quest:sellen:side'] },
  { id: 'item:nagakiba', kind: 'item', name: 'Nagakiba', aliases: [], region: 'Liurnia', campaign: 'base', implies: ['quest:yura:nagakiba'] },
  { id: 'item:flock-canvas-talisman', kind: 'item', name: "Flock's Canvas Talisman", aliases: ['flock canvas'], region: 'Caelid', campaign: 'base', implies: ['quest:gowry:concluded'] },
  { id: 'item:twinned-armor', kind: 'item', name: 'Twinned Armor', aliases: ['twinned set'], region: 'Deeproot Depths', campaign: 'base', implies: [] },
  { id: 'item:thops-barrier', kind: 'item', name: "Thops's Barrier", aliases: ['thops barrier'], region: 'Raya Lucaria', campaign: 'base', implies: ['quest:thops:barrier'] },

  // Missable items the Task 52 gate overlay names (source: public/sourced/guide/missables.json,
  // the same file src/knowledge/missables.ts is built from). Real locked-away items that had no
  // catalog row; adding the fact does not invent a location or an unlock.
  { id: 'item:bolt-of-gransax', kind: 'item', name: 'Bolt of Gransax', aliases: ['gransax'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'item:sanctified-whetblade', kind: 'item', name: 'Sanctified Whetblade', aliases: ['sanctified whetblade'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'item:blessed-dew-talisman', kind: 'item', name: 'Blessed Dew Talisman', aliases: ['blessed dew'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'item:black-whetblade', kind: 'item', name: 'Black Whetblade', aliases: ['black whetblade'], region: 'Nokron', campaign: 'base', implies: [] },
  { id: 'item:rotten-winged-sword-insignia', kind: 'item', name: 'Rotten Winged Sword Insignia', aliases: ['rotten winged insignia'], region: 'Elphael', campaign: 'base', implies: ['grace:drainage'] },
  { id: 'item:millicent-prosthesis', kind: 'item', name: "Millicent's Prosthesis", aliases: ['millicent prosthesis'], region: 'Elphael', campaign: 'base', implies: ['grace:drainage'] },

  // Task 53: quest-state and key-item facts the eight wiki-grade lines need. Names come from
  // the in-repo dumps (open/names.json goods/npcs/places, guide/items.json acquisition text,
  // guide/map-extras.json) and the existing route authoring; no scraped walkthrough prose.
  // `implies: []` on quest state on purpose: a beat being done does not, by itself, prove a
  // region or an earlier beat, and inventing that chain is exactly what Task 12 warned against.
  { id: 'quest:erdtree-burned', kind: 'quest', name: 'The Erdtree burned at the Forge of the Giants', aliases: ['burned the erdtree'], region: 'Mountaintops', campaign: 'base', implies: [] },
  { id: 'quest:seluvis-blade', kind: 'quest', name: 'Seluvis has the Fingerslayer Blade', aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },

  // Ranni — servant states that gate the Fingerslayer hand-in and the fork.
  { id: 'quest:ranni:iji', kind: 'quest', name: 'Ranni — Iji counselled', aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },
  { id: 'quest:ranni:blaidd', kind: 'quest', name: 'Ranni — Blaidd met', aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },
  { id: 'quest:ranni:blaidd-fate', kind: 'quest', name: "Ranni — Blaidd's fate at the Rise", aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },
  { id: 'quest:ranni:iji-fate', kind: 'quest', name: "Ranni — Iji's last counsel", aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },

  // Millicent — Gowry needle through the Elphael gold/red fork.
  { id: 'quest:millicent:cured', kind: 'quest', name: 'Millicent — cured at the Church of the Plague', aliases: [], region: 'Caelid', campaign: 'base', implies: [] },
  { id: 'quest:millicent:altus', kind: 'quest', name: 'Millicent — met at Erdtree-Gazing Hill', aliases: [], region: 'Altus', campaign: 'base', implies: [] },
  { id: 'quest:millicent:godskin', kind: 'quest', name: 'Millicent — aided at Dominula', aliases: [], region: 'Altus', campaign: 'base', implies: [] },
  { id: 'quest:millicent:prosthesis', kind: 'quest', name: 'Millicent — Valkyrie’s Prosthesis given', aliases: [], region: 'Altus', campaign: 'base', implies: [] },
  { id: 'quest:millicent:aid', kind: 'quest', name: 'Millicent — aided at Elphael (gold sign)', aliases: [], region: 'Elphael', campaign: 'base', implies: [] },
  { id: 'quest:millicent:betrayed', kind: 'quest', name: 'Millicent — challenged at Elphael (red sign)', aliases: [], region: 'Elphael', campaign: 'base', implies: [] },
  { id: 'quest:millicent-killed', kind: 'quest', name: 'Millicent is dead this run', aliases: [], region: 'Elphael', campaign: 'base', implies: [] },

  // Fia — knifeprint join, Deeproot, Fortissax, ending vs D’s brother.
  { id: 'quest:fia:met', kind: 'quest', name: 'Fia — held at the Roundtable', aliases: [], region: 'Roundtable', campaign: 'base', implies: [] },
  { id: 'quest:fia:dagger', kind: 'quest', name: 'Fia — Weathered Dagger decided', aliases: [], region: 'Roundtable', campaign: 'base', implies: [] },
  { id: 'quest:fia:cursemark', kind: 'quest', name: 'Fia — Cursemark of Death given', aliases: [], region: 'Deeproot Depths', campaign: 'base', implies: [] },
  { id: 'quest:fia:concluded', kind: 'quest', name: 'Fia — Death-Prince line concluded', aliases: [], region: 'Deeproot Depths', campaign: 'base', implies: [] },
  { id: 'quest:d:brother', kind: 'quest', name: "D's brother met in Deeproot", aliases: [], region: 'Deeproot Depths', campaign: 'base', implies: [] },

  // Dung Eater — seedbeds, potion fork, blessing / curse.
  { id: 'quest:dungeater:met', kind: 'quest', name: 'Dung Eater — met at the Roundtable', aliases: [], region: 'Roundtable', campaign: 'base', implies: [] },
  { id: 'quest:dungeater:freed', kind: 'quest', name: 'Dung Eater — cell opened in the Shunning-Grounds', aliases: [], region: 'Leyndell', campaign: 'base', implies: [] },
  { id: 'quest:dungeater:invasion', kind: 'quest', name: 'Dung Eater — defeated at the Leyndell moat', aliases: [], region: 'Leyndell', campaign: 'base', implies: [] },
  { id: 'quest:dungeater:potioned', kind: 'quest', name: 'Dung Eater — made a Seluvis puppet', aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },

  // Tanith / Volcano Manor — Rya recruit, drawings, Rykard, Rya aftermath.
  { id: 'quest:tanith:contracts', kind: 'quest', name: 'Tanith — first contract taken', aliases: [], region: 'Volcano Manor', campaign: 'base', implies: [] },
  { id: 'quest:tanith:targets', kind: 'quest', name: 'Tanith — named contracts complete', aliases: [], region: 'Volcano Manor', campaign: 'base', implies: [] },
  { id: 'quest:tanith:concluded', kind: 'quest', name: 'Tanith — final request heard', aliases: [], region: 'Volcano Manor', campaign: 'base', implies: [] },
  { id: 'quest:rya:necklace', kind: 'quest', name: 'Rya — necklace recovered', aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },
  { id: 'quest:rya:manor', kind: 'quest', name: 'Rya — joined Volcano Manor', aliases: [], region: 'Volcano Manor', campaign: 'base', implies: [] },
  { id: 'quest:rya:concluded', kind: 'quest', name: 'Rya — aftermath chosen', aliases: [], region: 'Volcano Manor', campaign: 'base', implies: [] },

  // Leda — one beat per invitation window, then Sealing Tree and Enir-Ilim.
  { id: 'quest:leda:met', kind: 'quest', name: 'Leda — met at the Three-Path Cross', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'quest:leda:highroad', kind: 'quest', name: 'Leda — met at the Highroad Cross', aliases: [], region: 'Scadu Altus', campaign: 'sote', implies: [] },
  { id: 'quest:leda:invitations', kind: 'quest', name: 'Leda — Shadow Keep invitations cleared', aliases: [], region: 'Shadow Keep', campaign: 'sote', implies: [] },
  { id: 'quest:leda:invitations-locked', kind: 'quest', name: 'Leda — invitation window closed at the Sealing Tree', aliases: [], region: 'Shadow Keep', campaign: 'sote', implies: [] },
  { id: 'quest:leda:concluded', kind: 'quest', name: 'Leda — Enir-Ilim alliance resolved', aliases: [], region: 'Enir-Ilim', campaign: 'sote', implies: [] },
  { id: 'quest:hornsent:met', kind: 'quest', name: 'Hornsent — met at the Three-Path Cross', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'quest:freyja:met', kind: 'quest', name: 'Freyja — met at the Three-Path Cross', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'quest:thiollier:met', kind: 'quest', name: 'Thiollier — met at the Three-Path Cross', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'quest:ansbach:met', kind: 'quest', name: 'Ansbach — freed in the Shadow Keep', aliases: [], region: 'Shadow Keep', campaign: 'sote', implies: [] },

  // Sellen — Jerren, Lusat, Azur, the fork.
  { id: 'quest:sellen:freed', kind: 'quest', name: 'Sellen — freed from the Waypoint Ruins', aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },
  { id: 'quest:sellen:azur', kind: 'quest', name: 'Sellen — Azur found', aliases: [], region: 'Mt. Gelmir', campaign: 'base', implies: [] },
  { id: 'quest:sellen:lusat', kind: 'quest', name: 'Sellen — Lusat found', aliases: [], region: 'Caelid', campaign: 'base', implies: [] },
  { id: 'quest:sellen:primers', kind: 'quest', name: 'Sellen — both primeval sorcerers reported', aliases: [], region: 'Liurnia', campaign: 'base', implies: [] },
  { id: 'quest:sellen:jerren', kind: 'quest', name: 'Sellen — Witch-Hunter Jerren met', aliases: [], region: 'Raya Lucaria', campaign: 'base', implies: [] },
  { id: 'quest:sellen:side', kind: 'quest', name: 'Sellen — sided with her against Jerren', aliases: [], region: 'Raya Lucaria', campaign: 'base', implies: [] },
  { id: 'quest:sellen:jerren-side', kind: 'quest', name: 'Sellen — sided with Jerren', aliases: [], region: 'Raya Lucaria', campaign: 'base', implies: [] },

  // Count Ymir — finger-ruin bells, Jolan, Metyr, the Iris choice.
  { id: 'quest:ymir:met', kind: 'quest', name: 'Ymir — met at the Cathedral of Manus Metyr', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'quest:ymir:rhia', kind: 'quest', name: 'Ymir — bell rung at the Finger Ruins of Rhia', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'quest:ymir:dheo', kind: 'quest', name: 'Ymir — bell rung at the Finger Ruins of Dheo', aliases: [], region: 'Scadu Altus', campaign: 'sote', implies: [] },
  { id: 'quest:jolan:met', kind: 'quest', name: 'Jolan, Swordhand of Night — met', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'quest:ymir:concluded', kind: 'quest', name: 'Ymir — Iris choice made', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },

  { id: 'item:seedbed-curse', kind: 'item', name: 'Seedbed Curse', aliases: ['seedbed'], region: 'Leyndell', campaign: 'base', implies: [] },
  { id: 'item:drawing-room-key', kind: 'item', name: 'Drawing-Room Key', aliases: ['drawing room key'], region: 'Volcano Manor', campaign: 'base', implies: [] },
  { id: 'item:iris-of-grace', kind: 'item', name: 'Iris of Grace', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'item:iris-of-occultation', kind: 'item', name: 'Iris of Occultation', aliases: [], region: 'Gravesite Plain', campaign: 'sote', implies: [] },
  { id: 'boss:metyr', kind: 'boss', name: 'Metyr, Mother of Fingers', aliases: ['metyr', 'mother of fingers'], region: 'Gravesite Plain', campaign: 'sote', implies: [] },

  // Task 54: the two named items the inference chains need that had no catalog row.
  // Real goods from public/sourced/open/names.json ("Mimic Tear Ashes", "Haligtree
  // Secret Medallion (Left)"/"(Right)"). `implies: []` on both halves on purpose —
  // the Haligtree gate is a compound chain (see src/knowledge/inferChains.ts), so a
  // lone half must never close the world on its own.
  { id: 'item:mimic-tear-ashes', kind: 'item', name: 'Mimic Tear Ashes', aliases: ['mimic tear ashes', 'mimic ash'], region: 'Nokron', campaign: 'base', implies: [] },
  { id: 'item:haligtree-medallion-left', kind: 'item', name: 'Haligtree Secret Medallion (Left)', aliases: ['haligtree medallion left'], region: 'Mountaintops', campaign: 'base', implies: [] },
  { id: 'item:haligtree-medallion-right', kind: 'item', name: 'Haligtree Secret Medallion (Right)', aliases: ['haligtree medallion right'], region: 'Liurnia', campaign: 'base', implies: [] },
]

export const byId = new Map(facts.map((f) => [f.id, f]))

export function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

export function matchFacts(text: string): Fact[] {
  const n = normalize(text)
  if (n.length < 3) return []
  const scored = facts.map((f) => {
    const names = [f.name, ...f.aliases].map(normalize)
    let score = 0
    for (const name of names) {
      if (!name) continue
      if (n === name) score = Math.max(score, 3)
      else if (n.includes(name) || name.includes(n)) score = Math.max(score, 2)
    }
    return { f, score }
  })
  return scored.filter((s) => s.score >= 2).sort((a, b) => b.score - a.score).map((s) => s.f)
}

export function matchMany(blob: string): Fact[] {
  const seen = new Set<string>()
  const out: Fact[] = []
  const lines = blob.split(/[\n,;/|]+/)
  const whole = matchFacts(blob)
  for (const f of whole) {
    if (!seen.has(f.id)) { seen.add(f.id); out.push(f) }
  }
  for (const line of lines) {
    for (const f of matchFacts(line)) {
      if (!seen.has(f.id)) { seen.add(f.id); out.push(f) }
    }
  }
  return out
}

export const interview = [
  {
    id: 'platform',
    prompt: 'Where are you playing?',
    hint: 'PS5 has no save drop. We reconstruct from answers and screenshots. PC can still drop ER0000.sl2.',
    options: [
      { value: 'ps5', label: 'PlayStation 5' },
      { value: 'pc', label: 'PC' },
      { value: 'both', label: 'Both' },
    ],
  },
  {
    id: 'class',
    prompt: 'Starting class?',
    hint: 'Heavy Knight and Idus Knight are Tarnished Pack / Tarnished Edition.',
    options: [
      { value: 'unknown', label: 'Not sure' },
      { value: 'vagabond', label: 'Vagabond' },
      { value: 'samurai', label: 'Samurai' },
      { value: 'wretch', label: 'Wretch' },
      { value: 'astrologer', label: 'Astrologer' },
      { value: 'confessor', label: 'Confessor' },
      { value: 'heavy-knight', label: 'Heavy Knight' },
      { value: 'idus-knight', label: 'Idus Knight' },
    ],
  },
  {
    id: 'tarnished',
    prompt: 'Tarnished Pack / Tarnished Edition?',
    hint: 'The Tarnished Pack adds the Heavy Knight and Idus Knight starts and the Leontiel encounter. Pick your start and its origin weapon is seeded.',
    options: [
      { value: 'none', label: 'No / base game' },
      { value: 'heavy-knight', label: 'Heavy Knight start' },
      { value: 'idus-knight', label: 'Idus Knight start' },
      { value: 'owned', label: 'Own it, other start' },
      { value: 'unknown', label: 'Not sure' },
    ],
  },
  {
    id: 'dlc',
    prompt: 'How far has the world opened?',
    hint: 'One answer here unlocks whole regions of the atlas.',
    options: [
      { value: 'limgrave', label: 'Still in Limgrave / Weeping' },
      { value: 'liurnia', label: 'Reached Liurnia' },
      { value: 'altus', label: 'Reached Altus or Leyndell' },
      { value: 'mountaintops', label: 'Mountaintops or Farum' },
      { value: 'sote', label: 'Entered the Realm of Shadow' },
      { value: 'finished', label: 'Elden Lord / a final ending' },
    ],
  },
  {
    id: 'soteStart',
    prompt: 'Did this run begin with the DLC already open?',
    hint: 'A post-Radahn start with the Realm of Shadow unlocked already has Radahn and Mohg down — answering yes seeds region:shadow and both access bosses.',
    options: [
      { value: 'no', label: 'No — began in the base game' },
      { value: 'yes', label: 'Yes — DLC already unlocked' },
    ],
  },
  {
    id: 'lastGrace',
    prompt: 'Where did you last sit?',
    hint: 'One warp name lights that region and everything required to reach it.',
    options: [
      { value: 'grace:elleh', label: 'Church of Elleh' },
      { value: 'grace:gatefront', label: 'Gatefront' },
      { value: 'grace:lake-shore', label: 'Liurnia Lake Shore' },
      { value: 'grace:redmane', label: 'Redmane plaza' },
      { value: 'grace:east-capital', label: 'East Capital Rampart' },
      { value: 'grace:forge-giants', label: 'Foot of the Forge' },
      { value: 'grace:gravesite', label: 'Gravesite Plain' },
      { value: 'grace:shadow-keep', label: 'Shadow Keep plaza' },
    ],
  },
  {
    id: 'shardbearers',
    prompt: 'Which shardbearers are dead?',
    hint: 'Great Runes in the inventory are enough if you screenshot that page instead.',
    multi: true,
    options: [
      { value: 'boss:godrick', label: 'Godrick' },
      { value: 'boss:rennala', label: 'Rennala' },
      { value: 'boss:radahn', label: 'Radahn' },
      { value: 'boss:rykard', label: 'Rykard' },
      { value: 'boss:morgott', label: 'Morgott' },
      { value: 'boss:mohg', label: 'Mohg' },
      { value: 'boss:malenia', label: 'Malenia' },
    ],
  },
]
