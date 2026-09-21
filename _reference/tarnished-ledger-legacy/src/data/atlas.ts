import type { Region } from "./types";

export type AtlasBoard = "lands" | "under" | "shadow";

export type AtlasCell = {
  id: string;
  name: string;
  regions: Region[];
  board: AtlasBoard;
  art: string;
  kicker: string;
  wide?: boolean;
};

export const ATLAS: AtlasCell[] = [
  { id: "limgrave", name: "Limgrave", regions: ["Limgrave"], board: "lands", art: "/atlas/limgrave.jpg", kicker: "The grave-plain", wide: true },
  { id: "weeping", name: "Weeping Peninsula", regions: ["Weeping Peninsula"], board: "lands", art: "/atlas/weeping.jpg", kicker: "South of the bridge" },
  { id: "liurnia", name: "Liurnia of the Lakes", regions: ["Liurnia of the Lakes"], board: "lands", art: "/atlas/liurnia.jpg", kicker: "Academy waters", wide: true },
  { id: "caelid", name: "Caelid", regions: ["Caelid"], board: "lands", art: "/atlas/caelid.jpg", kicker: "Scarlet rot", wide: true },
  { id: "dragonbarrow", name: "Dragonbarrow", regions: ["Dragonbarrow"], board: "lands", art: "/atlas/caelid.jpg", kicker: "Greyoll's rest" },
  { id: "altus", name: "Altus Plateau", regions: ["Altus Plateau"], board: "lands", art: "/atlas/altus.jpg", kicker: "Golden road", wide: true },
  { id: "gelmir", name: "Mt. Gelmir", regions: ["Mt. Gelmir"], board: "lands", art: "/atlas/gelmir.jpg", kicker: "Volcano Manor" },
  { id: "outskirts", name: "Capital Outskirts", regions: ["Capital Outskirts"], board: "lands", art: "/atlas/leyndell.jpg", kicker: "Outer wall" },
  { id: "leyndell", name: "Leyndell", regions: ["Leyndell"], board: "lands", art: "/atlas/leyndell.jpg", kicker: "Royal capital", wide: true },
  { id: "ashen", name: "Ashen Capital", regions: ["Ashen Capital"], board: "lands", art: "/atlas/leyndell.jpg", kicker: "After Maliketh" },
  { id: "mountaintops", name: "Mountaintops of the Giants", regions: ["Mountaintops of the Giants"], board: "lands", art: "/atlas/mountaintops.jpg", kicker: "The Forge", wide: true },
  { id: "snowfield", name: "Consecrated Snowfield", regions: ["Consecrated Snowfield"], board: "lands", art: "/atlas/mountaintops.jpg", kicker: "Secret medallion" },
  { id: "haligtree", name: "Miquella's Haligtree", regions: ["Miquella's Haligtree"], board: "lands", art: "/atlas/haligtree.jpg", kicker: "Elphael", wide: true },
  { id: "farum", name: "Crumbling Farum Azula", regions: ["Crumbling Farum Azula"], board: "lands", art: "/atlas/farum.jpg", kicker: "Outside time", wide: true },
  { id: "roundtable", name: "Roundtable Hold", regions: ["Roundtable Hold"], board: "lands", art: "/atlas/roundtable.jpg", kicker: "The hub" },

  { id: "siofra", name: "Siofra River", regions: ["Siofra River"], board: "under", art: "/atlas/nokron.jpg", kicker: "Nokron", wide: true },
  { id: "ainsel", name: "Ainsel River", regions: ["Ainsel River"], board: "under", art: "/atlas/nokron.jpg", kicker: "Nokstella · Astel", wide: true },
  { id: "deeproot", name: "Deeproot Depths", regions: ["Deeproot Depths"], board: "under", art: "/atlas/underground.jpg", kicker: "Godwyn" },
  { id: "mohgwyn", name: "Mohgwyn Palace", regions: ["Mohgwyn Palace"], board: "under", art: "/atlas/mohgwyn.jpg", kicker: "The cocoon", wide: true },

  { id: "gravesite", name: "Gravesite Plain", regions: ["Gravesite Plain"], board: "shadow", art: "/atlas/gravesite.jpg", kicker: "First cross", wide: true },
  { id: "scadu", name: "Scadu Altus", regions: ["Scadu Altus"], board: "shadow", art: "/atlas/shadow.jpg", kicker: "Highroad", wide: true },
  { id: "keep", name: "Shadow Keep", regions: ["Shadow Keep"], board: "shadow", art: "/atlas/shadow.jpg", kicker: "Messmer", wide: true },
  { id: "rauh", name: "Ancient Ruins of Rauh", regions: ["Rauh Base"], board: "shadow", art: "/atlas/shadow.jpg", kicker: "Sealing tree" },
  { id: "abyss", name: "Abyssal Woods", regions: ["Abyssal Woods"], board: "shadow", art: "/atlas/abyss.jpg", kicker: "Midra", wide: true },
  { id: "cerulean", name: "Cerulean Coast", regions: ["Cerulean Coast"], board: "shadow", art: "/atlas/weeping.jpg", kicker: "Southern shore" },
  { id: "charo", name: "Charo's Hidden Grave", regions: ["Charo's Hidden Grave"], board: "shadow", art: "/atlas/gravesite.jpg", kicker: "Putrescence" },
  { id: "jagged", name: "Jagged Peak", regions: ["Jagged Peak"], board: "shadow", art: "/atlas/jagged.jpg", kicker: "Bayle", wide: true },
  { id: "enir", name: "Enir-Ilim", regions: ["Enir-Ilim"], board: "shadow", art: "/atlas/enir.jpg", kicker: "The divine gate", wide: true },
];

export const BOARDS: { id: AtlasBoard; title: string; kicker: string }[] = [
  { id: "lands", title: "The Lands Between", kicker: "Surface" },
  { id: "under", title: "Eternal Cities", kicker: "Below" },
  { id: "shadow", title: "Realm of Shadow", kicker: "SotE" },
];
