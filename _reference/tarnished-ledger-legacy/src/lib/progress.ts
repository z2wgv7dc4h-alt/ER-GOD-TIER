import { BOSSES } from "@/data/bosses";
import { UPGRADES } from "@/data/upgrades";
import { QUESTS } from "@/data/quests";
import { ROUTE } from "@/data/walkthrough";
import { GRACES } from "@/data/graces";
import { SPIRITS } from "@/data/spirits";
import { TEARS } from "@/data/tears";
import { dlcVisible } from "@/data/types";
import { lockedReasons } from "@/data/flags";
import { checkId, type Character } from "@/store/ledger";

function packOn(ch: Character) {
  return { includeDlc: ch.includeDlc, includeTarnished: ch.includeTarnished !== false };
}

export function visibleBosses(ch: Character) {
  return BOSSES.filter((b) => dlcVisible(b.dlc, packOn(ch)));
}
export function visibleUpgrades(ch: Character) {
  return UPGRADES.filter((b) => dlcVisible(b.dlc, packOn(ch)));
}
export function visibleQuests(ch: Character) {
  return QUESTS.filter((b) => dlcVisible(b.dlc, packOn(ch)));
}
export function visibleRoute(ch: Character) {
  return ROUTE.filter((b) => dlcVisible(b.dlc, packOn(ch)));
}
export function visibleGraces(ch: Character) {
  return GRACES.filter((b) => dlcVisible(b.dlc, packOn(ch)));
}
export function visibleSpirits(ch: Character) {
  return SPIRITS.filter((b) => dlcVisible(b.dlc, packOn(ch)));
}
export function visibleTears(ch: Character) {
  return TEARS.filter((b) => dlcVisible(b.dlc, packOn(ch)));
}

export function counted(ids: string[], checks: Record<string, boolean>) {
  const done = ids.filter((id) => checks[id]).length;
  return { done, total: ids.length, pct: ids.length ? Math.round((done / ids.length) * 100) : 0 };
}

export function progressOf(ch: Character) {
  const bosses = counted(visibleBosses(ch).map((b) => checkId.boss(b.id)), ch.checks);
  const upgrades = counted(visibleUpgrades(ch).map((b) => checkId.upg(b.id)), ch.checks);
  const questIds = visibleQuests(ch).flatMap((q) => q.steps.map((s) => checkId.quest(q.id, s.id)));
  const quests = counted(questIds, ch.checks);
  const route = counted(visibleRoute(ch).map((b) => checkId.route(b.id)), ch.checks);
  const graces = counted(visibleGraces(ch).map((b) => checkId.grace(b.id)), ch.checks);
  const spirits = counted(visibleSpirits(ch).map((b) => checkId.spirit(b.id)), ch.checks);
  const tears = counted(visibleTears(ch).map((b) => checkId.tear(b.id)), ch.checks);
  const all = counted(
    [
      ...visibleBosses(ch).map((b) => checkId.boss(b.id)),
      ...visibleUpgrades(ch).map((b) => checkId.upg(b.id)),
      ...questIds,
      ...visibleRoute(ch).map((b) => checkId.route(b.id)),
      ...visibleGraces(ch).map((b) => checkId.grace(b.id)),
      ...visibleSpirits(ch).map((b) => checkId.spirit(b.id)),
      ...visibleTears(ch).map((b) => checkId.tear(b.id)),
    ],
    ch.checks,
  );
  return { bosses, upgrades, quests, route, graces, spirits, tears, all };
}

export function openMissables(ch: Character) {
  const out: { id: string; label: string; warning: string; href: string }[] = [];
  for (const r of lockedReasons(ch)) {
    out.push({ id: r.id, label: r.label, warning: r.reason, href: r.href });
  }
  for (const b of visibleBosses(ch)) {
    if (b.missable && !ch.checks[checkId.boss(b.id)]) {
      out.push({
        id: checkId.boss(b.id),
        label: b.name,
        warning: b.notes ?? "Missable boss",
        href: "/checklist",
      });
    }
  }
  for (const q of visibleQuests(ch)) {
    for (const s of q.steps) {
      if (s.missable && !ch.checks[checkId.quest(q.id, s.id)]) {
        out.push({
          id: checkId.quest(q.id, s.id),
          label: `${q.name}: ${s.text}`,
          warning: s.warning ?? q.lockout,
          href: "/quests",
        });
      }
    }
  }
  return out;
}

export function nextRouteStep(ch: Character) {
  return visibleRoute(ch).find((s) => !ch.checks[checkId.route(s.id)]);
}
