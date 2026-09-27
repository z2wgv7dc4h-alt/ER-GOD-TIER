# Task 100 — Session resume, Glance mode, "is this good for me" verdicts

Read `docs/USAGE-MODEL.md` moments 1, 5, 13, 15, 16.

1. **Resume card** — on app open (once per session, >30 min since last visit), the landing view is
   Journey › Now with a dismissible top card: "Welcome back — you were in <area> heading for <goal>.
   Next: <step>. Since last time: +N facts." (track `lastVisitAt` + fact count snapshot in the vault).
2. **Glance mode** — toggle from the header (and omnibox "glance"): hides header/sub-tabs chrome,
   shows the map for `currentArea` full-screen with a large bottom strip: current goal step, nearest
   unfinished thing, one big "+ Log" button. Screen wake lock while active (`navigator.wakeLock`,
   guarded). Exit with one tap.
3. **Item verdict** — on every weapon/armor/talisman entity page, a one-line verdict computed by the
   advisor (Task 96): "Upgrade: +18% AR over your Uchigatana at your stats" / "Not for you: needs 20
   INT (you have 9)" / "Side-grade". Also on Library cards as a small badge.
4. **Remembrance choice** — on every remembrance entity page, rank the Enia trade options for the
   detected build (advisor), marking already-traded ones.
5. **Completion view** — Tarnished › Overview "Missing" drill-down per category (bosses, graces,
   items, spirit ashes, crystal tears, cookbooks, bell bearings, map fragments, Scadutree fragments)
   with Show all on map.

Acceptance: tests for resume-card trigger logic, verdict thresholds, remembrance ranking; build
passes; `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
