import type { StartingClass, StatKey, ScalingGrade, Weapon } from "./types";
import { CLASSES } from "./classes";

/** Official-feeling vigor HP table (community-verified, patch 1.10+). */
const VIGOR_HP: number[] = [
  0, 300, 304, 312, 322, 334, 347, 362, 378, 396, 414, 434, 455, 476, 499, 522, 547, 572, 598, 624, 652,
  680, 709, 738, 769, 800, 833, 870, 910, 951, 994, 1037, 1081, 1125, 1170, 1216, 1262, 1308, 1355, 1402, 1450,
  1476, 1503, 1529, 1555, 1581, 1606, 1631, 1656, 1680, 1704, 1727, 1750, 1772, 1793, 1814, 1834, 1853, 1871, 1887, 1900,
  1909, 1917, 1926, 1934, 1942, 1949, 1956, 1962, 1968, 1974, 1979, 1984, 1988, 1992, 1996, 1999, 2002, 2005, 2007, 2009,
  2011, 2012, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2020, 2021, 2021, 2022, 2022, 2023, 2023, 2024, 2024, 2025, 2027,
];

const MIND_FP: number[] = [
  0, 50, 53, 57, 62, 67, 72, 77, 82, 87, 93, 98, 103, 109, 114, 120, 125, 130, 136, 141, 146, 152, 157, 162, 168, 173,
  178, 184, 189, 194, 200, 207, 214, 221, 228, 235, 242, 248, 255, 261, 268, 274, 280, 286, 292, 298, 304, 310, 316, 321,
  327, 332, 337, 342, 346, 351, 355, 359, 362, 366, 370, 373, 376, 379, 381, 384, 386, 388, 390, 392, 394, 395, 397, 398,
  399, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 411, 412, 413, 413, 414, 414, 415, 415, 416, 416, 417, 417,
  418, 418, 419, 450,
];

const END_STAM: number[] = [
  0, 80, 81, 83, 85, 87, 89, 91, 93, 95, 97, 99, 101, 104, 106, 109, 111, 113, 116, 118, 121, 123, 126, 128, 131, 133,
  136, 139, 141, 144, 146, 149, 152, 154, 157, 160, 162, 165, 167, 170, 172, 175, 177, 179, 182, 184, 186, 189, 191, 193,
  195, 197, 199, 201, 203, 205, 207, 209, 211, 213, 215, 216, 218, 219, 221, 222, 224, 225, 226, 228, 229, 230, 232, 233,
  234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 244, 245, 246, 247, 247, 248, 249, 249, 250, 250, 251, 252, 252,
  253, 253, 254, 255,
];

function clampStat(n: number) {
  return Math.max(1, Math.min(99, Math.round(n)));
}

export function hpAt(vigor: number) {
  return VIGOR_HP[clampStat(vigor)] ?? 300;
}
export function fpAt(mind: number) {
  return MIND_FP[clampStat(mind)] ?? 50;
}
export function stamAt(end: number) {
  return END_STAM[clampStat(end)] ?? 80;
}

/** Equip load from endurance (community table). */
export function equipLoadAt(end: number) {
  const e = clampStat(end);
  if (e <= 8) return 45 + e * 1.2;
  if (e <= 25) return 45 + (e - 8) * 1.5 + 8 * 1.2;
  if (e <= 60) return 72.6 + (e - 25) * 1.0;
  return 107.6 + (e - 60) * 0.5;
}

export function rollClass(load: number, max: number) {
  const r = load / max;
  if (r <= 0.3) return { label: "Light", hint: "Fast roll, extra i-frames" };
  if (r <= 0.7) return { label: "Medium", hint: "Standard roll" };
  if (r < 1) return { label: "Heavy", hint: "Fat roll — avoid" };
  return { label: "Overloaded", hint: "Cannot roll" };
}

/** Rune cost to go from level L to L+1. */
export function runeCostToNext(level: number) {
  const x = Math.max(1, level);
  const a = 0.02 * x ** 3 + 3.06 * x ** 2 + 105.6 * x - 895;
  return Math.max(0, Math.round(a));
}

export function runesToLevel(from: number, to: number) {
  let sum = 0;
  for (let l = from; l < to; l++) sum += runeCostToNext(l);
  return sum;
}

export function classLevel(stats: Record<StatKey, number>, cls: StartingClass) {
  const keys: StatKey[] = ["vig", "mnd", "end", "str", "dex", "int", "fai", "arc"];
  const spent = keys.reduce((n, k) => n + (stats[k] - cls.stats[k]), 0);
  return cls.level + spent;
}

export function wastedPoints(target: Record<StatKey, number>, cls: StartingClass) {
  const keys: StatKey[] = ["vig", "mnd", "end", "str", "dex", "int", "fai", "arc"];
  return keys.reduce((n, k) => n + Math.max(0, cls.stats[k] - target[k]), 0);
}

export function bestClassFor(target: Record<StatKey, number>) {
  return [...CLASSES].sort((a, b) => {
    const wa = wastedPoints(target, a);
    const wb = wastedPoints(target, b);
    if (wa !== wb) return wa - wb;
    return classLevel(target, a) - classLevel(target, b);
  })[0];
}

const GRADE: Record<ScalingGrade, number> = {
  S: 1.0,
  A: 0.85,
  B: 0.65,
  C: 0.42,
  D: 0.25,
  E: 0.12,
  "-": 0,
};

/** Elden Ring-style soft-cap correction (approx. standard graph). */
export function correction(stat: number) {
  const s = clampStat(stat);
  if (s <= 18) return (s / 18) * 0.25;
  if (s <= 60) return 0.25 + ((s - 18) / 42) * 0.5;
  if (s <= 80) return 0.75 + ((s - 60) / 20) * 0.15;
  return 0.9 + ((s - 80) / 19) * 0.1;
}

export function upgradeMul(level: number, somber: boolean) {
  if (somber) return 1 + Math.min(10, level) * 0.1;
  return 1 + Math.min(25, level) * 0.04;
}

export function weaponAR(
  w: Weapon,
  stats: Record<StatKey, number>,
  upgrade: number,
  twoHand = false,
) {
  const mul = upgradeMul(upgrade, w.upgrade === "somber");
  const str = twoHand ? Math.floor(stats.str * 1.5) : stats.str;
  const scaled = (base: number, key: StatKey) => {
    const g = w.scaling[key];
    if (!g || g === "-") return 0;
    const st = key === "str" ? str : stats[key];
    return base * GRADE[g] * correction(st);
  };
  const physBase = w.phys * mul;
  const magBase = (w.mag ?? 0) * mul;
  const fireBase = (w.fire ?? 0) * mul;
  const lightBase = (w.light ?? 0) * mul;
  const holyBase = (w.holy ?? 0) * mul;
  const phys =
    physBase +
    scaled(physBase, "str") +
    scaled(physBase, "dex") +
    scaled(physBase, "arc") * 0.4;
  const mag = magBase + scaled(magBase, "int");
  const fire = fireBase + scaled(fireBase, "fai");
  const light = lightBase + scaled(lightBase, "dex");
  const holy = holyBase + scaled(holyBase, "fai");
  const total = phys + mag + fire + light + holy;
  return {
    phys: Math.round(phys),
    mag: Math.round(mag),
    fire: Math.round(fire),
    light: Math.round(light),
    holy: Math.round(holy),
    total: Math.round(total),
  };
}

export function meetsReq(w: Weapon, stats: Record<StatKey, number>, twoHand = false) {
  const str = twoHand ? Math.floor(stats.str * 1.5) : stats.str;
  const keys: StatKey[] = ["str", "dex", "int", "fai", "arc"];
  return keys.every((k) => {
    const need = w.req[k] ?? 0;
    const have = k === "str" ? str : stats[k];
    return have >= need;
  });
}

/** Coop/invasion matchmaking window (base game formula). */
export function summonRange(level: number) {
  const lower = Math.floor(level - 10 - level * 0.1);
  const upper = Math.floor(level + 10 + level * 0.1);
  return { lower: Math.max(1, lower), upper };
}

export const FLASK_CHARGES = [
  { seeds: 0, flasks: 4 },
  { seeds: 1, flasks: 5 },
  { seeds: 3, flasks: 6 },
  { seeds: 5, flasks: 7 },
  { seeds: 7, flasks: 8 },
  { seeds: 9, flasks: 9 },
  { seeds: 11, flasks: 10 },
  { seeds: 13, flasks: 11 },
  { seeds: 15, flasks: 12 },
  { seeds: 17, flasks: 13 },
  { seeds: 20, flasks: 14 },
];

export function flasksFromSeeds(seeds: number) {
  let flasks = 4;
  for (const row of FLASK_CHARGES) if (seeds >= row.seeds) flasks = row.flasks;
  return flasks;
}

export function scadutreeBlessing(fragments: number) {
  const table = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 45, 48, 50];
  let b = 0;
  for (let i = 0; i < table.length; i++) if (fragments >= table[i]) b = i;
  return Math.min(20, b);
}

export const SOFT_CAPS: { stat: StatKey; caps: number[]; note: string }[] = [
  { stat: "vig", caps: [40, 60], note: "HP hard-caps after 60. Stop at 40 for hybrid, 60 for melee." },
  { stat: "mnd", caps: [40, 60], note: "FP. 20–25 covers most melee; 38 for Comet Azur." },
  { stat: "end", caps: [30, 50], note: "Stamina + equip load. 25–40 is the practical band." },
  { stat: "str", caps: [54, 80], note: "54 two-hand = 80 effective. 80 is the last useful cap." },
  { stat: "dex", caps: [55, 80], note: "Cast speed scales to 70 virtual DEX. Keen weapons love 55–80." },
  { stat: "int", caps: [60, 80], note: "Sorcery scaling. 60 for most, 80 for moon/primeval." },
  { stat: "fai", caps: [60, 80], note: "Incantations and flame art. 25 for utility buffs." },
  { stat: "arc", caps: [45, 60], note: "Status buildup + dragon communion. Occult weapons 45–60." },
];
