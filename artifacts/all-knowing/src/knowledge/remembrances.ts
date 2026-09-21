import type { Campaign } from '../types'

/**
 * The Finger Reader Enia remembrance exchange, authored from the game's real
 * `ShopLineupParam` rows (see `public/sourced/open/shops.json`, shop rows
 * 101900–101948). Each remembrance is turned in once, at Enia in the Roundtable
 * Hold, and yields one of its listed rewards; the remembrance is consumed either
 * way (you can duplicate one per NG via a Mausoleum, and the Walking Mausoleums
 * let you buy the other option without a second kill).
 *
 * This is deliberately separate from `merchants.ts`: that table is the rune-priced
 * shop dump, while this is the one-for-one remembrance trade. `bossFactId` links
 * back into the catalog so the router can say which fight drops it.
 */
export type RemembranceReward = {
  name: string
  /** Authored catalog fact id when the reward is a known item, else undefined. */
  factId?: string
}

export type Remembrance = {
  id: string
  name: string
  aliases: string[]
  /** Catalog boss fact id that drops it, when the boss is in the catalog. */
  bossFactId?: string
  bossName: string
  campaign: Campaign
  rewards: RemembranceReward[]
}

export const remembrances: Remembrance[] = [
  {
    id: 'item:remembrance-grafted',
    name: 'Remembrance of the Grafted',
    aliases: ['grafted remembrance', 'godrick remembrance'],
    bossFactId: 'boss:godrick',
    bossName: 'Godrick the Grafted',
    campaign: 'base',
    rewards: [{ name: 'Axe of Godrick' }, { name: 'Grafted Dragon' }],
  },
  {
    id: 'item:remembrance-full-moon-queen',
    name: 'Remembrance of the Full Moon Queen',
    aliases: ['full moon queen remembrance', 'rennala remembrance'],
    bossFactId: 'boss:rennala',
    bossName: 'Rennala, Queen of the Full Moon',
    campaign: 'base',
    rewards: [{ name: 'Carian Regal Scepter' }, { name: "Rennala's Full Moon" }],
  },
  {
    id: 'item:remembrance-starscourge',
    name: 'Remembrance of the Starscourge',
    aliases: ['starscourge remembrance', 'radahn remembrance'],
    bossFactId: 'boss:radahn',
    bossName: 'Starscourge Radahn',
    campaign: 'base',
    rewards: [{ name: 'Starscourge Greatsword' }, { name: 'Lion Greatbow' }],
  },
  {
    id: 'item:remembrance-regal-ancestor',
    name: 'Remembrance of the Regal Ancestor',
    aliases: ['regal ancestor remembrance', 'ancestor spirit remembrance'],
    bossFactId: 'boss:regal-ancestor',
    bossName: 'Regal Ancestor Spirit',
    campaign: 'base',
    rewards: [{ name: 'Winged Greathorn' }, { name: "Ancestral Spirit's Horn" }],
  },
  {
    id: 'item:remembrance-naturalborn',
    name: 'Remembrance of the Naturalborn',
    aliases: ['naturalborn remembrance', 'astel remembrance'],
    bossFactId: 'boss:astel',
    bossName: 'Astel, Naturalborn of the Void',
    campaign: 'base',
    rewards: [{ name: "Bastard's Stars" }, { name: 'Ash of War: Waves of Darkness' }],
  },
  {
    id: 'item:remembrance-blasphemous',
    name: 'Remembrance of the Blasphemous',
    aliases: ['blasphemous remembrance', 'rykard remembrance'],
    bossFactId: 'boss:rykard',
    bossName: 'Rykard, Lord of Blasphemy',
    campaign: 'base',
    rewards: [{ name: 'Blasphemous Blade' }, { name: "Rykard's Rancor" }],
  },
  {
    id: 'item:remembrance-omen-king',
    name: 'Remembrance of the Omen King',
    aliases: ['omen king remembrance', 'morgott remembrance'],
    bossFactId: 'boss:morgott',
    bossName: 'Morgott, the Omen King',
    campaign: 'base',
    rewards: [{ name: "Morgott's Cursed Sword" }, { name: 'Regal Omen Bairn' }],
  },
  {
    id: 'item:remembrance-rot-goddess',
    name: 'Remembrance of the Rot Goddess',
    aliases: ['rot goddess remembrance', 'malenia remembrance'],
    bossFactId: 'boss:malenia',
    bossName: 'Malenia, Blade of Miquella',
    campaign: 'base',
    rewards: [{ name: 'Hand of Malenia' }, { name: 'Scarlet Aeonia' }],
  },
  {
    id: 'item:remembrance-blood-lord',
    name: 'Remembrance of the Blood Lord',
    aliases: ['blood lord remembrance', 'mohg remembrance'],
    bossFactId: 'boss:mohg',
    bossName: 'Mohg, Lord of Blood',
    campaign: 'base',
    rewards: [{ name: "Mohgwyn's Sacred Spear" }, { name: 'Bloodboon' }],
  },
  {
    id: 'item:remembrance-lichdragon',
    name: 'Remembrance of the Lichdragon',
    aliases: ['lichdragon remembrance', 'fortissax remembrance'],
    bossFactId: 'boss:fortissax',
    bossName: 'Lichdragon Fortissax',
    campaign: 'base',
    rewards: [{ name: "Fortissax's Lightning Spear" }, { name: 'Death Lightning' }],
  },
  {
    id: 'item:remembrance-fire-giant',
    name: 'Remembrance of the Fire Giant',
    aliases: ['fire giant remembrance'],
    bossFactId: 'boss:fire-giant',
    bossName: 'Fire Giant',
    campaign: 'base',
    rewards: [{ name: "Giant's Red Braid" }, { name: 'Burn, O Flame!' }],
  },
  {
    id: 'item:remembrance-dragonlord',
    name: 'Remembrance of the Dragonlord',
    aliases: ['dragonlord remembrance', 'placidusax remembrance'],
    bossFactId: 'boss:placidusax',
    bossName: 'Dragonlord Placidusax',
    campaign: 'base',
    rewards: [{ name: "Dragon King's Cragblade" }, { name: "Placidusax's Ruin" }],
  },
  {
    id: 'item:remembrance-black-blade',
    name: 'Remembrance of the Black Blade',
    aliases: ['black blade remembrance', 'maliketh remembrance'],
    bossFactId: 'boss:maliketh',
    bossName: 'Maliketh, the Black Blade',
    campaign: 'base',
    rewards: [{ name: "Maliketh's Black Blade" }, { name: 'Black Blade' }],
  },
  {
    id: 'item:remembrance-hoarah-loux',
    name: 'Remembrance of Hoarah Loux',
    aliases: ['hoarah loux remembrance', 'godfrey remembrance'],
    bossFactId: 'boss:godfrey',
    bossName: 'Godfrey, First Elden Lord / Hoarah Loux',
    campaign: 'base',
    rewards: [{ name: 'Axe of Godfrey' }, { name: "Ash of War: Hoarah Loux's Earthshaker" }],
  },
  {
    id: 'item:elden-remembrance',
    name: 'Elden Remembrance',
    aliases: ['elden remembrance', 'radagon remembrance', 'elden beast remembrance'],
    bossFactId: 'boss:radagon',
    bossName: 'Radagon of the Golden Order / Elden Beast',
    campaign: 'base',
    rewards: [{ name: "Marika's Hammer" }, { name: 'Sacred Relic Sword' }],
  },
  {
    id: 'item:remembrance-dancing-lion',
    name: 'Remembrance of the Dancing Lion',
    aliases: ['dancing lion remembrance', 'divine beast remembrance'],
    bossFactId: 'boss:divine-beast',
    bossName: 'Divine Beast Dancing Lion',
    campaign: 'sote',
    rewards: [{ name: 'Enraged Divine Beast' }, { name: 'Ash of War: Divine Beast Frost Stomp' }],
  },
  {
    id: 'item:remembrance-twin-moon-knight',
    name: 'Remembrance of the Twin Moon Knight',
    aliases: ['twin moon knight remembrance', 'rellana remembrance'],
    bossFactId: 'boss:rennala-sote',
    bossName: 'Rellana, Twin Moon Knight',
    campaign: 'sote',
    rewards: [{ name: "Rellana's Twin Blades" }, { name: "Rellana's Twin Moons" }],
  },
  {
    id: 'item:remembrance-wild-boar-rider',
    name: 'Remembrance of the Wild Boar Rider',
    aliases: ['wild boar rider remembrance', 'gaius remembrance'],
    bossName: 'Commander Gaius',
    campaign: 'sote',
    rewards: [{ name: 'Sword Lance (Spinning Gravity Thrust)' }, { name: 'Blades of Stone' }],
  },
  {
    id: 'item:remembrance-putrescence',
    name: 'Remembrance of Putrescence',
    aliases: ['putrescence remembrance', 'putrescent knight remembrance'],
    bossName: 'Putrescent Knight',
    campaign: 'sote',
    rewards: [{ name: 'Putrescence Cleaver' }, { name: 'Vortex of Putrescence' }],
  },
  {
    id: 'item:remembrance-saint-of-the-bud',
    name: 'Remembrance of the Saint of the Bud',
    aliases: ['saint of the bud remembrance', 'romina remembrance'],
    bossName: 'Romina, Saint of the Bud',
    campaign: 'sote',
    rewards: [{ name: 'Poleblade of the Bud' }, { name: 'Rotten Butterflies' }],
  },
  {
    id: 'item:remembrance-lord-of-frenzied-flame',
    name: 'Remembrance of the Lord of Frenzied Flame',
    aliases: ['lord of frenzied flame remembrance', 'midra remembrance'],
    bossFactId: 'boss:midra',
    bossName: 'Midra, Lord of Frenzied Flame',
    campaign: 'sote',
    rewards: [{ name: 'Greatsword of Damnation' }, { name: "Midra's Flame of Frenzy" }],
  },
  {
    id: 'item:remembrance-shadow-sunflower',
    name: 'Remembrance of the Shadow Sunflower',
    aliases: ['shadow sunflower remembrance', 'scadutree avatar remembrance'],
    bossName: 'Scadutree Avatar',
    campaign: 'sote',
    rewards: [{ name: 'Shadow Sunflower Blossom' }, { name: 'Land of Shadow' }],
  },
  {
    id: 'item:remembrance-impaler',
    name: 'Remembrance of the Impaler',
    aliases: ['impaler remembrance', 'messmer remembrance'],
    bossFactId: 'boss:messmer',
    bossName: 'Messmer the Impaler',
    campaign: 'sote',
    rewards: [{ name: 'Spear of the Impaler' }, { name: "Messmer's Orb" }],
  },
  {
    id: 'item:remembrance-mother-of-fingers',
    name: 'Remembrance of the Mother of Fingers',
    aliases: ['mother of fingers remembrance', 'metyr remembrance'],
    bossName: 'Metyr, Mother of Fingers',
    campaign: 'sote',
    rewards: [{ name: 'Staff of the Great Beyond' }, { name: 'Gazing Finger' }],
  },
  {
    id: 'item:remembrance-a-god-and-a-lord',
    name: 'Remembrance of a God and a Lord',
    aliases: ['god and a lord remembrance', 'consort radahn remembrance', 'promised consort remembrance'],
    bossFactId: 'boss:consort',
    bossName: 'Promised Consort Radahn / Radahn, Consort of Miquella',
    campaign: 'sote',
    rewards: [
      { name: 'Greatsword of Radahn (Lord)' },
      { name: 'Greatsword of Radahn (Light)' },
      { name: 'Light of Miquella' },
    ],
  },
]

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
}

/** Resolve a remembrance by name, alias, id, or the boss it drops from. */
export function findRemembrance(text: string): Remembrance | undefined {
  const n = norm(text)
  if (n.length < 3) return undefined
  return remembrances.find((r) => {
    const names = [r.name, r.id, r.bossName, ...r.aliases].map(norm)
    return names.some((name) => name && (n === name || n.includes(name) || name.includes(n)))
  })
}

export function remembranceCount() {
  return remembrances.length
}
