# Task 109 — Polish round 2 (from Task 108 screenshots)

1. **Library filters on phone are a text collision mess**: chip labels spill out of their boxes and over each
   other ("BACKHAND BLADE" / "BALLISTA", "PHYSICAL" / "MAGIC", "I MEET REQUIREMENTS" squashed). On phone:
   the toolbar is search + one row: [Owned ▾] [I meet reqs] [Near me] [Filters (N)] [Sort ▾]. Type, damage and
   other facet chips move into a **Filters bottom sheet** with wrapped chips (`white-space: nowrap` per chip,
   chips wrap as whole units, never overlap). Desktop keeps inline facets but chips must also be nowrap and
   wrap as units.
2. **Unexplained card badges**: the red ↓ and ✗ on Library cards. Replace with readable badges: "Upgrade
   +18%", "Side-grade", "Needs 20 INT", "Owned ✓". Colour + words, never symbol-only.
3. **Gideon header leaks developer text**: remove "GUIDE · USING BUILT-IN ICONS (NO CUSTOM ICON PACK
   INSTALLED)" and "Optional AI answers are on." from the Gideon view (AI status belongs on Tarnished ›
   Profiles only). Shrink the portrait banner to a small 40px avatar next to the name "Gideon Ofnir" on phone.
   Search the whole app for other developer/status strings shown to players (icon pack, engine status, fact
   ids, "source:", regulation stamps) and move them to Profiles/diagnostics.
4. **"What should I do now?" must answer, not deflect**. Never reply "live on Journey → Now". Answer with the
   top 3 next things for THIS character (use `advise().todo` + current goal + `currentArea`): one line each
   with the reason and an EntityLink, then one "See the full plan" button. Keep answers ≤ 6 lines on phone;
   extra context (quest lines, Related graph) goes behind a "More" disclosure. Remove the "GRAPH" heading
   jargon — call it "Related".
5. **Answer buttons**: Gideon action/link buttons are huge full-width uppercase boxes. Make them compact
   inline chips (≤ 2 per row on phone, ellipsis at 28 chars); links inside the answer text are the primary
   interaction.
6. **Audit: add a text-overflow check** — any visible element with text whose `scrollWidth > clientWidth + 2`
   or whose text rects extend outside its border box, or two sibling chips whose text rects intersect →
   issue "text overflow". Add a check for strings matching /icon pack|regulation|factId|source:|engine
   (live|offline)/i visible outside Tarnished › Profiles → issue "dev text".

Acceptance: `npm run audit:ui` (dev server on :5173 already running; don't start/stop it): phone + desktop
zero overlap/covered/transparent/text-overflow/dev-text/did-not-reach/console. Look at phone screenshots
for Library search, Gideon (both questions) and describe them. `npx tsc -b`, `npm test`, `npm run lint`,
`npm run build` pass; `git add -A` and commit.
