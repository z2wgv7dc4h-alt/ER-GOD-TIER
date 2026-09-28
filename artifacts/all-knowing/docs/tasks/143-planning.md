# Task 143 — Planning: goal stack, route optimiser, ending chooser, NG+ planner, route on map

Read `docs/USAGE-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/DATA-CATALOG.md`. PS5 players: all of this works from the
facts the app already has (no save-file needed). Commit after each section.

1. **Goal stack** (`src/lib/goals.ts` + UI on Journey › Now): multiple ordered goals (any entity: ending, boss, item,
   questline, build piece). Now shows the next step of the top goal plus "on the way" items from other goals that lie
   on the same route. Add/reorder/remove goals from any entity page ("Set as goal" already exists → becomes "Add
   goal"). Persist in the vault.
2. **Route optimiser** (`src/lib/routePlan.ts`, pure, tested): order open to-dos (goal steps, advisor to-dos,
   missables, bosses in reached regions) by region adjacency (`legs.json` routes / region graph) and prerequisites
   (gates, requires/unlocks edges) so one trip clears several things; respect lockouts (never schedule something
   before a step that forecloses it). Output ordered legs with reasons.
3. **Ending chooser** (Journey › Quests › Endings): for each ending, what's still required from the current state,
   what it locks, steps left, and "Set as goal". Compare two endings side by side.
4. **NG+ planner**: what carries over, what resets, what's missable this cycle vs recoverable next, and a checklist
   of things to do differently (based on what the character missed).
5. **Route on the map**: draw the optimiser's route as a line on Journey › Map (static plate + live engine via
   postMessage), with numbered stops that open the entity page.

Tests for goal persistence, route ordering (adjacency + prerequisite + lockout cases), ending requirements.
NEVER read .env files. No dev servers, no installs. Don't edit inference/link logic, builds/pvp, gates data, ps5Map
or Gideon transport files (other agents). `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
