import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageTitle, Panel } from "@/components/shell";
import { CheckRow } from "@/components/check-row";
import { ForkPick } from "@/components/fork-pick";
import { ConsequenceModal } from "@/components/consequence";
import { checkId, useLedger } from "@/store/ledger";
import { visibleQuests } from "@/lib/progress";
import { FORKS, impactOfFork, impactOfQuest, lockedReasons, type Impact } from "@/data/flags";

export const Route = createFileRoute("/quests")({ component: QuestsPage });

function QuestsPage() {
  const ch = useLedger((s) => s.active());
  const toggle = useLedger((s) => s.toggle);
  const setCheck = useLedger((s) => s.setCheck);
  const setFork = useLedger((s) => s.setFork);
  const list = visibleQuests(ch);
  const locks = lockedReasons(ch);
  const [pending, setPending] = useState<
    | { kind: "quest"; id: string; impact: Impact }
    | { kind: "fork"; forkId: string; optionId: string; impact: Impact }
    | null
  >(null);

  function tryQuest(qid: string, sid: string) {
    const id = checkId.quest(qid, sid);
    if (ch.checks[id]) {
      toggle(id);
      return;
    }
    const impact = impactOfQuest(qid, sid);
    if (impact) setPending({ kind: "quest", id, impact });
    else toggle(id);
  }

  return (
    <div>
      <PageTitle kicker="The Empyreans" title="Questlines">
        <Link to="/weave" className="text-xs uppercase tracking-[0.16em] font-display text-brass">
          Open the Weave
        </Link>
      </PageTitle>

      {locks.length ? (
        <Panel className="mb-6">
          <p className="font-display text-[10px] tracking-[0.24em] uppercase text-blood">Lockouts on this journey</p>
          <ul className="mt-3 space-y-2">
            {locks.map((l) => (
              <li key={l.id}>
                <p className="text-sm text-fg">{l.label}</p>
                <p className="text-xs text-fg-muted">{l.reason}</p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="space-y-4">
        {list.map((q) => {
          const done = q.steps.filter((s) => ch.checks[checkId.quest(q.id, s.id)]).length;
          return (
            <Panel key={q.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h3 className="font-display text-xl">{q.name}</h3>
                  {q.ending ? <p className="text-xs uppercase tracking-[0.16em] text-brass mt-1">{q.ending}</p> : null}
                </div>
                <p className="text-xs tabular-nums text-fg-subtle">
                  {done}/{q.steps.length} · {q.dlc === "sote" ? "DLC" : "Base"}
                </p>
              </div>
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">{q.summary}</p>
              <p className="mt-2 text-xs text-blood/90 leading-relaxed">{q.lockout}</p>
              <div className="mt-3 divide-y divide-border">
                {q.steps.map((s, i) => (
                  <div key={s.id}>
                    <CheckRow
                      checked={!!ch.checks[checkId.quest(q.id, s.id)]}
                      onToggle={() => tryQuest(q.id, s.id)}
                      title={`${i + 1}. ${s.text}`}
                      missable={s.missable}
                      meta={s.where}
                      note={s.warning}
                    />
                    {s.fork ? (
                      <ForkPick
                        forkId={s.fork}
                        onAsk={(forkId, optionId) => {
                          const impact = impactOfFork(forkId, optionId);
                          if (impact) setPending({ kind: "fork", forkId, optionId, impact });
                          else {
                            setFork(forkId, optionId);
                            setCheck(checkId.quest(q.id, s.id), true);
                          }
                        }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>

      <ConsequenceModal
        impact={pending?.impact ?? null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "quest") toggle(pending.id);
          else {
            setFork(pending.forkId, pending.optionId);
            const fork = FORKS.find((f) => f.id === pending.forkId);
            const q = list.find((x) => x.id === fork?.quest);
            const step = q?.steps.find((s) => s.fork === pending.forkId);
            if (q && step) setCheck(checkId.quest(q.id, step.id), true);
          }
          setPending(null);
        }}
      />
    </div>
  );
}
