import type { Archetype } from './archetype'

/**
 * Task 137 §4 — authored archetype → gear tags, split out of `advisor.ts` so
 * eager surfaces (the area hub, gear verdicts) can read the table without
 * importing the attack-rating calculator. Names resolve through `loot.ts` / the
 * catalog; the table exists because "which talisman suits which build" is domain
 * knowledge, not something the regulation dump expresses.
 */
export type GearTag = { name: string; kind: 'talisman' | 'armor'; why: string }

export const GEAR_TAGS: Record<Archetype, GearTag[]> = {
  strength: [
    { name: 'Shard of Alexander', kind: 'talisman', why: 'Boosts the big skills and ashes a strength build actually uses.' },
    { name: "Great-Jar's Arsenal", kind: 'talisman', why: 'More equip load so heavy armour does not force a fat roll.' },
    { name: 'Claw Talisman', kind: 'talisman', why: 'Jump attacks are the colossal opener.' },
    { name: 'Axe Talisman', kind: 'talisman', why: 'Charged attacks hit harder, which is how you trade.' },
    { name: "Bull-Goat's Talisman", kind: 'talisman', why: 'Poise so slow swings finish through a hit.' },
  ],
  dexterity: [
    { name: "Millicent's Prosthesis", kind: 'talisman', why: 'Dex builds land fast combos, so the successive-hit bonus is always up.' },
    { name: 'Rotten Winged Sword Insignia', kind: 'talisman', why: 'Same ramp, bigger numbers, for a pure dex chain.' },
    { name: 'Ritual Sword Talisman', kind: 'talisman', why: 'Rewards the clean, hit-and-run spacing dex wants.' },
    { name: 'Spear Talisman', kind: 'talisman', why: 'Punishes the counter-hit window a fast weapon creates.' },
  ],
  quality: [
    { name: 'Shard of Alexander', kind: 'talisman', why: 'Most quality kits live on their weapon skill.' },
    { name: 'Axe Talisman', kind: 'talisman', why: 'A quality weapon usually wants the charged attack.' },
    { name: 'Claw Talisman', kind: 'talisman', why: 'Jump attacks scale off both stats at once.' },
  ],
  intelligence: [
    { name: 'Graven-Mass Talisman', kind: 'talisman', why: 'Raises sorcery damage, the whole point of an Int build.' },
    { name: 'Godfrey Icon', kind: 'talisman', why: 'Charged spells and skills — Comet Azur, Dark Moon — hit harder.' },
    { name: 'Magic Scorpion Charm', kind: 'talisman', why: 'More magic damage at the cost of physical defence.' },
    { name: 'Ritual Sword Talisman', kind: 'talisman', why: 'Safe at range, so the full-health bonus stays on.' },
  ],
  faith: [
    { name: "Flock's Canvas Talisman", kind: 'talisman', why: 'Raises incantation potency across the board.' },
    { name: 'Fire Scorpion Charm', kind: 'talisman', why: 'For the fire incantations faith actually casts.' },
    { name: 'Radagon Icon', kind: 'talisman', why: 'Faster casts; faith has the slowest animations.' },
    { name: 'Ritual Sword Talisman', kind: 'talisman', why: 'Casters stay at range, so the bonus rarely drops.' },
  ],
  arcane: [
    { name: "Lord of Blood's Exultation", kind: 'talisman', why: 'Arcane bleed pressure keeps the 20% damage window open.' },
    { name: 'White Mask', kind: 'armor', why: 'Extra attack while bleed is proccing on anything nearby.' },
    { name: "Millicent's Prosthesis", kind: 'talisman', why: 'Successive hits ramp the arcane status chains.' },
  ],
  bleed: [
    { name: "Lord of Blood's Exultation", kind: 'talisman', why: 'Turns each Hemorrhage proc into a damage window.' },
    { name: 'Rotten Winged Sword Insignia', kind: 'talisman', why: 'Multi-hit bleed chains ramp attack power.' },
    { name: "Millicent's Prosthesis", kind: 'talisman', why: 'Dex/Arc successive hits stack with the insignia.' },
    { name: 'White Mask', kind: 'armor', why: 'More attack while a bleed proc is live.' },
  ],
  hybrid: [
    { name: 'Radagon Icon', kind: 'talisman', why: 'A hybrid casts both sides; faster is always better.' },
    { name: 'Godfrey Icon', kind: 'talisman', why: 'Charged spells from either stat get the boost.' },
    { name: 'Magic Scorpion Charm', kind: 'talisman', why: 'For the Int half of the spread.' },
    { name: "Old Lord's Talisman", kind: 'talisman', why: 'Extends the buffs a hybrid shell leans on.' },
  ],
}
