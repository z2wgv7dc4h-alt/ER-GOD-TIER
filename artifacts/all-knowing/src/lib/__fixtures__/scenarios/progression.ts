import { emptyCharacter } from '../../../data/seed'
import type { Character } from '../../../types'
import { applyFacts, denyFacts } from '../../infer'

/**
 * Progress-audit characters at each stage of a normal run, built only from
 * catalog fact ids through the real `applyFacts` pipeline (so inference runs
 * exactly as it does for a player). They complement the user's own character
 * (`urmummytoilet.ts`): an audit that only ever sees one save misses faults at
 * the start and end of the game.
 */

function build(level: number, facts: string[], deny: string[] = []): Character {
  let c = applyFacts({ ...emptyCharacter, level }, facts, 'answer', 'progress-audit scenario')
  if (deny.length) c = denyFacts(c, deny, 'progress-audit scenario')
  return c
}

export const progressionScenarios: { name: string; character: () => Character }[] = [
  { name: 'early — Limgrave, Margit down', character: () => build(22, ['region:limgrave', 'boss:margit']) },
  {
    name: 'mid — Liurnia and Caelid, Rennala and Radahn down',
    character: () => build(70, ['region:liurnia', 'region:caelid', 'boss:godrick', 'boss:rennala', 'boss:radahn']),
  },
  {
    name: 'late — Leyndell and Farum Azula',
    character: () => build(130, ['region:leyndell', 'region:mountaintops', 'region:farum', 'boss:morgott', 'boss:fire-giant', 'boss:maliketh']),
  },
  {
    name: 'DLC — Shadow of the Erdtree entered',
    character: () => build(150, ['region:shadow', 'boss:mohg', 'boss:radahn', 'boss:messmer']),
  },
  {
    // A player's explicit "not defeated" must win over inference everywhere.
    name: 'denial — Godrick logged, Margit denied',
    character: () => build(40, ['boss:godrick'], ['boss:margit']),
  },
]

/** Every area label the Area hub resolves; each scenario is checked in all of them. */
export const AUDIT_AREAS = [
  'Limgrave',
  'Weeping Peninsula',
  'Stormveil',
  'Liurnia',
  'Raya Lucaria',
  'Caelid',
  'Altus',
  'Mt. Gelmir',
  'Leyndell',
  'Mountaintops',
  'Farum Azula',
  'Haligtree',
  'Mohgwyn',
  'Roundtable',
  'Gravesite Plain',
  'Scadu Altus',
]
