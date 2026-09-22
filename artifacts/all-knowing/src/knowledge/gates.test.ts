import { describe, expect, it } from 'vitest'
import { emptyCharacter } from '../data/seed'
import { applyFacts } from '../lib/infer'
import { askGideonRouter } from '../lib/gideon'
import { gatePins, unresolvedGateLocks } from '../lib/gatePins'
import type { Character } from '../types'
import { endings, planRoute } from './endings'
import {
  approachingGates,
  findGate,
  gateForStep,
  gateState,
  gateWarningForStep,
  gates,
  triggeredGates,
} from './gates'
import { stillAvailable } from './storylines'

/**
 * Golden fixture from the Task 52 brief: a mid-run Tarnished who has cleared the
 * early shardbearers and started several companion lines, but has not touched
 * Leyndell, Millicent, Volcano Manor or Mohgwyn.
 */
const TRUE_FACTS = [
  'boss:margit',
  'boss:godrick',
  'boss:rennala',
  'boss:radahn',
  'boss:mimic-tear',
  'item:black-whetblade',
  'item:godrick-great-rune',
  'quest:ranni:service',
  'quest:varre:met',
  'item:black-knifeprint',
  'quest:fia:met',
  'quest:fia:dagger',
  'invader:ensha',
  'quest:thops:met',
]

const fixture: Character = applyFacts(emptyCharacter, TRUE_FACTS, 'answer', 'Task 52 fixture')

const forge = gates.find((g) => g.id === 'gate:forge')!

describe('gate model', () => {
  it('defines every gate the brief requires', () => {
    const required = [
      'gate:forge',
      'gate:maliketh',
      'gate:sealing-tree',
      'gate:ranni-ending',
      'gate:frenzy',
      'gate:dung-eater-curse',
      'gate:seluvis-potion',
      'gate:volcano-host',
      'gate:millicent-choice',
      'gate:varre-ignore',
    ]
    const ids = gates.map((g) => g.id)
    for (const id of required) expect(ids).toContain(id)
  })

  it('carries the real Royal Capital locks on the Forge gate', () => {
    const lockIds = forge.locks.map((l) => l.factId)
    expect(lockIds).toEqual(
      expect.arrayContaining([
        'item:bolt-of-gransax',
        'item:sanctified-whetblade',
        'item:golden-order-principia',
        'item:blessed-dew-talisman',
        'item:sword-of-milos',
        'item:weathered-dagger',
      ]),
    )
    for (const lock of forge.locks) {
      expect(lock.name.length).toBeGreaterThan(0)
      expect(lock.why.length).toBeGreaterThan(0)
    }
  })

  it('names the Four that survive the Forge rather than pretending they lock', () => {
    const stillOk = forge.stillOk?.map((s) => s.name).join(' ') ?? ''
    expect(stillOk).toMatch(/ranni/i)
    expect(stillOk).toMatch(/millicent/i)
    expect(stillOk).toMatch(/rya/i)
    expect(stillOk).toMatch(/varr/i)
  })

  it('uses real storyline lockouts for the Sealing Tree / Volcano / Millicent gates', () => {
    expect(gates.find((g) => g.id === 'gate:sealing-tree')!.locks.map((l) => l.factId)).toContain(
      'quest:leda:invitations',
    )
    expect(gates.find((g) => g.id === 'gate:volcano-host')!.locks.map((l) => l.factId)).toContain(
      'quest:rya:amnion',
    )
    expect(gates.find((g) => g.id === 'gate:millicent-choice')!.locks.map((l) => l.factId)).toEqual(
      expect.arrayContaining(['item:miquella-needle', 'item:rotten-winged-sword-insignia', 'item:millicent-prosthesis']),
    )
  })
})

describe('gate state from the golden fixture', () => {
  it('has not fired the Forge gate', () => {
    expect(gateState(fixture, forge)).toBe('open')
    expect(triggeredGates(fixture).map((g) => g.id)).not.toContain('gate:forge')
  })

  it('is one beat from the Varré gate (Rose Church started, cloth unsoaked)', () => {
    const approaching = approachingGates(fixture).map((g) => g.id)
    expect(approaching).toContain('gate:varre-ignore')
  })

  it('surfaces approaching gates through stillAvailable', () => {
    const s = stillAvailable(fixture)
    expect(s.gates.approaching.map((g) => g.id)).toContain('gate:varre-ignore')
    expect(s.gates.fired).toEqual([])
  })

  it('carries the approaching gates into every plan', () => {
    const lord = endings.find((e) => e.id === 'lord')!
    const plan = planRoute(fixture, lord)
    expect(plan.approachingGates.map((g) => g.id)).toContain('gate:varre-ignore')
  })

  it('puts the Forge lock list before the walk-forward beat', () => {
    // The burn flag is the trigger; the Forge grace / Fire Giant are the "one beat
    // away" signals that make Gideon warn before the player commits.
    const warn = gateWarningForStep({ factId: 'grace:forge-giants', grants: [] })
    expect(warn).toContain('Forge of the Giants')
    expect(warn).toContain('Bolt of Gransax')
    expect(gateWarningForStep({ factId: 'boss:morgott', grants: [] })).toBeUndefined()
  })
})

describe('every gate reports a state from the fixture', () => {
  const expected: Record<string, string> = {
    'gate:forge': 'open',
    'gate:maliketh': 'open',
    'gate:sealing-tree': 'open',
    'gate:ranni-ending': 'open',
    'gate:frenzy': 'open',
    'gate:dung-eater-curse': 'open',
    'gate:seluvis-potion': 'open',
    'gate:volcano-host': 'open',
    'gate:millicent-choice': 'open',
    'gate:varre-ignore': 'approaching',
  }

  it('matches the expected state for each gate', () => {
    for (const gate of gates) {
      expect(gateState(fixture, gate), gate.id).toBe(expected[gate.id])
    }
  })

  it('fires a gate from its own trigger fact and approaches from a near one', () => {
    // Killing the Fire Giant does NOT burn the tree, so it is "approaching" only.
    const preForge = applyFacts(emptyCharacter, ['boss:fire-giant'], 'answer', 'x')
    expect(gateState(preForge, gates.find((g) => g.id === 'gate:forge')!)).toBe('approaching')

    const burned = applyFacts(emptyCharacter, ['quest:erdtree-burned'], 'answer', 'x')
    expect(gateState(burned, gates.find((g) => g.id === 'gate:forge')!)).toBe('fired')

    const ashen = applyFacts(emptyCharacter, ['boss:maliketh'], 'answer', 'x')
    expect(gateState(ashen, gates.find((g) => g.id === 'gate:maliketh')!)).toBe('fired')
  })

  it('keeps trigger / approaching / lock arrays well-formed', () => {
    for (const gate of gates) {
      expect(gate.triggerFacts.length, gate.id).toBeGreaterThan(0)
      expect(gate.approachingWhen.length, gate.id).toBeGreaterThan(0)
      expect(gate.locks.length, gate.id).toBeGreaterThan(0)
      const ids = gate.locks.map((l) => l.factId)
      expect(new Set(ids).size, gate.id).toBe(ids.length)
      for (const id of ids) expect(id).toMatch(/^[a-z]+:/)
    }
  })
})

describe('negative: Raya Lucaria does not fire the Forge gate', () => {
  const academy = applyFacts(
    emptyCharacter,
    ['boss:rennala', 'grace:debate-parlor', 'region:liurnia'],
    'answer',
    'academy fixture',
  )

  it('does not trigger gate:forge', () => {
    expect(triggeredGates(academy).map((g) => g.id)).not.toContain('gate:forge')
    expect(approachingGates(academy).map((g) => g.id)).not.toContain('gate:forge')
    expect(findGate('walks into the Raya Lucaria library')).not.toMatchObject({ id: 'gate:forge' })
  })
})

describe('gate answer from Gideon', () => {
  it('answers "if I keep going to Leyndell" with named locks, not a generic warning', () => {
    const act = askGideonRouter('if I keep going to Leyndell what do I miss', fixture)
    expect(act.module).toBe('quests')
    expect(act.say).toContain('Forge of the Giants')
    expect(act.say).toMatch(/Bolt of Gransax/)
    expect(act.say).toMatch(/ranni/i)
    expect(act.say).toMatch(/millicent/i)
    expect(act.say).toMatch(/rya/i)
    expect(act.say).toMatch(/varr[ée]/i)
  })

  it('does not claim Leyndell entry itself hard-locks the four unfinished lines', () => {
    const act = askGideonRouter('if I keep going to Leyndell what do I miss', fixture)
    expect(act.say).toContain('It does not lock')
  })

  it('answers "am I locking" from the nearest approaching gate', () => {
    const act = askGideonRouter('am i locking anything before the forge', fixture)
    expect(act.say.length).toBeGreaterThan(0)
    expect(act.module).toBe('quests')
  })

  it('finds the named gate for the Sealing Tree prompt', () => {
    expect(findGate('what do I miss before the sealing tree')?.id).toBe('gate:sealing-tree')
    expect(findGate('before maliketh')?.id).toBe('gate:maliketh')
    // Fire Giant is the one-beat-away signal; the burn flag itself is the trigger.
    expect(gateForStep({ factId: 'boss:fire-giant', grants: [] })?.gate.id).toBe('gate:forge')
    expect(gateForStep({ factId: 'quest:erdtree-burned', grants: [] })?.kind).toBe('fires')
  })
})

describe('gate pin layer', () => {
  it('resolves a locked loot item onto the existing grace frame', () => {
    const beforeForge = applyFacts(emptyCharacter, ['boss:fire-giant'], 'answer', 'pre-forge')
    const pins = gatePins(beforeForge, [])
    const bolt = pins.find((p) => p.id === 'item:bolt-of-gransax')
    expect(bolt).toMatchObject({ gate: true, kind: 'item' })
    // The pin comes from the loot row's grace pin (grace:east-capital), not an
    // invented coordinate.
    expect(bolt!.x).toBeCloseTo(42.51, 2)
    expect(pins.every((p) => p.gate)).toBe(true)
  })

  it('lists a lock with no pin instead of inventing one', () => {
    const unplaced = unresolvedGateLocks(fixture, []).map((u) => u.lock.factId)
    expect(unplaced).toContain('item:pureblood-medal')
  })
})
