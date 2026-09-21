import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FORKS,
  THREADS,
  endingStatus,
  impactOfFork,
  lockedReasons,
  worldStamps,
  type Impact,
} from "@/data/flags";
import { QUESTS } from "@/data/quests";
import { PageTitle, Panel } from "@/components/shell";
import { ConsequenceModal } from "@/components/consequence";
import { Button } from "@/components/ui/button";
import { checkId, useLedger } from "@/store/ledger";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/weave")({ component: WeavePage });

const STATE_LABEL: Record<string, string> = {
  locked: "Locked",
  open: "In motion",
  ready: "Ready to choose",
  claimed: "Claimed",
};

const FLAG_LABEL: Record<string, string> = {
  elden_beast: "Elden Beast",
  ranni_ready: "Ranni's night",
  goldmask_rune: "Perfect Order rune",
  fia_rune: "Death-Prince rune",
  dung_rune: "Fell Curse rune",
  frenzy: "Frenzied Flame",
  needle: "Miquella's Needle",
};

function prettyFlags(ids: string[]) {
  return ids.map((id) => FLAG_LABEL[id] ?? id.replace(/_/g, " ")).join(" · ");
}

function WeavePage() {
  const ch = useLedger((s) => s.active());
  const setFork = useLedger((s) => s.setFork);
  const setCheck = useLedger((s) => s.setCheck);
  const toggle = useLedger((s) => s.toggle);
  const endings = endingStatus(ch);
  const stamps = worldStamps(ch);
  const locks = lockedReasons(ch);
  const [threadId, setThreadId] = useState<string | null>(THREADS[0]?.id ?? null);
  const [pending, setPending] = useState<{ forkId: string; optionId: string; impact: Impact } | null>(null);

  const thread = THREADS.find((t) => t.id === threadId) ?? THREADS[0];
  const related = useMemo(() => {
    if (!thread) return [];
    const names = [thread.from, thread.to].map((n) => n.toLowerCase());
    return QUESTS.filter((q) => names.some((n) => q.name.toLowerCase().includes(n) || n.includes(q.name.toLowerCase().split(" ")[0]!)));
  }, [thread]);

  function askFork(forkId: string, optionId: string) {
    const impact = impactOfFork(forkId, optionId);
    if (impact) setPending({ forkId, optionId, impact });
    else applyFork(forkId, optionId);
  }

  function applyFork(forkId: string, optionId: string) {
    setFork(forkId, optionId);
    const fork = FORKS.find((f) => f.id === forkId);
    if (!fork) return;
    const q = QUESTS.find((x) => x.id === fork.quest);
    const step = q?.steps.find((s) => s.fork === forkId);
    if (q && step) setCheck(checkId.quest(q.id, step.id), true);
  }

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-xl min-h-48 sm:min-h-64 shadow-panel">
        <img src="/atlas/weave.jpg" alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/20" />
        <div className="relative z-10 p-5 sm:p-8 flex flex-col justify-end min-h-48 sm:min-h-64">
          <p className="font-display text-[10px] tracking-[0.32em] uppercase text-brass">Fate's knots</p>
          <h2 className="mt-1 font-display text-3xl sm:text-4xl text-fg">The Weave</h2>
          <p className="mt-3 max-w-xl text-sm text-fg-muted leading-relaxed">
            Questlines lock each other. Endings overwrite endings. Tick the world, pick the forks, watch who dies.
          </p>
        </div>
      </div>

      <PageTitle kicker="World state" title="Stamps">
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={!!ch.checks[checkId.flag("needle")]}
            onChange={() => toggle(checkId.flag("needle"))}
            className="size-4 accent-brass"
          />
          Miquella's Needle used
        </label>
      </PageTitle>

      <div className="flex flex-wrap gap-2 mb-8">
        {stamps.map((s) => (
          <span
            key={s.id}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-display uppercase tracking-[0.14em]",
              s.on ? "bg-brass text-bg" : "bg-surface text-fg-subtle",
            )}
          >
            {s.label}
          </span>
        ))}
      </div>

      {locks.length ? (
        <Panel className="mb-8">
          <p className="font-display text-[10px] tracking-[0.24em] uppercase text-blood">Already broken</p>
          <ul className="mt-3 space-y-3">
            {locks.map((l) => (
              <li key={l.id}>
                <Link to={l.href} className="block">
                  <p className="text-sm text-fg">{l.label}</p>
                  <p className="text-xs text-fg-muted mt-0.5">{l.reason}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <p className="mb-8 text-sm text-fg-muted">No irreversible lockouts yet. The web is still intact.</p>
      )}

      <p className="font-display text-[10px] tracking-[0.32em] uppercase text-brass mb-3">Endings</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {endings.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => {
              if (e.state === "ready" || e.state === "claimed") toggle(checkId.ending(e.id));
            }}
            className={cn(
              "rounded-xl p-4 text-left shadow-panel transition-colors duration-150",
              e.state === "locked" && "opacity-50",
              e.state === "ready" && "shadow-brass",
              e.state === "claimed" && "bg-brass/15",
              e.state !== "claimed" && "bg-surface/80",
            )}
          >
            <p className="font-display text-[10px] tracking-[0.2em] uppercase text-brass">{STATE_LABEL[e.state]}</p>
            <h3 className="mt-1 font-display text-lg text-fg">{e.name}</h3>
            <p className="mt-2 text-xs text-fg-muted leading-relaxed">{e.summary}</p>
            {e.missing.length ? (
              <p className="mt-3 text-[11px] text-fg-subtle">Needs: {prettyFlags(e.missing)}</p>
            ) : null}
            {e.blocked.length ? (
              <p className="mt-3 text-[11px] text-blood">Blocked by {prettyFlags(e.blocked)}</p>
            ) : null}
          </button>
        ))}
      </div>

      <p className="font-display text-[10px] tracking-[0.32em] uppercase text-brass mb-3">Forks</p>
      <p className="mb-4 max-w-2xl text-sm text-fg-muted leading-relaxed">
        These choices kill the other reward. Commit them here and the quest step ticks with them.
      </p>
      <div className="space-y-4 mb-10">
        {FORKS.map((fork) => {
          const chosen = ch.forks?.[fork.id];
          return (
            <Panel key={fork.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-display text-xl">{fork.title}</h3>
                <p className="text-xs text-fg-subtle">{fork.when}</p>
              </div>
              <p className="mt-2 text-xs text-blood/90 leading-relaxed">{fork.warning}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {fork.options.map((o) => {
                  const on = chosen === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        if (on) return;
                        askFork(fork.id, o.id);
                      }}
                      className={cn(
                        "rounded-lg px-3 py-3 text-left transition-colors duration-150",
                        on ? "bg-brass/15 shadow-brass" : "bg-bg hover:bg-surface-2",
                      )}
                    >
                      <span className={cn("block text-sm", on ? "text-brass" : "text-fg")}>{o.label}</span>
                      <span className="mt-1 block text-xs text-fg-muted leading-relaxed">{o.detail}</span>
                      <span className="mt-2 block text-[11px] text-brass-bright/80">{o.grants}</span>
                    </button>
                  );
                })}
              </div>
              {chosen ? (
                <Button variant="ghost" size="sm" className="mt-3" type="button" onClick={() => setFork(fork.id, "")}>
                  Clear this fork
                </Button>
              ) : null}
            </Panel>
          );
        })}
      </div>

      <p className="font-display text-[10px] tracking-[0.32em] uppercase text-brass mb-3">Threads</p>
      <p className="mb-4 max-w-2xl text-sm text-fg-muted leading-relaxed">
        How the stories knot. Select a thread — the related questlines surface underneath.
      </p>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          {THREADS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThreadId(t.id)}
              className={cn(
                "w-full rounded-lg px-4 py-3 text-left transition-colors duration-150",
                threadId === t.id ? "bg-brass/12 shadow-brass" : "bg-surface/80 hover:bg-surface-2",
              )}
            >
              <p className="font-display text-sm text-fg">
                {t.from}
                <span className="mx-2 text-brass">→</span>
                {t.to}
              </p>
            </button>
          ))}
        </div>
        {thread ? (
          <Panel>
            <p className="font-display text-[10px] tracking-[0.2em] uppercase text-brass">
              {thread.from} · {thread.to}
            </p>
            <p className="mt-3 text-sm text-fg leading-relaxed">{thread.text}</p>
            {related.length ? (
              <div className="mt-5 space-y-3">
                <p className="font-display text-[10px] tracking-[0.2em] uppercase text-fg-subtle">Tied questlines</p>
                {related.map((q) => (
                  <Link key={q.id} to="/quests" className="block rounded-md bg-bg/50 px-3 py-2">
                    <p className="text-sm text-fg">{q.name}</p>
                    <p className="text-xs text-fg-muted mt-0.5">{q.lockout}</p>
                  </Link>
                ))}
              </div>
            ) : null}
          </Panel>
        ) : null}
      </div>

      <ConsequenceModal
        impact={pending?.impact ?? null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) applyFork(pending.forkId, pending.optionId);
          setPending(null);
        }}
      />
    </div>
  );
}
