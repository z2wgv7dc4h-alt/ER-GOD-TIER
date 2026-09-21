import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Compass,
  Flame,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Map,
  ScrollText,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLedger } from "@/store/ledger";
import { progressOf } from "@/lib/progress";

const NAV = [
  { to: "/", label: "Ledger", icon: LayoutDashboard },
  { to: "/atlas", label: "Atlas", icon: Map },
  { to: "/weave", label: "Weave", icon: GitBranch },
  { to: "/checklist", label: "Checklist", icon: ListChecks },
  { to: "/quests", label: "Quests", icon: ScrollText },
  { to: "/guide", label: "Path", icon: Compass },
  { to: "/codex", label: "Codex", icon: BookOpen },
  { to: "/forge", label: "Forge", icon: Swords },
  { to: "/chronicle", label: "Chronicle", icon: Flame },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useLedger.persist.rehydrate();
  }, []);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ch = useLedger((s) => s.active());
  const pct = progressOf(ch).all.pct;

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-border bg-bg-elevated/80">
        <div className="px-5 pt-7 pb-5">
          <p className="font-display text-[10px] tracking-[0.32em] text-brass uppercase">The Lands Between</p>
          <h1 className="mt-1 font-display text-xl text-fg leading-tight">Tarnished Ledger</h1>
          <p className="mt-3 text-xs text-fg-muted">
            {ch.name} · NG{ch.ng}
            {ch.includeDlc ? " · SotE" : ""}
            {ch.includeTarnished !== false ? " · Pack" : ""}
          </p>
          <div className="mt-4 h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-brass transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] tabular-nums text-fg-subtle">{pct}% catalogued</p>
        </div>
        <nav className="flex-1 px-3 pb-6 space-y-0.5">
          {NAV.map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                  active ? "bg-brass/12 text-brass" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon className="size-4" strokeWidth={1.6} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-5 pb-5 text-[10px] tracking-wide text-fg-subtle">Fan companion · not affiliated with FromSoftware</p>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-display text-[9px] tracking-[0.28em] text-brass uppercase">Tarnished Ledger</p>
              <p className="text-xs text-fg-muted">{ch.name}</p>
            </div>
            <span className="tabular-nums text-sm text-brass">{pct}%</span>
          </div>
          <nav className="flex overflow-x-auto px-2 pb-2 gap-1">
            {NAV.map((item) => {
              const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-display uppercase tracking-[0.14em]",
                    active ? "bg-brass text-bg" : "text-fg-muted bg-surface",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-display text-[10px] tracking-[0.32em] text-brass uppercase">{kicker}</p>
        <h2 className="mt-1 font-display text-3xl sm:text-4xl text-fg">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-xl bg-surface/80 p-4 sm:p-5 shadow-panel", className)}>{children}</section>
  );
}
