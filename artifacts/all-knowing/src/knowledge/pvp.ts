import type { OpBuild } from './builds'

/**
 * PvP is a separate concern from the PvE `opBuilds` list: poise, stance and
 * invade-vs-host asymmetry matter more than raw damage, and PvP has its own
 * balance layer (patch 1.07+ scales skills/status separately against players).
 *
 * Sources (patch 1.17, Aug 27 2026 — the Tarnished Pack regulation line this
 * project is stamped against):
 *  - https://eldenring.wiki.fextralife.com/PvP_Builds  (the four builds tagged PvP)
 *  - individual Fextralife build pages, listed per entry below
 *  - https://eldenring.wiki.fextralife.com/PvP   (PvP-exclusive scaling rules)
 *  - https://eldenring.wiki.fextralife.com/Patch+Notes  (1.17 PvP changes)
 * Two entries are community-standard archetypes rather than wiki-tagged PvP
 * builds; they are marked `source` accordingly. Stat lines are target spreads,
 * not extracted numbers. See docs/research/op-builds-pvp-tricks-sources.md.
 */

export type PvpMode = 'invade' | 'duel' | 'both'

export type PvpBuild = OpBuild & {
  mode: PvpMode
  /** Level bracket the build is tuned for. */
  bracket: string
  /** Router keywords for "what's good for pvp / sleep / poke" style asks. */
  keywords: string[]
  /** What this build punishes. */
  beats: string
  /** The honest weakness. */
  losesTo: string
  /** Where the data came from. */
  source: string
}

export const pvpBuilds: PvpBuild[] = [
  {
    id: 'build:pvp-wretch',
    name: 'Poison/Bleed Wretch (RL30)',
    tag: 'pvp / invade / status',
    why: 'Low-level invasion build. Status buildup outpaces the tiny health pools hosts have at RL30, and the Reduvia bleed proc is lethal before anyone has Vigor.',
    level: 30,
    stats: { vigor: 31, mind: 10, endurance: 12, strength: 10, dexterity: 12, intelligence: 9, faith: 9, arcane: 28 },
    kit: [
      { id: 'warhawk-talon', name: "Warhawk's Talon", kind: 'armament', upgrade: 2 },
      { id: 'cane-sword', name: 'Cane Sword', kind: 'armament', upgrade: 2 },
      { id: 'reduvia', name: 'Reduvia', kind: 'armament', upgrade: 1 },
    ],
    need: ['loot:reduvia'],
    mode: 'invade',
    bracket: 'RL30',
    keywords: ['low level', 'low-level', 'twink', 'poison', 'bleed'],
    beats: 'Low-Vigor hosts and players still learning roll timing.',
    losesTo: 'Over-levelled password-summon phantoms with poise and Vigor.',
    source: 'https://eldenring.wiki.fextralife.com/PvP_Builds',
  },
  {
    id: 'build:pvp-trinitas',
    name: "St. Trina's Confessor (RL60)",
    tag: 'pvp / invade / sleep+frost',
    why: 'Powerstanced Swords of St Trina proc Sleep fast; in PvP Sleep does not open a crit but leaves a long stance-break window, then Ghostflame Ignition detonates the trade.',
    level: 60,
    stats: { vigor: 49, mind: 15, endurance: 25, strength: 17, dexterity: 18, intelligence: 14, faith: 8, arcane: 9 },
    kit: [
      { id: 'st-trina-l', name: 'Sword of St Trina', kind: 'armament', upgrade: 3 },
      { id: 'st-trina-r', name: 'Sword of St Trina', kind: 'armament', upgrade: 3 },
      { id: 'deaths-poker', name: "Death's Poker", kind: 'armament', upgrade: 3 },
      { id: 'pulley-xbow', name: 'Pulley Crossbow', kind: 'armament', upgrade: 3 },
      { id: 'radagon-soreseal', name: "Radagon's Soreseal", kind: 'talisman' },
      { id: 'winged', name: 'Rotten Winged Sword Insignia', kind: 'talisman' },
    ],
    need: ['loot:sword-st-trina', 'loot:deaths-poker'],
    mode: 'invade',
    bracket: 'RL60',
    keywords: ['sleep', 'trina', 'frost', 'confessor'],
    beats: 'Passive players who eat the L1 chain and give up the stance-break window.',
    losesTo: 'Anyone who rolls out of Sleep and punishes the Ghostflame recovery.',
    source: "https://eldenring.wiki.fextralife.com/Level_60_St._Trina%27s_Confessor_Build",
  },
  {
    id: 'build:pvp-lightning-assassin',
    name: 'Sanguine Lightning Assassin (RL75)',
    tag: 'pvp / invade / burst',
    why: 'Concealing Veil keeps you invisible at range, Bolt of Gransax and Dragon King’s Cragblade deliver the one-shot, Bloodhound’s Step is the escape. Built to delete the host before the gank reacts.',
    level: 75,
    stats: { vigor: 40, mind: 12, endurance: 20, strength: 20, dexterity: 40, intelligence: 9, faith: 8, arcane: 9 },
    kit: [
      { id: 'gransax', name: 'Bolt of Gransax', kind: 'armament', upgrade: 10 },
      { id: 'cragblade', name: "Dragon King's Cragblade", kind: 'armament', upgrade: 10 },
      { id: 'okina', name: 'Okina Mask', kind: 'armor' },
      { id: 'concealing-veil', name: 'Concealing Veil', kind: 'talisman' },
      { id: 'alex', name: 'Shard of Alexander', kind: 'talisman' },
      { id: 'godfrey-icon', name: 'Godfrey Icon', kind: 'talisman' },
    ],
    need: ['loot:bolt-gransax', 'loot:concealing-veil'],
    mode: 'invade',
    bracket: 'RL75',
    keywords: ['assassin', 'stealth', 'burst', 'gransax', 'lightning'],
    beats: 'Hosts who walk open ground and never check behind them.',
    losesTo: 'Sustained 2v1 pressure once the ambush fails and the co-op players group up.',
    source: 'https://eldenring.wiki.fextralife.com/Level_75_Sanguine_Lightning_Assassin_Build',
  },
  {
    id: 'build:pvp-sorcerer-duelist',
    name: 'Sorcerer Duelist (RL80/90)',
    tag: 'pvp / duel / caster',
    why: 'Azur’s Staff plus Radagon Icon reaches the cast-speed cap, Carian Slicer staggers anyone under ~30 poise, and two Magic Glintblades into Collapsing Stars is close to a guaranteed one-shot.',
    level: 90,
    stats: { vigor: 40, mind: 26, endurance: 15, strength: 12, dexterity: 16, intelligence: 60, faith: 7, arcane: 9 },
    kit: [
      { id: 'azur-staff', name: "Azur's Glintstone Staff", kind: 'catalyst', upgrade: 25 },
      { id: 'carian-slicer', name: 'Carian Slicer', kind: 'ash' },
      { id: 'swift-shard', name: 'Swift Glintstone Shard', kind: 'ash' },
      { id: 'graven-mass', name: 'Graven-Mass Talisman', kind: 'talisman' },
      { id: 'radagon-icon', name: 'Radagon Icon', kind: 'talisman' },
      { id: 'stargazer', name: 'Stargazer Heirloom', kind: 'talisman' },
      { id: 'great-jar', name: "Great-Jar's Arsenal", kind: 'talisman' },
    ],
    need: ['loot:carian-slicer', 'boss:rennala', 'loot:radagon-icon'],
    mode: 'duel',
    bracket: 'RL80-90',
    keywords: ['mage', 'sorcerer', 'spell', 'duel', 'caster', 'int'],
    beats: 'Low-poise melee players who try to wade through Slicer and Glintblades.',
    losesTo: 'Eternal Darkness users and anyone who closes distance during cast recovery.',
    source: 'https://eldenring.wiki.fextralife.com/Level_80-90_Sorcerer_Duelist_Build',
  },
  {
    id: 'build:pvp-bleed-katana',
    name: 'Bleed katana duelist (RL125/150)',
    tag: 'pvp / both / bleed',
    why: 'Corpse Piler and powerstanced Blood katanas still punish passive play: bleed pressure forces a reaction, and Lord of Blood’s Exultation turns the proc into a damage window. Community-standard archetype, not a wiki-tagged build.',
    level: 150,
    stats: { vigor: 55, mind: 20, endurance: 25, strength: 12, dexterity: 45, intelligence: 9, faith: 8, arcane: 45 },
    kit: [
      { id: 'rob', name: 'Rivers of Blood', kind: 'armament', upgrade: 10 },
      { id: 'nagakiba', name: 'Nagakiba', kind: 'armament', affinity: 'Blood', upgrade: 25 },
      { id: 'white-mask', name: 'White Mask', kind: 'armor' },
      { id: 'exult', name: "Lord of Blood's Exultation", kind: 'talisman' },
      { id: 'winged', name: 'Rotten Winged Sword Insignia', kind: 'talisman' },
    ],
    need: ['loot:rivers', 'loot:lord-blood-exul'],
    mode: 'both',
    bracket: 'RL125-150',
    keywords: ['bleed', 'rivers', 'rob', 'corpse piler', 'katana'],
    beats: 'Players who back off instead of rolling through the third Corpse Piler hit.',
    losesTo: 'Bleed-resistant armour, shields, and roll-catch spacing that punishes the L2 recovery.',
    source: 'Community-standard archetype (author-encoded); cf. Sanguine Samurai build, Fextralife.',
  },
  {
    id: 'build:pvp-colossal',
    name: 'Colossal poise monster (RL150)',
    tag: 'pvp / both / poise',
    why: 'Max poise plus hyper-armour trades win the neutral game: Lion’s Claw cannot be parried, and the opponent eats the follow-up if they try to interrupt. Community-standard archetype, not a wiki-tagged build.',
    level: 150,
    stats: { vigor: 60, mind: 12, endurance: 45, strength: 80, dexterity: 14, intelligence: 7, faith: 8, arcane: 7 },
    kit: [
      { id: 'crusher', name: 'Giant-Crusher', kind: 'armament', affinity: 'Heavy', upgrade: 25 },
      { id: 'greatsword', name: 'Greatsword', kind: 'armament', affinity: 'Heavy', upgrade: 25 },
      { id: 'lions-claw', name: 'Lion’s Claw', kind: 'ash' },
      { id: 'bullgoat', name: 'Bull-Goat Set', kind: 'armor' },
      { id: 'alex', name: 'Shard of Alexander', kind: 'talisman' },
      { id: 'great-jar', name: "Great-Jar's Arsenal", kind: 'talisman' },
    ],
    need: ['loot:giant-crusher', 'loot:lions-claw', 'loot:bullgoat'],
    mode: 'both',
    bracket: 'RL150',
    keywords: ['colossal', 'poise', 'strength', 'bonk', 'hyper armor', 'hyperarmour'],
    beats: 'Fast weapons that try to trade into hyper armour.',
    losesTo: 'Thrusting-sword poke, Giant Hunt (parryable) and patient whiff-punishing.',
    source: 'Community-standard archetype (author-encoded); cf. Colossal Crusher build, Fextralife.',
  },
]

export type PvpMatchup = {
  id: string
  /** The archetype being countered. */
  threat: string
  /** Router keywords that name this archetype. */
  aliases: string[]
  /** How to recognise it. */
  tell: string
  /** Real, concrete counter-tech. */
  counters: string[]
  note: string
}

/**
 * Matchup advice for the archetypes that actually show up. Counter-tech is
 * grounded in the wiki mechanics cited per line (parry flags, Cragblade stamina
 * damage, Eternal Darkness, PvP status scaling); see the module header.
 */
export const pvpMatchups: PvpMatchup[] = [
  {
    id: 'matchup:bleed',
    threat: 'Bleed / Rivers of Blood',
    aliases: ['bleed', 'rivers of blood', 'rivers', 'rob', 'corpse piler', 'blood'],
    tell: 'Katana or twinblade fishing for a multi-hit L2 to proc Hemorrhage.',
    counters: [
      'Roll through the third Corpse Piler hit rather than away from it — that hit is the proc.',
      'PvP scales status buildup down, so one bleed proc rarely kills a high-Vigor build; do not panic-roll into the follow-up.',
      'A shield or high bleed-resist armour blunts the whole plan; pressure the recovery after the L2 whiffs.',
    ],
    note: 'PvP-exclusive status scaling has applied since patch 1.07 (Fextralife PvP).',
  },
  {
    id: 'matchup:colossal',
    threat: 'Colossal / poise monster',
    aliases: ['colossal', 'poise', 'bonk', 'giant crusher', 'hyper armor', 'hyperarmour', 'strength'],
    tell: 'Greatsword or greathammer walking you down behind hyper armour.',
    counters: [
      'Bait the slow R1 and whiff-punish; never trade into hyper armour with a fast weapon.',
      'Giant Hunt and Cragblade can be parried; Lion’s Claw cannot — learn which one they use.',
      'Thrusting damage (Spear Talisman) and roll-catching beat the recovery frames.',
    ],
    note: 'Parry flags from the Fextralife Lion’s Claw / Giant Hunt / Cragblade pages.',
  },
  {
    id: 'matchup:mage',
    threat: 'Mage / spellspam',
    aliases: ['mage', 'sorcer', 'spellspam', 'spell', 'caster', 'comet', 'glintstone'],
    tell: 'Staff out, chaining fast projectiles and keeping range.',
    counters: [
      'Eternal Darkness pulls in incoming spells and eats a whole volley.',
      'Close the gap during cast recovery instead of trying to out-range them.',
      'Patch 1.17 reduced Meteorite/Meteorite of Astel cast time and buffed Carian Retaliation — respect the faster pressure.',
    ],
    note: 'Eternal Darkness as anti-caster is from the Fextralife Sorcerer Duelist page; 1.17 changes from Patch Notes.',
  },
  {
    id: 'matchup:poke',
    threat: 'Thrusting-sword poke',
    aliases: ['poke', 'thrust', 'estoc', 'rapier', 'naginata', 'spear', 'greatshield poke', 'turtle'],
    tell: 'Fast thrusting sword poking from just outside your swing range.',
    counters: [
      'Cragblade adds +50% stamina damage against guarding enemies for 60s — the anti-shield tool.',
      'Parry the predictable thrust; the 1.17 Parry improvement widened the window.',
      'Out-poise the poke or out-range it with a longer weapon; guard counters punish blocked pokes.',
    ],
    note: 'Cragblade and Parry values from their Fextralife pages and the 1.17 Patch Notes.',
  },
  {
    id: 'matchup:greatshield',
    threat: 'Greatshield turtle',
    aliases: ['greatshield', 'fingerprint', 'shield poke', 'shield', 'guard'],
    tell: 'Blocking behind a tower shield and poking from safety.',
    counters: [
      'Cragblade’s +50% stamina damage against guarding enemies is the direct answer.',
      'Scarlet Rot or bleed through the shield (Antspur Rapier) ignores the block entirely.',
      'Patch 1.17 buffed greatshield guard boost and cut weight on many shields, so they are tankier now — do not assume chip damage will do it.',
    ],
    note: '1.17 greatshield changes from the Patch Notes; Cragblade from its Fextralife page.',
  },
  {
    id: 'matchup:invader',
    threat: 'Invader / host asymmetry',
    aliases: ['invader', 'invade', 'invasion', 'host', 'gank', '2v1', 'co-op'],
    tell: 'Deciding who has the advantage before the fight starts.',
    counters: [
      'The host has flasks, a Great Rune and co-op summons; the invader has the PvE mobs and cannot enter boss fog.',
      'Invaders should use enemies as cover and pick off the summon before the host.',
      'Taunter’s Tongue shortens the invasion window and allows a second invader (limits the host to one summon).',
    ],
    note: 'Invasion rules and Taunter’s Tongue behaviour from the Fextralife PvP page.',
  },
]
