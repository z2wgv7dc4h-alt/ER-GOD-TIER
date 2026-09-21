/**
 * Real tips, tricks and strong tech. Structured data, not prose — Codex renders
 * these cards and Gideon's router answers from the same rows.
 *
 * Sources are the Fextralife wiki pages named on each entry (patch 1.17, Aug 27
 * 2026, the Tarnished Pack regulation line this project is stamped against) plus
 * the 1.17 Patch Notes. Numeric values (stance, buff percentages, FP/HP costs)
 * are quoted only where a source actually states them; everything else is
 * described qualitatively on purpose. Full list in
 * docs/research/op-builds-pvp-tricks-sources.md.
 */

export type TechCategory =
  | 'jump-attack'
  | 'ash-of-war'
  | 'buff-stacking'
  | 'spirit-ash'
  | 'item'
  | 'status'
  | 'sorcery'
  | 'incantation'
  | 'pvp-tech'
  | 'general'

export type TechTip = {
  id: string
  name: string
  category: TechCategory
  /** One line: what it is. */
  what: string
  /** Why it is strong. */
  why: string
  /** How to actually use it. */
  how: string
  /** Router keywords. */
  tags: string[]
  /** Patch-currency caveat, when the tech is balance-sensitive. */
  patch?: string
  source: string
}

export const techTips: TechTip[] = [
  {
    id: 'tech:lions-claw',
    name: "Lion's Claw",
    category: 'ash-of-war',
    what: 'A leaping slam Ash of War that does heavy stance damage and cannot be parried.',
    why: 'Stance damage scales with weapon weight (up to 45 on a colossal hammer), so two casts stagger most bosses. The startup also grants hyper armour.',
    how: 'Put it on a Greatsword/Greathammer and spam it into a boss that would otherwise out-trade you.',
    tags: ['lions claw', "lion's claw", 'stance break', 'stance', 'unparryable'],
    source: "https://eldenring.wiki.fextralife.com/Lion%27s+Claw",
  },
  {
    id: 'tech:giant-hunt',
    name: 'Giant Hunt',
    category: 'ash-of-war',
    what: 'A lunging upward thrust that launches most humanoid enemies airborne.',
    why: 'It always deals thrust damage (so the Spear Talisman boosts it) and the launch sets up a free follow-up.',
    how: 'Use it on a heavy thrusting sword or great spear to launch and then punish; remember it CAN be parried.',
    tags: ['giant hunt', 'launch', 'thrust'],
    source: 'https://eldenring.wiki.fextralife.com/Giant+Hunt',
  },
  {
    id: 'tech:royal-knights-resolve',
    name: "Royal Knight's Resolve",
    category: 'ash-of-war',
    what: 'Buffs the next landing swing by 80% (35% on a critical), for 10s or until it connects.',
    why: 'Turns one charged heavy or a jump attack into a one-shot on a high-AR weapon.',
    how: 'Buff, then land a single charged R2 or backstab; re-apply after it is spent. Effectiveness is cut to 40% in PvP.',
    tags: ['royal knights resolve', "knight's resolve", 'rkr', 'one shot', 'oneshot'],
    patch: 'PvP effectiveness reduced to 40% since patch 1.09.',
    source: "https://eldenring.wiki.fextralife.com/Royal_Knight%27s+Resolve",
  },
  {
    id: 'tech:cragblade',
    name: 'Cragblade',
    category: 'ash-of-war',
    what: 'Coats the weapon in stone for 60s: +15% physical, +10% stance damage, +50% stamina damage vs guarding enemies.',
    why: 'The best anti-shield tool in the game and a solid stance buff for a pure-physical build.',
    how: 'Apply before a shield-poke duel or a boss with a guard; note it overwrites other weapon buffs.',
    tags: ['cragblade', 'anti shield', 'guard', 'stamina damage'],
    source: 'https://eldenring.wiki.fextralife.com/Cragblade',
  },
  {
    id: 'tech:seppuku',
    name: 'Seppuku',
    category: 'ash-of-war',
    what: 'Self-inflicted blood loss that adds 30 flat physical and 30 base bleed scaling with Arcane for 60s.',
    why: 'The self-proc also triggers Lord of Blood’s Exultation and the White Mask, so the buff and the damage stack.',
    how: 'Apply to a bleed weapon before a fight; the HP cost is 100 + 15% of max HP, so do it with room to heal.',
    tags: ['seppuku', 'bleed', 'exultation', 'white mask'],
    source: 'https://eldenring.wiki.fextralife.com/Seppuku',
  },
  {
    id: 'tech:comet-azur-cerulean',
    name: 'Comet Azur + Cerulean Hidden Tear',
    category: 'sorcery',
    what: 'The Cerulean Hidden Tear removes FP cost for 15 seconds, letting Comet Azur channel far longer.',
    why: 'Comet Azur is a channelled beam, so FP is the only real limit on the one-shot; the tear removes it.',
    how: 'Put the tear in the Wondrous Physick, then open with the beam on a boss that has a long intro or is downed.',
    tags: ['comet azur', 'cerulean', 'physick', 'beam', 'one shot'],
    patch: 'Comet Azur is channelled and does not benefit from Godfrey Icon.',
    source: 'https://eldenring.wiki.fextralife.com/Comet+Azur',
  },
  {
    id: 'tech:night-comet-staff-loss',
    name: 'Night Comet + Staff of Loss',
    category: 'sorcery',
    what: 'Staff of Loss boosts Night Comet potency by 30%, and the effect stacks with a second Staff of Loss.',
    why: 'It is effectively the strongest of the comet-type spells, and NPCs do not dodge it.',
    how: 'Hold a Staff of Loss in each hand; cast Night Comet with the main hand for the doubled boost.',
    tags: ['night comet', 'staff of loss', 'invisible', 'sorcery'],
    source: 'https://eldenring.wiki.fextralife.com/Night+Comet',
  },
  {
    id: 'tech:black-knife-tiche',
    name: 'Black Knife Tiche',
    category: 'spirit-ash',
    what: 'A 132 FP spirit ash with 80 poise, immune to all statuses, that inflicts Destined Death.',
    why: 'Destined Death burns a chunk of max HP, so Tiche scales into high-health bosses and endgame fights.',
    how: 'Summon her against a boss with a huge health pool; she input-reads and will dodge while dealing percentage damage.',
    tags: ['tiche', 'black knife', 'spirit ash', 'destined death', 'summon'],
    source: 'https://eldenring.wiki.fextralife.com/Black+Knife+Tiche+Ashes',
  },
  {
    id: 'tech:mimic-tear',
    name: 'Mimic Tear',
    category: 'spirit-ash',
    what: 'Copies your weapons, armour, talismans, spells, ammo and consumables, and powerstances if you do.',
    why: 'It is a second copy of your whole build, and it only costs HP (660) instead of FP.',
    how: 'Summon it after equipping your real setup; it will not use Great Runes or your pouch items.',
    tags: ['mimic tear', 'mimic', 'spirit ash', 'summon', 'copy'],
    source: 'https://eldenring.wiki.fextralife.com/Mimic+Tear+Ashes',
  },
  {
    id: 'tech:sleep-pot',
    name: 'Sleep Pot',
    category: 'item',
    what: 'A craftable pot that applies Sleep buildup scaling with Arcane over a short burst.',
    why: 'Sleep hard-controls bosses that are otherwise a wall — the Godskin Duo is the classic use.',
    how: 'Craft with Fevor’s Cookbook [1], a Mushroom, a Trina’s Lily and a Cracked Pot; throw before the boss wakes.',
    tags: ['sleep pot', 'sleep', 'godskin', 'pot', 'craft'],
    source: 'https://eldenring.wiki.fextralife.com/Sleep+Pot',
  },
  {
    id: 'tech:ironjar-aromatic',
    name: 'Ironjar Aromatic',
    category: 'item',
    what: 'A 40s buff: +40% physical negation, +45 all aux resistances, Tier 4 hardness, but −60% lightning negation.',
    why: 'Lets you facetank physical damage and ignore light stagger; it stacks multiplicatively with Golden Vow / Rallying Standard.',
    how: 'Pop it before a physical boss, then use Quickstep or Bloodhound’s Step to bypass the heavy-roll movement penalty.',
    tags: ['ironjar', 'aromatic', 'tank', 'facetank', 'buff'],
    source: 'https://eldenring.wiki.fextralife.com/Ironjar+Aromatic',
  },
  {
    id: 'tech:bloodflame-blade',
    name: 'Bloodflame Blade',
    category: 'incantation',
    what: 'A weapon buff that adds fire damage and a bleed debuff stacking 40 bleed over 2s per hit.',
    why: 'The bleed does not scale with Arcane, so it works on any Faith build and stacks fast on multi-hit attacks.',
    how: 'Apply to an innate-bleed weapon like an Uchigatana, then use fast multi-hit attacks (spinning slash, twinblade).',
    tags: ['bloodflame', 'blood flame', 'bleed buff', 'incantation'],
    source: 'https://eldenring.wiki.fextralife.com/Bloodflame+Blade',
  },
  {
    id: 'tech:buff-stacking',
    name: 'Golden Vow + Flame, Grant Me Strength',
    category: 'buff-stacking',
    what: 'Golden Vow is an aura buff and Flame, Grant Me Strength is a body buff, so they stack.',
    why: 'Stacking attack and defence buffs from different categories is the single biggest free damage gain in the game.',
    how: 'Cast Golden Vow (aura) then Flame, Grant Me Strength (body) before a boss; add a weapon buff or greases for a third layer.',
    tags: ['buff stack', 'golden vow', 'flame grant', 'fgms', 'buffs'],
    source: 'https://eldenring.wiki.fextralife.com/Buffs_and_Debuffs',
  },
  {
    id: 'tech:jump-attack',
    name: 'Jumping heavy attacks',
    category: 'jump-attack',
    what: 'A jumping R2/strong attack hits hard, does solid stance damage, and has a low recovery.',
    why: 'It is the safest high-damage option against a boss — you leap out of range, land the hit, and are free to roll.',
    how: 'Jump straight up and press heavy attack; pair with the Claw Talisman and, if powerstancing, the dual L1 jump.',
    tags: ['jump attack', 'jumping attack', 'jump r2', 'claw talisman'],
    source: 'https://eldenring.wiki.fextralife.com/Combat',
  },
  {
    id: 'tech:powerstance-jump',
    name: 'Powerstanced jump attacks',
    category: 'jump-attack',
    what: 'Two-handing the same weapon class lets the jump L1 hit with both weapons at once.',
    why: 'It stacks status buildup and stance damage from two weapons in one low-commitment swing.',
    how: 'Equip two of the same class (e.g. twinblades or curved swords) and use the jumping L1; add Rotten Winged Sword Insignia for the chain.',
    tags: ['powerstance', 'power stance', 'dual wield', 'jump l1'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvE builds.',
  },
  {
    id: 'tech:poise-breakpoints',
    name: 'Poise breakpoints (PvE)',
    category: 'general',
    what: '51 poise (the full Knight Set) stops most standard PvE weak-staggers; 101 poise endures far more.',
    why: 'Hitting a poise breakpoint is what lets you finish a cast or an attack without being interrupted.',
    how: 'Aim for 51 as a baseline, 101 for a heavy build; Bull-Goat Set reaches 99.99 poise. Poise resets 30s after you stop being hit.',
    tags: ['poise', 'breakpoint', 'knight set', 'bull goat'],
    patch: 'Numbers quoted are the PvE breakpoints on the Fextralife Poise page; PvP breakpoints differ.',
    source: 'https://eldenring.wiki.fextralife.com/Poise',
  },
  {
    id: 'tech:greatshield-1-17',
    name: 'Greatshield guard boost (1.17)',
    category: 'general',
    what: 'Patch 1.17 raised guard boost on a long list of greatshields and cut weight on several.',
    why: 'Greatshield poke got tankier and lighter this patch, making it one of the most forgiving setups.',
    how: 'Pair a Fingerprint Stone Shield with a thrusting sword; add the Greatshield Talisman and poke from behind block.',
    tags: ['greatshield', 'guard boost', 'fingerprint', 'shield', '1.17'],
    patch: 'Patch 1.17 (Aug 27 2026) change — balance-sensitive, revisit after the next patch.',
    source: 'https://eldenring.wiki.fextralife.com/Patch+Notes',
  },
  {
    id: 'tech:parry-1-17',
    name: 'Parry buffs (1.17)',
    category: 'pvp-tech',
    what: 'Patch 1.17 improved Parry, made Storm Wall cost no FP, and improved Thops’s Barrier.',
    why: 'Parry tools are stronger than they have been in a long time, and Storm Wall is now a free defensive option.',
    how: 'Use a small shield or Carian Retaliation for parries; Storm Wall no longer drains FP, so spam it freely.',
    tags: ['parry', 'storm wall', 'thops', 'carian retaliation', '1.17'],
    patch: 'Patch 1.17 (Aug 27 2026) change — balance-sensitive, revisit after the next patch.',
    source: 'https://eldenring.wiki.fextralife.com/Patch+Notes',
  },
  {
    id: 'tech:perfume-1-17',
    name: 'Perfume Bottle buffs (1.17)',
    category: 'item',
    what: 'Patch 1.17 increased attack power on Firespark, Lightning, Chilling, Frenzyflame and Deadly Poison perfume bottles.',
    why: 'Perfumes are fast, cheap ranged damage that now hits harder, and they can be thrown from the hip.',
    how: 'Build around a Perfumer’s Talisman and throw bottles; the Chilling bottle also builds Frostbite.',
    tags: ['perfume', 'perfume bottle', '1.17', 'throwing'],
    patch: 'Patch 1.17 (Aug 27 2026) change — balance-sensitive, revisit after the next patch.',
    source: 'https://eldenring.wiki.fextralife.com/Patch+Notes',
  },
]
