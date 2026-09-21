import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function CheckRow({
  checked,
  onToggle,
  title,
  meta,
  missable,
  note,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  meta?: string;
  missable?: boolean;
  note?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-2/80",
        checked && "opacity-55",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm border transition-colors",
          checked ? "border-brass bg-brass text-bg" : "border-border-strong text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={cn("text-sm leading-snug", checked && "line-through")}>{title}</span>
          {missable ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blood/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-blood shrink-0">
              <AlertTriangle className="size-3" />
              Missable
            </span>
          ) : null}
        </span>
        {meta ? <span className="mt-0.5 block text-xs text-fg-muted">{meta}</span> : null}
        {note ? <span className="mt-1 block text-xs text-brass-bright/90">{note}</span> : null}
      </span>
    </button>
  );
}
