import type { Weapon } from "./types";
import raw from "./catalog/weapons.json";

/** Full armament catalog (base + SotE + Tarnished Pack). Patch 1.17 params. */
export const WEAPONS = raw as Weapon[];

export const WEAPON_CLASSES = [...new Set(WEAPONS.map((w) => w.cls))].sort();
