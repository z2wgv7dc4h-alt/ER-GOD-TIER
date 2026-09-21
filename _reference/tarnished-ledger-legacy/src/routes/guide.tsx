import { createFileRoute } from "@tanstack/react-router";
import { PageTitle, Panel } from "@/components/shell";
import { CheckRow } from "@/components/check-row";
import { checkId, useLedger } from "@/store/ledger";
import { visibleRoute } from "@/lib/progress";

export const Route = createFileRoute("/guide")({ component: GuidePage });

function GuidePage() {
  const ch = useLedger((s) => s.active());
  const toggle = useLedger((s) => s.toggle);
  const steps = visibleRoute(ch);

  return (
    <div>
      <PageTitle kicker="Grace to grace" title="The Path" />
      <p className="mb-6 max-w-2xl text-sm text-fg-muted leading-relaxed">
        A condensed single-playthrough spine. Side content is flagged in the checklist and quests — this is the order that
        keeps missables alive and the world open as long as possible.
      </p>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <Panel key={s.id} className={ch.checks[checkId.route(s.id)] ? "opacity-70" : ""}>
            <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">
              {String(i + 1).padStart(2, "0")} · {s.region}
            </p>
            <CheckRow
              checked={!!ch.checks[checkId.route(s.id)]}
              onToggle={() => toggle(checkId.route(s.id))}
              title={s.title}
            />
            <p className="px-3 pb-2 text-sm text-fg-muted leading-relaxed">{s.body}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
