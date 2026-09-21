import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ATLAS, BOARDS, type AtlasBoard, type AtlasCell } from "@/data/atlas";
import { DLC_LABEL, flagsOf, impactOfBoss, type Impact } from "@/data";
import { PageTitle } from "@/components/shell";
import { CheckRow } from "@/components/check-row";
import { ConsequenceModal } from "@/components/consequence";
import { packForCell } from "@/lib/region-pack";
import { checkId, useLedger, type Character } from "@/store/ledger";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/atlas")({ component: AtlasPage });

const SHEET_TABS = ["Bosses", "Graces", "Relics", "Ashes", "Tears", "Quests"] as const;

function AtlasPage() {
  const ch = useLedger((s) => s.active());
  const toggle = useLedger((s) => s.toggle);
  const [board, setBoard] = useState<AtlasBoard>("lands");
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheetTab, setSheetTab] = useState<(typeof SHEET_TABS)[number]>("Bosses");
  const [pending, setPending] = useState<{ id: string; impact: Impact } | null>(null);

  const cells = useMemo(() => {
    return ATLAS.filter((c) => {
      if (c.board !== board) return false;
      if (c.board === "shadow" && !ch.includeDlc) return false;
      return true;
    });
  }, [board, ch.includeDlc]);

  const open = cells.find((c) => c.id === openId) ?? ATLAS.find((c) => c.id === openId) ?? null;
  const pack = open ? packForCell(ch, open) : null;
  const flags = flagsOf(ch);

  function tryBoss(id: string) {
    const on = !!ch.checks[checkId.boss(id)];
    if (on) {
      toggle(checkId.boss(id));
      return;
    }
    const impact = impactOfBoss(ch, id);
    if (impact) setPending({ id: checkId.boss(id), impact });
    else toggle(checkId.boss(id));
  }

  return (
    <div>
      <PageTitle kicker="Cartography" title="Atlas">
        <div className="flex flex-wrap gap-2">
          {BOARDS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBoard(b.id);
                setOpenId(null);
              }}
              className={cn(
                "rounded-full px-4 py-2 text-[11px] font-display uppercase tracking-[0.16em]",
                board === b.id ? "bg-brass text-bg" : "bg-surface text-fg-muted",
              )}
            >
              {b.kicker}
            </button>
          ))}
        </div>
      </PageTitle>

      <p className="mb-5 max-w-2xl text-sm text-fg-muted leading-relaxed">
        Original plates of each region — tap a land to drill into its bosses, graces, relics and the quests that pass through it.
        Progress is live from this tarnished.
      </p>

      {board === "shadow" && !ch.includeDlc ? (
        <p className="mb-6 rounded-xl bg-surface p-5 text-sm text-fg-muted">
          Shadow of the Erdtree is hidden on this character. Enable it from the Ledger to open the Realm of Shadow.
        </p>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cells.map((cell) => (
          <Tile
            key={cell.id}
            cell={cell}
            ch={ch}
            active={openId === cell.id}
            ashen={flags.has("ashen") && (cell.id === "leyndell" || cell.id === "ashen")}
            onOpen={() => {
              setOpenId(cell.id);
              setSheetTab("Bosses");
            }}
          />
        ))}
      </div>

      {open && pack ? (
        <div className="fixed inset-0 z-40">
          <button type="button" className="absolute inset-0 bg-bg/80" aria-label="Close region" onClick={() => setOpenId(null)} />
          <aside className="absolute inset-x-0 bottom-0 top-10 sm:top-0 sm:left-auto sm:w-[min(36rem,100%)] bg-bg-elevated overflow-y-auto shadow-panel">
            <div className="relative h-44 sm:h-56 overflow-hidden">
              <img src={open.art} alt="" className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-elevated to-transparent" />
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-bg/70 text-fg"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
              <div className="absolute bottom-4 left-5 right-5">
                <p className="font-display text-[10px] tracking-[0.28em] uppercase text-brass">{open.kicker}</p>
                <h3 className="font-display text-2xl text-fg">{open.name}</h3>
                <p className="mt-1 text-xs tabular-nums text-fg-muted">
                  {pack.tally.done}/{pack.tally.total} catalogued · {pack.tally.pct}%
                </p>
              </div>
            </div>

            {flags.has("ashen") && open.id === "leyndell" ? (
              <p className="mx-4 mt-4 rounded-md bg-blood/15 px-3 py-2 text-xs text-blood leading-relaxed">
                Maliketh is fallen. This city is ash — use the Ashen Capital plate for what remains.
              </p>
            ) : null}
            {flags.has("ashen") && open.id === "ashen" ? (
              <p className="mx-4 mt-4 rounded-md bg-brass/15 px-3 py-2 text-xs text-brass leading-relaxed">
                Goldmask's rune appears on the snowy colosseum only after Regression in the living capital.
              </p>
            ) : null}

            <div className="flex gap-1 overflow-x-auto px-4 pt-4">
              {SHEET_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSheetTab(t)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[10px] font-display uppercase tracking-[0.14em]",
                    sheetTab === t ? "bg-brass text-bg" : "bg-surface text-fg-muted",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-3 pb-10">
              {sheetTab === "Bosses"
                ? pack.bosses.map((b) => (
                    <CheckRow
                      key={b.id}
                      checked={!!ch.checks[checkId.boss(b.id)]}
                      onToggle={() => tryBoss(b.id)}
                      title={b.name}
                      missable={b.missable}
                      meta={`${b.location} · ${b.kind} · ${b.drops}${b.dlc !== "base" ? ` · ${DLC_LABEL[b.dlc]}` : ""}`}
                      note={b.notes}
                    />
                  ))
                : null}
              {sheetTab === "Graces"
                ? pack.graces.map((g) => (
                    <CheckRow
                      key={g.id}
                      checked={!!ch.checks[checkId.grace(g.id)]}
                      onToggle={() => toggle(checkId.grace(g.id))}
                      title={g.name}
                      meta={g.notes}
                    />
                  ))
                : null}
              {sheetTab === "Relics"
                ? pack.upgrades.map((u) => (
                    <CheckRow
                      key={u.id}
                      checked={!!ch.checks[checkId.upg(u.id)]}
                      onToggle={() => toggle(checkId.upg(u.id))}
                      title={u.name}
                      meta={`${u.location} · ${u.category}`}
                      note={u.notes}
                    />
                  ))
                : null}
              {sheetTab === "Ashes"
                ? pack.spirits.map((s) => (
                    <CheckRow
                      key={s.id}
                      checked={!!ch.checks[checkId.spirit(s.id)]}
                      onToggle={() => toggle(checkId.spirit(s.id))}
                      title={s.name}
                      meta={s.loc}
                      note={s.notes}
                    />
                  ))
                : null}
              {sheetTab === "Tears"
                ? pack.tears.map((t) => (
                    <CheckRow
                      key={t.id}
                      checked={!!ch.checks[checkId.tear(t.id)]}
                      onToggle={() => toggle(checkId.tear(t.id))}
                      title={t.name}
                      meta={`${t.loc} · ${t.effect}`}
                    />
                  ))
                : null}
              {sheetTab === "Quests"
                ? pack.quests.map((q) => (
                    <div key={q.id} className="rounded-lg px-3 py-3">
                      <p className="font-display text-sm text-fg">{q.name}</p>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">{q.summary}</p>
                      <p className="mt-1 text-xs text-blood/90">{q.lockout}</p>
                    </div>
                  ))
                : null}
              {sheetTab === "Bosses" && pack.bosses.length === 0 ? <Empty label="No bosses catalogued here." /> : null}
              {sheetTab === "Graces" && pack.graces.length === 0 ? <Empty label="No sites of grace listed." /> : null}
              {sheetTab === "Relics" && pack.upgrades.length === 0 ? <Empty label="No relics here." /> : null}
              {sheetTab === "Ashes" && pack.spirits.length === 0 ? <Empty label="No spirit ashes here." /> : null}
              {sheetTab === "Tears" && pack.tears.length === 0 ? <Empty label="No crystal tears here." /> : null}
              {sheetTab === "Quests" && pack.quests.length === 0 ? <Empty label="No questlines touch this land." /> : null}
            </div>
          </aside>
        </div>
      ) : null}

      <ConsequenceModal
        impact={pending?.impact ?? null}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) toggle(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="px-3 py-6 text-sm text-fg-muted">{label}</p>;
}

function Tile({
  cell,
  ch,
  active,
  ashen,
  onOpen,
}: {
  cell: AtlasCell;
  ch: Character;
  active: boolean;
  ashen: boolean;
  onOpen: () => void;
}) {
  const pack = packForCell(ch, cell);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative overflow-hidden rounded-xl text-left shadow-panel min-h-44 sm:min-h-52",
        cell.wide ? "sm:col-span-2 lg:col-span-1 lg:min-h-56" : "",
        active && "shadow-brass",
      )}
    >
      <img
        src={cell.art}
        alt=""
        className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      <span className="relative z-10 flex h-full min-h-44 sm:min-h-52 flex-col justify-end p-4">
        <span className="font-display text-[10px] tracking-[0.22em] uppercase text-brass">{cell.kicker}</span>
        <span className="mt-1 font-display text-xl text-fg">{cell.name}</span>
        <span className="mt-2 flex items-center gap-3">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-bg/70">
            <span className="block h-full bg-brass" style={{ width: `${pack.tally.pct}%` }} />
          </span>
          <span className="text-[11px] tabular-nums text-fg-muted">
            {pack.tally.done}/{pack.tally.total}
          </span>
        </span>
        {ashen ? (
          <span className="mt-2 text-[10px] uppercase tracking-[0.16em] text-blood">World is ash</span>
        ) : null}
      </span>
    </button>
  );
}
