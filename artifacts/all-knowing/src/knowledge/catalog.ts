import type { Campaign } from '../types'

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
  { id: 'grace:gravesite', kind: 'grace', name: 'Gravesite Plain', aliases: ['scorched ruins', 'three-path cross'], region: 'Gravesite Plain', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'grace:belurat', kind: 'grace', name: 'Belurat, Tower Settlement', aliases: ['belurat'], region: 'Belurat', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'grace:shadow-keep', kind: 'grace', name: 'Main Gate Plaza', aliases: ['shadow keep plaza'], region: 'Shadow Keep', campaign: 'sote', implies: ['region:shadow'] },

  // Bosses
  { id: 'boss:margit', kind: 'boss', name: 'Margit, the Fell Omen', aliases: ['margit', 'fell omen'], region: 'Stormveil', campaign: 'base', implies: ['grace:castleward'] },
  { id: 'boss:godrick', kind: 'boss', name: 'Godrick the Grafted', aliases: ['godrick'], region: 'Stormveil', campaign: 'base', implies: ['boss:margit'], drops: ['item:godrick-great-rune'] },
  { id: 'boss:red-wolf', kind: 'boss', name: 'Red Wolf of Radagon', aliases: ['red wolf'], region: 'Raya Lucaria', campaign: 'base', implies: ['item:academy-glintstone-key'] },
  { id: 'boss:rennala', kind: 'boss', name: 'Rennala, Queen of the Full Moon', aliases: ['rennala'], region: 'Raya Lucaria', campaign: 'base', implies: ['boss:red-wolf'], drops: ['item:rennala-great-rune'] },
  { id: 'boss:radahn', kind: 'boss', name: 'Starscourge Radahn', aliases: ['radahn', 'general radahn'], region: 'Caelid', campaign: 'base', implies: ['quest:ranni:festival'], drops: ['item:radahn-great-rune'] },
  { id: 'boss:rykard', kind: 'boss', name: 'Rykard, Lord of Blasphemy', aliases: ['rykard', 'god-devouring serpent'], region: 'Mt. Gelmir', campaign: 'base', implies: [], drops: ['item:rykard-great-rune'] },
  { id: 'boss:godfrey-golden', kind: 'boss', name: 'Godfrey, First Elden Lord (golden shade)', aliases: ['golden godfrey', 'godfrey shade'], region: 'Leyndell', campaign: 'base', implies: ['region:leyndell'] },
  { id: 'boss:morgott', kind: 'boss', name: 'Morgott, the Omen King', aliases: ['morgott', 'omen king'], region: 'Leyndell', campaign: 'base', implies: ['boss:godfrey-golden'], drops: ['item:morgott-great-rune'] },
  { id: 'boss:fire-giant', kind: 'boss', name: 'Fire Giant', aliases: [], region: 'Mountaintops', campaign: 'base', implies: ['grace:forge-giants'] },
  { id: 'boss:godskin-duo', kind: 'boss', name: 'Godskin Duo', aliases: [], region: 'Farum Azula', campaign: 'base', implies: ['region:farum'] },
  { id: 'boss:maliketh', kind: 'boss', name: 'Maliketh, the Black Blade', aliases: ['maliketh', 'gurranq'], region: 'Farum Azula', campaign: 'base', implies: ['boss:godskin-duo'] },
  { id: 'boss:gideon', kind: 'boss', name: 'Sir Gideon Ofnir, the All-Knowing', aliases: ['gideon', 'ofnir'], region: 'Ashen Capital', campaign: 'base', implies: ['boss:maliketh'] },
  { id: 'boss:godfrey', kind: 'boss', name: 'Godfrey, First Elden Lord / Hoarah Loux', aliases: ['hoarah loux', 'godfrey'], region: 'Ashen Capital', campaign: 'base', implies: ['boss:gideon'] },
  { id: 'boss:radagon', kind: 'boss', name: 'Radagon of the Golden Order / Elden Beast', aliases: ['radagon', 'elden beast', 'elden lord'], region: 'Ashen Capital', campaign: 'base', implies: ['boss:godfrey'] },
  { id: 'boss:mohg', kind: 'boss', name: 'Mohg, Lord of Blood', aliases: ['mohg', 'lord of blood'], region: 'Mohgwyn', campaign: 'base', implies: [], drops: ['item:mohg-great-rune'] },
  { id: 'boss:malenia', kind: 'boss', name: 'Malenia, Blade of Miquella', aliases: ['malenia'], region: 'Elphael', campaign: 'base', implies: ['grace:drainage'], drops: ['item:malenia-great-rune'] },
  { id: 'boss:divine-beast', kind: 'boss', name: 'Divine Beast Dancing Lion', aliases: ['dancing lion'], region: 'Belurat', campaign: 'sote', implies: ['grace:belurat'] },
  { id: 'boss:rennala-sote', kind: 'boss', name: 'Rellana, Twin Moon Knight', aliases: ['rellana'], region: 'Castle Ensis', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'boss:messmer', kind: 'boss', name: 'Messmer the Impaler', aliases: ['messmer'], region: 'Shadow Keep', campaign: 'sote', implies: ['grace:shadow-keep'] },
  { id: 'boss:midra', kind: 'boss', name: 'Midra, Lord of Frenzied Flame', aliases: ['midra'], region: 'Abyssal Woods', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'boss:bayle', kind: 'boss', name: 'Bayle the Dread', aliases: ['bayle'], region: 'Jagged Peak', campaign: 'sote', implies: ['region:shadow'] },
  { id: 'boss:consort', kind: 'boss', name: 'Promised Consort Radahn / Radahn, Consort of Miquella', aliases: ['consort radahn', 'promised consort'], region: 'Enir-Ilim', campaign: 'sote', implies: ['boss:messmer'] },
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

  { id: 'boss:astel', kind: 'boss', name: 'Astel, Naturalborn of the Void', aliases: ['astel'], region: 'Lake of Rot', campaign: 'base', implies: ['item:fingerslayer'] },

  { id: 'quest:ranni:festival', kind: 'quest', name: 'Ranni — Radahn festival opened Nokron', aliases: [], region: 'Caelid', campaign: 'base', implies: ['quest:ranni:service'] },
  { id: 'quest:ranni:service', kind: 'quest', name: 'Ranni — entered her service', aliases: ['ranni rise'], region: 'Liurnia', campaign: 'base', implies: ['grace:lake-shore'] },
  { id: 'quest:ranni:nokron', kind: 'quest', name: 'Ranni — Fingerslayer Blade recovered', aliases: [], region: 'Nokron', campaign: 'base', implies: ['quest:ranni:festival'] },
  { id: 'quest:ranni:statue', kind: 'quest', name: 'Ranni — Carian Study Hall inverted', aliases: [], region: 'Liurnia', campaign: 'base', implies: ['quest:ranni:service'] },
  { id: 'quest:ranni:ring', kind: 'quest', name: 'Ranni — Dark Moon Ring placed', aliases: ['age of stars'], region: 'Moonlight Altar', campaign: 'base', implies: ['item:dark-moon-ring'] },
  { id: 'quest:boc:needle', kind: 'quest', name: 'Boc — gold sewing needle given', aliases: ['boc'], region: 'Altus', campaign: 'base', implies: [] },
  { id: 'quest:millicent:needle', kind: 'quest', name: 'Millicent — unalloyed needle', aliases: ['millicent'], region: 'Caelid', campaign: 'base', implies: ['region:caelid'] },
  { id: 'quest:rya:amnion', kind: 'quest', name: 'Rya — Serpent’s Amnion', aliases: ['rya'], region: 'Volcano Manor', campaign: 'base', implies: [] },
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
