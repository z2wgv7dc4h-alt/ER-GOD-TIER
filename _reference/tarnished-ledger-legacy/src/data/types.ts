export type Region =
  | "Limgrave"
  | "Weeping Peninsula"
  | "Liurnia of the Lakes"
  | "Caelid"
  | "Dragonbarrow"
  | "Altus Plateau"
  | "Mt. Gelmir"
  | "Leyndell"
  | "Capital Outskirts"
  | "Siofra River"
  | "Ainsel River"
  | "Deeproot Depths"
  | "Mountaintops of the Giants"
  | "Consecrated Snowfield"
  | "Mohgwyn Palace"
  | "Miquella's Haligtree"
  | "Crumbling Farum Azula"
  | "Ashen Capital"
  | "Roundtable Hold"
  | "Gravesite Plain"
  | "Scadu Altus"
  | "Rauh Base"
  | "Abyssal Woods"
  | "Jagged Peak"
  | "Cerulean Coast"
  | "Charo's Hidden Grave"
  | "Shadow Keep"
  | "Enir-Ilim";

export type DlcFlag = "base" | "sote" | "tarnished";

export type BossKind =
  | "remembrance"
  | "great"
  | "legendary"
  | "dungeon"
  | "field"
  | "evergaol"
  | "invasion"
  | "night"
  | "world";

export type StatKey = "vig" | "mnd" | "end" | "str" | "dex" | "int" | "fai" | "arc";

export type ScalingGrade = "S" | "A" | "B" | "C" | "D" | "E" | "-";

export type Affinity =
  | "Standard"
  | "Heavy"
  | "Keen"
  | "Quality"
  | "Fire"
  | "Flame Art"
  | "Lightning"
  | "Sacred"
  | "Magic"
  | "Cold"
  | "Poison"
  | "Blood"
  | "Occult";

export type WeaponClass =
  | "Dagger"
  | "Straight Sword"
  | "Greatsword"
  | "Colossal Sword"
  | "Thrusting Sword"
  | "Heavy Thrusting Sword"
  | "Curved Sword"
  | "Curved Greatsword"
  | "Katana"
  | "Twinblade"
  | "Axe"
  | "Greataxe"
  | "Hammer"
  | "Flail"
  | "Great Hammer"
  | "Colossal Weapon"
  | "Spear"
  | "Great Spear"
  | "Halberd"
  | "Reaper"
  | "Whip"
  | "Fist"
  | "Claw"
  | "Light Bow"
  | "Bow"
  | "Greatbow"
  | "Crossbow"
  | "Ballista"
  | "Glintstone Staff"
  | "Sacred Seal"
  | "Torch"
  | "Small Shield"
  | "Medium Shield"
  | "Greatshield"
  | "Backhand Blade"
  | "Light Greatsword"
  | "Great Katana"
  | "Beast Claw"
  | "Perfume Bottle"
  | "Throwing Blade"
  | "Hand-to-Hand"
  | "Thrusting Shield";

export interface StartingClass {
  id: string;
  name: string;
  level: number;
  stats: Record<StatKey, number>;
  summary: string;
}

export interface Boss {
  id: string;
  name: string;
  region: Region;
  location: string;
  kind: BossKind;
  dlc: DlcFlag;
  drops: string;
  notes?: string;
  missable?: boolean;
}

export interface UpgradeItem {
  id: string;
  name: string;
  category: "golden-seed" | "sacred-tear" | "scadutree" | "rsa" | "larval" | "whetblade" | "bell-bearing" | "memory-stone" | "steed" | "map" | "rune";
  region: Region;
  location: string;
  dlc: DlcFlag;
  notes?: string;
}

export interface SiteOfGrace {
  id: string;
  name: string;
  region: Region;
  dlc: DlcFlag;
  notes?: string;
}

export interface QuestStep {
  id: string;
  text: string;
  where: string;
  missable?: boolean;
  warning?: string;
  fork?: string;
  sets?: string[];
}

export interface Questline {
  id: string;
  name: string;
  ending?: string;
  dlc: DlcFlag;
  summary: string;
  lockout: string;
  steps: QuestStep[];
}

export interface Weapon {
  id: string;
  name: string;
  cls: WeaponClass;
  dlc: DlcFlag;
  weight: number;
  req: Partial<Record<StatKey, number>>;
  scaling: Partial<Record<StatKey, ScalingGrade>>;
  phys: number;
  mag?: number;
  fire?: number;
  light?: number;
  holy?: number;
  crit: number;
  upgrade: "regular" | "somber";
  skill: string;
  loc: string;
  notes?: string;
}

export interface ArmorPiece {
  id: string;
  name: string;
  slot: "helm" | "chest" | "gauntlets" | "legs";
  set: string;
  weight: number;
  poise: number;
  phys: number;
  dlc: DlcFlag;
  strike?: number;
  slash?: number;
  pierce?: number;
  mag?: number;
  fire?: number;
  light?: number;
  holy?: number;
}

export interface Talisman {
  id: string;
  name: string;
  weight: number;
  effect: string;
  loc: string;
  dlc: DlcFlag;
}

export interface Spell {
  id: string;
  name: string;
  kind: "sorcery" | "incantation";
  slots: number;
  fp: number;
  req: Partial<Record<StatKey, number>>;
  loc: string;
  dlc: DlcFlag;
  notes?: string;
}

export interface AshOfWar {
  id: string;
  name: string;
  affinity: string;
  skill: string;
  loc: string;
  dlc: DlcFlag;
}

export interface RouteStep {
  id: string;
  region: Region;
  title: string;
  body: string;
  related: string[];
  dlc: DlcFlag;
}

export const STAT_LABELS: Record<StatKey, string> = {
  vig: "Vigor",
  mnd: "Mind",
  end: "Endurance",
  str: "Strength",
  dex: "Dexterity",
  int: "Intelligence",
  fai: "Faith",
  arc: "Arcane",
};

export const REGIONS: Region[] = [
  "Limgrave",
  "Weeping Peninsula",
  "Liurnia of the Lakes",
  "Caelid",
  "Dragonbarrow",
  "Altus Plateau",
  "Mt. Gelmir",
  "Leyndell",
  "Capital Outskirts",
  "Siofra River",
  "Ainsel River",
  "Deeproot Depths",
  "Mountaintops of the Giants",
  "Consecrated Snowfield",
  "Mohgwyn Palace",
  "Miquella's Haligtree",
  "Crumbling Farum Azula",
  "Ashen Capital",
  "Roundtable Hold",
  "Gravesite Plain",
  "Scadu Altus",
  "Rauh Base",
  "Abyssal Woods",
  "Jagged Peak",
  "Cerulean Coast",
  "Charo's Hidden Grave",
  "Shadow Keep",
  "Enir-Ilim",
];

export const DLC_LABEL: Record<DlcFlag, string> = {
  base: "Base",
  sote: "SotE",
  tarnished: "Pack",
};

export function dlcVisible(
  dlc: DlcFlag,
  opts: { includeDlc: boolean; includeTarnished?: boolean },
) {
  if (dlc === "sote") return opts.includeDlc;
  if (dlc === "tarnished") return opts.includeTarnished !== false;
  return true;
}
