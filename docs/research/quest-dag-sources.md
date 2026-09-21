# Quest DAG Sources: Research Memo

**Date:** 2026-09-22  
**Subject:** Feasibility assessment for expanding quest DAG from `er-quest-tracker` or EanNewton tracker

---

## 1. Current Quest DAG State

The All-Knowing project currently authors quest DAGs in `src/knowledge/storylines.ts` and `src/knowledge/endings.ts`.

### Authored lines (11 total)
- **4 NPC storylines:** Millicent (3 steps), Alexander (3 steps), Varré (3 steps), Leda (3 steps)
- **5 ending routes:** Age of Stars, Frenzied Flame, Duskborn, Perfect Order, Elden Lord
- **2 blitz speedrun routes:** Blitz Elden Lord, Blitz Age of Stars

### Current Step schema
```typescript
type PlanStep = {
  id: string
  do: string
  detail: string
  factId?: string         // fact identifier for this step
  module?: ModuleId       // map | quests | etc.
  minLevel?: number       // suggested level
  obtain?: string         // items collected here
  lockout?: string        // WARNING STRING ONLY, not encoded as edges
}
```

**Key observation:** The `lockout` field is narrative prose ("Seluvis + this blade ends her line") rather than a data edge. SCOPE.md section 7 flags this as a design gap: needs `requires[]`, `grants[]`, `lockouts[]` arrays to enable graph traversal.

### Test case coverage
✓ **Alexander (Limgrave hole test case):** Present, step `a1` explicitly mentions "Free Alexander from the Limgrave hole"  
✓ **Leda (Enir-Ilim invitation test case):** Present, step `ld2` mentions "Clear Shadow Keep invitations," `ld3` "Enir-Ilim and the Consort"

---

## 2. GitHub `mhogeveen/er-quest-tracker`

**Repo:** https://github.com/mhogeveen/er-quest-tracker  
**License:** MIT (permissive; allows commercial reuse + modification)

### Data format
- **Structure:** TypeScript hardcoded objects (no JSON export, no spreadsheet)
- **Fields per step:** id, optional (boolean), description, note, zone
- **Dependencies:** No `requires[]`, `grants[]`, or `lockouts[]` arrays observed

### Coverage
- **Status:** Incomplete; README reports "9 of 35 NPC questlines fully documented"
- **Data format:** Not JSON; cannot be vendored as a flat file import
- **Lockout encoding:** Step structure does **not** capture quest dependencies (no edge fields)

### Verdict
**Not suitable as a port source.** While MIT-licensed and permissive, the tracker:
1. Is incomplete (26/35 NPCs still missing)
2. Doesn't encode the edge structure (requires, grants, lockouts) that SCOPE.md mandates
3. Uses TS objects, not a portable data format—would require hand-translation anyway

---

## 3. EanNewton Progress Tracker (Google Sheet)

**Link:** https://docs.google.com/spreadsheets/d/1_7sTNSle8kxB72eNgICAfdGoWMbe4tFycy2PNwJFTw8/edit?usp=sharing  
**Type:** Community spreadsheet (not a GitHub repo)

### License / reuse terms
- Cannot be formally licensed (Google Sheets do not carry machine-readable licenses)
- Community reference artifact, not a vendorable data source
- Treat as a cross-check only; any reuse would require manual transcription + attribution

### Content
- Described in AWESOME-RESOURCES.md as "Interactive spreadsheet for tracking bosses and item acquisition"
- Designed for player-facing checklists, not developer-facing graph data
- Lockout/dependency edges unclear from description

### Verdict
**Reference only.** EanNewton's sheet is authoritative for community consensus on quest steps and gotchas, but:
1. Cannot be imported programmatically
2. Not designed to encode edges (requires, lockouts, gates)
3. No license to reuse; attribution required for any copy

---

## 4. Related tracker: erquesttracker.com

**Site:** https://www.erquesttracker.com/  
(Note: Different from mhogeveen/er-quest-tracker GitHub repo)

**Does track:**
- Step-by-step NPC progression
- **Failure conditions** (lockout edges) with consequences  
- **Optional steps** marked clearly
- **Point-of-no-return decisions** (e.g., Sealing Tree, Erdtree burn)

**Verdict:** Shows that robust quest-DAG sites *do* exist and *do* encode dependencies. However, the erquesttracker.com source code does not appear to be published; this is a live web app, not a reusable data source.

---

## 5. Cross-check: Specific test cases

| NPC | Lockout | Current coverage | Edge encoding |
|---|---|---|---|
| **Alexander** | Missing Limgrave hole = no quest completion | ✓ Present (step a1) | String only ("Missable if you never crack it") |
| **Leda** | Sealing Tree burn locks invitations | ✓ Present (step ld2) | String only ("Sealing Tree is the last invitation window") |
| **Ranni** | Giving Blade to Seluvis locks Age of Stars | ✓ Via ending route | String only ("Seluvis + this blade ends her line") |

**Finding:** All three lockouts are **present and documented**, but as prose in the `lockout` field. They are not encoded as graph edges (`lockouts[]` array with step IDs), blocking automated route planning (e.g., "if you chose X, which paths remain?").

---

## Recommendation

**This must remain a hand-authoring task.** Here's why:

1. **No upstream source provides the right structure.** Both mhogeveen/er-quest-tracker (incomplete, no edges) and EanNewton (reference only, not machine-readable) require manual transcription.

2. **The edge structure is non-standard.** Elden Ring's quest lockouts are conditional (e.g., "burn Sealing Tree after talking to Ansbach but before beating Romina"). A generic quest tracker schema may not capture this complexity.

3. **The thin→thick expansion is not mechanical.** Going from 4 NPC lines to 34+ requires not just listing steps, but defining:
   - Which step `grants` which flags (e.g., talking to Freyja grants "can side with Leda")
   - Which step `requires` prior flags (e.g., Keep invitation requires not-burnt-Sealing-Tree)
   - Which steps are `lockouts` for others (e.g., killing Ansbach locks his invite; killing Leda locks her ending)

4. **EanNewton sheet is a good cross-check, not an import source.** Use it to validate coverage and catch edge cases, but transcribe by hand.

### Next step
Write the task brief to expand NPC questlines (6–20 additional NPCs) with proper edge definitions. Use:
- **Primary source:** Elden Ring wiki + player community consensus
- **Cross-check:** EanNewton sheet for common gotchas
- **QA:** Compare against erquesttracker.com to ensure lockouts are complete

---

## Appendix: Sources examined

- [mhogeveen/er-quest-tracker](https://github.com/mhogeveen/er-quest-tracker) (MIT, incomplete, no edges)
- [EanNewton/Awesome-Elden-Ring-Resources](https://github.com/EanNewton/Awesome-Elden-Ring-Resources) (reference list, CC0)
- [EanNewton Progress Tracker Sheet](https://docs.google.com/spreadsheets/d/1_7sTNSle8kxB72eNgICAfdGoWMbe4tFycy2PNwJFTw8/edit?usp=sharing) (community reference)
- [erquesttracker.com](https://www.erquesttracker.com/) (web app, closed-source, does track lockouts)
- Local: HANDOFF-CLAUDE.md, ARCHITECTURE.md, docs/REVIEW.md, docs/SCOPE.md
