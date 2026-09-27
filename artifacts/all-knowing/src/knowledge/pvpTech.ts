/**
 * Task 116 §3 — PvP technique reference. Structured rows, not prose, so the Kit
 * UI, search and Gideon can all read the same entries.
 *
 * Each entry is how-to, not lore. Values are stated only where a Fextralife page
 * states them (parry tool classes, ash behaviours, the 1.17 changes); everything
 * else is described qualitatively on purpose. Entries with no wiki page for the
 * specific tech are marked author-encoded. Patch 1.17, Aug 27 2026 —
 * the Tarnished Pack regulation line this project is stamped against. See
 * docs/research/op-builds-pvp-tricks-sources.md.
 */

export type PvpTechCategory =
  | 'backstab'
  | 'riposte'
  | 'parry'
  | 'roll-catch'
  | 'delayed-attack'
  | 'invasion'
  | 'gank'
  | 'etiquette'
  | 'dodge'
  | 'stance'
  | 'movement'

export type PvpTech = {
  id: string
  name: string
  category: PvpTechCategory
  /** What the tech is. */
  what: string
  /** How to actually do it in a duel or an invasion. */
  how: string
  /** Router keywords. */
  tags: string[]
  source: string
}

export const pvpTech: PvpTech[] = [
  {
    id: 'pvptech:backstab-setups',
    name: 'Backstab setups',
    category: 'backstab',
    what: 'A backstab needs you behind the target at the moment the attack input lands, not just standing there.',
    how: 'Break the lock-on so you can orbit freely, run through the opponent when they commit to a long animation, and input the attack as you pass their shoulder. Whiffing a light attack near them baits a roll you can chase into the back.',
    tags: ['backstab', 'back stab', 'crit', 'critical', 'positioning'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'pvptech:chain-backstabs',
    name: 'Chain backstabs',
    category: 'backstab',
    what: 'A wake-up can be backstabbed again if you stay glued to the target and do not let them turn.',
    how: 'After a backstab, do not disengage: walk through the body as they stand and re-input the backstab on the wake-up. Works best on players who mash roll on wake-up instead of holding still.',
    tags: ['chain backstab', 'wake-up', 'backstab', 'crit'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'pvptech:riposte-window',
    name: 'Riposte window',
    category: 'riposte',
    what: 'After a successful parry the target is staggered and open to a critical; the riposte damage depends on the weapon you hold.',
    how: 'Swap to your highest-crit weapon before inputting the riposte — a Misericorde dagger on a heavy Strength build out-damages the weapon you actually parried with. Do the swap during the parry animation, then press the attack.',
    tags: ['riposte', 'parry', 'crit', 'misericorde', 'weapon swap'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife Parry.',
  },
  {
    id: 'pvptech:parry-windows',
    name: 'Parry windows by tool class',
    category: 'parry',
    what: 'Not all parry tools have the same active window; small shields and special parry ashes are the most forgiving.',
    how: 'Buckler and small shields have the widest parry window, Carian Retaliation and Golden Parry are special parry ashes with generous windows, a Parrying Dagger sits in between, and medium shields are the tightest — use them only on a hard read. Parry the moment the attack would connect, not when it starts.',
    tags: ['parry', 'buckler', 'carian retaliation', 'golden parry', 'parrying dagger', 'medium shield'],
    source: 'https://eldenring.wiki.fextralife.com/Parry (tool classes); 1.17 Patch Notes (Parry buffed).',
  },
  {
    id: 'pvptech:parry-recovery',
    name: 'Punishing a whiffed parry',
    category: 'parry',
    what: 'A missed parry has a long recovery, which is why parry-spam loses to patience.',
    how: 'Bait a parry with a light attack aimed just outside their range or a jumping attack, then land a full punish on the recovery. Never throw out a predictable running attack into a Buckler.',
    tags: ['parry punish', 'whiff', 'bait', 'parry'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife Parry.',
  },
  {
    id: 'pvptech:roll-catching',
    name: 'Roll-catching',
    category: 'roll-catch',
    what: 'Hitting a target on the recovery of their roll, before they can start the next one.',
    how: 'Delay the swing slightly rather than mashing R1 — the goal is to hit the tail of the roll. Wide, fast weapons catch a roll away from you; thrusting weapons catch a roll to the side. A running R1 or a jump attack on the wake-up roll is the simplest version.',
    tags: ['roll catch', 'roll-catch', 'wake-up', 'punish'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'pvptech:delayed-attacks',
    name: 'Delayed attacks',
    category: 'delayed-attack',
    what: 'Holding a swing a beat longer so it lands on the roll-immunity window rather than before it.',
    how: 'Charge or hold the light attack so its active frames arrive after the opponent expects; a delayed running attack beats the standard panic-roll timing. Practise the timing against a friend, because it is timing, not a stat.',
    tags: ['delay', 'delayed attack', 'timing', 'mixup'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'pvptech:dodge-timing',
    name: 'Dodge timing and direction',
    category: 'dodge',
    what: 'Where you roll matters more than when: into a combo usually beats away from it.',
    how: 'Roll diagonally through sweeps rather than straight back, so you finish beside or behind the attacker and can punish. Save the last third of your stamina — a dodge with an empty bar is a death sentence. Iframes are not infinite: do not roll early into a combo just because you can.',
    tags: ['dodge', 'roll', 'iframe', 'stamina', 'timing'],
    source: 'https://eldenring.wiki.fextralife.com/Combat (dodge behaviour); stamina management from the PvP page.',
  },
  {
    id: 'pvptech:two-handing',
    name: 'Two-handing and the 1.5x Strength',
    category: 'stance',
    what: 'Two-handing grants a 1.5x Strength multiplier, which can meet a weapon requirement you cannot hold one-handed.',
    how: 'Two-hand the weapon to hit the requirement with less Strength investment, then the freed points go to Vigor or Endurance. Two-handing also changes the moveset: some weapons gain hyper armour or a better R2 only when two-handed.',
    tags: ['two-hand', 'two hand', '2h', 'strength', 'requirement'],
    source: 'https://eldenring.wiki.fextralife.com/Combat (two-handing); community-standard use (author-encoded).',
  },
  {
    id: 'pvptech:crouch-poke',
    name: 'Crouch pokes',
    category: 'movement',
    what: 'Crouching changes the attack to a rolling thrust that is fast and hard to read.',
    how: 'Crouch and attack (or roll then attack) to get the low thrust; it comes out quick, hits low, and is much harder to parry than a standing swing. Mix it into your normal R1s so the opponent cannot read the timing.',
    tags: ['crouch', 'crouch poke', 'thrust', 'mixup', 'poke'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'pvptech:invade-items',
    name: 'Invasion items: fingers and tongues',
    category: 'invasion',
    what: 'The Bloody Finger family starts an invasion; the Taunter\'s Tongue changes who gets invaded.',
    how: 'Use Festering Bloody Finger (or the Duelist\'s Furled Finger) to invade. As a host, the Taunter\'s Tongue shortens the invasion cooldown and opens a second invader slot, which caps you at one co-op summon — useful when you want the fight. The Blue Cipher Ring summons a Hunter of the blue to defend the host.',
    tags: ['taunter\'s tongue', 'festering bloody finger', 'blue cipher ring', 'invade', 'host', 'summon'],
    source: 'https://eldenring.wiki.fextralife.com/PvP (invasion items and Taunter\'s Tongue).',
  },
  {
    id: 'pvptech:invasion-play',
    name: 'Invasion play: use the level',
    category: 'invasion',
    what: 'An invader has the PvE mobs and cannot be followed into boss fog, so the level is the build.',
    how: 'Retreat into enemy packs and force the host to fight both; never brawl the whole squad in the open. Pick off the summon or the weakest phantom before the host, and disengage to reset whenever the numbers turn bad.',
    tags: ['invasion', 'invade', 'pve', 'mobs', 'retreat', 'gank'],
    source: 'https://eldenring.wiki.fextralife.com/PvP (invasion asymmetry).',
  },
  {
    id: 'pvptech:gank-splitting',
    name: 'Splitting a gank',
    category: 'gank',
    what: 'A 3v1 is only lost if you fight it as a 3v1 at once.',
    how: 'Use a doorway, a cliff or a mob pack to break line of sight, then burst whoever follows first. Mobility ashes (Bloodhound\'s Step) create the separation; the objective is a pick, not a clean sweep.',
    tags: ['gank', '3v1', 'split', 'pick', 'mobility'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'pvptech:duel-etiquette',
    name: 'Duel etiquette',
    category: 'etiquette',
    what: 'Colosseum and red-sign duels have unwritten rules; breaking them gets you no matches.',
    how: 'Bow or wave before the fight, let them finish their opening buff, and do not heal in a duel (a red sign on a host who did not agree to flasks). In the Colosseum, use the arena\'s rules. Do not spam "surrender" or stall the timer.',
    tags: ['duel', 'etiquette', 'bow', 'colosseum', 'honor'],
    source: 'https://eldenring.wiki.fextralife.com/PvP (duel conventions).',
  },
  {
    id: 'pvptech:status-application',
    name: 'Applying status in PvP',
    category: 'stance',
    what: 'Status buildup is scaled down against other players, so procs are pressure, not the win condition.',
    how: 'Do not build around a single proc killing a full-Vigor opponent; treat bleed, frost and rot as damage-over-time pressure that punishes passivity. Carry boluses for whatever status your opponent applies, and trade only when a proc is already ticking.',
    tags: ['status', 'bleed', 'frost', 'rot', 'buildup', 'boluses'],
    source: 'https://eldenring.wiki.fextralife.com/PvP (PvP status scaling, since 1.07).',
  },
  {
    id: 'pvptech:whiff-punish',
    name: 'Whiff-punishing',
    category: 'roll-catch',
    what: 'Every attack has a recovery you can attack into; the duel is about baiting those windows.',
    how: 'Stand just outside their range, let them attack air, then step in and hit the recovery. This is the core neutral game and it beats raw damage; it is also why spamming Corpse Piler or a colossal R1 loses to patience.',
    tags: ['whiff', 'punish', 'neutral', 'spacing', 'recovery'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'pvptech:buff-order',
    name: 'Buff order before a fight',
    category: 'invasion',
    what: 'Aura buffs, body buffs and weapon buffs stack, but they must be applied in the right order to not overwrite each other.',
    how: 'Apply the aura (Golden Vow), then the body buff (Flame, Grant Me Strength), then the weapon buff or grease last. Do not re-buff mid-fight in the open; pick a safe window or an invade where the host has to come to you.',
    tags: ['buff', 'buff order', 'golden vow', 'flame grant', 'stacking'],
    source: 'https://eldenring.wiki.fextralife.com/Buffs_and_Debuffs (buff categories and stacking).',
  },
  {
    id: 'pvptech:block-cancel',
    name: 'Block-cancelling attacks',
    category: 'movement',
    what: 'Tapping block after an attack shortens its recovery, letting you act sooner.',
    how: 'Input a light block tap immediately after a swing to cancel part of the recovery, then dodge or attack again. It is a timing feel, best learned on a fast weapon; do not overuse it against a shield-break build.',
    tags: ['block cancel', 'cancel', 'recovery', 'tech'],
    source: 'Community-standard technique (author-encoded); cf. Fextralife PvP.',
  },
  {
    id: 'pvptech:jump-attacks-pvp',
    name: 'Jump attacks as roll-catches',
    category: 'roll-catch',
    what: 'Jumping attacks land low and late, which makes them natural roll-catches and parry-proof openers.',
    how: 'Jump in and heavy attack on the wake-up roll; the attack cannot be parried and the landing is safe to roll out of. Claw Talisman boosts the damage if you build around it.',
    tags: ['jump attack', 'roll catch', 'unparryable', 'claw talisman'],
    source: 'https://eldenring.wiki.fextralife.com/Combat (jump attacks); Claw Talisman from its page.',
  },
]
