import { emptyCharacter } from '../../../data/seed'
import type { Character, LoadoutSlot } from '../../../types'
import { applyFacts } from '../../infer'

/**
 * Task 138 §1 — the user's own character, reconstructed from the Task 134 PS5
 * captures.
 *
 * Source of truth is `src/lib/__fixtures__/ps5/ground-truth.json` plus what the
 * photos visibly show. Every read carries a `certain` flag: only evidence we can
 * actually read is applied to the character; icon-only cells whose identity we
 * cannot prove stay on `scenarioReads` with `certain: false` and are never fed to
 * the inference pipeline. Nothing here is invented — an id that could not be
 * established is recorded as `unidentified`, not guessed.
 */

export type ScenarioRead = {
  id: string
  label: string
  /** Which capture / ground-truth section proves it. */
  source: string
  /** Applied to the character only when true. */
  certain: boolean
  note?: string
}

export const SCENARIO_NAME = 'UrMumMyToilet'
export const SCENARIO_LEVEL = 87
export const SCENARIO_RUNES_HELD = 45381

/**
 * Base stats, not the displayed ones: the Status photo shows 64/14/27/21/23/9/15/13
 * (sum 186 ⇒ level 107), and the +20 in Vig/End/Str/Dex is exactly Radagon's
 * Soreseal, so the base spread is 59/14/22/16/18/9/15/13 (sum 166 ⇒ level 87).
 * See the `_statsNote` in ground-truth.json.
 */
export const SCENARIO_BASE_STATS = {
  vigor: 59,
  mind: 14,
  endurance: 22,
  strength: 16,
  dexterity: 18,
  intelligence: 9,
  faith: 15,
  arcane: 13,
} as const

/** Revealed map regions as the Task 135 photo reader would classify them. */
export const SCENARIO_REVEALED_REGIONS = [
  'Limgrave',
  'Weeping Peninsula',
  'Liurnia of the Lakes',
  'Caelid',
  'Dragonbarrow',
  'Altus Plateau',
  'Leyndell, Royal Capital',
  'Mountaintops of the Giants (partial)',
  'Ainsel River (underground)',
  'Siofra River (underground)',
] as const

export const scenarioReads: ScenarioRead[] = [
  // --- Equipment (equipment-photo-01 / equipment-talisman-list-01) ---------
  {
    id: 'item:reed-great-katana',
    label: 'Blood Reed Great Katana +14 (Lion’s Claw)',
    source: 'equipment-photo-01',
    certain: true,
    note: 'Right Hand Armament 1: Blood affinity, +14, Lion’s Claw, blood loss buildup.',
  },
  {
    id: 'item:radagon-s-soreseal',
    label: "Radagon's Soreseal",
    source: 'status-photo-01 + equipment-photo-01',
    certain: true,
    note: 'Talisman 1 slot; the +5 Vig/End/Str/Dex in the Status photo is its signature.',
  },
  {
    id: 'item:green-turtle-talisman',
    label: 'Green Turtle Talisman',
    source: 'equipment-talisman-list-01',
    certain: true,
    note: 'Selected cell in the Talisman 1 picker; carries the equipped badge.',
  },
  {
    id: 'talisman:unidentified-row4-a',
    label: 'Unidentified talisman (row 4, cell 1: silver winged crest)',
    source: 'equipment-photo-01',
    certain: false,
    note: 'A fourth talisman is equipped; the icon read is not conclusive, so it stays unidentified.',
  },
  {
    id: 'talisman:unidentified-row4-b',
    label: 'Unidentified talisman (row 4, cell 4: portrait cameo)',
    source: 'equipment-photo-01',
    certain: false,
    note: 'A fourth talisman is equipped; the icon read is not conclusive, so it stays unidentified.',
  },

  // --- Inventory: key items (inventory-tools-01 / inventory-key-items-01) ---
  {
    id: 'item:remembrance-starscourge',
    label: 'Remembrance of the Starscourge',
    source: 'inventory-tools-01',
    certain: true,
    note: 'Tools row 3 holds 5 remembrances; this is the one identified with confidence.',
  },
  {
    id: 'item:holy-shrouding-cracked-tear',
    label: 'Holy-shrouding Cracked Tear',
    source: 'inventory-key-items-01',
    certain: true,
    note: 'Header of the Key Items page.',
  },
  {
    id: 'item:remembrance-unidentified-2',
    label: 'Unidentified remembrance (Tools row 3, cell 2: golden winged beast)',
    source: 'inventory-tools-01',
    certain: false,
    note: 'Four further remembrances are held (five in total); their icons are not conclusive.',
  },
  {
    id: 'item:remembrance-unidentified-3',
    label: 'Unidentified remembrance (Tools row 3, cell 3: blue glowing blade)',
    source: 'inventory-tools-01',
    certain: false,
  },
  {
    id: 'item:remembrance-unidentified-4',
    label: 'Unidentified remembrance (Tools row 3, cell 4: orange flame beast)',
    source: 'inventory-tools-01',
    certain: false,
  },
  {
    id: 'item:remembrance-unidentified-5',
    label: 'Unidentified remembrance (Tools row 3, cell 5: golden lion)',
    source: 'inventory-tools-01',
    certain: false,
  },

  // --- Revealed map fragments (map-overworld-01 / map-overworld-north-01) ---
  // A painted fragment is owned, and owning it means the region was physically
  // reached. These ids come from `src/knowledge/collectibles.ts` mapFragments.
  { id: 'mapfrag:limgrave-w', label: 'Map: Limgrave, West', source: 'map-overworld-01', certain: true },
  { id: 'mapfrag:limgrave-e', label: 'Map: Limgrave, East', source: 'map-overworld-01', certain: true },
  { id: 'mapfrag:weeping', label: 'Map: Weeping Peninsula', source: 'map-overworld-01', certain: true },
  { id: 'mapfrag:liurnia-e', label: 'Map: Liurnia, East', source: 'map-overworld-01', certain: true },
  { id: 'mapfrag:liurnia-n', label: 'Map: Liurnia, North', source: 'map-overworld-north-01', certain: true },
  { id: 'mapfrag:liurnia-w', label: 'Map: Liurnia, West', source: 'map-overworld-north-01', certain: true },
  { id: 'mapfrag:caelid', label: 'Map: Caelid', source: 'map-overworld-01', certain: true },
  {
    id: 'mapfrag:dragonbarrow',
    label: 'Map: Dragonbarrow (partial)',
    source: 'map-overworld-north-01',
    certain: true,
    note: 'The northern plateau is painted but only partly in frame.',
  },
  { id: 'mapfrag:altus', label: 'Map: Altus Plateau', source: 'map-overworld-north-01', certain: true },
  { id: 'mapfrag:leyndell', label: 'Map: Leyndell, Royal Capital', source: 'map-overworld-north-01', certain: true },
  {
    id: 'mapfrag:mountaintops-w',
    label: 'Map: Mountaintops of the Giants, West (partial)',
    source: 'map-overworld-north-01',
    certain: true,
    note: 'Snow terrain is painted but the far north is still fog.',
  },

  // --- Underground (map-underground-01) ------------------------------------
  {
    id: 'grace:siofra',
    label: 'Siofra River Bank',
    source: 'map-underground-01',
    certain: true,
    note: '~11 Siofra graces snapped; Siofra River Well was used.',
  },
  {
    id: 'grace:ainsel',
    label: 'Ainsel River Well Depths',
    source: 'map-underground-01',
    certain: true,
    note: '~5 Ainsel graces snapped; the Ainsel River Well was reached.',
  },

  // --- Leyndell graces (map-overworld-north-01) ----------------------------
  {
    id: 'grace:east-capital',
    label: 'East Capital Rampart',
    source: 'map-overworld-north-01',
    certain: true,
    note: 'A discovered grace inside the capital.',
  },
]

/** Only the reads we can actually prove, for the inference pipeline. */
export const scenarioDirectFacts: string[] = scenarioReads.filter((r) => r.certain).map((r) => r.id)

/** Reads the photos show but cannot be identified with confidence. */
export const scenarioUncertainReads: ScenarioRead[] = scenarioReads.filter((r) => !r.certain)

/** What the Equipment screen shows in the gear sheet (identified pieces only). */
export const scenarioLoadout: LoadoutSlot[] = [
  {
    id: 'item:reed-great-katana',
    name: 'Reed Great Katana',
    kind: 'armament',
    affinity: 'Blood',
    upgrade: 14,
    slot: 'right-1',
  },
  { id: 'item:radagon-s-soreseal', name: "Radagon's Soreseal", kind: 'talisman', slot: 'talisman-1' },
  { id: 'talisman:unidentified-row4-a', name: 'Unidentified talisman', kind: 'talisman', slot: 'talisman-2' },
  { id: 'item:green-turtle-talisman', name: 'Green Turtle Talisman', kind: 'talisman', slot: 'talisman-3' },
  { id: 'talisman:unidentified-row4-b', name: 'Unidentified talisman', kind: 'talisman', slot: 'talisman-4' },
]

/** The character with only the certain reads applied and inference run. */
export function scenarioCharacter(): Character {
  const base: Character = {
    ...emptyCharacter,
    source: 'reckon',
    name: SCENARIO_NAME,
    level: SCENARIO_LEVEL,
    runesHeld: SCENARIO_RUNES_HELD,
    stats: { ...SCENARIO_BASE_STATS },
    baseStats: { ...SCENARIO_BASE_STATS },
    loadout: scenarioLoadout,
    answers: { platform: 'ps5' },
  }
  return applyFacts(base, scenarioDirectFacts, 'screenshot', 'scenario:urmummytoilet')
}
