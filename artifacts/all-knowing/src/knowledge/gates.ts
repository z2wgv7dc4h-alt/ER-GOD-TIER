import type { Character } from '../types'
import { canonicalFactId } from '../lib/aliases'

/**
 * World-state gates (Task 52): tripwires that close content if the player simply
 * keeps walking. A Gate is deliberately **not** a quest step — it models a
 * transition (the Forge, Maliketh, the Sealing Tree, an ending commit, a fork at
 * Elphael) and what that transition forecloses.
 *
 * Authoring rules, same as the rest of the knowledge tree:
 *  - `locks[]` names real, verifiable consequences only. If a thing is not
 *    actually locked by the transition, it does not go in the list. A short,
 *    correct list beats a long, plausible one — wrong lockouts are worse than
 *    none.
 *  - Facts use existing catalog / storyline / missable ids wherever they exist.
 *    `item:bolt-of-gransax`, `item:sanctified-whetblade`, `item:blessed-dew-talisman`,
 *    `item:rotten-winged-sword-insignia` and `item:millicent-prosthesis` are real
 *    items that were missing from `catalog.ts`; they were added there for this
 *    file (same source: `public/sourced/guide/missables.json`).
 *  - `stillOk[]` is the honest counterweight: things the transition does *not*
 *    close, so Gideon never claims a false lockout.
 */

export type GateLock = {
  factId: string
  name: string
  why: string
}

export type Gate = {
  id: string
  name: string
  aliases: string[]
  /** Fact ids that fire the gate — the transition has happened. */
  triggerFacts: string[]
  /** Fact ids that mean "one beat away" from the transition. */
  approachingWhen: string[]
  locks: GateLock[]
  stillOk?: { factId: string; name: string }[]
}

export const gates: Gate[] = [
  {
    id: 'gate:forge',
    name: 'Forge of the Giants / burning the Erdtree',
    aliases: ['forge', 'forge of the giants', 'burn the erdtree', 'burning the erdtree', 'fire giant', 'erdtree burn', 'leyndell', 'royal capital'],
    // The irreversible act is the burning itself, which the game records under
    // its own flag. `quest:erdtree-burned` is that authored event — deliberately
    // NOT implied by the Fire Giant kill, because killing him does not burn the
    // tree. The kill and reaching the Forge are the one-beat-away signals.
    triggerFacts: ['quest:erdtree-burned'],
    approachingWhen: ['boss:fire-giant', 'grace:forge-giants'],
    locks: [
      { factId: 'item:bolt-of-gransax', name: 'Bolt of Gransax', why: 'Royal Capital spear monument only; gone in the Ashen Capital.' },
      { factId: 'item:sanctified-whetblade', name: 'Sanctified Whetblade', why: 'Royal Capital only; the Holy/Lightning affinities leave with the city.' },
      { factId: 'item:golden-order-principia', name: 'Golden Order Principia', why: 'Fortified Manor prayerbook; Royal Capital only.' },
      { factId: 'item:blessed-dew-talisman', name: 'Blessed Dew Talisman', why: 'Divine Bridge chest; Royal Capital only.' },
      { factId: 'item:sword-of-milos', name: 'Sword of Milos', why: "Dung Eater's moat invasion does not occur in the Ashen Capital." },
      { factId: 'item:weathered-dagger', name: 'Weathered Dagger', why: "Royal Capital pickup; needed to advance Fia's line." },
      { factId: 'quest:dungeater:invasion', name: 'Dung Eater — Leyndell moat invasion', why: 'The invasion ends with the living capital.' },
    ],
    stillOk: [
      { factId: 'item:fingerslayer', name: 'Ranni / Fingerslayer Blade (still doable)' },
      { factId: 'quest:millicent:needle', name: 'Millicent (still doable)' },
      { factId: 'quest:rya:necklace', name: 'Rya / Volcano Manor (still doable)' },
      { factId: 'item:pureblood-medal', name: 'Varré / Mohgwyn (still doable)' },
    ],
  },
  {
    id: 'gate:maliketh',
    name: 'Maliketh / the Ashen Capital',
    aliases: ['maliketh', 'ashen capital', 'farum azula', 'black blade', 'destined death'],
    triggerFacts: ['boss:maliketh'],
    approachingWhen: ['boss:godskin-duo', 'grace:farum-balcony', 'region:farum'],
    locks: [
      { factId: 'item:bolt-of-gransax', name: 'Bolt of Gransax', why: 'The living Royal Capital is gone; the spear monument cannot be looted in the ash.' },
      { factId: 'item:sanctified-whetblade', name: 'Sanctified Whetblade', why: 'Living Leyndell only; Ashen Capital has no manor or rooftops.' },
      { factId: 'item:golden-order-principia', name: 'Golden Order Principia', why: 'Fortified Manor is gone once the capital turns to ash.' },
    ],
  },
  {
    id: 'gate:sealing-tree',
    name: 'Sealing Tree / Shadow Keep',
    aliases: ['sealing tree', 'shadow keep', 'leda', 'enir-ilim', 'messmer', 'specimen storehouse'],
    triggerFacts: ['quest:leda:invitations-locked', 'grace:enir'],
    approachingWhen: ['quest:leda:met', 'quest:leda:invitations', 'grace:shadow-keep', 'boss:messmer'],
    locks: [
      { factId: 'quest:freyja:concluded', name: 'Redmane Freyja — Enir-Ilim alliance', why: "The Sealing Tree is the last window to keep Freyja's alliance." },
      { factId: 'quest:ansbach:concluded', name: 'Sir Ansbach — Enir-Ilim alliance', why: 'Crossing the Sealing Tree freezes the Leda alliance choices.' },
      { factId: 'quest:thiollier:concluded', name: "Thiollier — Enir-Ilim alliance", why: "Thiollier's side must be chosen before the invitations lock." },
      { factId: 'quest:leda:invitations', name: 'Leda — invitation decisions', why: 'The Sealing Tree closes the invitation window.' },
    ],
  },
  {
    id: 'gate:ranni-ending',
    name: 'Age of Stars committed',
    aliases: ['ranni ending', 'age of stars', 'dark moon ring', 'ranni'],
    // Placing the Dark Moon Ring is the last irreversible Ranni beat; from there
    // Seluvis is already gone and the ending is the one you can summon.
    triggerFacts: ['quest:ranni:ring', 'item:dark-moon-ring'],
    approachingWhen: ['quest:ranni:statue', 'quest:ranni:nokron'],
    locks: [
      { factId: 'quest:seluvis:concluded', name: 'Preceptor Seluvis — potion and puppet stock', why: 'Once Ranni has the Fingerslayer Blade, Seluvis is found dead and his sorceries and puppets are gone for the run.' },
      { factId: 'loot:therolina', name: 'Finger Maiden Therolina Puppet', why: "Seluvis's puppet cellar closes when his line ends." },
    ],
    stillOk: [
      { factId: 'item:mending-rune-order', name: 'The other Mending Runes are unaffected until the final choice' },
    ],
  },
  {
    id: 'gate:frenzy',
    name: 'Lord of Frenzied Flame committed',
    aliases: ['frenzy', 'frenzied flame', 'three fingers', 'chaos ending', 'shabriri', 'proscription'],
    triggerFacts: ['quest:frenzy:taken'],
    approachingWhen: ['grace:east-capital', 'boss:mohg-omen', 'quest:hyetta:maiden', 'quest:hyetta:grapes'],
    locks: [
      { factId: 'quest:ranni:ring', name: 'Age of Stars', why: 'Taking the Frenzied Flame locks every other ending until the flame is purged.' },
      { factId: 'item:mending-rune-death-prince', name: 'Age of the Duskborn', why: 'The un-mended endings are closed while the flame is in you.' },
      { factId: 'item:mending-rune-fell-curse', name: 'Mending Rune of the Fell Curse', why: 'Every Mending Rune path is locked until the flame is purged.' },
      { factId: 'item:mending-rune-order', name: 'Age of Order', why: 'The un-mended endings are closed while the flame is in you.' },
    ],
    stillOk: [
      { factId: 'item:miquella-needle', name: "Miquella's Needle (use in Placidusax's arena after Malenia to purge the flame)" },
    ],
  },
  {
    id: 'gate:dung-eater-curse',
    name: 'Seedbed Curse / Dung Eater fork',
    aliases: ['dung eater', 'seedbed curse', 'fell curse', 'defiler', 'mending rune of the fell curse'],
    // The irreversible choice is Seluvis's potion: it turns him into a puppet and
    // forfeits the Mending Rune. Obtaining the rune itself does not close anything
    // else, so it is not listed as a trigger.
    triggerFacts: ['quest:dungeater:potioned'],
    approachingWhen: ['quest:dungeater:freed', 'quest:dungeater:invasion'],
    locks: [
      { factId: 'item:mending-rune-fell-curse', name: 'Mending Rune of the Fell Curse', why: "Making Dung Eater a puppet with Seluvis's potion forfeits his Mending Rune ending." },
    ],
  },
  {
    id: 'gate:seluvis-potion',
    name: "Seluvis's potion used on Nepheli",
    aliases: ['seluvis potion', 'potion of sleep', 'nepheli potion', 'seluvis'],
    triggerFacts: ['quest:nepheli:potioned'],
    approachingWhen: ['quest:seluvis:met', 'quest:seluvis:potion', 'quest:nepheli:refused-potion'],
    locks: [
      { factId: 'quest:nepheli:ruler', name: 'Nepheli Loux crowned at Stormveil', why: 'The potion ends her rule of Limgrave.' },
      { factId: 'quest:nepheli:stormhawk', name: 'Nepheli — Stormhawk King', why: 'Her Stormhawk step never happens once she is a puppet.' },
      { factId: 'quest:kenneth:ruler', name: 'Kenneth Haight — Limgrave steward', why: 'Kenneth needs Nepheli crowned; her line is gone.' },
    ],
  },
  {
    id: 'gate:volcano-host',
    name: 'Rykard / Volcano Manor too early',
    aliases: ['volcano manor', 'rykard', 'tanith', 'rya', 'serpent'],
    triggerFacts: ['boss:rykard'],
    approachingWhen: ['quest:rya:manor', 'quest:tanith:contracts', 'quest:rya:necklace'],
    locks: [
      { factId: 'quest:rya:amnion', name: 'Rya — Serpent’s Amnion', why: 'Killing Rykard before giving Rya the amnion strands her in the manor.' },
      { factId: 'quest:rya:concluded', name: 'Rya — spare or tell her the truth', why: "Rykard's death closes her window." },
      { factId: 'quest:tanith:targets', name: 'Tanith — the named contracts', why: 'The contract window ends when Rykard dies.' },
      { factId: 'quest:tanith:concluded', name: 'Tanith — devour the god', why: "Tanith's final beat needs the manor alive." },
    ],
  },
  {
    id: 'gate:millicent-choice',
    name: "Millicent's choice at Elphael",
    aliases: ['millicent choice', 'gold sign', 'red sign', 'elphael choice'],
    triggerFacts: ['quest:millicent:aid', 'quest:millicent:betrayed', 'quest:millicent-killed'],
    approachingWhen: ['quest:millicent:cured', 'grace:drainage'],
    locks: [
      { factId: 'item:miquella-needle', name: "Miquella's Needle", why: 'Only the gold (aid) sign leaves the needle; betraying her forfeits the Frenzy purge.' },
      { factId: 'item:rotten-winged-sword-insignia', name: 'Rotten Winged Sword Insignia', why: 'Drops on the aid path; the red sign locks it out.' },
      { factId: 'item:millicent-prosthesis', name: "Millicent's Prosthesis", why: 'Drops on the betray path; aiding her locks it out.' },
    ],
  },
  {
    id: 'gate:varre-ignore',
    name: 'Varré / Rose Church ignored or killed',
    aliases: ['varre', 'rose church', 'mohgwyn medal', 'pureblood medal', 'white mask'],
    triggerFacts: ['quest:varre:killed'],
    approachingWhen: ['quest:varre:met', 'quest:varre:cloth', 'grace:lake-shore'],
    locks: [
      { factId: 'item:pureblood-medal', name: "Pureblood Knight's Medal", why: 'Killing Varré or abandoning Rose Church strands the medal and the fast road to Mohgwyn.' },
      { factId: 'quest:varre:cloth', name: 'Varré — soak the cloth in maiden blood', why: 'The cloth cannot be soaked once he is gone.' },
      { factId: 'item:lord-of-blood-favor', name: "Lord of Blood's Favor", why: "The favour is a step on Varré's line." },
    ],
  },
]

function knownSet(c: Character): Set<string> {
  return new Set(
    [...c.defeatedBosses, ...c.discoveredGraces, ...c.collectedItems, ...c.completedQuestSteps].map((id) =>
      canonicalFactId(id),
    ),
  )
}

export type GateState = 'fired' | 'approaching' | 'open'

/** Where this character stands relative to a gate. */
export function gateState(character: Character, gate: Gate): GateState {
  const known = knownSet(character)
  if (gate.triggerFacts.some((t) => known.has(canonicalFactId(t)))) return 'fired'
  if (gate.approachingWhen.some((t) => known.has(canonicalFactId(t)))) return 'approaching'
  return 'open'
}

export function triggeredGates(character: Character): Gate[] {
  return gates.filter((g) => gateState(character, g) === 'fired')
}

export function approachingGates(character: Character): Gate[] {
  return gates.filter((g) => gateState(character, g) === 'approaching')
}

type StepLike = { factId?: string; factIds?: string[]; grants?: string[] }

function stepIds(step: StepLike): string[] {
  return [step.factId, ...(step.factIds ?? []), ...(step.grants ?? [])]
    .filter((x): x is string => Boolean(x))
    .map((x) => canonicalFactId(x))
}

/**
 * The gate the next authored beat walks into: its own completion/grants fire a
 * trigger (`fires`), or they are one beat short of one (`approaching`). Used to
 * slip the lock list ahead of the walk-forward instruction.
 */
export function gateForStep(step: StepLike): { gate: Gate; kind: 'fires' | 'approaching' } | undefined {
  const ids = stepIds(step)
  for (const gate of gates) {
    if (gate.triggerFacts.some((t) => ids.includes(canonicalFactId(t)))) return { gate, kind: 'fires' }
  }
  for (const gate of gates) {
    if (gate.approachingWhen.some((t) => ids.includes(canonicalFactId(t)))) return { gate, kind: 'approaching' }
  }
  return undefined
}

/** One sentence warning for a plan step, or undefined when the step is clear. */
export function gateWarningForStep(step: StepLike): string | undefined {
  const hit = gateForStep(step)
  if (!hit) return undefined
  const names = hit.gate.locks.map((l) => l.name)
  if (!names.length) return undefined
  const lead = hit.kind === 'fires' ? 'This beat is a point of no return' : 'One beat later'
  return `${lead} (${hit.gate.name}) — continuing locks ${names.join(', ')}.`
}

/** Match a gate by alias / id fragment in free text. First match wins. */
export function findGate(text: string): Gate | undefined {
  const n = text.toLowerCase()
  return gates.find((g) => g.aliases.some((a) => n.includes(a)) || n.includes(g.id.replace(/^gate:/, '')))
}
