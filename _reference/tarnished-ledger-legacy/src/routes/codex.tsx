import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { WEAPONS, WEAPON_CLASSES } from "@/data/weapons";
import { ARMOR } from "@/data/armor";
import { TALISMANS } from "@/data/talismans";
import { SPELLS } from "@/data/spells";
import { ASHES_OF_WAR } from "@/data/ashes";
import { SPIRITS } from "@/data/spirits";
import { DLC_LABEL, STAT_LABELS, dlcVisible, type StatKey, type WeaponClass } from "@/data/types";
import { PageTitle, Panel } from "@/components/shell";
import { CheckRow } from "@/components/check-row";
import { checkId, useLedger } from "@/store/ledger";
import { counted } from "@/lib/progress";

export const Route = createFileRoute("/codex")({ component: CodexPage });

const TABS = ["Weapons", "Armor", "Talismans", "Spells", "Ashes of War", "Spirits"] as const;

function reqText(req: Partial<Record<StatKey, number>>) {
  return (Object.entries(req) as [StatKey, number][])
    .filter(([, v]) => v)
    .map(([k, v]) => `${STAT_LABELS[k].slice(0, 3)} ${v}`)
    .join(" · ");
}

function CodexPage() {
  const ch = useLedger((s) => s.active());
  const toggle = useLedger((s) => s.toggle);
  const shown = { includeDlc: ch.includeDlc, includeTarnished: ch.includeTarnished !== false };
  const [tab, setTab] = useState<(typeof TABS)[number]>("Weapons");
  const [q, setQ] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [cls, setCls] = useState<WeaponClass | "All">("All");
  const [slot, setSlot] = useState<"All" | "helm" | "chest" | "gauntlets" | "legs">("All");
  const [kind, setKind] = useState<"All" | "sorcery" | "incantation">("All");
  const needle = q.trim().toLowerCase();

  const weapons = useMemo(
    () =>
      WEAPONS.filter((w) => {
        if (!dlcVisible(w.dlc, shown)) return false;
        if (cls !== "All" && w.cls !== cls) return false;
        if (hideDone && ch.checks[checkId.wep(w.id)]) return false;
        if (needle && !`${w.name} ${w.cls} ${w.skill} ${w.loc}`.toLowerCase().includes(needle)) return false;
        return true;
      }),
    [shown.includeDlc, shown.includeTarnished, needle, cls, hideDone, ch.checks],
  );
  const armor = useMemo(
    () =>
      ARMOR.filter((a) => {
        if (!dlcVisible(a.dlc, shown)) return false;
        if (slot !== "All" && a.slot !== slot) return false;
        if (hideDone && ch.checks[checkId.arm(a.id)]) return false;
        if (needle && !`${a.name} ${a.set}`.toLowerCase().includes(needle)) return false;
        return true;
      }),
    [shown.includeDlc, shown.includeTarnished, needle, slot, hideDone, ch.checks],
  );
  const tals = useMemo(
    () =>
      TALISMANS.filter((t) => {
        if (!dlcVisible(t.dlc, shown)) return false;
        if (hideDone && ch.checks[checkId.tal(t.id)]) return false;
        if (needle && !`${t.name} ${t.effect} ${t.loc}`.toLowerCase().includes(needle)) return false;
        return true;
      }),
    [shown.includeDlc, shown.includeTarnished, needle, hideDone, ch.checks],
  );
  const spells = useMemo(
    () =>
      SPELLS.filter((s) => {
        if (!dlcVisible(s.dlc, shown)) return false;
        if (kind !== "All" && s.kind !== kind) return false;
        if (hideDone && ch.checks[checkId.spl(s.id)]) return false;
        if (needle && !`${s.name} ${s.kind} ${s.loc}`.toLowerCase().includes(needle)) return false;
        return true;
      }),
    [shown.includeDlc, shown.includeTarnished, needle, kind, hideDone, ch.checks],
  );
  const ashes = useMemo(
    () =>
      ASHES_OF_WAR.filter((s) => {
        if (!dlcVisible(s.dlc, shown)) return false;
        if (hideDone && ch.checks[checkId.aow(s.id)]) return false;
        if (needle && !`${s.name} ${s.affinity} ${s.skill}`.toLowerCase().includes(needle)) return false;
        return true;
      }),
    [shown.includeDlc, shown.includeTarnished, needle, hideDone, ch.checks],
  );
  const spirits = useMemo(
    () =>
      SPIRITS.filter((s) => {
        if (!dlcVisible(s.dlc, shown)) return false;
        if (hideDone && ch.checks[checkId.spirit(s.id)]) return false;
        if (needle && !`${s.name} ${s.loc} ${s.notes ?? ""}`.toLowerCase().includes(needle)) return false;
        return true;
      }),
    [shown.includeDlc, shown.includeTarnished, needle, hideDone, ch.checks],
  );

  const totals = {
    Weapons: counted(
      WEAPONS.filter((w) => dlcVisible(w.dlc, shown)).map((w) => checkId.wep(w.id)),
      ch.checks,
    ),
    Armor: counted(
      ARMOR.filter((a) => dlcVisible(a.dlc, shown)).map((a) => checkId.arm(a.id)),
      ch.checks,
    ),
    Talismans: counted(
      TALISMANS.filter((t) => dlcVisible(t.dlc, shown)).map((t) => checkId.tal(t.id)),
      ch.checks,
    ),
    Spells: counted(
      SPELLS.filter((s) => dlcVisible(s.dlc, shown)).map((s) => checkId.spl(s.id)),
      ch.checks,
    ),
    "Ashes of War": counted(
      ASHES_OF_WAR.filter((s) => dlcVisible(s.dlc, shown)).map((s) => checkId.aow(s.id)),
      ch.checks,
    ),
    Spirits: counted(
      SPIRITS.filter((s) => dlcVisible(s.dlc, shown)).map((s) => checkId.spirit(s.id)),
      ch.checks,
    ),
  };

  const armorGroups = useMemo(() => {
    const map = new Map<string, typeof armor>();
    for (const a of armor) {
      const arr = map.get(a.set) ?? [];
      arr.push(a);
      map.set(a.set, arr);
    }
    return [...map.entries()];
  }, [armor]);

  const shownCount = {
    Weapons: weapons.length,
    Armor: armor.length,
    Talismans: tals.length,
    Spells: spells.length,
    "Ashes of War": ashes.length,
    Spirits: spirits.length,
  }[tab];

  return (
    <div>
      <PageTitle kicker="Archives" title="Codex">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-[11px] font-display uppercase tracking-[0.16em] ${
                tab === t ? "bg-brass text-bg" : "bg-surface text-fg-muted"
              }`}
            >
              {t}
              <span className="ml-2 tabular-nums opacity-70">
                {totals[t].done}/{totals[t].total}
              </span>
            </button>
          ))}
        </div>
      </PageTitle>

      <p className="mb-4 text-sm text-fg-muted">
        Every armament, armor piece, talisman, spell, ash of war, and spirit ash in the Lands Between
        {shown.includeDlc ? " and the Realm of Shadow" : ""}
        {shown.includeTarnished !== false ? " — plus the Tarnished Pack" : ""}. Tick them as you loot.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the archive"
          className="h-10 min-w-[16rem] flex-1 rounded-md bg-surface px-3 text-sm text-fg outline-none ring-1 ring-border focus:ring-brass"
        />
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-brass" />
          Hide collected
        </label>
        {tab === "Weapons" ? (
          <select
            value={cls}
            onChange={(e) => setCls(e.target.value as WeaponClass | "All")}
            className="h-10 rounded-md bg-surface px-3 text-sm text-fg ring-1 ring-border"
          >
            <option value="All">All classes</option>
            {WEAPON_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : null}
        {tab === "Armor" ? (
          <select
            value={slot}
            onChange={(e) => setSlot(e.target.value as typeof slot)}
            className="h-10 rounded-md bg-surface px-3 text-sm text-fg ring-1 ring-border"
          >
            <option value="All">All slots</option>
            <option value="helm">Helms</option>
            <option value="chest">Chests</option>
            <option value="gauntlets">Gauntlets</option>
            <option value="legs">Legs</option>
          </select>
        ) : null}
        {tab === "Spells" ? (
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="h-10 rounded-md bg-surface px-3 text-sm text-fg ring-1 ring-border"
          >
            <option value="All">All magics</option>
            <option value="sorcery">Sorceries</option>
            <option value="incantation">Incantations</option>
          </select>
        ) : null}
        <span className="text-xs tabular-nums text-fg-subtle">{shownCount} showing</span>
      </div>

      {shownCount === 0 ? (
        <Panel>
          <p className="py-6 text-center text-sm text-fg-muted">Nothing in this drawer. Clear the search or unhide collected pieces.</p>
        </Panel>
      ) : null}

      {tab === "Weapons" ? (
        <Panel>
          {weapons.map((w) => (
            <CheckRow
              key={w.id}
              checked={!!ch.checks[checkId.wep(w.id)]}
              onToggle={() => toggle(checkId.wep(w.id))}
              title={w.name}
              meta={`${w.cls} · ${w.weight} wt · AR ${w.phys}${w.mag ? `/${w.mag} mag` : ""}${w.fire ? `/${w.fire} fire` : ""}${w.light ? `/${w.light} lt` : ""}${w.holy ? `/${w.holy} holy` : ""} · ${w.upgrade} · ${w.skill}${w.loc ? ` · ${w.loc}` : ""}`}
              note={w.dlc !== "base" ? DLC_LABEL[w.dlc] : undefined}
            />
          ))}
        </Panel>
      ) : null}

      {tab === "Armor" ? (
        <div className="space-y-3">
          {armorGroups.map(([set, pieces]) => (
            <Panel key={set}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <h3 className="font-display text-base">{set}</h3>
                <span className="text-[10px] uppercase tracking-wider text-fg-subtle">
                  {pieces.filter((p) => ch.checks[checkId.arm(p.id)]).length}/{pieces.length}
                </span>
              </div>
              {pieces.map((a) => (
                <CheckRow
                  key={a.id}
                  checked={!!ch.checks[checkId.arm(a.id)]}
                  onToggle={() => toggle(checkId.arm(a.id))}
                  title={a.name}
                  meta={`${a.slot} · ${a.weight} wt · poise ${a.poise} · phys ${a.phys}${a.mag ? ` · mag ${a.mag}` : ""}${a.fire ? ` · fire ${a.fire}` : ""}`}
                  note={a.dlc !== "base" ? DLC_LABEL[a.dlc] : undefined}
                />
              ))}
            </Panel>
          ))}
        </div>
      ) : null}

      {tab === "Talismans" ? (
        <Panel>
          {tals.map((t) => (
            <CheckRow
              key={t.id}
              checked={!!ch.checks[checkId.tal(t.id)]}
              onToggle={() => toggle(checkId.tal(t.id))}
              title={t.name}
              meta={`${t.effect}${t.loc ? ` · ${t.loc}` : ""} · ${t.weight} wt`}
              note={t.dlc !== "base" ? DLC_LABEL[t.dlc] : undefined}
            />
          ))}
        </Panel>
      ) : null}

      {tab === "Spells" ? (
        <Panel>
          {spells.map((s) => (
            <CheckRow
              key={s.id}
              checked={!!ch.checks[checkId.spl(s.id)]}
              onToggle={() => toggle(checkId.spl(s.id))}
              title={s.name}
              meta={`${s.kind} · ${s.fp} FP · ${s.slots} slot${s.slots > 1 ? "s" : ""}${reqText(s.req) ? ` · ${reqText(s.req)}` : ""}${s.loc ? ` · ${s.loc}` : ""}`}
              note={s.notes ?? (s.dlc !== "base" ? DLC_LABEL[s.dlc] : undefined)}
            />
          ))}
        </Panel>
      ) : null}

      {tab === "Ashes of War" ? (
        <Panel>
          {ashes.map((s) => (
            <CheckRow
              key={s.id}
              checked={!!ch.checks[checkId.aow(s.id)]}
              onToggle={() => toggle(checkId.aow(s.id))}
              title={s.name}
              meta={`${s.affinity || "Standard"} · ${s.skill}`}
              note={s.dlc !== "base" ? DLC_LABEL[s.dlc] : undefined}
            />
          ))}
        </Panel>
      ) : null}

      {tab === "Spirits" ? (
        <Panel>
          {spirits.map((s) => (
            <CheckRow
              key={s.id}
              checked={!!ch.checks[checkId.spirit(s.id)]}
              onToggle={() => toggle(checkId.spirit(s.id))}
              title={s.name}
              meta={`${s.legendary ? "Legendary · " : ""}${s.region ? `${s.region} · ` : ""}${s.loc || "Lands Between"}`}
              note={s.notes ?? (s.dlc !== "base" ? DLC_LABEL[s.dlc] : undefined)}
            />
          ))}
        </Panel>
      ) : null}
    </div>
  );
}
