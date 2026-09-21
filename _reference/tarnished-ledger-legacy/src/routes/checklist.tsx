import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BOSS_KINDS } from "@/data/bosses";
import { DLC_LABEL, REGIONS, type BossKind, type Region } from "@/data/types";
import { impactOfBoss, type Impact } from "@/data/flags";
import { PageTitle, Panel } from "@/components/shell";
import { CheckRow } from "@/components/check-row";
import { ConsequenceModal } from "@/components/consequence";
import { checkId, useLedger } from "@/store/ledger";
import { visibleBosses, visibleGraces, visibleSpirits, visibleTears, visibleUpgrades } from "@/lib/progress";

export const Route = createFileRoute("/checklist")({ component: Checklist });

const TABS = ["Bosses", "Graces", "Upgrades", "Ashes", "Tears"] as const;

function Checklist() {
  const ch = useLedger((s) => s.active());
  const toggle = useLedger((s) => s.toggle);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Bosses");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All");
  const [kind, setKind] = useState<BossKind | "All">("All");
  const [hideDone, setHideDone] = useState(false);
  const [pending, setPending] = useState<{ id: string; impact: Impact } | null>(null);

  const bosses = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visibleBosses(ch).filter((b) => {
      if (region !== "All" && b.region !== region) return false;
      if (kind !== "All" && b.kind !== kind) return false;
      if (hideDone && ch.checks[checkId.boss(b.id)]) return false;
      if (needle && !`${b.name} ${b.location} ${b.drops}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [ch, q, region, kind, hideDone]);

  const upgrades = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visibleUpgrades(ch).filter((u) => {
      if (region !== "All" && u.region !== region) return false;
      if (hideDone && ch.checks[checkId.upg(u.id)]) return false;
      if (needle && !`${u.name} ${u.location} ${u.category}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [ch, q, region, hideDone]);

  const graces = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visibleGraces(ch).filter((g) => {
      if (region !== "All" && g.region !== region) return false;
      if (hideDone && ch.checks[checkId.grace(g.id)]) return false;
      if (needle && !`${g.name} ${g.region} ${g.notes ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [ch, q, region, hideDone]);

  const spirits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visibleSpirits(ch).filter((s) => {
      if (region !== "All" && s.region !== region) return false;
      if (hideDone && ch.checks[checkId.spirit(s.id)]) return false;
      if (needle && !`${s.name} ${s.loc} ${s.notes ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [ch, q, region, hideDone]);

  const tears = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visibleTears(ch).filter((t) => {
      if (region !== "All" && t.region !== region) return false;
      if (hideDone && ch.checks[checkId.tear(t.id)]) return false;
      if (needle && !`${t.name} ${t.loc} ${t.effect}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [ch, q, region, hideDone]);

  const graceGroups = useMemo(() => {
    const map = new Map<Region, typeof graces>();
    for (const g of graces) {
      const arr = map.get(g.region) ?? [];
      arr.push(g);
      map.set(g.region, arr);
    }
    return REGIONS.filter((r) => map.has(r)).map((r) => ({ region: r, items: map.get(r)! }));
  }, [graces]);

  const usedRegions =
    tab === "Bosses"
      ? [...new Set(visibleBosses(ch).map((b) => b.region))]
      : tab === "Graces"
        ? [...new Set(visibleGraces(ch).map((g) => g.region))]
        : tab === "Ashes"
          ? [...new Set(visibleSpirits(ch).map((s) => s.region))]
          : tab === "Tears"
            ? [...new Set(visibleTears(ch).map((t) => t.region))]
            : [...new Set(visibleUpgrades(ch).map((u) => u.region))];

  const shownCount =
    tab === "Bosses"
      ? `${bosses.filter((b) => ch.checks[checkId.boss(b.id)]).length} / ${bosses.length} shown`
      : tab === "Graces"
        ? `${graces.filter((g) => ch.checks[checkId.grace(g.id)]).length} / ${graces.length} shown`
        : tab === "Ashes"
          ? `${spirits.filter((s) => ch.checks[checkId.spirit(s.id)]).length} / ${spirits.length} shown`
          : tab === "Tears"
            ? `${tears.filter((t) => ch.checks[checkId.tear(t.id)]).length} / ${tears.length} shown`
            : `${upgrades.filter((u) => ch.checks[checkId.upg(u.id)]).length} / ${upgrades.length} shown`;

  function tryBoss(id: string) {
    if (ch.checks[checkId.boss(id)]) {
      toggle(checkId.boss(id));
      return;
    }
    const impact = impactOfBoss(ch, id);
    if (impact) setPending({ id: checkId.boss(id), impact });
    else toggle(checkId.boss(id));
  }

  return (
    <div>
      <PageTitle kicker="Catalogue" title="Checklist">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-display uppercase tracking-[0.16em] ${
                tab === t ? "bg-brass text-bg" : "bg-surface text-fg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </PageTitle>

      <Panel className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              tab === "Graces"
                ? "Search sites of grace"
                : tab === "Ashes"
                  ? "Search spirit ashes"
                  : tab === "Tears"
                    ? "Search physick tears"
                    : "Search names, drops, locations"
            }
            className="h-10 flex-1 rounded-md bg-bg px-3 text-sm text-fg outline-none ring-1 ring-border focus:ring-brass"
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="h-10 rounded-md bg-bg px-3 text-sm text-fg ring-1 ring-border"
          >
            <option>All</option>
            {REGIONS.filter((r) => usedRegions.includes(r)).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          {tab === "Bosses" ? (
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as BossKind | "All")}
              className="h-10 rounded-md bg-bg px-3 text-sm text-fg ring-1 ring-border"
            >
              <option>All</option>
              {BOSS_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-fg-muted shrink-0">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-brass" />
            Hide done
          </label>
        </div>
      </Panel>

      {tab === "Bosses" ? (
        <Panel className="p-2 sm:p-3">
          <p className="px-3 py-2 text-xs text-fg-subtle tabular-nums">{shownCount}</p>
          {bosses.map((b) => (
            <CheckRow
              key={b.id}
              checked={!!ch.checks[checkId.boss(b.id)]}
              onToggle={() => tryBoss(b.id)}
              title={b.name}
              missable={b.missable}
              meta={`${b.region} · ${b.location} · ${b.kind} · ${b.drops}${b.dlc !== "base" ? ` · ${DLC_LABEL[b.dlc]}` : ""}`}
              note={b.notes}
            />
          ))}
        </Panel>
      ) : null}

      {tab === "Graces" ? (
        <div className="space-y-4">
          <p className="px-1 text-xs text-fg-subtle tabular-nums">{shownCount} · Sites of Grace</p>
          {graceGroups.map((group) => {
            const done = group.items.filter((g) => ch.checks[checkId.grace(g.id)]).length;
            return (
              <Panel key={group.region} className="p-2 sm:p-3">
                <div className="flex items-baseline justify-between px-3 py-2">
                  <h3 className="font-display text-sm tracking-[0.16em] uppercase text-brass">{group.region}</h3>
                  <span className="text-[11px] tabular-nums text-fg-subtle">
                    {done}/{group.items.length}
                  </span>
                </div>
                {group.items.map((g) => (
                  <CheckRow
                    key={g.id}
                    checked={!!ch.checks[checkId.grace(g.id)]}
                    onToggle={() => toggle(checkId.grace(g.id))}
                    title={g.name}
                    meta={g.notes}
                  />
                ))}
              </Panel>
            );
          })}
        </div>
      ) : null}

      {tab === "Upgrades" ? (
        <Panel className="p-2 sm:p-3">
          <p className="px-3 py-2 text-xs text-fg-subtle tabular-nums">{shownCount}</p>
          {upgrades.map((u) => (
            <CheckRow
              key={u.id}
              checked={!!ch.checks[checkId.upg(u.id)]}
              onToggle={() => toggle(checkId.upg(u.id))}
              title={u.name}
              meta={`${u.region} · ${u.location} · ${u.category}${u.dlc !== "base" ? ` · ${DLC_LABEL[u.dlc]}` : ""}`}
              note={u.notes}
            />
          ))}
        </Panel>
      ) : null}

      {tab === "Ashes" ? (
        <Panel className="p-2 sm:p-3">
          <p className="px-3 py-2 text-xs text-fg-subtle tabular-nums">{shownCount} · Spirit ashes</p>
          {spirits.map((s) => (
            <CheckRow
              key={s.id}
              checked={!!ch.checks[checkId.spirit(s.id)]}
              onToggle={() => toggle(checkId.spirit(s.id))}
              title={s.name}
              meta={`${s.region} · ${s.loc}${s.dlc !== "base" ? ` · ${DLC_LABEL[s.dlc]}` : ""}`}
              note={s.notes}
            />
          ))}
        </Panel>
      ) : null}

      {tab === "Tears" ? (
        <Panel className="p-2 sm:p-3">
          <p className="px-3 py-2 text-xs text-fg-subtle tabular-nums">{shownCount} · Crystal tears</p>
          {tears.map((t) => (
            <CheckRow
              key={t.id}
              checked={!!ch.checks[checkId.tear(t.id)]}
              onToggle={() => toggle(checkId.tear(t.id))}
              title={t.name}
              meta={`${t.region} · ${t.loc} · ${t.effect}${t.dlc !== "base" ? ` · ${DLC_LABEL[t.dlc]}` : ""}`}
            />
          ))}
        </Panel>
      ) : null}

      <ConsequenceModal
        impact={pending?.impact ?? null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) toggle(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
}
