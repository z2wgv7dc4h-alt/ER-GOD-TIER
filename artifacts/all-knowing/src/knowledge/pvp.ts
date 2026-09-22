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

  // --- Task 65 additions. Target spreads, not extracted numbers; every `need` id is a real
  // fact id (resolved or reported unresolved by buildHunt()). One original sentence per `why`.
  {
    id: 'build:pvp-parry',
    name: 'Buckler parry punish (RL60)',
    tag: 'pvp / both / parry',
    why: 'A Buckler parry into a dagger riposte is the cheapest way a low-level host turns an invader\u2019s first greedy swing into a full health bar.',
    level: 60,
    stats: { vigor: 40, mind: 12, endurance: 16, strength: 14, dexterity: 20, intelligence: 9, faith: 9, arcane: 9 },
    kit: [
      { id: 'buckler', name: 'Buckler', kind: 'shield', upgrade: 3 },
      { id: 'parrying-dagger', name: 'Parrying Dagger', kind: 'armament', upgrade: 3 },
      { id: 'dagger', name: 'Dagger', kind: 'armament', affinity: 'Keen', upgrade: 3 },
      { id: 'ritual-sword', name: 'Ritual Sword Talisman', kind: 'talisman' },
    ],
    need: ['loot:buckler', 'loot:parrying-dagger', 'loot:ritual-sword'],
    mode: 'both',
    bracket: 'RL60',
    keywords: ['parry', 'buckler', 'riposte', 'daggers'],
    beats: 'Players who throw out predictable running attacks and rolling R1s.',
    losesTo: 'Lag, jumping attacks and anything that cannot be parried.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-faith-poke',
    name: 'Faith poke (RL125)',
    tag: 'pvp / both / faith',
    why: 'A Coded Sword and Blade of Calling poke behind a shield, with the Erdtree Seal buffing holy damage, punishes passivity without ever committing to a long animation.',
    level: 125,
    stats: { vigor: 55, mind: 20, endurance: 25, strength: 14, dexterity: 18, intelligence: 9, faith: 45, arcane: 9 },
    kit: [
      { id: 'coded-sword', name: 'Coded Sword', kind: 'armament', upgrade: 10 },
      { id: 'blade-calling', name: 'Blade of Calling', kind: 'armament', upgrade: 10 },
      { id: 'erdtree-seal', name: 'Erdtree Seal', kind: 'catalyst', upgrade: 10 },
      { id: 'ritual-sword', name: 'Ritual Sword Talisman', kind: 'talisman' },
    ],
    need: ['loot:coded-sword', 'item:blade-of-calling', 'loot:erdtree-seal', 'loot:ritual-sword'],
    mode: 'both',
    bracket: 'RL125',
    keywords: ['faith', 'poke', 'holy', 'shield'],
    beats: 'Shield turtles and players who expect a slow incantation.',
    losesTo: 'Anyone who parries the poke or punishes the buff window.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-dual-spear',
    name: 'Dual spear poke (RL150)',
    tag: 'pvp / both / poke',
    why: 'Powerstanced spears out-range nearly every melee weapon, so the matchup is decided before the other player can close the gap.',
    level: 150,
    stats: { vigor: 60, mind: 15, endurance: 35, strength: 20, dexterity: 60, intelligence: 9, faith: 9, arcane: 9 },
    kit: [
      { id: 'naginata-l', name: 'Cross-Naginata', kind: 'armament', affinity: 'Keen', upgrade: 25 },
      { id: 'naginata-r', name: 'Cross-Naginata', kind: 'armament', affinity: 'Keen', upgrade: 25 },
      { id: 'spear-tal', name: 'Spear Talisman', kind: 'talisman' },
      { id: 'ritual-sword', name: 'Ritual Sword Talisman', kind: 'talisman' },
    ],
    need: ['loot:cross-naginata', 'loot:spear-talisman', 'loot:ritual-sword'],
    mode: 'both',
    bracket: 'RL125-150',
    keywords: ['spear', 'dual', 'poke', 'range'],
    beats: 'Short-range strength weapons that have to walk through the poke.',
    losesTo: 'Parries on the predictable thrust and passivity into a gank.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-host-turtle',
    name: 'Host turtle (RL150)',
    tag: 'pvp / both / turtle',
    why: 'Hosts have flasks and a summon, so a Fingerprint shield plus an Antspur Rapier lets you out-sustain an invader while the bleed and rot chip through their block.',
    level: 150,
    stats: { vigor: 60, mind: 12, endurance: 45, strength: 48, dexterity: 14, intelligence: 9, faith: 8, arcane: 7 },
    kit: [
      { id: 'fingerprint', name: 'Fingerprint Stone Shield', kind: 'shield', upgrade: 25 },
      { id: 'antspur', name: 'Antspur Rapier', kind: 'armament', affinity: 'Blood', upgrade: 25 },
      { id: 'greatshield-tal', name: 'Greatshield Talisman', kind: 'talisman' },
      { id: 'spear-tal', name: 'Spear Talisman', kind: 'talisman' },
    ],
    need: ['loot:fingerprint-shield', 'loot:antspur-rapier', 'loot:greatshield-talisman', 'loot:spear-talisman'],
    mode: 'both',
    bracket: 'RL150',
    keywords: ['host', 'turtle', 'shield', 'rot', 'poke'],
    beats: 'Invaders who try to out-trade a shield and run out of flasks first.',
    losesTo: 'Cragblade stamina damage and anything that forces a roll.',
    patch: 'nerfed-but-works',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-frost',
    name: 'Zamor frost duelist (RL125)',
    tag: 'pvp / duel / frost',
    why: 'Frostbite cuts stamina regen and amplifies the next hit, so a Zamor curved sword\u2019s fast chains win the duel before the proc even lands twice.',
    level: 125,
    stats: { vigor: 55, mind: 18, endurance: 25, strength: 16, dexterity: 34, intelligence: 38, faith: 8, arcane: 9 },
    kit: [
      { id: 'zamor', name: 'Zamor Curved Sword', kind: 'armament', upgrade: 10 },
      { id: 'magic-scorp', name: 'Magic Scorpion Charm', kind: 'talisman' },
      { id: 'graven-mass', name: 'Graven-Mass Talisman', kind: 'talisman' },
      { id: 'ritual-sword', name: 'Ritual Sword Talisman', kind: 'talisman' },
    ],
    need: ['loot:zamor-curved-sword', 'loot:magic-scorpion', 'loot:graven-mass', 'loot:ritual-sword'],
    mode: 'duel',
    bracket: 'RL125',
    keywords: ['frost', 'duel', 'curved sword', 'int'],
    beats: 'Trading opponents who eat a second chain to clear the frostbite proc.',
    losesTo: 'Frost-resistant builds and anyone who out-ranges the curved sword.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-blackflame',
    name: 'Black flame duelist (RL125)',
    tag: 'pvp / duel / incant',
    why: 'Black Flame and Scouring Black Flame give a fast projectile and a roll-catching arc, so the duel is fought at the range the caster chooses.',
    level: 125,
    stats: { vigor: 55, mind: 25, endurance: 22, strength: 14, dexterity: 14, intelligence: 9, faith: 50, arcane: 9 },
    kit: [
      { id: 'godslayer-seal', name: "Godslayer's Seal", kind: 'catalyst', upgrade: 25 },
      { id: 'black-flame', name: 'Black Flame', kind: 'ash' },
      { id: 'scouring', name: 'Scouring Black Flame', kind: 'ash' },
      { id: 'radagon-icon', name: 'Radagon Icon', kind: 'talisman' },
    ],
    need: ['loot:godslayer-seal', 'loot:black-flame', 'loot:scouring-black-flame', 'loot:radagon-icon'],
    mode: 'duel',
    bracket: 'RL125',
    keywords: ['faith', 'incant', 'black flame', 'duel'],
    beats: 'Players who try to close distance through the projectile.',
    losesTo: 'Passive players who roll everything and poke the recovery.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-bhs',
    name: 'Bloodhound step duelist (RL125)',
    tag: 'pvp / both / bleed',
    why: 'Bloodhound\u2019s Step resets the bleed chain instantly, so a katana build keeps repositioning and never has to trade into the other player\u2019s combo.',
    level: 125,
    stats: { vigor: 55, mind: 15, endurance: 25, strength: 14, dexterity: 42, intelligence: 9, faith: 9, arcane: 35 },
    kit: [
      { id: 'nagakiba', name: 'Nagakiba', kind: 'armament', affinity: 'Blood', upgrade: 25 },
      { id: 'bhs', name: "Ash of War: Bloodhound's Step", kind: 'ash' },
      { id: 'exult', name: "Lord of Blood's Exultation", kind: 'talisman' },
      { id: 'white-mask', name: 'White Mask', kind: 'armor' },
    ],
    need: ['item:nagakiba', 'loot:bloodhound-step', 'loot:lord-blood-exul', 'loot:white-mask'],
    mode: 'both',
    bracket: 'RL125',
    keywords: ['bleed', 'katana', 'step', 'mobility'],
    beats: 'Slow weapons that cannot punish the step recovery.',
    losesTo: 'Passive play and builds that stack bleed resistance.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-rot',
    name: 'Scarlet rot pressure (RL150)',
    tag: 'pvp / both / rot+bleed',
    why: 'An Antspur Rapier procs both Scarlet Rot and Hemorrhage through a block, and the two Winged Insignia talismans turn the long fight into a damage race you win.',
    level: 150,
    stats: { vigor: 55, mind: 15, endurance: 28, strength: 14, dexterity: 50, intelligence: 9, faith: 8, arcane: 35 },
    kit: [
      { id: 'antspur', name: 'Antspur Rapier', kind: 'armament', affinity: 'Blood', upgrade: 25 },
      { id: 'winged', name: 'Rotten Winged Sword Insignia', kind: 'talisman' },
      { id: 'millicent', name: "Millicent's Prosthesis", kind: 'talisman' },
      { id: 'exult', name: "Lord of Blood's Exultation", kind: 'talisman' },
    ],
    need: ['loot:antspur-rapier', 'item:rotten-winged-sword-insignia', 'item:millicent-prosthesis', 'loot:lord-blood-exul'],
    mode: 'both',
    bracket: 'RL150',
    keywords: ['rot', 'scarlet rot', 'bleed', 'pressure'],
    beats: 'Turtles and anyone who lets both statuses tick.',
    losesTo: 'Burst builds that end the fight before either proc lands.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-frenzy',
    name: 'Frenzy burst (RL125)',
    tag: 'pvp / duel / frenzy',
    why: 'Unendurable Frenzy fires a long stream that forces the duel into a roll-chase, and Madness buildup makes each clean hit worth far more than its damage.',
    level: 125,
    stats: { vigor: 55, mind: 30, endurance: 22, strength: 14, dexterity: 14, intelligence: 9, faith: 45, arcane: 9 },
    kit: [
      { id: 'frenzy', name: 'Unendurable Frenzy', kind: 'ash' },
      { id: 'finger-seal', name: 'Finger Seal', kind: 'catalyst', upgrade: 25 },
      { id: 'ritual-sword', name: 'Ritual Sword Talisman', kind: 'talisman' },
      { id: 'green-turtle', name: 'Green Turtle Talisman', kind: 'talisman' },
    ],
    need: ['loot:unendurable-frenzy', 'loot:finger-seal', 'loot:ritual-sword', 'loot:green-turtle-talisman'],
    mode: 'duel',
    bracket: 'RL125',
    keywords: ['frenzy', 'madness', 'incant', 'burst'],
    beats: 'Players who try to roll through the stream instead of breaking line of sight.',
    losesTo: 'Anyone who closes during the long channel and punishes the recovery.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'build:pvp-support',
    name: 'Golden Vow support (RL150)',
    tag: 'pvp / both / buffs',
    why: 'A host who keeps Golden Vow and Black Flame\u2019s Protection up gives the whole squad a flat edge, so the invader is always fighting buffed numbers.',
    level: 150,
    stats: { vigor: 60, mind: 30, endurance: 28, strength: 14, dexterity: 14, intelligence: 9, faith: 60, arcane: 9 },
    kit: [
      { id: 'erdtree-seal', name: 'Erdtree Seal', kind: 'catalyst', upgrade: 10 },
      { id: 'vow', name: 'Golden Vow', kind: 'ash' },
      { id: 'bf-protection', name: "Black Flame's Protection", kind: 'ash' },
      { id: 'ritual-shield', name: 'Ritual Shield Talisman', kind: 'talisman' },
    ],
    need: ['loot:erdtree-seal', 'loot:golden-vow', 'loot:black-flames-protection', 'loot:ritual-shield-talisman'],
    mode: 'both',
    bracket: 'RL150',
    keywords: ['support', 'buffs', 'host', 'golden vow'],
    beats: 'Invaders who try to burst through a buffed, flasked host.',
    losesTo: 'Pressure that never lets you re-buff, and dispels.',
    patch: 'still-strong',
    source: 'Community-standard archetype (author-encoded); cf. Fextralife PvP.',
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
  {
    id: 'matchup:frost',
    threat: 'Frost / cold weapons and spells',
    aliases: ['frost', 'frostbite', 'cold', 'zamor', 'ghostflame'],
    tell: 'Fast curved swords or a caster fishing for a Frostbite proc to cut your stamina.',
    counters: [
      'Carry a frost-resistant talisman or armour for the matchup; the proc amplifies the hit that follows, so never eat the second chain.',
      'Clear the frostbite bar with a boluse before re-engaging rather than letting it linger.',
      'Punish the caster between Glintstone Icecrag casts; the frost weapons have to come to you.',
    ],
    note: 'Frostbite stamina effect and damage amplification are wiki mechanics (Fextralife, Frostbite).',
  },
  {
    id: 'matchup:rot',
    threat: 'Scarlet Rot pressure',
    aliases: ['rot', 'scarlet rot', 'antspur', 'rotten'],
    tell: 'An Antspur Rapier or a rot breath ticking both a damage-over-time and a heal cut.',
    counters: [
      'Preserving Boluses clear Scarlet Rot; keep two on the quick bar in any late-game invasion.',
      'Pressure the rot applier immediately — the build needs time to win, so deny it.',
      'Do not trade into a bleed-rot rapier; poke from outside its range or parry the thrust.',
    ],
    note: 'Rot cures from the Fextralife Preserving Boluses page; status stacking from the PvP page.',
  },
  {
    id: 'matchup:frenzy',
    threat: 'Frenzied Flame burst',
    aliases: ['frenzy', 'madness', 'frenzied flame', 'unendurable'],
    tell: 'A caster charging Unendurable Frenzy or Flame of Frenzy at range.',
    counters: [
      'Break line of sight and close during the long channel; the stream cannot turn fast enough.',
      'Madness procs hurt far more than the listed damage, so do not face-tank the burst to trade.',
      'Once you are in, stay in — the frenzy caster has no melee answer at close range.',
    ],
    note: 'Madness buildup and the channel behaviour are from the Fextralife Frenzied Flame pages.',
  },
  {
    id: 'matchup:sleep',
    threat: 'Sleep / St Trina',
    aliases: ['sleep', 'st trina', 'trina', 'sword of st trina'],
    tell: 'Dual St Trina swords or a sleep pot fishing for a stance-break window.',
    counters: [
      'Sleep does not open a critical in PvP, but the stance-break window it leaves is where the damage goes.',
      'Keep moving; the proc only lands if you stand in the L1 chain.',
      'Stimulating Boluses or a sleep-resistant set blunts the whole plan.',
    ],
    note: 'PvP sleep behaviour from the Fextralife PvP page.',
  },
  {
    id: 'matchup:bhs',
    threat: 'Bloodhound’s Step escape',
    aliases: ['bloodhound step', 'bhs', 'step', 'mobility'],
    tell: 'An opponent who resets every exchange with a step and never commits to a combo.',
    counters: [
      'Do not chase the step; hold the centre and force them to come to you.',
      'Punish the recovery frames after the step, not the step itself.',
      'A thrusting weapon or a long poke catches the step-back better than a wide swing.',
    ],
    note: 'Community-standard counter-tech (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'matchup:dualspear',
    threat: 'Dual-spear poke',
    aliases: ['dual spear', 'spears', 'cross-naginata', 'naginata', 'powerstance'],
    tell: 'Powerstanced spears poking from just outside your swing range.',
    counters: [
      'Close the gap during the L1 recovery rather than trying to out-range it.',
      'Parry the predictable thrust; the spears cannot mix up the timing much.',
      'Cragblade or a shield counter punishes the poke if you cannot out-space it.',
    ],
    note: 'Community-standard counter-tech (author-encoded); cf. Fextralife PvP.',
  },
]
