import type { DlcFlag, Region } from "./types";

export type CrystalTear = {
  id: string;
  name: string;
  region: Region;
  loc: string;
  dlc: DlcFlag;
  effect: string;
};

export const TEARS: CrystalTear[] = [
  { id: "crimson", name: "Crimson Crystal Tear", region: "Limgrave", loc: "Third Church of Marika / Minor Erdtrees", dlc: "base", effect: "Restores HP" },
  { id: "cerulean", name: "Cerulean Crystal Tear", region: "Liurnia of the Lakes", loc: "Southwest Minor Erdtree (with Ruptured)", dlc: "base", effect: "Restores FP" },
  { id: "crimsonburst", name: "Crimsonburst Crystal Tear", region: "Weeping Peninsula", loc: "Minor Erdtree avatar", dlc: "base", effect: "HP regen" },
  { id: "greenburst", name: "Greenburst Crystal Tear", region: "Caelid", loc: "East Minor Erdtree (Putrid Avatar)", dlc: "base", effect: "Stamina regen" },
  { id: "greenspill", name: "Greenspill Crystal Tear", region: "Limgrave", loc: "Mistwood Minor Erdtree", dlc: "base", effect: "+stamina" },
  { id: "crimsonspill", name: "Crimsonspill Crystal Tear", region: "Altus Plateau", loc: "Northeast Minor Erdtree (Wormface)", dlc: "base", effect: "+max HP" },
  { id: "speckled", name: "Speckled Hardtear", region: "Altus Plateau", loc: "Wormface Minor Erdtree", dlc: "base", effect: "Resistances + residual healing" },
  { id: "leaden", name: "Leaden Hardtear", region: "Mt. Gelmir", loc: "Minor Erdtree (Ulcerated Tree Spirit)", dlc: "base", effect: "Poise boost" },
  { id: "opaline-hard", name: "Opaline Hardtear", region: "Dragonbarrow", loc: "Minor Erdtree (Putrid Avatar)", dlc: "base", effect: "All absorptions up" },
  { id: "opaline-bubble", name: "Opaline Bubbletear", region: "Weeping Peninsula", loc: "Minor Erdtree avatar", dlc: "base", effect: "One-shot shield" },
  { id: "crimson-bubble", name: "Crimson Bubbletear", region: "Mountaintops of the Giants", loc: "Northeast Minor Erdtree", dlc: "base", effect: "Auto-heal near death" },
  { id: "cerulean-hidden", name: "Cerulean Hidden Tear", region: "Mt. Gelmir", loc: "Minor Erdtree (with Leaden)", dlc: "base", effect: "Infinite FP for a few seconds — Comet Azur" },
  { id: "magic-shroud", name: "Magic-Shrouding Cracked Tear", region: "Liurnia of the Lakes", loc: "Northeast Minor Erdtree", dlc: "base", effect: "+magic attack" },
  { id: "flame-shroud", name: "Flame-Shrouding Cracked Tear", region: "Caelid", loc: "East Minor Erdtree", dlc: "base", effect: "+fire attack" },
  { id: "lightning-shroud", name: "Lightning-Shrouding Cracked Tear", region: "Liurnia of the Lakes", loc: "Northeast Minor Erdtree", dlc: "base", effect: "+lightning attack" },
  { id: "holy-shroud", name: "Holy-Shrouding Cracked Tear", region: "Liurnia of the Lakes", loc: "Northeast Minor Erdtree", dlc: "base", effect: "+holy attack" },
  { id: "stonebarb", name: "Stonebarb Cracked Tear", region: "Caelid", loc: "Caelem / Putrid avatar variants", dlc: "base", effect: "Stance damage up — boss melt" },
  { id: "thorny", name: "Thorny Cracked Tear", region: "Dragonbarrow", loc: "Minor Erdtree", dlc: "base", effect: "Successive attack bonus" },
  { id: "spiked", name: "Spiked Cracked Tear", region: "Limgrave", loc: "Mistwood Minor Erdtree", dlc: "base", effect: "Charged attack bonus" },
  { id: "ruptured", name: "Ruptured Crystal Tear", region: "Liurnia of the Lakes", loc: "Southwest Minor Erdtree (×2 exist)", dlc: "base", effect: "Explosion — usually skip" },
  { id: "winged", name: "Winged Crystal Tear", region: "Capital Outskirts", loc: "Minor Erdtree (outskirts)", dlc: "base", effect: "Lower equip load briefly" },
  { id: "twiggy", name: "Twiggy Cracked Tear", region: "Capital Outskirts", loc: "Minor Erdtree Church area", dlc: "base", effect: "Don't lose runes on death once" },
  { id: "purifying", name: "Purifying Crystal Tear", region: "Altus Plateau", loc: "Eleonora at Second Church of Marika", dlc: "base", effect: "Negates Mohg's nihil blood loss" },
  { id: "str-knot", name: "Strength-knot Crystal Tear", region: "Limgrave", loc: "Stormhill high cliff (tear on a body)", dlc: "base", effect: "+STR" },
  { id: "dex-knot", name: "Dexterity-knot Crystal Tear", region: "Liurnia of the Lakes", loc: "Liurnia, near Ravine", dlc: "base", effect: "+DEX" },
  { id: "int-knot", name: "Intelligence-knot Crystal Tear", region: "Liurnia of the Lakes", loc: "Liurnia lakes", dlc: "base", effect: "+INT" },
  { id: "fai-knot", name: "Faith-knot Crystal Tear", region: "Altus Plateau", loc: "Altus woods", dlc: "base", effect: "+FAI" },
  { id: "windy", name: "Windy Crystal Tear", region: "Caelid", loc: "Caelid, near Sellia", dlc: "base", effect: "Longer dodge" },
  { id: "oil", name: "Oil-Soaked Tear", region: "Gravesite Plain", loc: "Prospect Town / gravesite", dlc: "sote", effect: "Makes you oily — fire bait" },
  { id: "deflecting", name: "Deflecting Hardtear", region: "Gravesite Plain", loc: "Scorched Ruins / nearby hippo or altar", dlc: "sote", effect: "Guard counters and deflects — DLC staple" },
  { id: "crimsonburst-dried", name: "Crimsonburst Dried Tear", region: "Shadow Keep", loc: "Keep / storehouse", dlc: "sote", effect: "HP regen for allies too" },
  { id: "viridian-hidden", name: "Viridian Hidden Tear", region: "Jagged Peak", loc: "Jagged Peak", dlc: "sote", effect: "Infinite stamina window" },
];
