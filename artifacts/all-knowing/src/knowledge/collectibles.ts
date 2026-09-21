/** Public completion sets (wiki checklists). Not param-derived. */
export type Collectible = {
  id: string
  name: string
  region: string
  note: string
  campaign: 'base' | 'sote'
}

export const scadutreeFragments: Collectible[] = [
  { id: 'frag:three-path', name: 'Scadutree Fragment', region: 'Gravesite Plain', note: 'Three-Path Cross / Miquella’s Cross', campaign: 'sote' },
  { id: 'frag:scorched', name: 'Scadutree Fragment', region: 'Gravesite Plain', note: 'Northeast of Scorched Ruins', campaign: 'sote' },
  { id: 'frag:consolation', name: 'Scadutree Fragment x2', region: 'Gravesite Plain', note: 'Church of Consolation altar', campaign: 'sote' },
  { id: 'frag:main-gate', name: 'Scadutree Fragment', region: 'Gravesite Plain', note: 'Main Gate Cross', campaign: 'sote' },
  { id: 'frag:prospect', name: 'Scadutree Fragment', region: 'Gravesite Plain', note: 'West of Prospect Town', campaign: 'sote' },
  { id: 'frag:ensis-out', name: 'Scadutree Fragment', region: 'Castle Ensis', note: 'Outside Castle Ensis', campaign: 'sote' },
  { id: 'frag:pillar', name: 'Scadutree Fragment', region: 'Gravesite Plain', note: 'Pillar Path Cross', campaign: 'sote' },
  { id: 'frag:belurat-cross', name: 'Scadutree Fragment', region: 'Belurat', note: 'Belurat Cross', campaign: 'sote' },
  { id: 'frag:ensis-check', name: 'Scadutree Fragment', region: 'Castle Ensis', note: 'Castle Ensis Checkpoint', campaign: 'sote' },
  { id: 'frag:cerulean-cross', name: 'Scadutree Fragment', region: 'Cerulean Coast', note: 'Cerulean Coast Cross', campaign: 'sote' },
  { id: 'frag:cerulean-west', name: 'Scadutree Fragment', region: 'Cerulean Coast', note: 'North of Cerulean Coast West', campaign: 'sote' },
  { id: 'frag:charo', name: 'Scadutree Fragment', region: "Charo's Hidden Grave", note: 'Western lake', campaign: 'sote' },
  { id: 'frag:jagged-boulder', name: 'Scadutree Fragment', region: 'Jagged Peak', note: 'End of rolling boulder path', campaign: 'sote' },
  { id: 'frag:fissure', name: 'Scadutree Fragment', region: 'Stone Coffin Fissure', note: 'Fissure Cross', campaign: 'sote' },
  { id: 'frag:highroad', name: 'Scadutree Fragment', region: 'Scadu Altus', note: 'Highroad Cross', campaign: 'sote' },
  { id: 'frag:encampment', name: 'Scadutree Fragment', region: 'Scadu Altus', note: 'Highroad encampment', campaign: 'sote' },
  { id: 'frag:crusade', name: 'Scadutree Fragment x2', region: 'Scadu Altus', note: 'Church of the Crusade', campaign: 'sote' },
  { id: 'frag:moorth-camp', name: 'Scadutree Fragment', region: 'Scadu Altus', note: 'Camp west of Moorth Ruins', campaign: 'sote' },
  { id: 'frag:moorth-cross', name: 'Scadutree Fragment', region: 'Scadu Altus', note: 'Moorth Ruins Cross', campaign: 'sote' },
  { id: 'frag:moorth-n', name: 'Scadutree Fragment', region: 'Scadu Altus', note: 'North of Moorth Ruins', campaign: 'sote' },
  { id: 'frag:moorth-se', name: 'Scadutree Fragment', region: 'Scadu Altus', note: 'Southeast Moorth Ruins', campaign: 'sote' },
  { id: 'frag:scaduview-cross', name: 'Scadutree Fragment', region: 'Scadu Altus', note: 'Scaduview Cross', campaign: 'sote' },
  { id: 'frag:hippo', name: 'Scadutree Fragment x2', region: 'Shadow Keep', note: 'Golden Hippopotamus', campaign: 'sote' },
  { id: 'frag:back-gate', name: 'Scadutree Fragment', region: 'Shadow Keep', note: 'Back Gate Marika statue', campaign: 'sote' },
  { id: 'frag:chalice', name: 'Scadutree Fragment x5', region: 'Scaduview', note: 'Scadutree Chalice', campaign: 'sote' },
  { id: 'frag:church-ruins', name: 'Scadutree Fragment x2', region: 'Abyssal Woods', note: 'Church Ruins', campaign: 'sote' },
  { id: 'frag:abyssal-n', name: 'Scadutree Fragment', region: 'Abyssal Woods', note: 'North of Abyssal Woods grace', campaign: 'sote' },
  { id: 'frag:spiral', name: 'Scadutree Fragment', region: 'Enir-Ilim', note: 'Spiral Rise Cross', campaign: 'sote' },
  { id: 'frag:belurat-statue', name: 'Scadutree Fragment', region: 'Enir-Ilim', note: 'Belurat statue base', campaign: 'sote' },
  { id: 'frag:altar', name: 'Scadutree Fragment', region: 'Enir-Ilim', note: 'Altar room', campaign: 'sote' },
  { id: 'frag:cleansing', name: 'Scadutree Fragment', region: 'Enir-Ilim', note: 'Cleansing Chamber Anteroom', campaign: 'sote' },
]

export const mapFragments: Collectible[] = [
  { id: 'mapfrag:limgrave-w', name: 'Map: Limgrave, West', region: 'Limgrave', note: 'Gatefront chest', campaign: 'base' },
  { id: 'mapfrag:limgrave-e', name: 'Map: Limgrave, East', region: 'Mistwood', note: 'Beside the road south of the fort', campaign: 'base' },
  { id: 'mapfrag:weeping', name: 'Map: Weeping Peninsula', region: 'Weeping Peninsula', note: 'Castle Morne Rampart road', campaign: 'base' },
  { id: 'mapfrag:liurnia-e', name: 'Map: Liurnia, East', region: 'Liurnia', note: 'Liurnia Lake Shore road', campaign: 'base' },
  { id: 'mapfrag:liurnia-n', name: 'Map: Liurnia, North', region: 'Liurnia', note: 'Academy Gate Town north', campaign: 'base' },
  { id: 'mapfrag:liurnia-w', name: 'Map: Liurnia, West', region: 'Liurnia', note: 'Kingsrealm ruins road', campaign: 'base' },
  { id: 'mapfrag:caelid', name: 'Map: Caelid', region: 'Caelid', note: 'Smoldering Church south', campaign: 'base' },
  { id: 'mapfrag:dragonbarrow', name: 'Map: Dragonbarrow', region: 'Dragonbarrow', note: 'Farum Greatbridge approach', campaign: 'base' },
  { id: 'mapfrag:altus', name: 'Map: Altus Plateau', region: 'Altus', note: 'After Dectus, roadside stele', campaign: 'base' },
  { id: 'mapfrag:leyndell', name: 'Map: Leyndell, Royal Capital', region: 'Capital Outskirts', note: 'Outer wall stele', campaign: 'base' },
  { id: 'mapfrag:gelmir', name: 'Map: Mt. Gelmir', region: 'Mt. Gelmir', note: 'Road after the bridge', campaign: 'base' },
  { id: 'mapfrag:mountaintops-w', name: 'Map: Mountaintops of the Giants, West', region: 'Forbidden Lands', note: 'After Rold', campaign: 'base' },
  { id: 'mapfrag:mountaintops-e', name: 'Map: Mountaintops of the Giants, East', region: 'Flame Peak', note: 'Giants’ Gravepost', campaign: 'base' },
  { id: 'mapfrag:consecrated', name: 'Map: Consecrated Snowfield', region: 'Consecrated Snowfield', note: 'After the hidden path', campaign: 'base' },
]

export const flaskUpgrades: Collectible[] = [
  { id: 'tear:elleh', name: 'Sacred Tear', region: 'Limgrave', note: 'Church of Elleh — no; Third Church of Marika', campaign: 'base' },
  { id: 'tear:third-marika', name: 'Sacred Tear', region: 'Limgrave', note: 'Third Church of Marika', campaign: 'base' },
  { id: 'tear:callu', name: 'Sacred Tear', region: 'Weeping Peninsula', note: 'Callu Baptismal Church', campaign: 'base' },
  { id: 'tear:pilgrimage', name: 'Sacred Tear', region: 'Weeping Peninsula', note: 'Church of Pilgrimage', campaign: 'base' },
  { id: 'tear:irith', name: 'Sacred Tear', region: 'Liurnia', note: 'Church of Irith', campaign: 'base' },
  { id: 'tear:bellum', name: 'Sacred Tear', region: 'Liurnia', note: 'Bellum Church', campaign: 'base' },
  { id: 'tear:rose', name: 'Sacred Tear', region: 'Caelid', note: 'Church of the Plague', campaign: 'base' },
  { id: 'tear:smoldering', name: 'Sacred Tear', region: 'Caelid', note: 'Smoldering Church — no flask tear here', campaign: 'base' },
  { id: 'tear:second-marika', name: 'Sacred Tear', region: 'Altus', note: 'Second Church of Marika', campaign: 'base' },
  { id: 'tear:stormcaller', name: 'Sacred Tear', region: 'Altus', note: 'Stormcaller Church', campaign: 'base' },
  { id: 'tear:minor-erdtree', name: 'Sacred Tear', region: 'Capital Outskirts', note: 'Minor Erdtree Church', campaign: 'base' },
  { id: 'tear:first-marika', name: 'Sacred Tear', region: 'Mountaintops', note: 'First Church of Marika', campaign: 'base' },
  { id: 'seed:elleh', name: 'Golden Seed', region: 'Limgrave', note: 'Mistwood / Fort Haight road sapling', campaign: 'base' },
  { id: 'seed:stormhill', name: 'Golden Seed', region: 'Stormhill', note: 'Warmaster sapling', campaign: 'base' },
  { id: 'seed:south-ranni', name: 'Golden Seed', region: 'Liurnia', note: 'South of Ranni’s Rise / Caria Manor exit', campaign: 'base' },
  { id: 'seed:academy', name: 'Golden Seed', region: 'Raya Lucaria', note: 'Courtyard after the red wolf', campaign: 'base' },
  { id: 'seed:redmane', name: 'Golden Seed', region: 'Caelid', note: 'Before Redmane plaza', campaign: 'base' },
  { id: 'seed:altus', name: 'Golden Seed', region: 'Altus', note: 'Windmill Village approach', campaign: 'base' },
  { id: 'seed:leyndell', name: 'Golden Seed', region: 'Leyndell', note: 'Avenue saplings (several)', campaign: 'base' },
]
