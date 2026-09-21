/**
 * Attack-rating calculation, ported from ThomasJClark/elden-ring-weapon-calculator (MIT).
 *
 * The formula/logic in this file (evaluateCalcCorrectGraph, decodeRegulationData,
 * adjustAttributesForTwoHanding, getWeaponAttack) is a TypeScript port of that project's
 * src/calculator/*.ts and src/regulationData.ts. The numeric regulation data
 * (public/sourced/regulation-vanilla-v1.17.json) is the upstream project's
 * regulation-vanilla-v1.17.js, which tracks the vanilla 1.17 / Tarnished Pack patch line.
 *
 * See THIRD_PARTY_NOTICES.md.
 */
import type { LoadoutSlot, Stats } from '../types'

export const allAttributes = ['str', 'dex', 'int', 'fai', 'arc'] as const
export type Attribute = (typeof allAttributes)[number]
export type Attributes = Record<Attribute, number>

export const AttackPowerType = {
  PHYSICAL: 0,
  MAGIC: 1,
  FIRE: 2,
  LIGHTNING: 3,
  HOLY: 4,
  POISON: 5,
  SCARLET_ROT: 6,
  BLEED: 7,
  FROST: 8,
  SLEEP: 9,
  MADNESS: 10,
  DEATH_BLIGHT: 11,
} as const
export type AttackPowerType = (typeof AttackPowerType)[keyof typeof AttackPowerType]

export const allDamageTypes: AttackPowerType[] = [
  AttackPowerType.PHYSICAL,
  AttackPowerType.MAGIC,
  AttackPowerType.FIRE,
  AttackPowerType.LIGHTNING,
  AttackPowerType.HOLY,
]

export const allStatusTypes: AttackPowerType[] = [
  AttackPowerType.POISON,
  AttackPowerType.SCARLET_ROT,
  AttackPowerType.BLEED,
  AttackPowerType.FROST,
  AttackPowerType.SLEEP,
  AttackPowerType.MADNESS,
  AttackPowerType.DEATH_BLIGHT,
]

export const damageTypeLabels: Record<number, string> = {
  [AttackPowerType.PHYSICAL]: 'Physical',
  [AttackPowerType.MAGIC]: 'Magic',
  [AttackPowerType.FIRE]: 'Fire',
  [AttackPowerType.LIGHTNING]: 'Lightning',
  [AttackPowerType.HOLY]: 'Holy',
}

export type AttackElementCorrect = Partial<
  Record<AttackPowerType, Partial<Record<Attribute, number | true>>>
>

export type CalcCorrectGraph = {
  maxVal: number
  maxGrowVal: number
  adjPt: number
}[]

export interface ReinforceParamWeapon {
  attack: Partial<Record<AttackPowerType, number>>
  attributeScaling: Record<Attribute, number>
  statusSpEffectId1?: number
  statusSpEffectId2?: number
  statusSpEffectId3?: number
}

export interface EncodedWeaponJson {
  name: string
  weaponName: string
  variant?: string
  url?: string | null
  affinityId: number
  weaponType: number
  requirements: Partial<Record<Attribute, number>>
  attributeScaling: (readonly [Attribute, number])[]
  attack: (readonly [AttackPowerType, number])[]
  statusSpEffectParamIds?: number[]
  reinforceTypeId: number
  attackElementCorrectId: number
  calcCorrectGraphIds?: Partial<Record<AttackPowerType, number>>
  paired?: boolean
  sorceryTool?: boolean
  incantationTool?: boolean
  dlc?: boolean
}

export interface EncodedRegulationDataJson {
  calcCorrectGraphs: { [id: number]: CalcCorrectGraph }
  attackElementCorrects: { [id: number]: AttackElementCorrect }
  reinforceTypes: { [id: number]: ReinforceParamWeapon[] }
  statusSpEffectParams: { [id: number]: Partial<Record<AttackPowerType, number>> }
  scalingTiers: [number, string][]
  weapons: EncodedWeaponJson[]
}

export interface Weapon {
  name: string
  weaponName: string
  variant?: string
  url: string | null
  affinityId: number
  weaponType: number
  requirements: Partial<Record<Attribute, number>>
  attributeScaling: Partial<Record<Attribute, number>>[]
  attack: Partial<Record<AttackPowerType, number>>[]
  attackElementCorrect: AttackElementCorrect
  calcCorrectGraphs: Record<AttackPowerType, number[]>
  paired?: boolean
  sorceryTool?: boolean
  incantationTool?: boolean
  scalingTiers: [number, string][]
  dlc: boolean
}

export const defaultDamageCalcCorrectGraphId = 0
export const defaultStatusCalcCorrectGraphId = 6

/** Precompute a CalcCorrectGraph into an array of scaling amounts at each stat level. */
function evaluateCalcCorrectGraph(calcCorrectGraph: CalcCorrectGraph): number[] {
  const arr: number[] = []

  for (let i = 1; i < calcCorrectGraph.length; i++) {
    const prevStage = calcCorrectGraph[i - 1]
    const stage = calcCorrectGraph[i]

    const minAttributeValue = i === 1 ? 1 : prevStage.maxVal + 1
    const maxAttributeValue = i === calcCorrectGraph.length - 1 ? 148 : stage.maxVal

    for (let attributeValue = minAttributeValue; attributeValue <= maxAttributeValue; attributeValue++) {
      if (!arr[attributeValue]) {
        let ratio = Math.max(
          0,
          Math.min(1, (attributeValue - prevStage.maxVal) / (stage.maxVal - prevStage.maxVal)),
        )

        if (prevStage.adjPt > 0) {
          ratio = ratio ** prevStage.adjPt
        } else if (prevStage.adjPt < 0) {
          ratio = 1 - (1 - ratio) ** -prevStage.adjPt
        }

        arr[attributeValue] =
          prevStage.maxGrowVal + (stage.maxGrowVal - prevStage.maxGrowVal) * ratio
      }
    }
  }

  return arr
}

/** Decode the game regulation data into a convenient object used by the calculator. */
export function decodeRegulationData({
  calcCorrectGraphs,
  attackElementCorrects,
  reinforceTypes,
  statusSpEffectParams,
  weapons,
  scalingTiers,
}: EncodedRegulationDataJson): Weapon[] {
  const calcCorrectGraphsById = new Map(
    Object.entries(calcCorrectGraphs).map(([id, graph]) => [+id, evaluateCalcCorrectGraph(graph)]),
  )

  const attackElementCorrectsById = new Map<number, AttackElementCorrect>(
    Object.entries(attackElementCorrects).map(([id, aec]) => [
      +id,
      {
        ...aec,
        // Status effects aren't stored in AttackElementCorrectParam because it's the same for all
        // weapons. Manually add it to all entries. In vanilla only these four scale with arcane;
        // Scarlet Rot, Frost and Death Blight do not (upstream gates them on the Reforged mod).
        [AttackPowerType.POISON]: { arc: true },
        [AttackPowerType.BLEED]: { arc: true },
        [AttackPowerType.MADNESS]: { arc: true },
        [AttackPowerType.SLEEP]: { arc: true },
        [AttackPowerType.SCARLET_ROT]: {},
        [AttackPowerType.FROST]: {},
        [AttackPowerType.DEATH_BLIGHT]: {},
      },
    ]),
  )

  return weapons.map(
    ({
      attackElementCorrectId,
      reinforceTypeId,
      calcCorrectGraphIds,
      statusSpEffectParamIds,
      attack: unupgradedAttack,
      attributeScaling: unupgradedAttributeScaling,
      dlc = false,
      ...weapon
    }): Weapon => {
      const attackElementCorrect = attackElementCorrectsById.get(attackElementCorrectId)
      if (attackElementCorrect == null) {
        throw new Error(
          `No AttackElementCorrectParam found for id=${attackElementCorrectId} weapon=${weapon.name}`,
        )
      }

      const reinforceParams = reinforceTypes[reinforceTypeId]
      if (reinforceParams == null) {
        throw new Error(
          `No ReinforceParamWeapon found for id=${reinforceTypeId} weapon=${weapon.name}`,
        )
      }

      function getCalcCorrectGraph(calcCorrectId: number) {
        const graph = calcCorrectGraphsById.get(calcCorrectId)
        if (graph == null) {
          throw new Error(`No CalcCorrectGraph found for id=${calcCorrectId} weapon=${weapon.name}`)
        }
        return graph
      }

      const weaponCalcCorrectGraphs = {} as Weapon['calcCorrectGraphs']
      allDamageTypes.forEach((damageType) => {
        weaponCalcCorrectGraphs[damageType] = getCalcCorrectGraph(
          calcCorrectGraphIds?.[damageType] ?? defaultDamageCalcCorrectGraphId,
        )
      })
      allStatusTypes.forEach((statusType) => {
        weaponCalcCorrectGraphs[statusType] = getCalcCorrectGraph(
          calcCorrectGraphIds?.[statusType] ?? defaultStatusCalcCorrectGraphId,
        )
      })

      const attack: Weapon['attack'] = reinforceParams.map((reinforceParam) => {
        const attackAtUpgradeLevel: Weapon['attack'][number] = {}

        unupgradedAttack.forEach(([attackPowerType, unupgradedAttackPower]) => {
          attackAtUpgradeLevel[attackPowerType] =
            unupgradedAttackPower * (reinforceParam.attack[attackPowerType] ?? 0)
        })

        const offsets = [
          reinforceParam.statusSpEffectId1,
          reinforceParam.statusSpEffectId2,
          reinforceParam.statusSpEffectId3,
        ]

        statusSpEffectParamIds?.forEach((spEffectParamId, i) => {
          if (spEffectParamId) {
            const statusSpEffectParam = statusSpEffectParams[spEffectParamId + (offsets[i] ?? 0)]
            if (statusSpEffectParam) Object.assign(attackAtUpgradeLevel, statusSpEffectParam)
          }
        })

        return attackAtUpgradeLevel
      })

      const attributeScaling: Weapon['attributeScaling'] = reinforceParams.map((reinforceParam) => {
        const attributeScalingAtUpgradeLevel: Weapon['attributeScaling'][number] = {}
        unupgradedAttributeScaling.forEach(([attribute, unupgradedScaling]) => {
          attributeScalingAtUpgradeLevel[attribute] =
            unupgradedScaling * reinforceParam.attributeScaling[attribute]
        })
        return attributeScalingAtUpgradeLevel
      })

      return {
        ...weapon,
        url:
          weapon.url === undefined
            ? `https://eldenring.wiki.gg/wiki/${weapon.weaponName.replaceAll(' ', '_')}`
            : weapon.url,
        attack,
        attributeScaling,
        attackElementCorrect,
        calcCorrectGraphs: weaponCalcCorrectGraphs,
        scalingTiers,
        dlc,
      }
    },
  )
}

/**
 * Adjust a set of character attributes to take into account the 50% Strength bonus when two
 * handing a weapon.
 */
export function adjustAttributesForTwoHanding({
  twoHanding = false,
  weapon,
  attributes,
}: {
  twoHanding?: boolean
  weapon: Weapon
  attributes: Attributes
}): Attributes {
  let twoHandingBonus = twoHanding

  // Paired weapons do not get the two handing bonus
  if (weapon.paired) twoHandingBonus = false

  // Bows and ballistae can only be two handed
  if ([50, 51, 53, 56].includes(weapon.weaponType)) twoHandingBonus = true

  if (twoHandingBonus) {
    return { ...attributes, str: Math.floor(attributes.str * 1.5) }
  }

  return attributes
}

export interface WeaponAttackResult {
  upgradeLevel: number
  attackPower: Partial<Record<AttackPowerType, number>>
  ineffectiveAttributes: Attribute[]
  ineffectiveAttackPowerTypes: AttackPowerType[]
}

interface WeaponAttackOptions {
  weapon: Weapon
  attributes: Attributes
  twoHanding?: boolean
  upgradeLevel: number
  ineffectiveAttributePenalty?: number
}

/** Determine the damage for a weapon with the given player stats. */
export function getWeaponAttack({
  weapon,
  attributes,
  twoHanding,
  upgradeLevel,
  ineffectiveAttributePenalty = 0.4,
}: WeaponAttackOptions): WeaponAttackResult {
  const adjustedAttributes = adjustAttributesForTwoHanding({ twoHanding, weapon, attributes })

  const ineffectiveAttributes = (
    Object.entries(weapon.requirements) as [Attribute, number][]
  )
    .filter(([attribute, requirement]) => adjustedAttributes[attribute] < requirement)
    .map(([attribute]) => attribute)

  const ineffectiveAttackPowerTypes: AttackPowerType[] = []

  const attackPower: Partial<Record<AttackPowerType, number>> = {}

  for (const attackPowerType of [...allDamageTypes, ...allStatusTypes]) {
    const isDamageType = allDamageTypes.includes(attackPowerType)

    const baseAttackPower = weapon.attack[upgradeLevel]?.[attackPowerType] ?? 0
    if (baseAttackPower || weapon.sorceryTool || weapon.incantationTool) {
      const scalingAttributes = weapon.attackElementCorrect[attackPowerType] ?? {}

      let totalScaling = 1

      if (ineffectiveAttributes.some((attribute) => scalingAttributes[attribute])) {
        totalScaling = 1 - ineffectiveAttributePenalty
        ineffectiveAttackPowerTypes.push(attackPowerType)
      } else {
        const effectiveAttributes = isDamageType ? adjustedAttributes : attributes
        for (const attribute of allAttributes) {
          const attributeCorrect = scalingAttributes[attribute]
          if (attributeCorrect) {
            let scaling: number
            if (attributeCorrect === true) {
              scaling = weapon.attributeScaling[upgradeLevel]?.[attribute] ?? 0
            } else {
              const baseScaling = weapon.attributeScaling[0]?.[attribute] ?? 0
              scaling =
                (attributeCorrect * (weapon.attributeScaling[upgradeLevel]?.[attribute] ?? 0)) /
                baseScaling
            }

            if (scaling) {
              totalScaling +=
                weapon.calcCorrectGraphs[attackPowerType][effectiveAttributes[attribute]] * scaling
            }
          }
        }
      }

      if (baseAttackPower) {
        attackPower[attackPowerType] = baseAttackPower * totalScaling
      }
    }
  }

  return {
    upgradeLevel,
    attackPower,
    ineffectiveAttributes,
    ineffectiveAttackPowerTypes,
  }
}

/** Sum of the five damage types. Status buildup is not part of attack rating. */
export function totalDamage(attackPower: Partial<Record<AttackPowerType, number>>): number {
  return allDamageTypes.reduce<number>((total, type) => total + (attackPower[type] ?? 0), 0)
}

/** The number the game (and Clark's calculator) displays. */
export function displayAttackRating(attackPower: Partial<Record<AttackPowerType, number>>): number {
  return Math.floor(totalDamage(attackPower) + 0.000000001)
}

const affinityIds: Record<string, number> = {
  standard: 0,
  heavy: 1,
  keen: 2,
  quality: 3,
  fire: 4,
  'flame art': 5,
  lightning: 6,
  sacred: 7,
  magic: 8,
  cold: 9,
  poison: 10,
  blood: 11,
  occult: 12,
  unique: -1,
}

const affinityLabels: Record<number, string> = {
  0: 'Standard',
  1: 'Heavy',
  2: 'Keen',
  3: 'Quality',
  4: 'Fire',
  5: 'Flame Art',
  6: 'Lightning',
  7: 'Sacred',
  8: 'Magic',
  9: 'Cold',
  10: 'Poison',
  11: 'Blood',
  12: 'Occult',
  '-1': 'Unique',
}

export function affinityLabel(affinityId: number): string {
  return affinityLabels[affinityId] ?? String(affinityId)
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Find the regulation weapon row matching a loadout slot. Matches by full unique name first
 * (e.g. "Heavy Nightrider Glaive"), then by base weapon name plus affinity. Returns undefined
 * when the weapon is not in the vanilla 1.17 regulation data, so callers can show an honest
 * "unavailable" instead of a guessed number.
 */
export function findWeapon(weapons: Weapon[], slot: LoadoutSlot): Weapon | undefined {
  const wantedAffinity = slot.affinity ? affinityIds[norm(slot.affinity)] : undefined
  const name = norm(slot.name)

  function pick(candidates: Weapon[]): Weapon | undefined {
    if (wantedAffinity !== undefined) {
      const match = candidates.find((w) => w.affinityId === wantedAffinity)
      if (match) return match
    }
    return (
      candidates.find((w) => w.affinityId === 0) ??
      candidates.find((w) => w.affinityId === -1) ??
      candidates[0]
    )
  }

  const byFullName = weapons.filter((w) => norm(w.name) === name)
  if (byFullName.length) {
    const match = pick(byFullName)
    if (match && (wantedAffinity === undefined || match.affinityId === wantedAffinity)) return match
  }

  const byBaseName = weapons.filter((w) => norm(w.weaponName) === name)
  if (!byBaseName.length) return undefined
  return pick(byBaseName)
}

export function statsToAttributes(stats: Stats): Attributes {
  return {
    str: stats.strength,
    dex: stats.dexterity,
    int: stats.intelligence,
    fai: stats.faith,
    arc: stats.arcane,
  }
}

export type AttackRating =
  | {
      status: 'ok'
      weaponName: string
      affinity: string
      upgradeLevel: number
      total: number
      breakdown: Partial<Record<AttackPowerType, number>>
      ineffectiveAttributes: Attribute[]
    }
  | { status: 'unknown'; weaponName: string; reason: string }

/** Attack rating for one loadout armament, or an explicit unknown. */
export function attackRatingForSlot(
  weapons: Weapon[],
  slot: LoadoutSlot,
  stats: Stats,
  twoHanding: boolean,
): AttackRating {
  const weapon = findWeapon(weapons, slot)
  if (!weapon) {
    return {
      status: 'unknown',
      weaponName: slot.name,
      reason: `No vanilla 1.17 regulation data for "${slot.name}"${slot.affinity ? ` (${slot.affinity})` : ''}`,
    }
  }

  const maxUpgrade = weapon.attack.length - 1
  const upgradeLevel = Math.max(0, Math.min(slot.upgrade ?? 0, maxUpgrade))

  const result = getWeaponAttack({
    weapon,
    attributes: statsToAttributes(stats),
    twoHanding,
    upgradeLevel,
  })

  return {
    status: 'ok',
    weaponName: weapon.name,
    affinity: affinityLabel(weapon.affinityId),
    upgradeLevel,
    total: displayAttackRating(result.attackPower),
    breakdown: result.attackPower,
    ineffectiveAttributes: result.ineffectiveAttributes,
  }
}

let weaponsCache: Weapon[] | null = null

/** Load and decode the vendored vanilla 1.17 regulation data once. */
export async function loadWeapons(): Promise<Weapon[]> {
  if (weaponsCache) return weaponsCache
  const res = await fetch('/sourced/regulation-vanilla-v1.17.json')
  if (!res.ok) throw new Error(`regulation data unavailable (${res.status})`)
  const data = (await res.json()) as EncodedRegulationDataJson
  weaponsCache = decodeRegulationData(data)
  return weaponsCache
}
