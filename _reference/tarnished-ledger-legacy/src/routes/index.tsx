import { createFileRoute, Link } from "@tanstack/react-router";
import { CLASSES } from "@/data/classes";
import { classLevel } from "@/data/formulas";
import { worldStamps } from "@/data/flags";
import { PageTitle, Panel } from "@/components/shell";
import { useLedger } from "@/store/ledger";
import { nextRouteStep, openMissables, progressOf } from "@/lib/progress";
import { archiveProgress } from "@/lib/archive-progress";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 72 72" className="size-20">
        <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" className="text-surface-2" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-brass"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" className="fill-fg text-[12px]" fontFamily="Cinzel">
          {pct}
        </text>
      </svg>
      <span className="text-[11px] uppercase tracking-[0.16em] text-fg-muted font-display">{label}</span>
    </div>
  );
}

function Home() {
  const { characters, activeId, addCharacter, setActive, rename, setDlc, setTarnished, setNg } = useLedger();
  const ch = useLedger((s) => s.active());
  const prog = progressOf(ch);
  const archive = archiveProgress(ch);
  const miss = openMissables(ch).slice(0, 6);
  const next = nextRouteStep(ch);
  const stamps = worldStamps(ch);
  const cls = CLASSES.find((c) => c.id === ch.classId);
  const level = classLevel(ch.build.stats, cls ?? CLASSES[0]);
  const [name, setName] = useState("");
  const [klass, setKlass] = useState("vagabond");

  return (
    <div>
      <PageTitle kicker="Commandery" title="The Ledger">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={ch.includeDlc}
              onChange={(e) => setDlc(e.target.checked)}
              className="size-4 accent-brass"
            />
            Shadow of the Erdtree
          </label>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={ch.includeTarnished !== false}
              onChange={(e) => setTarnished(e.target.checked)}
              className="size-4 accent-brass"
            />
            Tarnished Pack
          </label>
        </div>
      </PageTitle>

      <Panel className="mb-6">
        <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">Patch 1.17 · August 2026</p>
        <p className="mt-2 text-sm text-fg-muted leading-relaxed">
          Atlas, Weave, Tarnished Pack, and every Site of Grace. Fork a quest and watch the rest of the world lock.
        </p>
      </Panel>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link to="/atlas" className="group relative overflow-hidden rounded-xl min-h-40 shadow-panel">
          <img src="/atlas/limgrave.jpg" alt="" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
          <span className="relative z-10 flex h-full min-h-40 flex-col justify-end p-5">
            <span className="font-display text-[10px] tracking-[0.28em] uppercase text-brass">Cartography</span>
            <span className="mt-1 font-display text-2xl text-fg">Atlas</span>
            <span className="mt-1 text-xs text-fg-muted">Tap a land. Tick its graves.</span>
          </span>
        </Link>
        <Link to="/weave" className="group relative overflow-hidden rounded-xl min-h-40 shadow-panel">
          <img src="/atlas/weave.jpg" alt="" className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
          <span className="relative z-10 flex h-full min-h-40 flex-col justify-end p-5">
            <span className="font-display text-[10px] tracking-[0.28em] uppercase text-brass">Fate's knots</span>
            <span className="mt-1 font-display text-2xl text-fg">Weave</span>
            <span className="mt-1 text-xs text-fg-muted">Endings, forks, and who they kill.</span>
          </span>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <p className="font-display text-[10px] tracking-[0.24em] uppercase text-fg-subtle">Active tarnished</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {characters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  c.id === activeId ? "bg-brass text-bg" : "bg-surface-2 text-fg-muted hover:text-fg"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-fg-muted">
              Name
              <input
                value={ch.name}
                onChange={(e) => rename(e.target.value)}
                className="mt-1 h-10 w-full rounded-md bg-bg px-3 text-sm text-fg outline-none ring-1 ring-border focus:ring-brass"
              />
            </label>
            <label className="text-xs text-fg-muted">
              Journey
              <select
                value={ch.ng}
                onChange={(e) => setNg(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-md bg-bg px-3 text-sm text-fg outline-none ring-1 ring-border focus:ring-brass"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    NG{n === 1 ? "" : `+${n - 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-4 text-sm text-fg-muted">
            {cls?.name} · Level {level} · {cls?.summary}
          </p>
        </Panel>

        <Panel>
          <p className="font-display text-[10px] tracking-[0.24em] uppercase text-fg-subtle">New character</p>
          <div className="mt-3 flex flex-col gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this tarnished"
              className="h-10 rounded-md bg-bg px-3 text-sm text-fg outline-none ring-1 ring-border focus:ring-brass"
            />
            <select
              value={klass}
              onChange={(e) => setKlass(e.target.value)}
              className="h-10 rounded-md bg-bg px-3 text-sm text-fg outline-none ring-1 ring-border focus:ring-brass"
            >
              {CLASSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button
              onClick={() => {
                addCharacter(name, klass);
                setName("");
              }}
            >
              <Plus className="size-4" />
              Begin journey
            </Button>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Panel className="flex justify-center py-5">
          <Ring pct={prog.bosses.pct} label="Bosses" />
        </Panel>
        <Panel className="flex justify-center py-5">
          <Ring pct={prog.graces.pct} label="Graces" />
        </Panel>
        <Panel className="flex justify-center py-5">
          <Ring pct={prog.upgrades.pct} label="Relics" />
        </Panel>
        <Panel className="flex justify-center py-5">
          <Ring pct={prog.spirits.pct} label="Ashes" />
        </Panel>
        <Panel className="flex justify-center py-5">
          <Ring pct={prog.quests.pct} label="Quests" />
        </Panel>
        <Panel className="flex justify-center py-5">
          <Ring pct={prog.route.pct} label="Path" />
        </Panel>
        <Panel className="flex justify-center py-5">
          <Ring pct={archive.pct} label="Archive" />
        </Panel>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {stamps.map((s) => (
          <span
            key={s.id}
            className={cn(
              "rounded-full px-3 py-1.5 text-[10px] font-display uppercase tracking-[0.14em]",
              s.on ? "bg-brass text-bg" : "bg-surface text-fg-subtle",
            )}
          >
            {s.label}
          </span>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center justify-between">
            <p className="font-display text-sm tracking-[0.18em] uppercase text-brass">Next on the path</p>
            <Link to="/guide" className="text-xs text-fg-muted hover:text-brass">
              Open path
            </Link>
          </div>
          {next ? (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-fg-subtle">{next.region}</p>
              <h3 className="mt-1 font-display text-xl">{next.title}</h3>
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">{next.body}</p>
              <Link to="/guide" className="mt-4 inline-flex items-center gap-1 text-sm text-brass">
                Continue <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">The path is complete. The Erdtree waits — or NG+ does.</p>
          )}
        </Panel>

        <Panel>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-blood" />
            <p className="font-display text-sm tracking-[0.18em] uppercase text-blood">Lockouts & missables</p>
          </div>
          {miss.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">No flagged missables outstanding. Stay vigilant anyway.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {miss.map((m) => (
                <li key={m.id}>
                  <Link to={m.href} className="block">
                    <p className="text-sm text-fg">{m.label}</p>
                    <p className="text-xs text-fg-muted mt-0.5">{m.warning}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
