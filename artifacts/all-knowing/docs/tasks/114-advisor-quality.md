# Task 114 — Advisor recommendation quality

Seen in Library › Builds for a Lv 30 Dex character (Vig 15, End 12, Str 12, Dex 18, Int 9, Fai 8, Arc 10) in
Limgrave with Margit logged: "Stronger for your build" lists Steel-Wire Torch, Reed Great Katana, Lizard
Greatsword — all Shadow of the Erdtree weapons, unreachable, and ranked by raw AR rather than fit.

## Fix `src/lib/advisor.ts` ranking (keep it pure + tested)
1. **Reachability first**: exclude DLC items unless the character can enter the DLC (Mohg + Radahn defeated
   facts, or any DLC grace/boss fact). Exclude items whose acquisition region is not reached and not adjacent
   (legs.json adjacency) — show those under a separate "Later" list, max 3.
2. **Build fit**: score = AR at current stats × fit, where fit rewards scaling in the detected archetype's stat
   (A/S > B > C > D/E) and penalises weapons whose AR mostly comes from a stat the player doesn't invest in.
   Also compute AR at the player's stats +10 levels in the main stat, so fit reflects growth.
3. **Sanity filters**: skip torches, catalysts/seals for non-caster builds, shields, bows/crossbows unless the
   player owns/equips that class; skip weapons whose weight would push equip load past 70% with current
   armor.
4. **Compare to equipped**: when a weapon is equipped, show "+N% vs your <weapon>"; otherwise compare against
   the best owned weapon; otherwise against the class starting weapon.
5. **Each row**: name + upgrade level, the gain, the scaling letters, **where to get it** (EntityLink to the
   location/boss + "Show on map"), and a short why ("B Dex scaling, 5.5 wt, bleed"). Requirements met is a
   small ✓ tag, not a button. Replace the jargon "AR used" with "Attack 183".
6. Early-game golden-path sanity test: for this exact character in Limgrave the top 5 must be base-game,
   reachable weapons suited to Dex (e.g. Uchigatana, Nagakiba (if Yura quest), Scimitar/Shamshir,
   Rogier's Rapier, Estoc, Great Stars no…) — write the test as: all top 5 are non-DLC, have Dex scaling ≥ C,
   and have an acquisition region in Limgrave/Weeping Peninsula/Stormhill/Liurnia-edge. Add a Str-build and an
   Int-build fixture with the same style of assertions.
7. Your build card: the "○○" dots under each stat bar get labelled soft-cap ticks like the planner ("40",
   "60", "80") with a legend.

Also apply the same reachability + fit rules to Gear picks (talismans/armor) and to the Journey › Now
Recommended card and Gideon "what should I upgrade" answers (they all call `advise`).

Acceptance: new advisor tests pass; `npm run audit:ui` (dev server on :5173 running; don't start/stop it) zero
issues; describe the phone Builds screenshot's top 5 list in the report. `npx tsc -b`, `npm test`,
`npm run lint`, `npm run build` pass; `git add -A` and commit.
