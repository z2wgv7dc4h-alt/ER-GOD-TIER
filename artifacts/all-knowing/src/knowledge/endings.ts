import type { Character, ModuleId } from '../types'

export type PlanStep = {
  id: string
  do: string
  detail: string
  factId?: string
  module?: ModuleId
  minLevel?: number
  obtain?: string
  lockout?: string
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
      { id: 's1', do: 'Enter Ranni’s service at Ranni’s Rise', detail: 'Three Sisters, after Caria Manor. Speak to Blaidd, Iji, and Seluvis in the towers.', factId: 'quest:ranni:service', module: 'quests', minLevel: 40 },
      { id: 's2', do: 'Open Nokron — defeat Starscourge Radahn', detail: 'Redmane festival. Talk to Jerren or progress Ranni far enough that the festival is live.', factId: 'boss:radahn', module: 'map', minLevel: 70, obtain: 'Radahn’s Great Rune' },
      { id: 's3', do: 'Retrieve the Fingerslayer Blade', detail: 'Night’s Sacred Ground in Nokron. Give it to Ranni, never to Seluvis.', factId: 'item:fingerslayer', module: 'map', lockout: 'Seluvis + this blade ends her line.' },
      { id: 's4', do: 'Invert the Carian Study Hall', detail: 'Use the Carian Inverted Statue. Divine Tower of Liurnia for the cursemark.', factId: 'quest:ranni:statue', module: 'quests' },
      { id: 's5', do: 'Kill Astel and place the Dark Moon Ring', detail: 'Lake of Rot → Grand Cloister coffin → Moonlight Altar → Cathedral of Manus Celes.', factId: 'quest:ranni:ring', module: 'map', minLevel: 90, obtain: 'Dark Moon Greatsword' },
      { id: 's6', do: 'Finish the Elden Lord path, then summon Ranni', detail: 'Forge → Farum → Ashen Capital → Elden Beast. Use Ranni’s summon sign after the fight.', factId: 'boss:radagon', module: 'map', minLevel: 110 },
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
      { id: 'f1', do: 'Meet Hyetta or Shabriri', detail: 'Hyetta starts at the Lake-Facing Cliffs grape line. Shabriri appears later on the mountain.', factId: 'grace:lake-shore', module: 'map', minLevel: 30 },
      { id: 'f2', do: 'Reach the Forsaken Depths under Leyndell', detail: 'Subterranean Shunning-Grounds, Mohg the Omen, then the floor drop to the Three Fingers.', factId: 'grace:east-capital', module: 'map', minLevel: 80 },
      { id: 'f3', do: 'Take the Frenzied Flame', detail: 'Strip armour, open the door. This locks every other ending unless you complete Millicent + needle at Farum.', factId: 'boss:morgott', module: 'quests', lockout: 'Other endings require the Unalloyed Gold Needle in Malenia’s bloom, then Farum.' },
      { id: 'f4', do: 'Beat the Elden Beast and do not use a Mending Rune', detail: 'The cutscene changes if the flame is still in you.', factId: 'boss:radagon', module: 'map', minLevel: 110 },
    ],
  },
  {
    id: 'duskborn',
    name: 'Age of the Duskborn',
    aliases: ['fia ending', 'duskborn', 'godwyn ending', 'deathbed'],
    lockedIf: () => null,
    steps: [
      { id: 'd1', do: 'Talk to Fia at the Roundtable until she asks for a champion', detail: 'Hold her, then follow D’s brother and the Cursemark path.', module: 'quests', minLevel: 40 },
      { id: 'd2', do: 'Get the Cursemark of Death', detail: 'Same inverted Study Hall as Ranni. These lines share that tower.', factId: 'quest:ranni:statue', module: 'quests', minLevel: 70 },
      { id: 'd3', do: 'Give Fia the cursemark in Deeproot Depths', detail: 'Across the coffin after Godwyn’s prince. Defend her from Lionel, pick the Mending Rune of the Death-Prince.', factId: 'grace:deeproot', module: 'map', minLevel: 90 },
      { id: 'd4', do: 'Use that rune after the Elden Beast', detail: 'Do not take the Frenzied Flame without a way to purge it.', factId: 'boss:radagon', module: 'map', minLevel: 110 },
    ],
  },
  {
    id: 'order',
    name: 'Age of Order',
    aliases: ['goldmask', 'perfect order', 'order ending', 'corhyn'],
    lockedIf: () => null,
    steps: [
      { id: 'o1', do: 'Find Goldmask on the Altus road', detail: 'Bring Corhyn from the Roundtable. Forest-Spanning Greatbridge area.', factId: 'grace:ergtree-grazing', module: 'map', minLevel: 60 },
      { id: 'o2', do: 'Learn the law of regression', detail: 'Goldmask in Leyndell. Spell from the coliseum debate floor. See Radagon in the statue.', factId: 'grace:east-capital', module: 'map', minLevel: 80 },
      { id: 'o3', do: 'Take the Mending Rune of Perfect Order', detail: 'Goldmask’s corpse on the snowfield bridge after the Forge.', factId: 'grace:forge-giants', module: 'map', minLevel: 100 },
      { id: 'o4', do: 'Use it after the Elden Beast', detail: 'Frenzied Flame still overrides this.', factId: 'boss:radagon', module: 'map', minLevel: 110 },
    ],
  },
  {
    id: 'lord',
    name: 'Elden Lord (default)',
    aliases: ['elden lord', 'default ending', 'marika ending', 'normal ending'],
    lockedIf: () => null,
    steps: [
      { id: 'l1', do: 'Two Great Runes and the capital', detail: 'Godrick plus one other is enough to open Leyndell.', factId: 'boss:godrick', module: 'map', minLevel: 50 },
      { id: 'l2', do: 'Morgott, then the Forge of the Giants', detail: 'Melina must still be with you.', factId: 'boss:morgott', module: 'map', minLevel: 90 },
      { id: 'l3', do: 'Farum Azula and the Ashen Capital', detail: 'Maliketh unbinds destine death.', factId: 'boss:maliketh', module: 'map', minLevel: 110 },
      { id: 'l4', do: 'Godfrey, then Radagon / Elden Beast', detail: 'Choose a Mending Rune only if you want a variant.', factId: 'boss:radagon', module: 'map', minLevel: 120 },
    ],
  },
]

export function findEnding(text: string) {
  const n = text.toLowerCase()
  return endings.find((e) => e.aliases.some((a) => n.includes(a)) || n.includes(e.id))
}

export function knownSet(c: Character) {
  return new Set([
    ...c.defeatedBosses,
    ...c.discoveredGraces,
    ...c.collectedItems,
    ...c.completedQuestSteps,
  ])
}

export function planRoute(character: Character, route: EndingRoute) {
  const locked = route.lockedIf(character)
  const have = knownSet(character)
  const done: PlanStep[] = []
  const todo: PlanStep[] = []
  for (const step of route.steps) {
    const finished = step.factId ? have.has(step.factId) : false
    if (finished) done.push(step)
    else todo.push(step)
  }
  const current = todo[0]
  const detours: string[] = []
  if (current?.minLevel && character.level > 1 && character.level < current.minLevel) {
    detours.push(
      `You are level ${character.level}. This beat is kinder around ${current.minLevel}. A side dungeon, a Great Rune, or a remembrance fight first will save the run.`,
    )
  }
  if (current?.obtain) detours.push(`While you are there, take ${current.obtain}.`)
  if (current?.lockout) detours.push(`Lockout: ${current.lockout}`)
  return { locked, done, todo, current, detours, remain: todo.length, total: route.steps.length }
}
