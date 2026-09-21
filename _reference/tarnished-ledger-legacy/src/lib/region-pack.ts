import type { Region } from "@/data/types";
import type { AtlasCell } from "@/data/atlas";
import { checkId, type Character } from "@/store/ledger";
import {
  counted,
  visibleBosses,
  visibleGraces,
  visibleQuests,
  visibleSpirits,
  visibleTears,
  visibleUpgrades,
} from "@/lib/progress";

const ALIASES: Partial<Record<Region, string[]>> = {
  Limgrave: ["limgrave", "stormveil", "mistwood", "agheel", "murkwater", "elleh", "saintsbridge", "waypoint", "first step", "chapel of anticipation"],
  "Weeping Peninsula": ["weeping", "morne", "irina"],
  "Liurnia of the Lakes": ["liurnia", "raya lucaria", "caria", "three sisters", "seluvis", "ranni", "scenic isle", "bellum", "academy"],
  Caelid: ["caelid", "redmane", "aeonia", "gowry", "sellia", "war-dead"],
  Dragonbarrow: ["dragonbarrow", "bestial", "greyoll"],
  "Altus Plateau": ["altus", "shaded castle", "dominula", "goldmask", "second church"],
  "Mt. Gelmir": ["gelmir", "volcano", "tanith", "rykard", "hermit village"],
  Leyndell: ["leyndell", "sewer", "erdtree sanctuary", "roundtable"],
  "Capital Outskirts": ["outskirts", "outer moat", "outer wall"],
  "Siofra River": ["siofra", "nokron", "night's sacred"],
  "Ainsel River": ["ainsel", "nokstella", "lake of rot", "astel", "manus celes"],
  "Deeproot Depths": ["deeproot", "fortissax", "godwyn"],
  "Mountaintops of the Giants": ["mountaintops", "forge", "fire giant"],
  "Consecrated Snowfield": ["snowfield", "apostate", "secret medallion"],
  "Mohgwyn Palace": ["mohgwyn", "mohg", "pureblood"],
  "Miquella's Haligtree": ["haligtree", "elphael", "prayer room", "drain"],
  "Crumbling Farum Azula": ["farum", "maliketh", "placidusax", "alexander"],
  "Ashen Capital": ["ashen", "fractured marika"],
  "Roundtable Hold": ["hold", "hewg", "roderika", "gideon", "fia"],
  "Gravesite Plain": ["gravesite", "belurat", "three-path", "pillar path"],
  "Scadu Altus": ["scadu", "manus metyr", "highroad", "ymir"],
  "Rauh Base": ["rauh", "sealing tree", "romina"],
  "Abyssal Woods": ["abyssal", "midra", "frenzied"],
  "Jagged Peak": ["jagged", "bayle", "igon"],
  "Cerulean Coast": ["cerulean", "stone coffin", "rhia"],
  "Charo's Hidden Grave": ["charo", "putrescence", "trina", "thiollier"],
  "Shadow Keep": ["shadow keep", "storehouse", "messmer", "leda", "ansbach"],
  "Enir-Ilim": ["enir", "cleansing", "consort", "divine gate"],
};

export function whereHits(where: string, region: Region) {
  const w = where.toLowerCase();
  if (w.includes(region.toLowerCase())) return true;
  return (ALIASES[region] ?? []).some((a) => w.includes(a));
}

export function packForCell(ch: Character, cell: AtlasCell) {
  const set = new Set(cell.regions);
  const bosses = visibleBosses(ch).filter((b) => set.has(b.region));
  const graces = visibleGraces(ch).filter((g) => set.has(g.region));
  const upgrades = visibleUpgrades(ch).filter((u) => set.has(u.region));
  const spirits = visibleSpirits(ch).filter((s) => s.region && set.has(s.region));
  const tears = visibleTears(ch).filter((t) => set.has(t.region));
  const quests = visibleQuests(ch).filter((q) =>
    q.steps.some((s) => cell.regions.some((r) => whereHits(s.where, r))),
  );
  const ids = [
    ...bosses.map((b) => checkId.boss(b.id)),
    ...graces.map((g) => checkId.grace(g.id)),
    ...upgrades.map((u) => checkId.upg(u.id)),
    ...spirits.map((s) => checkId.spirit(s.id)),
    ...tears.map((t) => checkId.tear(t.id)),
  ];
  return { bosses, graces, upgrades, spirits, tears, quests, tally: counted(ids, ch.checks) };
}
