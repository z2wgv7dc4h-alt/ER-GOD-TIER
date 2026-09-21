import type { ArmorPiece } from "./types";
import raw from "./catalog/armor.json";

/** Full armor catalog (every helm / chest / arms / legs, including altered and SotE). */
export const ARMOR = raw as ArmorPiece[];

export const ARMOR_SETS = [...new Set(ARMOR.map((p) => p.set))].sort();
