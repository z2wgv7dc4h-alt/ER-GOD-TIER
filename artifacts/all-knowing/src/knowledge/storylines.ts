import { endings, knownSet, planRoute, type EndingRoute, type PlanStep } from './endings'
import type { Character } from '../types'

export type Line = EndingRoute & { kind: 'ending' | 'story' | 'blitz' }

export const storylines: Line[] = [
  {
    id: 'millicent',
    kind: 'story',
    name: 'Millicent',
    aliases: ['millicent', 'gower', 'unalloyed', 'rot girl'],
    lockedIf: (c) => (knownSet(c).has('quest:millicent-killed') ? 'Millicent is already dead on this run.' : null),
    steps: [
      { id: 'm1', do: 'Get the Unalloyed Gold Needle from Commander O’Neil', detail: 'Swamp of Aeonia, Caelid. Take it to Gowry in Sellia.', factId: 'quest:millicent:needle', module: 'quests', minLevel: 50 },
      { id: 'm2', do: 'Cure Millicent at the Church of the Plague', detail: 'Return the repaired needle. She moves to Altus, then Dominula, then Haligtree.', module: 'map', minLevel: 70 },
      { id: 'm3', do: 'Help her at the Haligtree drain', detail: 'Choose to aid Millicent, not her sisters. That keeps the needle for a Frenzy purge later.', factId: 'grace:drainage', module: 'map', minLevel: 110, obtain: 'Unalloyed Gold Needle (for Farum / Frenzy undo)', lockout: 'Attacking her here ends the good needle.' },
    ],
  },
  {
    id: 'alexander',
    kind: 'story',
    name: 'Iron Fist Alexander',
    aliases: ['alexander', 'warrior jar', 'jar uncle'],
    lockedIf: () => null,
    steps: [
      { id: 'a1', do: 'Free Alexander from the Limgrave hole', detail: 'South of Stormhill. Hit the ground. Missable if you never crack it, but he can still show later.', factId: 'alexander-1', module: 'quests' },
      { id: 'a2', do: 'Meet him at Gael Tunnel and Redmane', detail: 'Festival fight. Talk after Radahn.', factId: 'boss:radahn', module: 'map', minLevel: 70 },
      { id: 'a3', do: 'Find him in the Gelmir lava, then Farum', detail: 'Finish the duel in Farum for the Shard of Alexander.', module: 'map', minLevel: 110, obtain: 'Shard of Alexander' },
    ],
  },
  {
    id: 'varre',
    kind: 'story',
    name: 'White Mask Varré',
    aliases: ['varre', 'varré', 'mohgwyn', 'maiden blood'],
    lockedIf: () => null,
    steps: [
      { id: 'v1', do: 'Talk to Varré at the First Step, then at Rose Church', detail: 'After one Great Rune he offers the invasion cloth.', factId: 'grace:first-step', module: 'map' },
      { id: 'v2', do: 'Soak the cloth in maiden blood', detail: 'Church of Inhibition Eochaid corpse, or your own finger maiden at the beginning if you never used her.', factId: 'grace:lake-shore', module: 'map', minLevel: 40 },
      { id: 'v3', do: 'Use the medal to Mohgwyn', detail: 'Fast path to Mohg and the SotE withered arm. Skips a lot of snowfield.', factId: 'boss:mohg', module: 'map', minLevel: 80, obtain: 'Mohg’s Great Rune' },
    ],
  },
  {
    id: 'leda',
    kind: 'story',
    name: 'Needle Knight Leda',
    aliases: ['leda', 'enir-ilim', 'shadow story', 'miquella'],
    lockedIf: (c) => (!knownSet(c).has('region:shadow') && !knownSet(c).has('item:shadow-realm-blessing') ? 'You have not entered the Realm of Shadow yet. Need Mohg + the withered arm.' : null),
    steps: [
      { id: 'ld1', do: 'Meet Leda at the Gravesite cross', detail: 'Talk to Freyja, Hornsent, Ansbach, Thiollier before the Keep turns.', factId: 'grace:gravesite', module: 'map' },
      { id: 'ld2', do: 'Clear Shadow Keep invitations', detail: 'Who you side with changes Enir-Ilim. Crossing the Sealing Tree locks several.', factId: 'grace:shadow-keep', module: 'map', minLevel: 150, lockout: 'Sealing Tree is the last invitation window.' },
      { id: 'ld3', do: 'Enir-Ilim and the Consort', detail: 'Promised Consort Radahn. Bring the allies you kept.', factId: 'boss:consort', module: 'map', minLevel: 170 },
    ],
  },
]

export const blitz: Line[] = [
  {
    id: 'blitz-lord',
    kind: 'blitz',
    name: 'Blitz Elden Lord',
    aliases: ['blitz', 'speedrun', 'fast ending', 'blitz lord', 'rush the game'],
    lockedIf: () => null,
    steps: [
      { id: 'b1', do: 'Limgrave → Stormveil', detail: 'Margit, Godrick. Grab the Groveside / Gatefront kit and leave.', factId: 'boss:godrick', module: 'map', minLevel: 20 },
      { id: 'b2', do: 'One more Great Rune, cheapest', detail: 'Rennala if you can cheese the students, or skip to Altus via the Ruin-Strewn Precipice / Dectus.', factId: 'boss:rennala', module: 'map', minLevel: 40 },
      { id: 'b3', do: 'Leyndell, Morgott', detail: 'No side quests. Capital Rampart → East Rampart → Godfrey shade → Morgott.', factId: 'boss:morgott', module: 'map', minLevel: 70 },
      { id: 'b4', do: 'Forge, Farum, Ashen Capital, Beast', detail: 'Ignore Haligtree, Mohgwyn, Ranni. This is the default Lord ending as fast as the seeded map allows.', factId: 'boss:radagon', module: 'map', minLevel: 100 },
    ],
  },
  {
    id: 'blitz-stars',
    kind: 'blitz',
    name: 'Blitz Age of Stars',
    aliases: ['blitz stars', 'fast ranni', 'rush stars'],
    lockedIf: (c) => endings[0].lockedIf(c),
    steps: [
      { id: 'bs1', do: 'Godrick, then Ranni’s Rise', detail: 'Skip Weeping. Caria Manor as soon as Liurnia opens.', factId: 'quest:ranni:service', module: 'quests', minLevel: 40 },
      { id: 'bs2', do: 'Radahn the moment the festival is up', detail: 'Do not tour Caelid. In, festival, out, Nokron.', factId: 'boss:radahn', module: 'map', minLevel: 60 },
      { id: 'bs3', do: 'Blade → statue → Astel → ring', detail: 'No Seluvis side deals. Straight to Manus Celes.', factId: 'quest:ranni:ring', module: 'map', minLevel: 80 },
      { id: 'bs4', do: 'Blitz the Lord path and summon Ranni', detail: 'Same as Blitz Elden Lord from Morgott onward.', factId: 'boss:radagon', module: 'map', minLevel: 100 },
    ],
  },
]

export const allLines: Line[] = [
  ...endings.map((e) => ({ ...e, kind: 'ending' as const })),
  ...storylines,
  ...blitz,
]

export function findLine(text: string) {
  const n = text.toLowerCase()
  return allLines.find((e) => e.aliases.some((a) => n.includes(a)) || n.includes(e.name.toLowerCase()) || n.includes(e.id))
}

export type LineStatus = {
  line: Line
  state: 'locked' | 'done' | 'active' | 'open'
  note: string
  current?: PlanStep
}

export function survey(character: Character): LineStatus[] {
  return allLines.map((line) => {
    const plan = planRoute(character, line)
    if (plan.locked) return { line, state: 'locked' as const, note: plan.locked }
    if (!plan.current) return { line, state: 'done' as const, note: 'Seeded beats are ticked.' }
    if (plan.done.length) {
      return { line, state: 'active' as const, note: `${plan.done.length}/${plan.total} · next: ${plan.current.do}`, current: plan.current }
    }
    return { line, state: 'open' as const, note: `Not started · first: ${plan.current.do}`, current: plan.current }
  })
}

export function stillAvailable(character: Character) {
  const rows = survey(character)
  return {
    locked: rows.filter((r) => r.state === 'locked'),
    done: rows.filter((r) => r.state === 'done'),
    active: rows.filter((r) => r.state === 'active'),
    open: rows.filter((r) => r.state === 'open'),
  }
}
