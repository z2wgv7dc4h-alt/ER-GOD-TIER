import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Character } from '../types'
import { callGideonLlm, hasGideonKey } from './muse'
import type { BossCombat } from './enemy'
import { askGideon, askGideonRouter, isFastLookup } from './gideon'
import { buildGrounding, stripUngroundedSentences, validateGideonAct } from './gideonLlm'
import { REGULATION_STAMP } from './regulation'

/** The real Task 17 extract, read straight off disk — not a hand-rolled fixture. */
const combat = JSON.parse(
  readFileSync(new URL('../../public/sourced/npc-combat.json', import.meta.url), 'utf8'),
) as BossCombat[]

vi.mock('./muse', () => ({
  hasGideonKey: vi.fn(),
  callGideonLlm: vi.fn(),
}))

const character: Character = {
  source: 'reckon',
  platform: 'ps5',
  regulation: REGULATION_STAMP,
  name: 'Tarnished',
  level: 40,
  startingClass: 'vagabond',
  stats: { vigor: 20, mind: 10, endurance: 15, strength: 20, dexterity: 12, intelligence: 9, faith: 9, arcane: 7 },
  loadout: [],
  defeatedBosses: [],
  discoveredGraces: [],
  collectedItems: [],
  completedQuestSteps: [],
  deniedFacts: [],
  answers: {},
  evidence: [],
  shots: [],
}

/** A question with no single-entity lookup and several reasoning markers. */
const OPEN_QUESTION = 'Which ending should I chase if I want faith and I killed Seluvis?'

describe('validateGideonAct', () => {
  it('keeps a fact id that is present in the grounding pack', () => {
    const g = buildGrounding('godrick', character)
    expect(g.factIds.has('boss:godrick')).toBe(true)
    const { act, rejected } = validateGideonAct({ say: 'Godrick.', module: 'map', factId: 'boss:godrick' }, g)
    expect(rejected).toEqual([])
    expect(act?.factId).toBe('boss:godrick')
  })

  it('rejects an invented fact id and refuses the whole act', () => {
    const g = buildGrounding('godrick', character)
    const { act, rejected } = validateGideonAct(
      { say: 'Seek boss:godrick-prime, the secret second Godrick.', module: 'map', factId: 'boss:godrick-prime' },
      g,
    )
    expect(act).toBeNull()
    expect(rejected).toContain('factId:boss:godrick-prime')
  })

  it('rejects invented build and goal ids', () => {
    const g = buildGrounding(OPEN_QUESTION, character)
    const { act, rejected } = validateGideonAct(
      { say: 'Wear it.', buildId: 'build:infinite-comet', goal: 'ending:secret-moon' },
      g,
    )
    expect(act).toBeNull()
    expect(rejected).toContain('buildId:build:infinite-comet')
    expect(rejected).toContain('goal:ending:secret-moon')
  })

  it('drops an invalid module without rejecting the act', () => {
    const g = buildGrounding('godrick', character)
    const { act, rejected } = validateGideonAct({ say: 'Godrick.', module: 'holodeck', factId: 'boss:godrick' }, g)
    expect(rejected).toEqual([])
    expect(act?.module).toBeUndefined()
    expect(act?.factId).toBe('boss:godrick')
  })
})

describe('stuck handler uses real boss resists', () => {
  it('advises from the actual NpcParam row for a named boss', () => {
    const act = askGideonRouter('help with malenia', character, {}, combat)
    expect(act.say).toContain('Real NpcParam absorb')
    expect(act.say).toContain('bleed soft')
    expect(act.offer?.label).toBe('Bleed sheet')
  })

  it('gives different advice for a bleed-resistant boss', () => {
    const malenia = askGideonRouter('help with malenia', character, {}, combat)
    const agheel = askGideonRouter('help with agheel', character, {}, combat)
    expect(agheel.say).toContain('bleed hard')
    expect(agheel.say).not.toBe(malenia.say)
    expect(agheel.offer?.label).not.toBe('Bleed sheet')
  })

  it('falls back to generic advice when combat data is not loaded', () => {
    const act = askGideonRouter('help with malenia', character, {}, [])
    expect(act.say).toContain('If this is a wall')
  })
})

describe('100% handler reflects tracked completion', () => {
  it('counts actual facts and surfaces a next actionable', () => {
    const progressed: Character = {
      ...character,
      defeatedBosses: ['boss:margit'],
      discoveredGraces: ['grace:first-step'],
    }
    const act = askGideonRouter('100%', progressed)
    expect(act.say).toContain('Bosses 1/')
    expect(act.say).toContain('Next actionable')
    expect(act.say).toContain('Spine chapter')
    expect(act.factId).toBeTruthy()
  })

  it('changes the response as facts are toggled', () => {
    const empty = askGideonRouter('100%', character)
    const progressed = askGideonRouter('100%', { ...character, defeatedBosses: ['boss:margit'] })
    expect(progressed.say).not.toBe(empty.say)
    expect(empty.say).toContain('Start with')
  })
})

describe('NPC questline steps', () => {
  it('answers "what does Ranni want next" with the real ending route', () => {
    const act = askGideonRouter('what does ranni want next', character, {}, combat)
    expect(act.say).toContain('Age of Stars')
    expect(act.say).toContain('Next: Enter Ranni’s service')
    expect(act.goal).toBe('stars')
    expect(act.factId).toBe('quest:ranni:service')
    expect(act.module).toBe('quests')
  })

  it('answers a new companion line (Seluvis) instead of the old placeholder', () => {
    const act = askGideonRouter('what does seluvis want', character, {}, combat)
    expect(act.say).not.toContain('Quest graph')
    expect(act.say).toContain('Preceptor Seluvis')
    expect(act.goal).toBe('seluvis')
    expect(act.factId).toBe('quest:seluvis:met')
  })

  it('gives the Shadow of the Erdtree lines an honest gate', () => {
    const act = askGideonRouter('freyja quest', character, {}, combat)
    expect(act.say).toContain('Realm of Shadow')
    expect(act.goal).toBe('freyja')
    expect(act.module).toBe('quests')
  })

  it('resolves other newly seeded companions', () => {
    for (const [q, goal] of [
      ['kenneth haight quest', 'kenneth'],
      ['latenna quest', 'latenna'],
      ['tanith quest', 'tanith'],
      ['rogier quest', 'rogier'],
      ['gurranq quest', 'gurranq'],
      ['thiollier quest', 'thiollier'],
      ['ansbach quest', 'ansbach'],
    ] as const) {
      const act = askGideonRouter(q, character, {}, combat)
      expect(act.goal).toBe(goal)
      expect(act.module).toBe('quests')
    }
  })
})

describe('generated alias plane widening', () => {
  it('recognizes "night cavalry" (Night’s Cavalry alias the catalog misses)', () => {
    const act = askGideonRouter('where is night cavalry', character, {}, combat)
    expect(act.factId).toBe('boss:nights-cavalry')
    expect(act.module).toBe('map')
    expect(act.navigateNow).toBe(true)
  })

  it('recognizes "pureblood knight medal" (Pureblood Knight’s Medal)', () => {
    const act = askGideonRouter('where is the pureblood knight medal', character, {}, combat)
    expect(act.factId).toBe('item:pureblood-medal')
    expect(act.module).toBe('codex')
    expect(act.say).toContain("Pureblood Knight's Medal")
  })

  it('recognizes "giant prayerbook" (Giant’s Prayerbook)', () => {
    const act = askGideonRouter('where is the giant prayerbook', character, {}, combat)
    expect(act.factId).toBe('item:prayerbook-giants')
    expect(act.module).toBe('codex')
  })
})

describe('Enia remembrance exchange', () => {
  it('answers "what does the Radahn remembrance give" with the real two rewards', () => {
    const act = askGideonRouter('what does the radahn remembrance give', character, {}, combat)
    expect(act.module).toBe('codex')
    expect(act.factId).toBe('boss:radahn')
    expect(act.say).toContain('Starscourge Greatsword')
    expect(act.say).toContain('Lion Greatbow')
  })

  it('answers "what can I get from Enia" with the table', () => {
    const act = askGideonRouter('what can i get from enia', character, {}, combat)
    expect(act.module).toBe('codex')
    expect(act.say).toContain('Finger Reader Enia')
    expect(act.say).toContain('Remembrance of the Grafted')
  })
})

describe('comparison handling', () => {
  it('compares two builds against the current sheet instead of picking one', () => {
    const act = askGideonRouter('should I use rivers of blood or comet azur', character, {}, combat)
    expect(act.module).toBe('build')
    expect(act.buildId).toBe('build:rivers')
    expect(act.say).toContain('Rivers of Blood')
    expect(act.say).toContain('Comet Azur glass')
    expect(act.say).toContain('fits better')
  })

  it('compares two damage types against a named boss’s real resists', () => {
    const act = askGideonRouter('is bleed better than sorcery for malenia', character, {}, combat)
    expect(act.module).toBe('build')
    expect(act.factId).toBe('boss:malenia')
    expect(act.say).toContain('bleed soft')
    expect(act.say).toContain('better line')
  })

  it('does not declare a winner when both damage types are resisted', () => {
    const act = askGideonRouter('is bleed better than sorcery for agheel', character, {}, combat)
    expect(act.factId).toBe('boss:agheel')
    expect(act.say).toContain('Neither is a clean win')
  })
})

describe('conditional merchant router', () => {
  it('answers "what does X sell after I give Y" for a bell bearing', () => {
    const act = askGideonRouter(
      "what does twin maiden husks sell after i give sellen's bell bearing",
      character,
    )
    expect(act.module).toBe('codex')
    expect(act.say).toContain('Twin Maiden Husks')
    expect(act.say.toLowerCase()).toContain('sellen')
    expect(act.factId).toBe('item:sellen-s-bell-bearing')
  })

  it('names the prayerbook buyer and the unlocked spells', () => {
    const act = askGideonRouter(
      'what does corhyn sell after i give the golden order principia',
      character,
    )
    expect(act.module).toBe('codex')
    expect(act.say).toContain('Brother Corhyn')
    expect(act.say).toContain('Radagon')
    expect(act.factId).toBe('item:golden-order-principia')
  })
})

describe('PvP router', () => {
  it('returns a real PvP build for a generic PvP question', () => {
    const act = askGideonRouter('what is good for pvp', character)
    expect(act.module).toBe('build')
    expect(act.buildId).toMatch(/^build:pvp-/)
    expect(act.say).toContain('Beats:')
    expect(act.say).toContain('Watch out for:')
  })

  it('answers a bleed matchup with real counter-tech, not the PvE bleed build', () => {
    const act = askGideonRouter('how do I beat a bleed build in PvP', character)
    expect(act.say).toContain('Corpse Piler')
    expect(act.say).toContain('status')
    expect(act.buildId).toBeUndefined()
    expect(act.offer?.label).toBe('PvP kits')
  })

  it('answers a mage matchup with Eternal Darkness', () => {
    const act = askGideonRouter('how do I counter a mage in pvp', character)
    expect(act.say).toContain('Eternal Darkness')
  })

  it('routes invade questions to an invade build and duel questions to a duel build', () => {
    const invade = askGideonRouter('what is a good invasion build', character)
    expect(invade.buildId).toBe('build:pvp-wretch')
    const duel = askGideonRouter('what is a good duel build', character)
    expect(duel.buildId).toBe('build:pvp-sorcerer-duelist')
  })

  it('recognises a PvP build by name in the build branch', () => {
    const act = askGideonRouter('use the Colossal poise monster (RL150) build', character)
    expect(act.buildId).toBe('build:pvp-colossal')
    expect(act.module).toBe('build')
  })
})

describe('tips / tech router', () => {
  it('answers a named tech question with the real entry', () => {
    const act = askGideonRouter('tips for stance break', character)
    expect(act.say).toContain("Lion's Claw")
    expect(act.say).toContain('How:')
    expect(act.module).toBe('codex')
  })

  it('answers a specific spirit-ash question', () => {
    const act = askGideonRouter('is mimic tear a good spirit ash', character)
    expect(act.say).toContain('Mimic Tear')
    expect(act.say).toContain('660')
  })

  it('returns a real list for a general tips question', () => {
    const act = askGideonRouter('show me tips and tricks', character)
    expect(act.say).toContain('Strong tech worth knowing')
    expect(act.say).toContain('Lion')
    expect(act.module).toBe('codex')
  })
})

describe('isFastLookup', () => {
  it('routes exact single-entity lookups and fixed commands without the LLM', () => {
    expect(isFastLookup('godrick')).toBe(true)
    expect(isFastLookup('What is still available on this run?')).toBe(true)
    expect(isFastLookup('Blitz: Age of Stars. What do I do next?')).toBe(true)
    expect(isFastLookup('I want the Age of Stars ending. What do I do next?')).toBe(true)
  })

  it('treats the new deterministic capabilities as fast lookups', () => {
    expect(isFastLookup('where is night cavalry')).toBe(true)
    expect(isFastLookup('what does the radahn remembrance give')).toBe(true)
    expect(isFastLookup('should I use rivers of blood or comet azur')).toBe(true)
    expect(isFastLookup('is bleed better than sorcery for malenia', {}, combat)).toBe(true)
  })

  it('keeps PvP and tips questions on the deterministic path', () => {
    expect(isFastLookup('how do I beat a bleed build in PvP')).toBe(true)
    expect(isFastLookup('show me tips and tricks')).toBe(true)
  })

  it('sends multi-concept questions to the LLM', () => {
    expect(isFastLookup(OPEN_QUESTION)).toBe(false)
    expect(isFastLookup('I am level 35 and stuck on Radahn, what should I do?')).toBe(false)
  })
})

describe('askGideon front', () => {
  beforeEach(() => {
    vi.mocked(hasGideonKey).mockReset()
    vi.mocked(callGideonLlm).mockReset()
  })

  it('falls back to the deterministic router when no key is configured', async () => {
    vi.mocked(hasGideonKey).mockReturnValue(false)
    const act = await askGideon(OPEN_QUESTION, character)
    expect(act).toEqual(askGideonRouter(OPEN_QUESTION, character))
    expect(callGideonLlm).not.toHaveBeenCalled()
  })

  it('does not call the LLM for a fast lookup even with a key', async () => {
    vi.mocked(hasGideonKey).mockReturnValue(true)
    const act = await askGideon('godrick', character)
    expect(act).toEqual(askGideonRouter('godrick', character))
    expect(callGideonLlm).not.toHaveBeenCalled()
  })

  it('passes a grounded response through', async () => {
    vi.mocked(hasGideonKey).mockReturnValue(true)
    const g = buildGrounding(OPEN_QUESTION, character)
    const factId = [...g.factIds][0]
    vi.mocked(callGideonLlm).mockResolvedValue({ say: 'Grounded answer.', module: 'map', factId })
    const act = await askGideon(OPEN_QUESTION, character)
    expect(callGideonLlm).toHaveBeenCalledTimes(1)
    expect(act.say).toBe('Grounded answer.')
    expect(act.factId).toBe(factId)
  })

  it('falls back to the router when the model hallucinates an id', async () => {
    vi.mocked(hasGideonKey).mockReturnValue(true)
    vi.mocked(callGideonLlm).mockResolvedValue({
      say: 'Follow boss:godrick-prime, the secret second Godrick.',
      module: 'map',
      factId: 'boss:godrick-prime',
    })
    const act = await askGideon(OPEN_QUESTION, character)
    expect(act).toEqual(askGideonRouter(OPEN_QUESTION, character))
  })

  it('falls back to the router when the API call fails', async () => {
    vi.mocked(hasGideonKey).mockReturnValue(true)
    vi.mocked(callGideonLlm).mockRejectedValue(new Error('network down'))
    const act = await askGideon(OPEN_QUESTION, character)
    expect(act).toEqual(askGideonRouter(OPEN_QUESTION, character))
  })
})

describe('stripUngroundedSentences', () => {
  it('drops only the sentence naming an id outside the catalog', () => {
    const g = buildGrounding('godrick', character)
    const factId = [...g.factIds][0]
    const say = `Head to ${factId} now. Follow boss:godrick-prime, the secret one.`
    expect(stripUngroundedSentences(say, g)).toBe(`Head to ${factId} now.`)
  })

  it('keeps the rest of a valid act when one sentence is stripped', () => {
    const g = buildGrounding('godrick', character)
    const factId = [...g.factIds][0]
    const { act } = validateGideonAct(
      { say: `Go to ${factId}. Then follow boss:godrick-prime.`, factId },
      g,
    )
    expect(act?.say).toBe(`Go to ${factId}.`)
    expect(act?.factId).toBe(factId)
  })
})

describe('Gideon build hunt', () => {
  it('answers "how do I build X" with the missing-piece list and a map offer', async () => {
    vi.mocked(hasGideonKey).mockReturnValue(false)
    const act = await askGideon('how do I build Rivers of Blood', character)
    expect(act.module).toBe('build')
    expect(act.buildId).toBe('build:rivers')
    expect(act.say).toMatch(/missing/i)
    expect(act.say).toContain('Rivers of Blood')
    expect(act.offer?.label).toBe('Show on map')
    expect(act.offer?.prompt).toMatch(/kit/i)
  })

  it('answers "show the X kit" by marking watchlist loot for the leftover pin layer', async () => {
    vi.mocked(hasGideonKey).mockReturnValue(false)
    const act = await askGideon('show the Rivers of Blood kit', character)
    expect(act.module).toBe('map')
    expect(act.buildId).toBe('build:rivers')
    expect(act.navigateNow).toBe(true)
    expect(act.watch).toContain('loot:rivers')
  })

  it('stays on the deterministic router for a kit question (no key, no fetch)', async () => {
    vi.mocked(hasGideonKey).mockReturnValue(false)
    vi.mocked(callGideonLlm).mockReset()
    const act = await askGideon('what do I need for the Rivers of Blood kit', character)
    expect(act.buildId).toBe('build:rivers')
    expect(callGideonLlm).not.toHaveBeenCalled()
  })
})
