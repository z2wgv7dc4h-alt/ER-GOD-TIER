import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CLASSES } from "@/data/classes";
import type { StatKey } from "@/data/types";

export type SessionBoss = { id: string; result: "win" | "loss" };

export type PlaySession = {
  id: string;
  startedAt: number;
  endedAt?: number;
  deaths: number;
  notes: string;
  runes: number;
  bosses: SessionBoss[];
};

export type BuildState = {
  stats: Record<StatKey, number>;
  rh1: string;
  lh1: string;
  helm: string;
  chest: string;
  gauntlets: string;
  legs: string;
  talismans: string[];
  upgrade: number;
  twoHand: boolean;
};

export type Character = {
  id: string;
  name: string;
  classId: string;
  ng: number;
  includeDlc: boolean;
  includeTarnished: boolean;
  createdAt: number;
  checks: Record<string, boolean>;
  notes: Record<string, string>;
  forks: Record<string, string>;
  build: BuildState;
  sessions: PlaySession[];
};

type LedgerState = {
  characters: Character[];
  activeId: string;
  hydrate: boolean;
  active: () => Character;
  addCharacter: (name: string, classId: string) => void;
  removeCharacter: (id: string) => void;
  setActive: (id: string) => void;
  rename: (name: string) => void;
  setClass: (classId: string) => void;
  setNg: (ng: number) => void;
  setDlc: (on: boolean) => void;
  setTarnished: (on: boolean) => void;
  toggle: (id: string) => void;
  setCheck: (id: string, on: boolean) => void;
  setNote: (id: string, note: string) => void;
  setFork: (forkId: string, optionId: string) => void;
  patchBuild: (patch: Partial<BuildState>) => void;
  setStat: (key: StatKey, value: number) => void;
  startSession: () => void;
  endSession: () => void;
  patchSession: (patch: Partial<PlaySession>) => void;
  logDeath: () => void;
  logBoss: (bossId: string, result: "win" | "loss") => void;
  exportJson: () => string;
  importJson: (raw: string) => boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function blankBuild(classId: string): BuildState {
  const cls = CLASSES.find((c) => c.id === classId) ?? CLASSES[0];
  return {
    stats: { ...cls.stats },
    rh1: "uchi",
    lh1: "",
    helm: "",
    chest: "",
    gauntlets: "",
    legs: "",
    talismans: [],
    upgrade: 10,
    twoHand: false,
  };
}

export function normalizeCharacter(c: Character): Character {
  return {
    ...c,
    includeTarnished: c.includeTarnished !== false,
    forks: c.forks ?? {},
    checks: c.checks ?? {},
    notes: c.notes ?? {},
    sessions: c.sessions ?? [],
  };
}

function makeCharacter(name: string, classId: string): Character {
  return {
    id: uid(),
    name,
    classId,
    ng: 1,
    includeDlc: true,
    includeTarnished: true,
    createdAt: Date.now(),
    checks: {},
    notes: {},
    forks: {},
    build: blankBuild(classId),
    sessions: [],
  };
}

const first = makeCharacter("Tarnished", "vagabond");

function patchActive(s: LedgerState, fn: (c: Character) => Character): Partial<LedgerState> {
  return {
    characters: s.characters.map((c) => (c.id === s.activeId ? fn(c) : c)),
  };
}

export const useLedger = create<LedgerState>()(
  persist(
    (set, get) => ({
      characters: [first],
      activeId: first.id,
      hydrate: false,
      active: () => get().characters.find((c) => c.id === get().activeId) ?? get().characters[0],
      addCharacter: (name, classId) => {
        const ch = makeCharacter(name || "Tarnished", classId);
        set((s) => ({ characters: [...s.characters, ch], activeId: ch.id }));
      },
      removeCharacter: (id) =>
        set((s) => {
          const characters = s.characters.filter((c) => c.id !== id);
          const next = characters.length ? characters : [makeCharacter("Tarnished", "vagabond")];
          return { characters: next, activeId: next[0].id };
        }),
      setActive: (id) => set({ activeId: id }),
      rename: (name) => set((s) => patchActive(s, (c) => ({ ...c, name }))),
      setClass: (classId) =>
        set((s) =>
          patchActive(s, (c) => ({
            ...c,
            classId,
            build: { ...c.build, stats: { ...blankBuild(classId).stats } },
          })),
        ),
      setNg: (ng) => set((s) => patchActive(s, (c) => ({ ...c, ng }))),
      setDlc: (on) => set((s) => patchActive(s, (c) => ({ ...c, includeDlc: on }))),
      setTarnished: (on) => set((s) => patchActive(s, (c) => ({ ...c, includeTarnished: on }))),
      toggle: (id) =>
        set((s) =>
          patchActive(s, (c) => ({ ...c, checks: { ...c.checks, [id]: !c.checks[id] } })),
        ),
      setCheck: (id, on) =>
        set((s) => patchActive(s, (c) => ({ ...c, checks: { ...c.checks, [id]: on } }))),
      setNote: (id, note) =>
        set((s) => patchActive(s, (c) => ({ ...c, notes: { ...c.notes, [id]: note } }))),
      setFork: (forkId, optionId) =>
        set((s) =>
          patchActive(s, (c) => {
            const forks = { ...c.forks };
            if (!optionId) delete forks[forkId];
            else forks[forkId] = optionId;
            return { ...c, forks };
          }),
        ),
      patchBuild: (patch) =>
        set((s) => patchActive(s, (c) => ({ ...c, build: { ...c.build, ...patch } }))),
      setStat: (key, value) =>
        set((s) =>
          patchActive(s, (c) => {
            const cls = CLASSES.find((x) => x.id === c.classId) ?? CLASSES[0];
            const min = cls.stats[key];
            return {
              ...c,
              build: { ...c.build, stats: { ...c.build.stats, [key]: Math.max(min, Math.min(99, value)) } },
            };
          }),
        ),
      startSession: () =>
        set((s) =>
          patchActive(s, (c) => ({
            ...c,
            sessions: [
              { id: uid(), startedAt: Date.now(), deaths: 0, notes: "", runes: 0, bosses: [] },
              ...c.sessions,
            ],
          })),
        ),
      endSession: () =>
        set((s) =>
          patchActive(s, (c) => {
            const [cur, ...rest] = c.sessions;
            if (!cur || cur.endedAt) return c;
            return { ...c, sessions: [{ ...cur, endedAt: Date.now() }, ...rest] };
          }),
        ),
      patchSession: (patch) =>
        set((s) =>
          patchActive(s, (c) => {
            const [cur, ...rest] = c.sessions;
            if (!cur) return c;
            return { ...c, sessions: [{ ...cur, ...patch }, ...rest] };
          }),
        ),
      logDeath: () =>
        set((s) =>
          patchActive(s, (c) => {
            const [cur, ...rest] = c.sessions;
            if (!cur || cur.endedAt) return c;
            return { ...c, sessions: [{ ...cur, deaths: cur.deaths + 1 }, ...rest] };
          }),
        ),
      logBoss: (bossId, result) =>
        set((s) =>
          patchActive(s, (c) => {
            const [cur, ...rest] = c.sessions;
            if (!cur || cur.endedAt) return c;
            const next = { ...cur, bosses: [...cur.bosses, { id: bossId, result }] };
            const checks = result === "win" ? { ...c.checks, [`boss:${bossId}`]: true } : c.checks;
            return { ...c, checks, sessions: [next, ...rest] };
          }),
        ),
      exportJson: () => JSON.stringify({ characters: get().characters, activeId: get().activeId }, null, 2),
      importJson: (raw) => {
        try {
          const data = JSON.parse(raw) as { characters: Character[]; activeId: string };
          if (!Array.isArray(data.characters) || !data.characters.length) return false;
          const characters = data.characters.map(normalizeCharacter);
          set({ characters, activeId: data.activeId ?? characters[0].id });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "tarnished-ledger-v1",
      skipHydration: true,
      partialize: (s) => ({ characters: s.characters, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrate = true;
          state.characters = state.characters.map(normalizeCharacter);
        }
      },
    },
  ),
);

export const checkId = {
  boss: (id: string) => `boss:${id}`,
  upg: (id: string) => `upg:${id}`,
  quest: (qid: string, sid: string) => `qs:${qid}:${sid}`,
  route: (id: string) => `route:${id}`,
  grace: (id: string) => `grace:${id}`,
  spirit: (id: string) => `spirit:${id}`,
  tear: (id: string) => `tear:${id}`,
  ending: (id: string) => `ending:${id}`,
  flag: (id: string) => `flag:${id}`,
  wep: (id: string) => `wep:${id}`,
  arm: (id: string) => `arm:${id}`,
  tal: (id: string) => `tal:${id}`,
  spl: (id: string) => `spl:${id}`,
  aow: (id: string) => `aow:${id}`,
};
