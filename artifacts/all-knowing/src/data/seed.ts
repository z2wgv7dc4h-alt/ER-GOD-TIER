import type { Character, CodexEntry, MapMarker } from '../types'
import { REGULATION_STAMP } from '../lib/regulation'

export const emptyStats = {
  vigor: 10,
  mind: 10,
  endurance: 10,
  strength: 10,
  dexterity: 10,
  intelligence: 10,
  faith: 10,
  arcane: 10,
}

export const emptyCharacter: Character = {
  source: 'empty',
  platform: 'ps5',
  regulation: REGULATION_STAMP,
  name: 'Tarnished',
  level: 1,
  startingClass: 'unknown',
  stats: emptyStats,
  loadout: [],
  defeatedBosses: [],
  discoveredGraces: [],
  collectedItems: [],
  completedQuestSteps: [],
  deniedFacts: [],
  answers: {},
  evidence: [],
  shots: [],
}

/** Demo save so the three modules have something to share before the real parser lands. */
export const demoCharacter: Character = {
  source: 'demo',
  platform: 'pc',
  regulation: REGULATION_STAMP,
  fileName: 'ER0000.sl2 (demo)',
  name: 'Gideon’s Apprentice',
  level: 86,
  startingClass: 'samurai',
  stats: {
    vigor: 40,
    mind: 20,
    endurance: 25,
    strength: 18,
    dexterity: 40,
    intelligence: 9,
    faith: 8,
    arcane: 16,
  },
  loadout: [
    { id: 'uchi', name: 'Uchigatana', kind: 'armament', affinity: 'Keen', upgrade: 18 },
    { id: 'naga', name: 'Nagakiba', kind: 'armament', affinity: 'Blood', upgrade: 16 },
    { id: 'carian', name: 'Carian Knight Shield', kind: 'shield', upgrade: 12 },
    { id: 'okina', name: 'White Reed Set', kind: 'armor' },
    { id: 'radagon-soreseal', name: "Radagon's Soreseal", kind: 'talisman' },
    { id: 'claw', name: 'Claw Talisman', kind: 'talisman' },
    { id: 'unsheathe', name: 'Unsheathe', kind: 'ash' },
  ],
  defeatedBosses: ['boss:margit', 'boss:godrick', 'boss:rennala', 'boss:radahn', 'boss:rykard'],
  discoveredGraces: ['grace:elleh', 'grace:gatefront', 'grace:academy-gate', 'grace:redmane'],
  collectedItems: ['item:shadow-realm-blessing', 'item:revered-ash'],
  completedQuestSteps: ['quest:ranni:service', 'quest:ranni:festival', 'quest:boc:needle'],
  deniedFacts: [],
  answers: { platform: 'pc', dlc: 'sote', lastRegion: 'altus' },
  evidence: [],
  shots: [],
}

export const markers: MapMarker[] = [
  { id: 'grace:elleh', name: 'Church of Elleh', kind: 'grace', region: 'Limgrave', campaign: 'base', x: 22, y: 68 },
  { id: 'grace:gatefront', name: 'Gatefront', kind: 'grace', region: 'Limgrave', campaign: 'base', x: 26, y: 64 },
  { id: 'boss:margit', name: 'Margit, the Fell Omen', kind: 'boss', region: 'Stormveil', campaign: 'base', x: 24, y: 58 },
  { id: 'boss:godrick', name: 'Godrick the Grafted', kind: 'boss', region: 'Stormveil', campaign: 'base', x: 22, y: 52 },
  { id: 'boss:rennala', name: 'Rennala, Queen of the Full Moon', kind: 'boss', region: 'Liurnia', campaign: 'base', x: 18, y: 38 },
  { id: 'boss:radahn', name: 'Starscourge Radahn', kind: 'boss', region: 'Caelid', campaign: 'base', x: 62, y: 58 },
  { id: 'boss:rykard', name: 'Rykard, Lord of Blasphemy', kind: 'boss', region: 'Mt. Gelmir', campaign: 'base', x: 12, y: 28 },
  { id: 'boss:malenia', name: 'Malenia, Blade of Miquella', kind: 'boss', region: 'Haligtree', campaign: 'base', x: 48, y: 12, missable: false },
  { id: 'boss:messmer', name: 'Messmer the Impaler', kind: 'boss', region: 'Shadow Keep', campaign: 'sote', x: 72, y: 30 },
  { id: 'boss:leontiel', name: 'Knight Leontiel', kind: 'boss', region: 'Caelid', campaign: 'base', x: 60, y: 56, note: 'Tarnished Pack invader in Radahn’s arena' },
  { id: 'uchi', name: 'Uchigatana', kind: 'item', region: 'Deathtouched Catacombs', campaign: 'base', x: 28, y: 60 },
  { id: 'naga', name: 'Nagakiba', kind: 'item', region: 'Limgrave', campaign: 'base', x: 30, y: 66, note: 'Yura’s quest' },
  { id: 'radagon-soreseal', name: "Radagon's Soreseal", kind: 'item', region: 'Fort Faroth', campaign: 'base', x: 64, y: 52 },
  { id: 'item:shadow-realm-blessing', name: 'Scadutree Fragment', kind: 'fragment', region: 'Gravesite Plain', campaign: 'sote', x: 70, y: 48 },
  { id: 'item:revered-ash', name: 'Revered Spirit Ash', kind: 'spirit-ash', region: 'Gravesite Plain', campaign: 'sote', x: 74, y: 46 },
  { id: 'ranni-rise', name: 'Ranni the Witch', kind: 'npc', region: 'Liurnia', campaign: 'base', x: 16, y: 34 },
  { id: 'alexander-gael', name: 'Iron Fist Alexander', kind: 'npc', region: 'Gael Tunnel', campaign: 'base', x: 48, y: 62 },
  { id: 'scadu-keep', name: 'Shadow Keep', kind: 'dungeon', region: 'Scadu Altus', campaign: 'sote', x: 73, y: 28 },
]

export const codex: CodexEntry[] = [
  { id: 'uchi', name: 'Uchigatana', category: 'Katana', campaign: 'base', snippet: 'Starting armament for Samurai. Innate bleed. Pairs with Unsheathe.' },
  { id: 'naga', name: 'Nagakiba', category: 'Katana', campaign: 'base', snippet: 'Longest katana reach. Yura’s weapon. Blood affinity is a staple.' },
  { id: 'idus-sword', name: 'Idus Sword', category: 'Light Greatsword', campaign: 'tarnished-pack', snippet: 'Idus Knight origin weapon. Also on a Liurnia corpse if you picked another class.' },
  { id: 'hefty-scimitar', name: 'Hefty Scimitar', category: 'Curved Greatsword', campaign: 'tarnished-pack', snippet: 'Heavy Knight origin. Merchant northwest of Fort Haight also sells it.' },
  { id: 'leontiel-gs', name: "Leontiel's Greatsword", category: 'Greatsword', campaign: 'tarnished-pack', snippet: 'Unique skill is a muleta flourish. Dropped by Knight Leontiel.' },
  { id: 'scadufrag', name: 'Scadutree Fragment', category: 'Blessing', campaign: 'sote', snippet: 'Raises attack and absorption inside the Realm of Shadow only.' },
]
