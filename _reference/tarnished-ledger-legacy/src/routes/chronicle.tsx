import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BOSSES } from "@/data/bosses";
import { PageTitle, Panel } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/store/ledger";
import { visibleBosses } from "@/lib/progress";

export const Route = createFileRoute("/chronicle")({ component: ChroniclePage });

function dur(ms: number) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}

function ChroniclePage() {
  const ch = useLedger((s) => s.active());
  const { startSession, endSession, logDeath, logBoss, patchSession, exportJson, importJson } = useLedger();
  const cur = ch.sessions[0] && !ch.sessions[0].endedAt ? ch.sessions[0] : null;
  const [bossId, setBossId] = useState("");
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState("");
  const bosses = useMemo(() => visibleBosses(ch), [ch]);
  const deaths = ch.sessions.reduce((n, s) => n + s.deaths, 0);
  const wins = ch.sessions.reduce((n, s) => n + s.bosses.filter((b) => b.result === "win").length, 0);

  return (
    <div>
      <PageTitle kicker="The round table" title="Chronicle" />

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <Panel>
          <p className="text-xs uppercase tracking-wider text-fg-subtle">Deaths logged</p>
          <p className="mt-1 font-display text-3xl tabular-nums text-blood">{deaths}</p>
        </Panel>
        <Panel>
          <p className="text-xs uppercase tracking-wider text-fg-subtle">Boss wins logged</p>
          <p className="mt-1 font-display text-3xl tabular-nums text-brass">{wins}</p>
        </Panel>
        <Panel>
          <p className="text-xs uppercase tracking-wider text-fg-subtle">Sessions</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{ch.sessions.length}</p>
        </Panel>
      </div>

      <Panel className="mb-4">
        <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">This sitting</p>
        {cur ? (
          <div className="mt-3">
            <p className="text-sm text-fg-muted">
              Opened {new Date(cur.startedAt).toLocaleString()} · {dur(Date.now() - cur.startedAt)} elapsed
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="blood" onClick={logDeath}>
                Log death
              </Button>
              <Button variant="outline" onClick={endSession}>
                Close sitting
              </Button>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select
                value={bossId}
                onChange={(e) => setBossId(e.target.value)}
                className="h-10 flex-1 rounded-md bg-bg px-3 text-sm ring-1 ring-border"
              >
                <option value="">Choose a boss</option>
                {bosses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Button
                variant="subtle"
                disabled={!bossId}
                onClick={() => {
                  logBoss(bossId, "loss");
                }}
              >
                Attempt
              </Button>
              <Button
                disabled={!bossId}
                onClick={() => {
                  logBoss(bossId, "win");
                  setBossId("");
                }}
              >
                Victory
              </Button>
            </div>
            <label className="mt-4 block text-xs text-fg-muted">
              Runes this sitting
              <input
                type="number"
                value={cur.runes}
                onChange={(e) => patchSession({ runes: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-md bg-bg px-3 text-sm ring-1 ring-border"
              />
            </label>
            <label className="mt-3 block text-xs text-fg-muted">
              Notes
              <textarea
                value={cur.notes}
                onChange={(e) => patchSession({ notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-md bg-bg px-3 py-2 text-sm ring-1 ring-border"
              />
            </label>
            {cur.bosses.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {cur.bosses.map((b, i) => (
                  <li key={i} className={b.result === "win" ? "text-brass" : "text-fg-muted"}>
                    {b.result === "win" ? "Victory" : "Fall"} — {BOSSES.find((x) => x.id === b.id)?.name ?? b.id}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-fg-muted">No sitting is open. Light a grace and begin.</p>
            <Button className="mt-3" onClick={startSession}>
              Begin sitting
            </Button>
          </div>
        )}
      </Panel>

      <Panel className="mb-4">
        <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">Past sittings</p>
        {ch.sessions.filter((s) => s.endedAt).length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {ch.sessions
              .filter((s) => s.endedAt)
              .map((s) => (
                <li key={s.id} className="border-t border-border pt-3">
                  <p className="text-sm">
                    {new Date(s.startedAt).toLocaleDateString()} · {dur((s.endedAt ?? 0) - s.startedAt)} · {s.deaths} deaths ·{" "}
                    {s.bosses.filter((b) => b.result === "win").length} wins
                  </p>
                  {s.notes ? <p className="text-xs text-fg-muted mt-1">{s.notes}</p> : null}
                </li>
              ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <p className="font-display text-[10px] tracking-[0.24em] uppercase text-brass">Carry the ledger</p>
        <p className="mt-2 text-sm text-fg-muted">Everything lives in this browser. Export a copy before you clear data.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([exportJson()], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "tarnished-ledger.json";
              a.click();
            }}
          >
            Export JSON
          </Button>
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste a previously exported ledger"
          rows={4}
          className="mt-3 w-full rounded-md bg-bg px-3 py-2 text-xs ring-1 ring-border"
        />
        <Button
          variant="subtle"
          className="mt-2"
          onClick={() => {
            const ok = importJson(importText);
            setMsg(ok ? "Ledger restored." : "Could not read that file.");
          }}
        >
          Import
        </Button>
        {msg ? <p className="mt-2 text-xs text-brass">{msg}</p> : null}
      </Panel>
    </div>
  );
}
