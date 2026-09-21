import { createFileRoute } from "@tanstack/react-router";
import { CLASSES } from "@/data/classes";
import { ARMOR } from "@/data/armor";
import { TALISMANS } from "@/data/talismans";
import { WEAPONS } from "@/data/weapons";
import { STAT_LABELS, dlcVisible, type StatKey } from "@/data/types";
import {
  bestClassFor,
  classLevel,
  equipLoadAt,
  hpAt,
  fpAt,
  stamAt,
  meetsReq,
  rollClass,
  runeCostToNext,
  runesToLevel,
  SOFT_CAPS,
  summonRange,
  weaponAR,
} from "@/data/formulas";
import { PageTitle, Panel } from "@/components/shell";
import { useLedger } from "@/store/ledger";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/picker";

export const Route = createFileRoute("/forge")({ component: ForgePage });

const KEYS: StatKey[] = ["vig", "mnd", "end", "str", "dex", "int", "fai", "arc"];

function ForgePage() {
  const ch = useLedger((s) => s.active());
  const { setClass, setStat, patchBuild } = useLedger();
  const cls = CLASSES.find((c) => c.id === ch.classId) ?? CLASSES[0];
  const stats = ch.build.stats;
  const level = classLevel(stats, cls);
  const hp = hpAt(stats.vig);
  const fp = fpAt(stats.mnd);
  const stam = stamAt(stats.end);
  const loadCap = equipLoadAt(stats.end);

  const helm = ARMOR.find((a) => a.id === ch.build.helm);
  const chest = ARMOR.find((a) => a.id === ch.build.chest);
  const gaunt = ARMOR.find((a) => a.id === ch.build.gauntlets);
  const legs = ARMOR.find((a) => a.id === ch.build.legs);
  const tals = TALISMANS.filter((t) => ch.build.talismans.includes(t.id));
  const rh = WEAPONS.find((w) => w.id === ch.build.rh1);
  const lh = WEAPONS.find((w) => w.id === ch.build.lh1);

  const gearWeight =
    (helm?.weight ?? 0) +
    (chest?.weight ?? 0) +
    (gaunt?.weight ?? 0) +
    (legs?.weight ?? 0) +
    tals.reduce((n, t) => n + t.weight, 0) +
    (rh?.weight ?? 0) +
    (lh?.weight ?? 0);
  const roll = rollClass(gearWeight, loadCap);
  const poise = (helm?.poise ?? 0) + (chest?.poise ?? 0) + (gaunt?.poise ?? 0) + (legs?.poise ?? 0);
  const ar = rh ? weaponAR(rh, stats, ch.build.upgrade, ch.build.twoHand) : null;
  const canWield = rh ? meetsReq(rh, stats, ch.build.twoHand) : true;
  const range = summonRange(level);
  const rec = bestClassFor(stats);

  const shown = { includeDlc: ch.includeDlc, includeTarnished: ch.includeTarnished !== false };
  const armorBy = (slot: "helm" | "chest" | "gauntlets" | "legs") =>
    ARMOR.filter((a) => a.slot === slot && dlcVisible(a.dlc, shown));
  const weapons = WEAPONS.filter((w) => dlcVisible(w.dlc, shown));
  const talOptions = TALISMANS.filter((t) => dlcVisible(t.dlc, shown));

  return (
    <div>
      <PageTitle kicker="Theorycraft" title="The Forge" />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-xs text-fg-muted">
              Starting class
              <select
                value={ch.classId}
                onChange={(e) => setClass(e.target.value)}
                className="mt-1 block h-10 rounded-md bg-bg px-3 text-sm text-fg ring-1 ring-border"
              >
                {CLASSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Lv {c.level})
                  </option>
                ))}
              </select>
            </label>
            <div className="text-right">
              <p className="font-display text-3xl tabular-nums text-brass">Lv {level}</p>
              <p className="text-xs text-fg-subtle">{runeCostToNext(level).toLocaleString()} runes to next</p>
            </div>
          </div>
          {rec.id !== ch.classId ? (
            <p className="mt-3 text-xs text-brass-bright">
              For these stats, {rec.name} wastes fewer points than {cls.name}.
            </p>
          ) : (
            <p className="mt-3 text-xs text-ok">This is the most efficient class for the current spread.</p>
          )}

          <div className="mt-5 space-y-3">
            {KEYS.map((k) => (
              <div key={k} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-fg-muted">{STAT_LABELS[k]}</span>
                <input
                  type="range"
                  min={cls.stats[k]}
                  max={99}
                  value={stats[k]}
                  onChange={(e) => setStat(k, Number(e.target.value))}
                  className="accent-brass w-full"
                />
                <span className="tabular-nums text-sm text-fg">{stats[k]}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">Vitals</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-fg-subtle text-xs">HP</dt>
                <dd className="tabular-nums text-lg">{hp}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle text-xs">FP</dt>
                <dd className="tabular-nums text-lg">{fp}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle text-xs">Stamina</dt>
                <dd className="tabular-nums text-lg">{stam}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle text-xs">Poise</dt>
                <dd className="tabular-nums text-lg">{poise}</dd>
              </div>
              <div>
                <dt className="text-fg-subtle text-xs">Equip load</dt>
                <dd className="tabular-nums text-lg">
                  {gearWeight.toFixed(1)} / {loadCap.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt className="text-fg-subtle text-xs">Roll</dt>
                <dd className={roll.label === "Heavy" || roll.label === "Overloaded" ? "text-blood" : "text-brass"}>
                  {roll.label}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-fg-muted">{roll.hint}</p>
          </Panel>
          <Panel>
            <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">Matchmaking</p>
            <p className="mt-2 text-sm">
              You can summon / be summoned around{" "}
              <span className="tabular-nums text-brass">
                {range.lower}–{range.upper}
              </span>
            </p>
            <p className="mt-1 text-xs text-fg-subtle">Weapon upgrade matching is separate. Keep smithing and somber in band.</p>
            <p className="mt-3 text-xs text-fg-muted">
              Runes from {cls.level} → {level}: {runesToLevel(cls.level, level).toLocaleString()}
            </p>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">Armament</p>
          <label className="mt-3 block text-xs text-fg-muted">
            Right hand
            <SearchSelect
              value={ch.build.rh1}
              onChange={(id) => patchBuild({ rh1: id })}
              options={weapons.map((w) => ({ id: w.id, label: w.name, hint: w.cls }))}
              placeholder="Search weapons"
            />
          </label>
          <label className="mt-3 block text-xs text-fg-muted">
            Left hand
            <SearchSelect
              value={ch.build.lh1}
              onChange={(id) => patchBuild({ lh1: id })}
              options={weapons.map((w) => ({ id: w.id, label: w.name, hint: w.cls }))}
              placeholder="Search weapons"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-3 items-center">
            <label className="text-xs text-fg-muted">
              Upgrade
              <input
                type="number"
                min={0}
                max={25}
                value={ch.build.upgrade}
                onChange={(e) => patchBuild({ upgrade: Number(e.target.value) })}
                className="ml-2 h-9 w-16 rounded-md bg-bg px-2 text-sm ring-1 ring-border"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={ch.build.twoHand}
                onChange={(e) => patchBuild({ twoHand: e.target.checked })}
                className="accent-brass"
              />
              Two-hand (1.5× STR)
            </label>
          </div>
          {rh && ar ? (
            <div className="mt-4">
              <p className={`text-sm ${canWield ? "text-fg" : "text-blood"}`}>
                {rh.name} · {rh.skill} {canWield ? "" : "— cannot wield"}
              </p>
              <p className="mt-1 font-display text-2xl tabular-nums text-brass">AR {ar.total}</p>
              <p className="text-xs text-fg-subtle tabular-nums">
                Phys {ar.phys}
                {ar.mag ? ` · Mag ${ar.mag}` : ""}
                {ar.fire ? ` · Fire ${ar.fire}` : ""}
                {ar.light ? ` · Lt ${ar.light}` : ""}
                {ar.holy ? ` · Holy ${ar.holy}` : ""}
              </p>
            </div>
          ) : null}
        </Panel>

        <Panel>
          <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">Panoply</p>
          {(
            [
              ["helm", "Helm", ch.build.helm],
              ["chest", "Chest", ch.build.chest],
              ["gauntlets", "Gauntlets", ch.build.gauntlets],
              ["legs", "Legs", ch.build.legs],
            ] as const
          ).map(([slot, label, value]) => (
            <label key={slot} className="mt-2 block text-xs text-fg-muted">
              {label}
              <SearchSelect
                value={value}
                onChange={(id) => patchBuild({ [slot]: id })}
                options={armorBy(slot).map((a) => ({
                  id: a.id,
                  label: a.name,
                  hint: `${a.weight} wt`,
                }))}
                placeholder={`Search ${label.toLowerCase()}`}
              />
            </label>
          ))}
          <div className="mt-2 space-y-2">
            <p className="text-xs text-fg-muted">Talismans (4 slots)</p>
            {[0, 1, 2, 3].map((i) => (
              <SearchSelect
                key={i}
                value={ch.build.talismans[i] ?? ""}
                onChange={(id) => {
                  const next = [...ch.build.talismans];
                  if (id) next[i] = id;
                  else next.splice(i, 1);
                  patchBuild({ talismans: next.filter(Boolean).slice(0, 4) });
                }}
                options={talOptions.map((t) => ({ id: t.id, label: t.name, hint: t.effect }))}
                placeholder={`Slot ${i + 1}`}
              />
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4">
        <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">Soft caps</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SOFT_CAPS.map((s) => (
            <div key={s.stat}>
              <p className="text-sm">
                {STAT_LABELS[s.stat]} · {s.caps.join(" / ")}
                <span className="ml-2 tabular-nums text-brass">{stats[s.stat]}</span>
              </p>
              <p className="text-xs text-fg-muted mt-0.5">{s.note}</p>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            const url = new URL(window.location.href);
            url.pathname = "/forge";
            navigator.clipboard.writeText(
              `${ch.name} · ${cls.name} Lv ${level} · ${KEYS.map((k) => `${k.toUpperCase()} ${stats[k]}`).join(" ")} · ${rh?.name ?? "unarmed"} +${ch.build.upgrade} AR ${ar?.total ?? 0}`,
            );
          }}
        >
          Copy build card
        </Button>
      </Panel>
    </div>
  );
}
