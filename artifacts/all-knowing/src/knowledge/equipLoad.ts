/**
 * Task 94 — maximum Equip Load by Endurance.
 *
 * The Gear sheet needs a real max-load number to show an equip-load percentage.
 * The in-repo regulation extract only computes attack rating, so this is the
 * game's published per-point table (Elden Ring wiki "Equip Load", CC BY-SA 4.0;
 * see THIRD_PARTY_NOTICES.md). It is a factual lookup, not an invented formula.
 *
 * Endurance 8 is the lowest a starting class has; values below clamp to 45.
 */
const MAX_EQUIP_LOAD_BY_ENDURANCE: number[] = [
  /*  8 */ 45.0,
  /*  9 */ 46.6,
  /* 10 */ 48.2,
  /* 11 */ 49.8,
  /* 12 */ 51.4,
  /* 13 */ 52.9,
  /* 14 */ 54.5,
  /* 15 */ 56.1,
  /* 16 */ 57.7,
  /* 17 */ 59.3,
  /* 18 */ 60.9,
  /* 19 */ 62.5,
  /* 20 */ 64.1,
  /* 21 */ 65.6,
  /* 22 */ 67.2,
  /* 23 */ 68.8,
  /* 24 */ 70.4,
  /* 25 */ 72.0,
  /* 26 */ 73.0,
  /* 27 */ 74.1,
  /* 28 */ 75.2,
  /* 29 */ 76.4,
  /* 30 */ 77.6,
  /* 31 */ 78.9,
  /* 32 */ 80.2,
  /* 33 */ 81.5,
  /* 34 */ 82.8,
  /* 35 */ 84.1,
  /* 36 */ 85.4,
  /* 37 */ 86.8,
  /* 38 */ 88.1,
  /* 39 */ 89.5,
  /* 40 */ 90.9,
  /* 41 */ 92.3,
  /* 42 */ 93.7,
  /* 43 */ 95.1,
  /* 44 */ 96.5,
  /* 45 */ 97.9,
  /* 46 */ 99.4,
  /* 47 */ 100.8,
  /* 48 */ 102.2,
  /* 49 */ 103.7,
  /* 50 */ 105.2,
  /* 51 */ 106.6,
  /* 52 */ 108.1,
  /* 53 */ 109.6,
  /* 54 */ 111.0,
  /* 55 */ 112.5,
  /* 56 */ 114.0,
  /* 57 */ 115.5,
  /* 58 */ 117.0,
  /* 59 */ 118.5,
  /* 60 */ 120.0,
  /* 61 */ 121.0,
  /* 62 */ 122.1,
  /* 63 */ 123.1,
  /* 64 */ 124.1,
  /* 65 */ 125.1,
  /* 66 */ 126.2,
  /* 67 */ 127.2,
  /* 68 */ 128.2,
  /* 69 */ 129.2,
  /* 70 */ 130.3,
  /* 71 */ 131.3,
  /* 72 */ 132.3,
  /* 73 */ 133.3,
  /* 74 */ 134.4,
  /* 75 */ 135.4,
  /* 76 */ 136.4,
  /* 77 */ 137.4,
  /* 78 */ 138.5,
  /* 79 */ 139.5,
  /* 80 */ 140.5,
  /* 81 */ 141.5,
  /* 82 */ 142.6,
  /* 83 */ 143.6,
  /* 84 */ 144.6,
  /* 85 */ 145.6,
  /* 86 */ 146.7,
  /* 87 */ 147.7,
  /* 88 */ 148.7,
  /* 89 */ 149.7,
  /* 90 */ 150.8,
  /* 91 */ 151.8,
  /* 92 */ 152.8,
  /* 93 */ 153.8,
  /* 94 */ 154.9,
  /* 95 */ 155.9,
  /* 96 */ 156.9,
  /* 97 */ 157.9,
  /* 98 */ 159.0,
  /* 99 */ 160.0,
]

export const MIN_EQUIP_LOAD_ENDURANCE = 8
export const MAX_EQUIP_LOAD = MAX_EQUIP_LOAD_BY_ENDURANCE[MAX_EQUIP_LOAD_BY_ENDURANCE.length - 1]

export function maxEquipLoad(endurance: number): number {
  const e = Math.floor(Number.isFinite(endurance) ? endurance : MIN_EQUIP_LOAD_ENDURANCE)
  if (e <= MIN_EQUIP_LOAD_ENDURANCE) return MAX_EQUIP_LOAD_BY_ENDURANCE[0]
  if (e >= 99) return MAX_EQUIP_LOAD
  return MAX_EQUIP_LOAD_BY_ENDURANCE[e - MIN_EQUIP_LOAD_ENDURANCE]
}

export type LoadClass = 'light' | 'medium' | 'heavy' | 'overloaded'

/** <30% light, 30–70% medium, >70% heavy, >100% overloaded (game menu rules). */
export function loadClass(ratio: number): LoadClass {
  if (!Number.isFinite(ratio) || ratio <= 0) return 'light'
  if (ratio > 1) return 'overloaded'
  if (ratio > 0.7) return 'heavy'
  if (ratio >= 0.3) return 'medium'
  return 'light'
}
