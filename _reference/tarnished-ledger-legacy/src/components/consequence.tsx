import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import type { Impact } from "@/data/flags";

export function ConsequenceModal({
  impact,
  onConfirm,
  onCancel,
}: {
  impact: Impact | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog.Root open={!!impact} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg/80" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-5 shadow-panel outline-none">
          {impact ? (
            <>
              <Dialog.Title className="font-display text-xl text-fg">{impact.title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-fg-muted leading-relaxed">
                {impact.irreversible
                  ? "This cannot be undone on this journey. The Lands Between will remember."
                  : "This changes who still walks with you."}
              </Dialog.Description>
              {impact.losses.length ? (
                <div className="mt-4">
                  <p className="font-display text-[10px] tracking-[0.2em] uppercase text-blood">You lose</p>
                  <ul className="mt-2 space-y-1">
                    {impact.losses.map((l) => (
                      <li key={l} className="text-sm text-fg-muted">
                        — {l}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {impact.gains.length ? (
                <div className="mt-4">
                  <p className="font-display text-[10px] tracking-[0.2em] uppercase text-ok">You gain</p>
                  <ul className="mt-2 space-y-1">
                    {impact.gains.map((g) => (
                      <li key={g} className="text-sm text-fg-muted">
                        — {g}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-6 flex gap-2 justify-end">
                <Button variant="ghost" type="button" onClick={onCancel}>
                  Hold
                </Button>
                <Button variant="blood" type="button" onClick={onConfirm}>
                  Commit
                </Button>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
