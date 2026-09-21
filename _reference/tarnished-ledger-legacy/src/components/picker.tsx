import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type PickerOption = { id: string; label: string; hint?: string };

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Search the archive",
  emptyLabel = "— none —",
}: {
  value: string;
  onChange: (id: string) => void;
  options: PickerOption[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options.slice(0, 80);
    return options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(needle)).slice(0, 80);
  }, [options, q]);

  return (
    <div className="relative mt-1">
      <input
        value={open ? q : (selected?.label ?? "")}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQ("");
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        placeholder={placeholder}
        className="h-10 w-full rounded-md bg-bg px-3 text-sm text-fg outline-none ring-1 ring-border focus:ring-brass"
      />
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-surface shadow-panel">
          <li>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-fg-subtle hover:bg-surface-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {emptyLabel}
            </button>
          </li>
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-surface-2",
                  o.id === value ? "text-brass" : "text-fg",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                {o.label}
                {o.hint ? <span className="ml-2 text-xs text-fg-subtle">{o.hint}</span> : null}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-fg-subtle">Nothing matches.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
