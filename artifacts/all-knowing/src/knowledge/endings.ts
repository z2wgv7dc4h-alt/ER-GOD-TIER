import { canonicalFactId } from '../lib/aliases'
import type { Character, ModuleId } from '../types'

export type PlanStep = {
  id: string
  do: string
  detail: string
  factId?: string
  /**
   * Additional acceptable completion markers for this beat. Some real game
   * beats are recorded under more than one id — a quest-state flag and the item
   * it hands over, or two equivalent dump families — and none of them is truly
   * canonical. A step counts as done when the character knows `factId` **or**
   * any id here. Entries are canonicalised through `canonicalFactId`, so engine
   * / dump dialects (`bossflag:…`, `grace:…`) resolve against authored slugs.
   */
  factIds?: string[]
  module?: ModuleId
  minLevel?: number
  obtain?: string
  /** Human-readable warning. Kept for display; the machine edge is `lockouts`. */
  lockout?: string
  /** Fact ids that must already be true before this beat is reachable. */
  requires: string[]
  /** Fact ids this beat produces when it is ticked. */
  grants: string[]
  /**
   * Mutually-exclusive fact/step ids. If any becomes known, this beat is
   * foreclosed. Authored as incoming guards so `planRoute` can answer
   * "what is still available" from the character's facts, and a completed
   * step also forecloses any step id/fact id it lists here.
   */
  lockouts: string[]
}

export type EndingRoute = {
  id: string
  name: string
  aliases: string[]
  lockedIf: (c: Character) => string | null
  steps: PlanStep[]
}

function has(c: Character, id: string) {
  return (
    c.defeatedBosses.includes(id) ||
    c.discoveredGraces.includes(id) ||
    c.collectedItems.includes(id) ||
    c.completedQuestSteps.includes(id)
  )
}

export const endings: EndingRoute[] = [
  {
    id: 'stars',
    name: 'Age of Stars',
    aliases: ['age of stars', 'ranni ending', 'stars ending', 'moon ending', 'witch ending'],
    lockedIf: (c) => {
      if (has(c, 'quest:seluvis-blade')) return 'Seluvis already has the Fingerslayer Blade. Ranni will not speak to you.'
      if (has(c, 'boss:radagon') && !has(c, 'quest:ranni:ring')) return 'The Elden Ring is already mended. Too late for the Age of Stars on this NG.'
      return null
    },
    steps: [
      { id: 's1', do: 'Enter Ranni’s service at Ranni’s Rise', detail: 'Three Sisters, after Caria Manor. Speak to Blaidd, Iji, and Seluvis in the towers.', factId: 'quest:ranni:service', module: 'quests', minLevel: 40, requires: [], grants: ['quest:ranni:service'], lockouts: [] },
      { id: 's2', do: 'Open Nokron — defeat Starscourge Radahn', detail: 'Redmane festival. Talk to Jerren or progress Ranni far enough that the festival is live.', factId: 'boss:radahn', module: 'map', minLevel: 70, obtain: 'Radahn’s Great Rune', requires: ['quest:ranni:service'], grants: ['quest:ranni:festival', 'boss:radahn'], lockouts: [] },
      { id: 's3', do: 'Retrieve the Fingerslayer Blade', detail: 'Night’s Sacred Ground in Nokron. Give it to Ranni, never to Seluvis.', factId: 'item:fingerslayer', factIds: ['quest:ranni:nokron'], module: 'map', requires: ['quest:ranni:festival'], grants: ['item:fingerslayer'], lockouts: ['quest:seluvis-blade'], lockout: 'Seluvis + this blade ends her line.' },
      { id: 's4', do: 'Invert the Carian Study Hall', detail: 'Use the Carian Inverted Statue. Divine Tower of Liurnia for the cursemark.', factId: 'quest:ranni:statue', module: 'quests', requires: ['item:fingerslayer'], grants: ['quest:ranni:statue'], lockouts: ['quest:seluvis-blade'] },
      { id: 's5', do: 'Kill Astel and place the Dark Moon Ring', detail: 'Lake of Rot → Grand Cloister coffin → Moonlight Altar → Cathedral of Manus Celes.', factId: 'quest:ranni:ring', factIds: ['item:dark-moon-ring'], module: 'map', minLevel: 90, obtain: 'Dark Moon Greatsword', requires: ['quest:ranni:statue'], grants: ['quest:ranni:ring', 'item:dark-moon-ring'], lockouts: ['quest:seluvis-blade'] },
      { id: 's6', do: 'Finish the Elden Lord path, then summon Ranni', detail: 'Forge → Farum → Ashen Capital → Elden Beast. Use Ranni’s summon sign after the fight.', factId: 'boss:radagon', module: 'map', minLevel: 110, requires: ['quest:ranni:ring'], grants: ['boss:radagon'], lockouts: ['quest:seluvis-blade'] },
    ],
  },
  {
    id: 'frenzy',
    name: 'Lord of Frenzied Flame',
    aliases: ['frenzied flame', 'three fingers', 'chaos ending', 'frenzy ending', 'shabriri'],
    lockedIf: (c) => {
      if (has(c, 'quest:mending-used')) return 'You already used a Mending Rune. Frenzy needs the un-mended ending.'
      return null
    },
    steps: [
      { id: 'f1', do: 'Meet Hyetta or Shabriri', detail: 'Hyetta starts at the Lake-Facing Cliffs grape line. Shabriri appears later on the mountain.', factId: 'grace:lake-shore', factIds: ['quest:hyetta:met', 'quest:yura:shabriri'], module: 'map', minLevel: 30, requires: [], grants: ['grace:lake-shore', 'quest:hyetta:met'], lockouts: [] },
      { id: 'f2', do: 'Reach the Forsaken Depths under Leyndell', detail: 'Subterranean Shunning-Grounds, Mohg the Omen, then the floor drop to the Three Fingers.', factId: 'grace:east-capital', module: 'map', minLevel: 80, requires: ['grace:lake-shore'], grants: ['grace:east-capital'], lockouts: [] },
      { id: 'f3', do: 'Take the Frenzied Flame', detail: 'Strip armour, open the door. This locks every other ending unless you complete Millicent + needle at Farum.', factId: 'boss:morgott', module: 'quests', requires: ['grace:east-capital'], grants: ['boss:morgott', 'quest:frenzy:taken'], lockouts: [], lockout: 'Other endings require the Unalloyed Gold Needle in Malenia’s bloom, then Farum.' },
      { id: 'f4', do: 'Beat the Elden Beast and do not use a Mending Rune', detail: 'The cutscene changes if the flame is still in you.', factId: 'boss:radagon', module: 'map', minLevel: 110, requires: ['quest:frenzy:taken'], grants: ['boss:radagon'], lockouts: [] },
    ],
  },
  {
    id: 'duskborn',
    name: 'Age of the Duskborn',
    aliases: ['fia ending', 'duskborn', 'godwyn ending', 'deathbed'],
    lockedIf: () => null,
    steps: [
      { id: 'd1', do: 'Talk to Fia at the Roundtable until she asks for a champion', detail: 'Hold her, then follow D’s brother and the Cursemark path.', factId: 'quest:fia:met', module: 'quests', minLevel: 40, requires: [], grants: ['quest:fia:met'], lockouts: [] },
      { id: 'd2', do: 'Get the Cursemark of Death', detail: 'Same inverted Study Hall as Ranni. These lines share that tower.', factId: 'quest:ranni:statue', factIds: ['item:cursemark-of-death'], module: 'quests', minLevel: 70, requires: ['quest:fia:met'], grants: ['quest:ranni:statue'], lockouts: ['quest:fia:killed'] },
      { id: 'd3', do: 'Give Fia the cursemark in Deeproot Depths', detail: 'Across the coffin after Godwyn’s prince. Defend her from Lionel, pick the Mending Rune of the Death-Prince.', factId: 'grace:deeproot', module: 'map', minLevel: 90, requires: ['quest:ranni:statue'], grants: ['grace:deeproot', 'quest:fia:cursemark', 'item:mending-rune-death-prince'], lockouts: ['quest:fia:killed'] },
      { id: 'd4', do: 'Use that rune after the Elden Beast', detail: 'Do not take the Frenzied Flame without a way to purge it.', factId: 'boss:radagon', module: 'map', minLevel: 110, requires: ['quest:fia:cursemark'], grants: ['boss:radagon'], lockouts: [] },
    ],
  },
  {
    id: 'order',
    name: 'Age of Order',
    aliases: ['goldmask', 'perfect order', 'order ending', 'corhyn'],
    lockedIf: () => null,
    steps: [
      { id: 'o1', do: 'Find Goldmask on the Altus road', detail: 'Bring Corhyn from the Roundtable. Forest-Spanning Greatbridge area.', factId: 'grace:ergtree-grazing', module: 'map', minLevel: 60, requires: [], grants: ['grace:ergtree-grazing', 'quest:corhyn:goldmask'], lockouts: [] },
      { id: 'o2', do: 'Learn the law of regression', detail: 'Goldmask in Leyndell. Spell from the coliseum debate floor. See Radagon in the statue.', factId: 'grace:east-capital', module: 'map', minLevel: 80, requires: ['quest:corhyn:goldmask'], grants: ['grace:east-capital', 'quest:goldmask:regression'], lockouts: [] },
      { id: 'o3', do: 'Take the Mending Rune of Perfect Order', detail: 'Goldmask’s corpse on the snowfield bridge after the Forge.', factId: 'grace:forge-giants', module: 'map', minLevel: 100, requires: ['quest:goldmask:regression', 'boss:fire-giant'], grants: ['grace:forge-giants', 'item:mending-rune-order'], lockouts: [] },
      { id: 'o4', do: 'Use it after the Elden Beast', detail: 'Frenzied Flame still overrides this.', factId: 'boss:radagon', module: 'map', minLevel: 110, requires: ['item:mending-rune-order'], grants: ['boss:radagon'], lockouts: [] },
    ],
  },
  {
    id: 'lord',
    name: 'Elden Lord (default)',
    aliases: ['elden lord', 'default ending', 'marika ending', 'normal ending'],
    lockedIf: () => null,
    steps: [
      { id: 'l1', do: 'Two Great Runes and the capital', detail: 'Godrick plus one other is enough to open Leyndell.', factId: 'boss:godrick', module: 'map', minLevel: 50, requires: [], grants: ['boss:godrick'], lockouts: [] },
      { id: 'l2', do: 'Morgott, then the Forge of the Giants', detail: 'Melina must still be with you.', factId: 'boss:morgott', module: 'map', minLevel: 90, requires: ['boss:godrick'], grants: ['boss:morgott'], lockouts: [] },
      { id: 'l3', do: 'Farum Azula and the Ashen Capital', detail: 'Maliketh unbinds destine death.', factId: 'boss:maliketh', module: 'map', minLevel: 110, requires: ['boss:morgott'], grants: ['boss:maliketh'], lockouts: [] },
      { id: 'l4', do: 'Godfrey, then Radagon / Elden Beast', detail: 'Choose a Mending Rune only if you want a variant.', factId: 'boss:radagon', module: 'map', minLevel: 120, requires: ['boss:maliketh'], grants: ['boss:radagon'], lockouts: [] },
    ],
  },
]

export function findEnding(text: string) {
  const n = text.toLowerCase()
  return endings.find((e) => e.aliases.some((a) => n.includes(a)) || n.includes(e.id))
}

export function knownSet(c: Character) {
  return new Set(
    [...c.defeatedBosses, ...c.discoveredGraces, ...c.collectedItems, ...c.completedQuestSteps].map((id) =>
      canonicalFactId(id),
    ),
  )
}

/**
 * Every completion marker a step accepts, canonicalised and de-duplicated, with
 * the primary `factId` first. Empty when the step carries no completion marker.
 */
export function completionIds(step: PlanStep): string[] {
  const raw = step.factId ? [step.factId, ...(step.factIds ?? [])] : [...(step.factIds ?? [])]
  const out: string[] = []
  for (const id of raw) {
    const canonical = canonicalFactId(id)
    if (!out.includes(canonical)) out.push(canonical)
  }
  return out
}

/** True when the character already satisfies any accepted marker for this step. */
export function isStepDone(character: Character, step: PlanStep): boolean {
  const have = knownSet(character)
  return completionIds(step).some((id) => have.has(id))
}

/**
 * The marker "I'm done" should apply for this step: the primary `factId` when
 * the character knows none of the accepted markers. Undefined when the beat is
 * already satisfied by any marker (so "I'm done" should assert nothing) or the
 * step carries no completion marker at all.
 */
export function nextCompletionId(character: Character, step: PlanStep): string | undefined {
  const have = knownSet(character)
  const ids = completionIds(step)
  if (ids.some((id) => have.has(id))) return undefined
  return ids[0]
}

export function planRoute(character: Character, route: EndingRoute) {
  const locked = route.lockedIf(character)
  const have = knownSet(character)
  const done: PlanStep[] = []
  const todo: PlanStep[] = []
  for (const step of route.steps) {
    const finished = completionIds(step).some((id) => have.has(id))
    if (finished) done.push(step)
    else todo.push(step)
  }

  // A completed beat produces its grants and forecloses anything it lists.
  const known = new Set(have)
  const foreclosedByDone = new Set<string>()
  for (const step of done) {
    for (const g of step.grants) known.add(g)
    for (const l of step.lockouts) foreclosedByDone.add(l)
  }

  const foreclosed: PlanStep[] = []
  const blocked: PlanStep[] = []
  const available: PlanStep[] = []
  for (const step of todo) {
    const isForeclosed =
      step.lockouts.some((l) => known.has(l)) ||
      foreclosedByDone.has(step.id) ||
      completionIds(step).some((id) => foreclosedByDone.has(id))
    if (isForeclosed) {
      foreclosed.push(step)
      continue
    }
    const gated = step.requires.some((r) => !known.has(r))
    if (gated) {
      blocked.push(step)
      continue
    }
    available.push(step)
  }

  const current = available[0]
  const detours: string[] = []
  if (current?.minLevel && character.level > 1 && character.level < current.minLevel) {
    detours.push(
      `You are level ${character.level}. This beat is kinder around ${current.minLevel}. A side dungeon, a Great Rune, or a remembrance fight first will save the run.`,
    )
  }
  if (current?.obtain) detours.push(`While you are there, take ${current.obtain}.`)
  if (current?.lockout) detours.push(`Lockout: ${current.lockout}`)
  return { locked, done, todo, current, detours, remain: todo.length, total: route.steps.length, foreclosed, blocked, available }
}
