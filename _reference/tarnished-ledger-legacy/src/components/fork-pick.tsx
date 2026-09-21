import { FORKS, impactOfFork } from "@/data/flags";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLedger } from "@/store/ledger";

export function ForkPick({
  forkId,
  onAsk,
}: {
  forkId: string;
  onAsk: (forkId: string, optionId: string) => void;
}) {
  const ch = useLedger((s) => s.active());
  const setFork = useLedger((s) => s.setFork);
  const fork = FORKS.find((f) => f.id === forkId);
  if (!fork) return null;
  const chosen = ch.forks?.[fork.id];

  return (
    <div className="mt-2 mb-2 rounded-lg bg-bg/60 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-blood font-display">{fork.title}</p>
      <p className="mt-1 text-xs text-fg-muted leading-relaxed">{fork.warning}</p>
      <div className="mt-3 flex flex-col gap-2">
        {fork.options.map((o) => {
          const on = chosen === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                if (on) return;
                const impact = impactOfFork(fork.id, o.id);
                if (impact) onAsk(fork.id, o.id);
                else setFork(fork.id, o.id);
              }}
              className={cn(
                "rounded-md px-3 py-2.5 text-left transition-colors duration-150",
                on ? "bg-brass/15 shadow-brass" : "bg-surface-2 hover:bg-surface",
              )}
            >
              <span className={cn("block text-sm", on ? "text-brass" : "text-fg")}>{o.label}</span>
              <span className="mt-0.5 block text-xs text-fg-muted">{o.detail}</span>
              <span className="mt-1 block text-[11px] text-brass-bright/80">{o.grants}</span>
            </button>
          );
        })}
        {chosen ? (
          <Button variant="ghost" size="sm" type="button" onClick={() => setFork(fork.id, "")}>
            Clear this fork
          </Button>
        ) : null}
      </div>
    </div>
  );
}
