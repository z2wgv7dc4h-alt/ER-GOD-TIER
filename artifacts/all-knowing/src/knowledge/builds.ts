import type { LoadoutSlot, Stats } from '../types'

export type OpBuild = {
  id: string
  name: string
  tag: string
  why: string
  level: number
  stats: Stats
  kit: LoadoutSlot[]
  need: string[]
}

export const opBuilds: OpBuild[] = [
  {
    id: 'build:rivers',
    name: 'Rivers of Blood',
    tag: 'bleed / arcane',
    why: 'Still deletes most of the Lands Between. Weak to high bleed resist (Malenia is the joke).',
    level: 150,
    stats: { vigor: 50, mind: 20, endurance: 25, strength: 12, dexterity: 40, intelligence: 9, faith: 8, arcane: 45 },
    kit: [
      { id: 'rob', name: 'Rivers of Blood', kind: 'armament', upgrade: 10 },
      { id: 'uchi', name: 'Uchigatana', kind: 'armament', affinity: 'Blood', upgrade: 25 },
      { id: 'exult', name: "Lord of Blood's Exultation", kind: 'talisman' },
      { id: 'winged', name: 'Winged Sword Insignia', kind: 'talisman' },
      { id: 'white-mask', name: 'White Mask', kind: 'armor' },
    ],
    need: ['loot:rivers', 'loot:lord-blood-exul', 'boss:radahn'],
  },
  {
    id: 'build:azur',
    name: 'Comet Azur glass',
    tag: 'intelligence',
    why: 'One-shot setups for dragons and late bosses if you can stand still. Terra Magicus + Graven-Mass + Magic Scorpion.',
    level: 150,
    stats: { vigor: 40, mind: 38, endurance: 20, strength: 8, dexterity: 16, intelligence: 80, faith: 6, arcane: 9 },
    kit: [
      { id: 'azur', name: 'Comet Azur', kind: 'ash' },
      { id: 'lusat', name: "Lusat's Glintstone Staff", kind: 'catalyst', upgrade: 10 },
      { id: 'icon', name: 'Radagon Icon', kind: 'talisman' },
      { id: 'godfrey-icon', name: 'Godfrey Icon', kind: 'talisman' },
    ],
    need: ['loot:comet-azur', 'loot:radagon-icon', 'loot:godfrey-icon'],
  },
  {
    id: 'build:blasphemous',
    name: 'Blasphemous Blade',
    tag: 'faith / quality',
    why: 'Taker’s Flames heals on every wave. Facetanks most of base game. Falls off vs holy resist in SotE.',
    level: 150,
    stats: { vigor: 55, mind: 25, endurance: 30, strength: 22, dexterity: 15, intelligence: 9, faith: 50, arcane: 8 },
    kit: [
      { id: 'bb', name: 'Blasphemous Blade', kind: 'armament', upgrade: 10 },
      { id: 'fgms', name: 'Flame, Grant Me Strength', kind: 'ash' },
      { id: 'vow', name: 'Golden Vow', kind: 'ash' },
      { id: 'fire-scorp', name: 'Fire Scorpion Charm', kind: 'talisman' },
    ],
    need: ['loot:blasphemous', 'loot:flame-grant', 'loot:golden-vow', 'boss:rykard'],
  },
  {
    id: 'build:heavy-bonk',
    name: 'Heavy Knight bonk',
    tag: 'strength / tarnished pack',
    why: 'The pack’s Heavy Knight already has the poise. Giant-Crusher or Anvil Hammer, lion’s claw / cragblade.',
    level: 150,
    stats: { vigor: 55, mind: 12, endurance: 40, strength: 80, dexterity: 10, intelligence: 7, faith: 8, arcane: 7 },
    kit: [
      { id: 'crusher', name: 'Giant-Crusher', kind: 'armament', affinity: 'Heavy', upgrade: 25 },
      { id: 'anvil', name: 'Anvil Hammer', kind: 'armament', upgrade: 10 },
      { id: 'crag', name: 'Cragblade', kind: 'ash' },
      { id: 'alex', name: 'Shard of Alexander', kind: 'talisman' },
    ],
    need: ['loot:anvil-hammer', 'loot:cragblade', 'loot:shard-alexander'],
  },
  {
    id: 'build:night-comet',
    name: 'Night Comet Sellia',
    tag: 'intelligence',
    why: 'Enemies barely dodge it. Staff of Loss in offhand. Best “I hate lock-on” sorcery.',
    level: 125,
    stats: { vigor: 40, mind: 30, endurance: 20, strength: 8, dexterity: 16, intelligence: 68, faith: 6, arcane: 9 },
    kit: [
      { id: 'nc', name: 'Night Comet', kind: 'ash' },
      { id: 'loss', name: 'Staff of Loss', kind: 'catalyst', upgrade: 25 },
      { id: 'carian', name: 'Carian Regal Scepter', kind: 'catalyst', upgrade: 10 },
    ],
    need: ['loot:night-comet', 'boss:rennala'],
  },
  {
    id: 'build:leontiel',
    name: 'Leontiel matador',
    tag: 'tarnished pack',
    why: 'Pack invader weapon. Reach + stance. Pairs with Heavy Knight or a dex hybrid after Radahn.',
    level: 150,
    stats: { vigor: 50, mind: 18, endurance: 28, strength: 22, dexterity: 50, intelligence: 9, faith: 8, arcane: 14 },
    kit: [
      { id: 'leo', name: "Leontiel's Greatsword", kind: 'armament', upgrade: 10 },
      { id: 'idus', name: 'Idus Sword', kind: 'armament', upgrade: 25 },
    ],
    need: ['loot:leontiel-gs', 'boss:leontiel', 'boss:radahn'],
  },
]
