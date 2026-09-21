import type { Spell } from "./types";
import raw from "./catalog/spells.json";

export const SPELLS = raw as Spell[];
