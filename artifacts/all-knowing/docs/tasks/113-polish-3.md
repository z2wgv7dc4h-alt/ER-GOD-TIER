# Task 113 — Polish round 3 (from the Task 110–112 screenshots)

1. **Quick-log FAB covers content** (e.g. the stat planner's "10 → 10" value). Make the FAB hide while
   scrolling down and reappear on scroll up / idle (standard mobile pattern), shrink to 52px, and keep the
   bottom-padding reserve. Audit: the covered check must include any visible text node, not only interactive
   elements (FAB excluded as the coverer only while hidden).
2. **Library › Builds order**: lead with what matters — Your build (detected archetype + stat bars) → Stronger
   for your build → Change build → Stat planner → Level-up calculator → Smithing tracker → Loadout presets.
   Each section is a collapsible card; the first two open by default.
3. **Themed sliders**: the stat planner uses default blue/white browser range inputs. Style them with the app's
   tokens (gold thumb, dark track, filled portion in gold), 44px touch height, visible focus ring.
4. **Soft-cap markers**: the unlabeled "○○" dots under each slider become labelled ticks on the track
   ("40", "60") with a legend "soft caps".
5. **Wire watchlist pins**: Atlas consumes `watchPins()` (Task 112) as a "Watchlist" layer (on by default).
6. **Gideon "what now" reasons**: "You have already reached Limgrave" repeated three times is not a reason.
   Use specific reasons from the advisor/area data: level fit ("recommended Lv 20–40, you're 30"), what it
   drops/unlocks ("drops Godrick's Great Rune; opens Liurnia"), missable warnings. No repeated reason text.
7. **Audit "Screens" metric**: Library › Builds measured 1 screen although it scrolls several; fix the scroll
   container detection (pick the element under the main region with the largest scrollHeight that actually
   scrolls, including nested ones).

Acceptance: `npm run audit:ui` (dev server on :5173 is running; don't start/stop it) phone + desktop zero
issues on all checks; look at the Builds, Gideon and Tarnished screenshots and describe them. `npx tsc -b`,
`npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
