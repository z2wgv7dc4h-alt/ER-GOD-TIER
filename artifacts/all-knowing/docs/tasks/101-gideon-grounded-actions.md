# Task 101 — Gideon LLM: real links, real items, real updates

The LLM path (`src/lib/muse.ts`, `gideonLlm.ts`, `gideonAgent.ts`) must answer with **verified
entities** the app can open, and **actions** the app can apply — never free-text names that go
nowhere. Depends on Task 97 (`entityGraph.ts`, `EntityLink`, `openEntity`) and Task 96 (`advise`).

## 1. Tools the LLM calls (extend the existing tool-calling harness)

All read local data only; results carry fact ids.
- `search(query, kind?)` → top hits `{id, kind, name}` (existing search).
- `get_entity(id)` → entity + status for this character + key edges (entityGraph).
- `edges(id, rel?)` → drops / sold by / found in / requires / unlocks / locks / weak to / etc.
- `where(id)` → acquisition text + map target (region, coords) if known.
- `character()` → stats, level, loadout, owned, progress summary, currentArea, goals.
- `advise(kind)` → upgrades / gear / todo / respec plan (Task 96).
- `quest(lineId)` → beats with done/next/locked.
Keep the existing `web_search` tool; external URLs it returns may be shown as source links.

## 2. Answer schema (extend `GideonAct`, strict JSON)

```ts
{
  say: string,            // may contain [[factId]] or [[factId|label]] markers
  links?: string[],       // fact ids referenced
  actions?: Array<
    | { type: 'markDone' | 'markNotDone' | 'addOwned' | 'removeOwned', ids: string[] }
    | { type: 'setGoal', id: string }
    | { type: 'equip', slot: string, id: string }
    | { type: 'setStats', stats: Partial<Stats>, level?: number }
    | { type: 'showOnMap', id: string }
    | { type: 'open', id: string }          // entity page or section/sub route
  >,
  sources?: Array<{ title: string, url: string }>
}
```

## 3. Validation (never trust the model)

- Every id in `say` markers, `links`, and `actions` goes through `canonicalFactId`. Unknown ids:
  try alias/name resolution; if still unknown, render as plain text and drop the action. Log drops.
- `sources` URLs must come from a `web_search` tool result in this turn; otherwise drop.
- Actions that change the character (`mark*`, `add/removeOwned`, `equip`, `setStats`, `setGoal`)
  are shown as **confirm chips** under the answer ("Gideon suggests: Mark Margit defeated · Equip
  Moonveil — [Apply] [Apply all] [Skip]"). Apply runs `applyFacts` + inference + `LockoutPrompt`
  when a gate trips, then posts the "unlocked / next" follow-up. Navigation actions
  (`showOnMap`, `open`) are plain buttons.
- The deterministic router's answers use the same markers + actions, so both paths render
  identically.

## 4. Rendering

`say` markers → `EntityLink` (opens entity page); `links` not already inline → a "Mentioned" chip row;
`sources` → small external link row.

## 5. Prompt

Update the system prompt: "Refer to anything in the game with [[id]] from a tool result. Never
invent ids. To change the player's record, propose an action; do not claim you changed it."

Acceptance: tests with a mocked model response containing valid ids, invented ids, a hallucinated
URL, and each action type → correct rendering, drops, confirm chips, and applied state after Apply;
`npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
