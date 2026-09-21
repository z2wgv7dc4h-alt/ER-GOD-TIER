import type { Campaign } from '../types'

export type AtlasWorld = 'overworld' | 'underground' | 'ashen' | 'shadow'

export type WarpGrace = {
  id: string
  name: string
  aliases: string[]
  region: string
  world: AtlasWorld
  campaign: Campaign
  x: number
  y: number
}

/** Names as they appear on the PS5 warp list. Overworld/underground x/y are the engine mosaic frame (px / 10496); ashen/shadow follow their stand-in plates. */
export const warpGraces: WarpGrace[] = [
  { id: 'grace:first-step', name: 'The First Step', aliases: ['first step'], region: 'Limgrave', world: 'overworld', campaign: 'base', x: 35.05, y: 70.05 },
  { id: 'grace:elleh', name: 'Church of Elleh', aliases: ['elleh'], region: 'Limgrave', world: 'overworld', campaign: 'base', x: 35.08, y: 69.04 },
  { id: 'grace:gatefront', name: 'Gatefront', aliases: ['gatefront ruins'], region: 'Limgrave', world: 'overworld', campaign: 'base', x: 35.77, y: 66.05 },
  { id: 'grace:agheel-north', name: 'Agheel Lake North', aliases: ['agheel north'], region: 'Limgrave', world: 'overworld', campaign: 'base', x: 37.03, y: 66.53 },
  { id: 'grace:mistwood', name: 'Mistwood Outskirts', aliases: ['mistwood'], region: 'Limgrave', world: 'overworld', campaign: 'base', x: 41.44, y: 66.03 },
  { id: 'grace:saintsbridge', name: 'Saintsbridge', aliases: [], region: 'Limgrave', world: 'overworld', campaign: 'base', x: 38.05, y: 62.21 },
  { id: 'grace:stormhill-shack', name: 'Stormhill Shack', aliases: ['stormhill'], region: 'Stormhill', world: 'overworld', campaign: 'base', x: 32.98, y: 64.48 },
  { id: 'grace:warmaster', name: "Warmaster's Shack", aliases: ['warmaster'], region: 'Stormhill', world: 'overworld', campaign: 'base', x: 35.5, y: 64.36 },
  { id: 'grace:castleward', name: 'Castleward Tunnel', aliases: ['stormveil gate'], region: 'Stormveil', world: 'overworld', campaign: 'base', x: 32.13, y: 64.99 },
  { id: 'grace:rampart-tower', name: 'Rampart Tower', aliases: [], region: 'Stormveil', world: 'overworld', campaign: 'base', x: 29.22, y: 63.96 },
  { id: 'grace:godrick-grace', name: 'Godrick the Grafted', aliases: ['godrick grace'], region: 'Stormveil', world: 'overworld', campaign: 'base', x: 29.28, y: 61.61 },
  { id: 'grace:limgrave-tower', name: 'Divine Tower of Limgrave', aliases: ['limgrave tower'], region: 'Limgrave', world: 'overworld', campaign: 'base', x: 40.63, y: 59.18 },
  { id: 'grace:pilgrimage', name: 'Church of Pilgrimage', aliases: ['pilgrimage'], region: 'Weeping Peninsula', world: 'overworld', campaign: 'base', x: 36.98, y: 73.65 },
  { id: 'grace:morne', name: 'Castle Morne Rampart', aliases: ['castle morne'], region: 'Weeping Peninsula', world: 'overworld', campaign: 'base', x: 40.88, y: 77.62 },
  { id: 'grace:lake-shore', name: 'Liurnia Lake Shore', aliases: ['lake shore'], region: 'Liurnia', world: 'overworld', campaign: 'base', x: 25.96, y: 58.53 },
  { id: 'grace:academy-gate-town', name: 'Academy Gate Town', aliases: ['gate town'], region: 'Liurnia', world: 'overworld', campaign: 'base', x: 22.55, y: 50.81 },
  { id: 'grace:academy-gate', name: 'South Raya Lucaria Gate', aliases: ['raya lucaria gate', 'academy gate'], region: 'Liurnia', world: 'overworld', campaign: 'base', x: 19.35, y: 48.28 },
  { id: 'grace:debate-parlor', name: 'Debate Parlor', aliases: [], region: 'Raya Lucaria', world: 'overworld', campaign: 'base', x: 18.74, y: 47.82 },
  { id: 'grace:vows', name: 'Church of Vows', aliases: ['vows'], region: 'Liurnia', world: 'overworld', campaign: 'base', x: 23.08, y: 44.91 },
  { id: 'grace:dectus', name: 'Grand Lift of Dectus', aliases: ['dectus'], region: 'Liurnia', world: 'overworld', campaign: 'base', x: 25.47, y: 35.79 },
  { id: 'grace:smoldering', name: 'Smoldering Church', aliases: [], region: 'Caelid', world: 'overworld', campaign: 'base', x: 44.39, y: 59.57 },
  { id: 'grace:rotview', name: 'Rotview Balcony', aliases: [], region: 'Caelid', world: 'overworld', campaign: 'base', x: 45.99, y: 60.42 },
  { id: 'grace:redmane', name: 'Chamber Outside the Plaza', aliases: ['redmane plaza'], region: 'Redmane Castle', world: 'overworld', campaign: 'base', x: 58.14, y: 70.01 },
  { id: 'grace:ergtree-grazing', name: 'Erdtree-Gazing Hill', aliases: ['erdtree gazing hill'], region: 'Altus', world: 'overworld', campaign: 'base', x: 25.41, y: 32.44 },
  { id: 'grace:outer-wall', name: 'Outer Wall Battleground', aliases: ['outer wall'], region: 'Leyndell', world: 'overworld', campaign: 'base', x: 37.18, y: 28.83 },
  { id: 'grace:east-capital', name: 'East Capital Rampart', aliases: [], region: 'Leyndell', world: 'overworld', campaign: 'base', x: 42.51, y: 32.41 },
  { id: 'grace:queen-bedchamber', name: "Queen's Bedchamber", aliases: ['queens bedchamber'], region: 'Leyndell', world: 'overworld', campaign: 'base', x: 42.36, y: 34.55 },
  { id: 'grace:forbidden', name: 'Forbidden Lands', aliases: [], region: 'Forbidden Lands', world: 'overworld', campaign: 'base', x: 48.14, y: 33.31 },
  { id: 'grace:zamor', name: 'Zamor Ruins', aliases: ['zamor'], region: 'Mountaintops', world: 'overworld', campaign: 'base', x: 53.24, y: 27.22 },
  { id: 'grace:forge-giants', name: 'Foot of the Forge', aliases: ['forge of the giants'], region: 'Mountaintops', world: 'overworld', campaign: 'base', x: 59.09, y: 28.59 },
  { id: 'grace:farum-balcony', name: 'Crumbling Beast Grave', aliases: ['farum start'], region: 'Farum Azula', world: 'overworld', campaign: 'base', x: 81.77, y: 44.38 },
  { id: 'grace:soh', name: 'Beside the Great Bridge', aliases: ['farum bridge'], region: 'Farum Azula', world: 'overworld', campaign: 'base', x: 81.45, y: 41.27 },
  { id: 'grace:siofra', name: 'Siofra River Bank', aliases: ['siofra'], region: 'Siofra', world: 'underground', campaign: 'base', x: 47.08, y: 66.02 },
  { id: 'grace:ainsel', name: 'Ainsel River Well Depths', aliases: ['ainsel'], region: 'Ainsel', world: 'underground', campaign: 'base', x: 26.11, y: 44.17 },
  { id: 'grace:nokron', name: 'Nokron, Eternal City', aliases: ['nokron'], region: 'Nokron', world: 'underground', campaign: 'base', x: 43.36, y: 66.28 },
  { id: 'grace:deeproot', name: 'Great Waterfall Crest', aliases: ['deeproot'], region: 'Deeproot', world: 'underground', campaign: 'base', x: 44.54, y: 33.83 },
  { id: 'grace:ashen-east', name: 'Leyndell, Capital of Ash', aliases: ['ashen capital'], region: 'Ashen Capital', world: 'ashen', campaign: 'base', x: 38, y: 22 },
  { id: 'grace:haligtree-town', name: 'Haligtree Town Plaza', aliases: [], region: 'Haligtree', world: 'overworld', campaign: 'base', x: 53.67, y: 10.32 },
  { id: 'grace:drainage', name: 'Drainage Channel', aliases: ['elphael drainage'], region: 'Elphael', world: 'overworld', campaign: 'base', x: 54.61, y: 8.49 },
  { id: 'grace:gravesite', name: 'Gravesite Plain', aliases: ['scorched ruins', 'three-path cross'], region: 'Gravesite Plain', world: 'shadow', campaign: 'sote', x: 72, y: 48 },
  { id: 'grace:belurat', name: 'Belurat, Tower Settlement', aliases: ['belurat'], region: 'Belurat', world: 'shadow', campaign: 'sote', x: 68, y: 44 },
  { id: 'grace:ensis', name: 'Castle Ensis Checkpoint', aliases: ['ensis'], region: 'Castle Ensis', world: 'shadow', campaign: 'sote', x: 74, y: 40 },
  { id: 'grace:shadow-keep', name: 'Main Gate Plaza', aliases: ['shadow keep plaza'], region: 'Shadow Keep', world: 'shadow', campaign: 'sote', x: 76, y: 30 },
  { id: 'grace:scaduview', name: 'Scaduview', aliases: [], region: 'Scaduview', world: 'shadow', campaign: 'sote', x: 80, y: 26 },
  { id: 'grace:abyssal', name: 'Abandoned Church', aliases: ['abyssal woods'], region: 'Abyssal Woods', world: 'shadow', campaign: 'sote', x: 70, y: 36 },
  { id: 'grace:jagged', name: 'Foot of the Jagged Peak', aliases: ['jagged peak'], region: 'Jagged Peak', world: 'shadow', campaign: 'sote', x: 84, y: 42 },
  { id: 'grace:enir', name: 'Enir-Ilim: Outer Wall', aliases: ['enir-ilim'], region: 'Enir-Ilim', world: 'shadow', campaign: 'sote', x: 78, y: 22 },
]

export function nextGraces(have: Set<string>, lastId?: string) {
  const last = lastId ? warpGraces.find((g) => g.id === lastId) : undefined
  const pool = last
    ? warpGraces.filter((g) => g.world === last.world && g.region === last.region)
    : warpGraces
  return pool.filter((g) => !have.has(g.id)).slice(0, 4)
}

export function matchWarp(text: string) {
  const n = text.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim()
  if (n.length < 3) return [] as WarpGrace[]
  const local = warpGraces.filter((g) => {
    const names = [g.name, ...g.aliases].map((s) => s.toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim())
    return names.some((name) => name && (n === name || n.includes(name) || name.includes(n)))
  })
  if (local.length) return local
  // Full Paramdex list is matched from aliases to avoid a cycle at module init.
  return [] as WarpGrace[]
}

/**
 * Static fallback plates. `w`/`h` are the plate's pixel dimensions and must
 * match the image: Atlas renders pins in a viewBox of the same aspect, so the
 * SVG and the image letterbox identically. Overworld/underground are Pack 960
 * (official mosaic, engine frame: percent = px/10496*100). Ashen/shadow are
 * AI-generated stand-ins and keep their own frames.
 */
export const worlds: { id: AtlasWorld; label: string; hint: string; plate?: string; w?: number; h?: number }[] = [
  { id: 'overworld', label: 'Lands Between', hint: 'Pack 960 plate. Pins use the engine frame (px / 10496), so they line up with the live map.', plate: '/sourced/maps/m0-overworld.jpg', w: 4096, h: 3880 },
  { id: 'underground', label: 'Underground', hint: 'Siofra, Ainsel, Nokron, Deeproot. Separate map screen on PS5 — screenshot that tab, not the overworld.', plate: '/sourced/maps/m1-underground.jpg', w: 4096, h: 3880 },
  { id: 'ashen', label: 'Ashen Capital', hint: 'After the Forge. Leyndell is a different map. Do not mix pins with the living capital.', plate: '/sourced/maps/m-ashen.jpg', w: 1168, h: 784 },
  { id: 'shadow', label: 'Realm of Shadow', hint: 'SotE map. Unlocks after touching the withered arm in Mohgwyn / Cocoon.', plate: '/sourced/maps/m-shadow.jpg', w: 1168, h: 784 },
]