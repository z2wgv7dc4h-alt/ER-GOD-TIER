export type FlagSource = {
  checks: Record<string, boolean>;
  forks?: Record<string, string>;
};

function boss(id: string) {
  return `boss:${id}`;
}
function quest(q: string, s: string) {
  return `qs:${q}:${s}`;
}
function ending(id: string) {
  return `ending:${id}`;
}

export type ForkOption = {
  id: string;
  label: string;
  detail: string;
  grants: string;
  sets: string[];
};

export type Fork = {
  id: string;
  title: string;
  quest: string;
  when: string;
  warning: string;
  options: ForkOption[];
};

export type Ending = {
  id: string;
  name: string;
  summary: string;
  requires: string[];
  blockedBy: string[];
};

export type Thread = {
  id: string;
  from: string;
  to: string;
  text: string;
};

export type Impact = {
  title: string;
  irreversible: boolean;
  losses: string[];
  gains: string[];
};

export const FORKS: Fork[] = [
  {
    id: "millicent",
    title: "Millicent at the Drain",
    quest: "millicent",
    when: "Elphael drainage channel, after the Prayer Room",
    warning: "Permanent for this journey. The other talisman is gone.",
    options: [
      { id: "help", label: "Help Millicent", detail: "Fight her sisters beside her. She blooms and dies later.", grants: "Rotten Winged Sword Insignia · Unalloyed Gold Needle", sets: ["millicent_helped"] },
      { id: "invade", label: "Invade Millicent", detail: "You take her arm. Gowry's best talisman dies.", grants: "Millicent's Prosthesis (+5 DEX, successive attack)", sets: ["millicent_invaded"] },
    ],
  },
  {
    id: "sellen",
    title: "Sellen or Jerren",
    quest: "sellen",
    when: "Raya Lucaria Grand Library, after placing her primal glintstone",
    warning: "The loser dies. Witch's Glintstone Crown vs Jerren's armour.",
    options: [
      { id: "sellen", label: "Stand with Sellen", detail: "Jerren dies. Sellen becomes a graven mass in the library.", grants: "Witch's Glintstone Crown · Graven-Mass nearby", sets: ["sellen_lived"] },
      { id: "jerren", label: "Stand with Jerren", detail: "Sellen dies. The witch-hunter pays you.", grants: "Eccentric's set · Ancient Dragon Smithing Stone from Jerren", sets: ["sellen_dead"] },
    ],
  },
  {
    id: "seluvis",
    title: "Seluvis's potion",
    quest: "seluvis",
    when: "After Ranni accepts you and Seluvis asks a favour",
    warning: "Giving it to Nepheli ends her line forever. Dung Eater puppet is a unique ash.",
    options: [
      { id: "nepheli", label: "Give it to Nepheli", detail: "She becomes a puppet. Kenneth's ending dies.", grants: "Nepheli Loux Puppet", sets: ["seluvis_nepheli"] },
      { id: "dung", label: "Give it to Dung Eater", detail: "Only if he is in his sewer cell. Unique spirit ash.", grants: "Dung Eater Puppet", sets: ["seluvis_dung"] },
      { id: "gideon", label: "Give it to Gideon", detail: "He disposes of it. Nepheli can still rule Stormveil.", grants: "Nepheli's quest stays alive", sets: ["seluvis_wasted"] },
    ],
  },
  {
    id: "boc",
    title: "Boc's rebirth",
    quest: "boc",
    when: "After the Gold Sewing Needle, when he hates his face",
    warning: "Rebirth at Rennala is the cruel path.",
    options: [
      { id: "beautiful", label: "Tell him he is beautiful", detail: "Prattling Pate 'You're beautiful' from Coastal Cave or the Hermit Merchant.", grants: "Boc lives, still alters garments", sets: ["boc_loved"] },
      { id: "reborn", label: "Send him to Rennala", detail: "He is reborn as a human and never speaks again.", grants: "A larval tear spent · silence", sets: ["boc_reborn"] },
    ],
  },
  {
    id: "leda-ansbach",
    title: "Leda hunts Ansbach",
    quest: "needle-leda",
    when: "Shadow Keep Storehouse, after the Secret Rite Scroll",
    warning: "Who you aid stands in the Cleansing Chamber — or does not.",
    options: [
      { id: "ansbach", label: "Defend Ansbach", detail: "He survives to Enir-Ilim. His longbow and set remain.", grants: "Ansbach as an ally vs the Consort", sets: ["leda_ansbach_saved"] },
      { id: "leda", label: "Help Leda kill him", detail: "Ansbach dies in the storehouse.", grants: "His gear early · he is absent at the Consort", sets: ["leda_ansbach_dead"] },
    ],
  },
  {
    id: "leda-hornsent",
    title: "Leda hunts Hornsent",
    quest: "needle-leda",
    when: "After Miquella's charm breaks",
    warning: "Hornsent's revenge vs Messmer's kindling path.",
    options: [
      { id: "hornsent", label: "Side with Hornsent", detail: "He remains a summon for Messmer and may stand against Leda.", grants: "Hornsent as a hostile or ally depending on later flags", sets: ["leda_hornsent_saved"] },
      { id: "leda", label: "Help Leda slay him", detail: "Hornsent dies. Leda's gauntlet is smaller.", grants: "His weapons · one less body at Enir-Ilim", sets: ["leda_hornsent_dead"] },
    ],
  },
];

export const ENDINGS: Ending[] = [
  {
    id: "fracture",
    name: "Age of Fracture",
    summary: "Mend the Elden Ring as it is. The default, if you refuse every rune.",
    requires: ["elden_beast"],
    blockedBy: ["frenzy"],
  },
  {
    id: "stars",
    name: "Age of the Stars",
    summary: "Summon Ranni at the Fractured Marika. A thousand year voyage under a dark moon.",
    requires: ["elden_beast", "ranni_ready"],
    blockedBy: ["frenzy"],
  },
  {
    id: "order",
    name: "Age of Order",
    summary: "Use Goldmask's Mending Rune of Perfect Order. Radagon is Marika, perfectly.",
    requires: ["elden_beast", "goldmask_rune"],
    blockedBy: ["frenzy"],
  },
  {
    id: "duskborn",
    name: "Age of the Duskborn",
    summary: "Fia's rune. Those who live in death are no longer hunted.",
    requires: ["elden_beast", "fia_rune"],
    blockedBy: ["frenzy"],
  },
  {
    id: "despair",
    name: "Blessing of Despair",
    summary: "The Dung Eater's fell curse upon every unborn.",
    requires: ["elden_beast", "dung_rune"],
    blockedBy: ["frenzy"],
  },
  {
    id: "frenzy-ending",
    name: "Lord of Frenzied Flame",
    summary: "Take the Three Fingers. Melina leaves you. The world burns yellow.",
    requires: ["elden_beast", "frenzy"],
    blockedBy: ["needle"],
  },
];

export const THREADS: Thread[] = [
  { id: "t-ranni-fia", from: "Ranni", to: "Fia", text: "The Cursemark of Death sits on Ranni's discarded flesh in the Divine Tower of Liurnia. Fia needs it. You can finish both." },
  { id: "t-ranni-radahn", from: "Radahn", to: "Ranni", text: "The stars stay frozen until Radahn dies. Nokron, the Fingerslayer Blade, and Ranni's night do not open before the festival." },
  { id: "t-seluvis-nepheli", from: "Seluvis", to: "Nepheli", text: "His potion puppets Nepheli. Stormveil never gets a lord. Give it to Gideon if you want both liars alive." },
  { id: "t-seluvis-ranni", from: "Seluvis", to: "Ranni", text: "If Ranni learns you served Seluvis's puppet plot, she can refuse you. Finish her blade first, or dump the potion." },
  { id: "t-frenzy-all", from: "Three Fingers", to: "Every ending", text: "Inheriting the Frenzied Flame overwrites every mending rune. Only Miquella's Needle in Placidusax's arena undoes it." },
  { id: "t-maliketh-pack", from: "Maliketh", to: "Noble Broken Mask", text: "When the capital is ash the Radagon-statue invasion never happens. Cast Regression before the Forge of the Giants if you want the Golden Order Flail." },
  { id: "t-maliketh-goldmask", from: "Maliketh", to: "Goldmask", text: "The Mending Rune of Perfect Order only appears in the ash. You must finish Regression in the living capital first." },
  { id: "t-hyetta-melina", from: "Frenzied Flame", to: "Melina", text: "If you take the Three Fingers before the Forge, Melina does not burn the tree — and she will hunt you." },
  { id: "t-volcano-bernahl", from: "Volcano Manor", to: "Bernahl", text: "Join Tanith to keep Bernahl's recusant path. His Farum Azula invasion (Devourer's Scepter) needs the contract." },
  { id: "t-patches", from: "Patches", to: "Tanith", text: "Kill him in Murkwater and the whole comic tragedy dies — no Dancer's Castanets, no kick at Scenic Isle." },
  { id: "t-millicent", from: "Millicent", to: "Gowry", text: "Help her: Rotten Winged Sword Insignia and Gowry's Flock's Canvas. Invade her: Millicent's Prosthesis. One journey, one arm." },
  { id: "t-sellen", from: "Sellen", to: "Jerren", text: "The library duel is a funeral either way. You pick which sorcerer remains a corpse." },
  { id: "t-varre-mohg", from: "Varré", to: "Mohg", text: "His medal is the fast door to Mohgwyn — and to the Realm of Shadow. Two great runes the slow way still works." },
  { id: "t-mohg-dlc", from: "Mohg", to: "Shadow of the Erdtree", text: "Touch his withered arm at the Cocoon. Without Mohg (or the late-game access), the DLC does not open." },
  { id: "t-messmer-enir", from: "Messmer", to: "Enir-Ilim", text: "Kindling from Messmer burns Romina's sealing tree. No kindling, no divine gate." },
  { id: "t-leda", from: "Leda", to: "Enir-Ilim", text: "Every ally you spare or slay in the Keep walks into the Cleansing Chamber. The last fight is the sum of your flags." },
  { id: "t-ranni-seluvis-sellen", from: "Seluvis's cellar", to: "Sellen", text: "Sellen's puppet body uses a cellar puppet. Finish placing her glintstone before Seluvis's quest consumes the dolls." },
  { id: "t-fate-ashen-bolt", from: "Morgott", to: "Bolt of Gransax", text: "The spear on Leyndell's rooftop is much harder once the city is ash. Take it while the capital still lives." },
];

const BOSS_FLAGS: Record<string, string[]> = {
  godrick: ["godrick", "great_rune"],
  rennala: ["rennala", "great_rune"],
  radahn: ["radahn", "stars_freed", "great_rune"],
  rykard: ["rykard", "great_rune"],
  morgott: ["morgott", "great_rune"],
  "mohg-lord": ["mohg", "great_rune", "dlc_door"],
  malenia: ["malenia", "great_rune"],
  "fire-giant": ["fire_giant"],
  maliketh: ["maliketh", "ashen"],
  "radagon-beast": ["elden_beast"],
  messmer: ["messmer", "kindling"],
  romina: ["romina"],
  consort: ["consort"],
  placidusax: ["placidusax"],
  "noble-broken-mask": ["noble_mask"],
  leontiel: ["leontiel"],
  patches: ["patches_dead"],
};

export function flagsOf(ch: FlagSource): Set<string> {
  const f = new Set<string>();
  const checks = ch.checks;
  for (const [id, flags] of Object.entries(BOSS_FLAGS)) {
    if (checks[boss(id)]) flags.forEach((x) => f.add(x));
  }
  if (checks[quest("ranni", "r4")]) f.add("ranni_blade");
  if (checks[quest("ranni", "r7")] || checks[quest("ranni", "r8")]) f.add("ranni_ready");
  if (checks[quest("fia", "f5")]) f.add("fia_rune");
  if (checks[quest("goldmask", "g4")]) f.add("goldmask_rune");
  if (checks[quest("dung-eater", "d4")]) f.add("dung_rune");
  if (checks[quest("hyetta", "h4")]) f.add("frenzy");
  if (checks[quest("ranni", "r8")]) f.add("stars_chosen");
  if (checks[quest("volcano", "vo1")]) f.add("volcano");
  if (checks["flag:needle"]) f.add("needle");
  if (checks["flag:volcano"]) f.add("volcano");
  if (checks["flag:sealing-tree"]) f.add("sealing_tree");
  if (f.has("needle")) f.delete("frenzy");

  const forks = ch.forks ?? {};
  for (const fork of FORKS) {
    const chosen = forks[fork.id];
    const opt = fork.options.find((o) => o.id === chosen);
    opt?.sets.forEach((s) => f.add(s));
  }
  return f;
}

export function endingStatus(ch: FlagSource) {
  const flags = flagsOf(ch);
  return ENDINGS.map((e) => {
    const blocked = e.blockedBy.filter((b) => flags.has(b));
    const missing = e.requires.filter((r) => !flags.has(r));
    let state: "locked" | "ready" | "open" | "claimed" = "open";
    if (blocked.length) state = "locked";
    else if (missing.length === 0) state = "ready";
    else if (missing.length < e.requires.length) state = "open";
    if (ch.checks[ending(e.id)]) state = "claimed";
    return { ...e, state, blocked, missing };
  });
}

export function lockedReasons(ch: FlagSource): { id: string; label: string; reason: string; href: string }[] {
  const flags = flagsOf(ch);
  const forks = ch.forks ?? {};
  const out: { id: string; label: string; reason: string; href: string }[] = [];

  if (flags.has("ashen") && !ch.checks[boss("noble-broken-mask")]) {
    out.push({
      id: boss("noble-broken-mask"),
      label: "The Noble Broken Mask",
      reason: "Leyndell is ash. The Radagon-statue invasion will not spawn.",
      href: "/checklist",
    });
  }
  if (forks.seluvis === "nepheli") {
    out.push({
      id: "quest:nepheli",
      label: "Nepheli Loux",
      reason: "Seluvis's potion made her a puppet. Stormveil has no lord.",
      href: "/weave",
    });
  }
  if (forks.millicent === "invade") {
    out.push({
      id: "tal:rotten-winged",
      label: "Rotten Winged Sword Insignia",
      reason: "You invaded Millicent. Gowry's best talisman is gone.",
      href: "/weave",
    });
  }
  if (forks.millicent === "help") {
    out.push({
      id: "tal:millicent-prosthesis",
      label: "Millicent's Prosthesis",
      reason: "You helped her. The prosthesis died with the other choice.",
      href: "/weave",
    });
  }
  if (flags.has("frenzy") && !flags.has("needle")) {
    out.push({
      id: "ending:others",
      label: "Every mending-rune ending",
      reason: "The Three Fingers have you. Use Miquella's Needle in Placidusax's arena, or burn.",
      href: "/weave",
    });
  }
  if (ch.checks[boss("patches")]) {
    out.push({
      id: "quest:patches-q",
      label: "Patches",
      reason: "You killed him in Murkwater. No kick, no letters, no castanets.",
      href: "/quests",
    });
  }
  if (forks.sellen === "jerren") {
    out.push({
      id: "quest:sellen-end",
      label: "Sellen the witch",
      reason: "Jerren finished her. No Graven-Mass from her corpse-mass.",
      href: "/weave",
    });
  }
  if (forks.boc === "reborn") {
    out.push({
      id: "quest:boc",
      label: "Boc the Seamster",
      reason: "He was reborn at Rennala. The seamster will not speak again.",
      href: "/weave",
    });
  }
  if (forks["leda-ansbach"] === "leda") {
    out.push({
      id: "quest:ansbach",
      label: "Sir Ansbach",
      reason: "You helped Leda hunt him. He will not stand at the Consort.",
      href: "/weave",
    });
  }
  return out;
}

export function impactOfBoss(ch: FlagSource, bossId: string): Impact | null {
  if (bossId === "maliketh" && !ch.checks[boss("noble-broken-mask")]) {
    return {
      title: "The capital will turn to ash",
      irreversible: true,
      losses: ["Noble Broken Mask invasion (Golden Order Flail)", "Easy Bolt of Gransax rooftop", "Living Leyndell layout"],
      gains: ["Ashen Capital · Goldmask's rune can appear · Farum is done"],
    };
  }
  if (bossId === "patches") {
    return {
      title: "Patches stays dead",
      irreversible: true,
      losses: ["Scenic Isle kick", "Volcano letter", "Dancer's Castanets", "Murkwater shop"],
      gains: ["His bell bearing · that's it"],
    };
  }
  if (bossId === "radahn") {
    return {
      title: "The stars will fall",
      irreversible: true,
      losses: [],
      gains: ["Nokron opens · Ranni continues · War-Dead Catacombs · Leontiel can invade the dunes"],
    };
  }
  if (bossId === "fire-giant") {
    return {
      title: "The Erdtree will burn",
      irreversible: true,
      losses: ["Roundtable Hold as you knew it — some NPCs leave forever"],
      gains: ["Crumbling Farum Azula · the path to Maliketh"],
    };
  }
  return null;
}

export function impactOfQuest(qid: string, sid: string): Impact | null {
  if (qid === "hyetta" && sid === "h4") {
    return {
      title: "The Three Fingers",
      irreversible: true,
      losses: ["Age of Fracture", "Age of the Stars", "Age of Order", "Age of the Duskborn", "Blessing of Despair", "Melina as kindling"],
      gains: ["Lord of Frenzied Flame — unless you use Miquella's Needle in Placidusax's arena"],
    };
  }
  return null;
}

export function impactOfFork(forkId: string, optionId: string): Impact | null {
  const fork = FORKS.find((f) => f.id === forkId);
  const opt = fork?.options.find((o) => o.id === optionId);
  if (!fork || !opt) return null;
  const others = fork.options.filter((o) => o.id !== optionId);
  return {
    title: fork.title,
    irreversible: true,
    losses: others.map((o) => o.grants),
    gains: [opt.grants],
  };
}

export function worldStamps(ch: FlagSource) {
  const f = flagsOf(ch);
  return [
    { id: "stars_freed", label: "Stars freed", on: f.has("stars_freed") },
    { id: "ashen", label: "Capital of ash", on: f.has("ashen") },
    { id: "frenzy", label: "Frenzied Flame", on: f.has("frenzy") },
    { id: "needle", label: "Needle used", on: f.has("needle") },
    { id: "ranni_ready", label: "Dark Moon ready", on: f.has("ranni_ready") },
    { id: "fia_rune", label: "Death-Prince rune", on: f.has("fia_rune") },
    { id: "goldmask_rune", label: "Perfect Order", on: f.has("goldmask_rune") },
    { id: "dung_rune", label: "Fell Curse", on: f.has("dung_rune") },
    { id: "mohg", label: "Cocoon reached", on: f.has("mohg") },
    { id: "kindling", label: "Messmer's kindling", on: f.has("kindling") },
    { id: "volcano", label: "Recusant", on: f.has("volcano") },
    { id: "elden_beast", label: "Elden Beast fallen", on: f.has("elden_beast") },
  ];
}
