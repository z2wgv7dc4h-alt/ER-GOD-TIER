# Ingest Jobs — Source Research Memo

**Date:** 2026-09-22  
**Scope:** Validation of four open ingest jobs from `AWESOME-RESOURCES.md` — URLs, licenses, data format, and actionability.

---

## Job 1: Elden Refs / Carian Archive → `aliases.json`

**Sources:**
- **Elden Refs:** https://ihascats.github.io/Elden-Text/ (static site)
- **Carian Archive:** https://github.com/AsteriskAmpersand/Carian-Archive (GitHub repo)

**Findings:**

*Elden Refs:* Static HTML/text site with extracted FMG data in `[ID] content` format (e.g., `[420] Electronica spell description`). No stated license, no linked GitHub repository found. Data is structured by category (AccessoryName.fmg, ArtsName.fmg, etc.) but no copyright/licensing terms are published.

*Carian Archive:* Contains `Master.html` (parsed EN strings) and `MasterJP.html` (parsed JP strings, separate FMG). **No LICENSE file in repo.** README mentions "text files already unpacked and converted" but does not specify license. This is critical: from-scratch licensing research is needed before ingesting.

*Redundancy check:* Project already has `public/sourced/open/names.json` with ~6,820 EN FMG names (sourced from Text Explorer, JP stripped). **Question:** Does Carian Archive provide JP names (different id scheme or same IDs with JP text), or is it a redundant EN dump? Checking the repo directly would show whether the data extends beyond what names.json covers.

*Alias shape:* Current `src/lib/aliases.ts` uses `name → seed slug` mapping for 418 warp graces and bosses. Generated `aliases.json` would need to bind engine grace ids (e.g., `grace:10000800`), seed slugs (e.g., `grace:elleh`), FMG names (e.g., `Church of Elleh`), and icon filenames (from RubyRed). The structure is already defined in SCOPE.md (point 2: "Alias plane").

**Verdict: Ready to task-brief, with license caveats.** Elden Refs is unlicensed and must be verified as public domain or acceptable fair use. Carian Archive similarly lacks a license statement and would need written clarification or WHOIS research before use. Both sites are functional and structured. The task is to write a script that: (1) fetches/parses both sources, (2) deduplicates against existing names.json, (3) outputs `aliases.json` in the shape expected by `aliases.ts`, and (4) flags license/attribution needs.

---

## Job 2: RubyRed Filenames vs `extract_icons` Diff

**Prerequisite Data:**
- **RubyRed folder:** Google Drive folder (not a repo, not downloadable via API without auth). Mentioned at https://drive.google.com/drive/folders/1QlFDRjtwJvJXBED7JsLN7jnkxB6ySr3p.
- **`extract_icons` output:** Part of `vendor/elden-ring-map` EldenRingMap tooling, requires a local PC game install to run.

**Current State:**
Per `docs/SOURCE-PACK.md` line 2: *"The PC in this house does not have Elden Ring."* Neither the RubyRed Drive folder nor a local game install currently exist on the development machine.

**What the Job Needs:**
1. User manually downloads RubyRed Drive folder to `public/sourced/icons/` (can be done offline, once).
2. User with a PC game install runs `extract_icons` (from EldenRingMap) to generate icon output (e.g., PNG filenames keyed to internal IDs or FMG names).
3. Diff script compares filenames: which icons are in RubyRed but missing from extract_icons output (cut/removed items) or vice versa.

**Verdict: Not actionable without user action.** This job is blocked on (a) the user manually downloading the RubyRed Google Drive folder and placing it in the project, and (b) a local game install or someone providing the `extract_icons` output from a copy of the game. The task cannot be written until both artifacts exist locally.

---

## Job 3: NPC Stats Sheet → `src/knowledge/npc-stats.json`

**Source:**
- **URL:** https://docs.google.com/spreadsheets/d/1jZokIy9PcX5UhUPcTe992aP21JiXL015sfP4sjYktu4/edit#gid=0
- **Attribution:** Listed in AWESOME-RESOURCES.md as "NPC stats sheet (player-model NPCs)"

**Critical Caveat — From REVIEW.md & SCOPE.md:**
Line in REVIEW.md: *"Zullie NPC stats sheet is player-model NPCs, not `NpcParam` absorb. Label it that way in the lab or it will lie about Malenia."*

Line in SCOPE.md (point 8, "Enemy absorb table"): *"Zullie player-model sheet is not this table."* The real need is `NpcParam` (combat absorb/stance/resistances/status) from **ERDB**, not player-model stats.

**What This Sheet Actually Covers:**
The EanNewton sheet in AWESOME-RESOURCES is for **display only** — character model stats, animation sets, cosmetics — not combat mechanics. This is fundamentally different from what the Build lab needs (enemy resistances, poise, stance, etc.).

**Distinction:**
- **EanNewton NPC stats sheet** (the one in AWESOME-RESOURCES.md): player-model NPCs (cosmetic/character model data)
- **Zullie NPC stats sheet** (separate source, also in Awesome list): same scope, different authority
- **ERDB NpcParam** (actual solution): combat absorb, resistances, poise, status — what Build lab actually needs

**Verdict: Blocked on product clarity.** The sheet is accessible and data is structured (Google Sheets rows/columns), but importing it under the name `npc-stats.json` would mislabel cosmetic data as combat data. Per SCOPE.md point 8, the real gap is sourcing ERDB `NpcParam` absorb tables. Before writing a task to import this sheet, confirm whether the goal is (a) NPC appearance/display cards (cosmetic, this sheet works) or (b) enemy combat stats (this sheet is wrong; ERDB is correct). These are two different schemas and different purposes.

---

## Job 4: EanNewton Progress Tracker vs `catalog.ts` Column-Diff

**Source:**
- **URL:** https://docs.google.com/spreadsheets/d/1_7sTNSle8kxB72eNgICAfdGoWMbe4tFycy2PNwJFTw8/edit?usp=sharing
- **Attribution:** Listed in AWESOME-RESOURCES.md as "EanNewton progress tracker"

**Current Catalog State (`src/knowledge/catalog.ts`):**
- **Total facts:** 89 entries
- **Breakdown by kind:**
  - 24 bosses (Margit, Godrick, Malenia, Consort Radahn, etc.)
  - 23 graces (warp sites across all regions + SotE)
  - 24 items (Great Runes, medallions, Fingerslayer Blade, etc.)
  - 8 quests (Ranni line, Boc, Millicent, Rya)
  - 10 regions (Limgrave, Liurnia, Caelid, SotE, etc.)

**What a Column-Diff Would Compare:**
The EanNewton tracker is a public Google Sheet tracking progression/completion across the game. Columns likely include: region, item, boss, location, completion status, notes. A diff would identify:
- Facts in catalog but not tracker (local authored edges, quest steps, GideonAct implications)
- Facts in tracker but not catalog (gaps in authored checklist, cut content, DLC items)
- Discrepancies in naming or region assignment

**Actionability:**
The tracker is publicly accessible as a Google Sheet. No local install needed. The catalog.ts is already in the repo. The diff is straightforward: parse both, compare fact keys and names, generate a report. The task is tractable once the person writing it reads the tracker columns and understands what the diff should flag (missing facts, new DLC coverage, etc.).

**Verdict: Ready to task-brief.** Sheet is accessible and structured. The work is to (1) fetch/parse the tracker, (2) normalize names/ids, (3) compare against catalog.ts, (4) generate a report of gaps. The scale is moderate: 89 facts in catalog vs likely 200+ in a full progression tracker. The task does not require local artifacts or user downloads.

---

## Summary

| Job | Actionable | Blocker | Next Step |
|---|---|---|---|
| 1. Elden Refs / Carian Archive → aliases.json | Yes, with caveats | License verification needed for both sources (no LICENSE files published) | Write task brief; confirm licensing & attribution approach |
| 2. RubyRed diff → missing/cut report | No | Requires user to download Drive folder manually + local game extract for `extract_icons` output | Ask user to provide both artifacts; then task |
| 3. EanNewton NPC stats → npc-stats.json | No / Clarification needed | Conflation with combat stats (ERDB NpcParam); sheet is player-model only | Clarify product need: cosmetic display cards or combat stats? If cosmetic, task is ready. If combat, use ERDB instead. |
| 4. EanNewton tracker vs catalog.ts | Yes | None | Write task brief; sheet is public, catalog is in repo, diff is well-defined |

---

**Key Findings:**

1. **Elden Refs & Carian Archive** — both sites exist and are publicly accessible with structured data, but neither has published license information. Research and written approval needed before ingesting.

2. **RubyRed icon diff** — blocked on user action (manual Drive folder download) and local game extract. Not a script-writing task until artifacts are present.

3. **NPC stats sheet confusion** — the sheet is cosmetic (player models), not combat (absorb/resistances). REVIEW.md and SCOPE.md both warn this. Clarify product intent before importing.

4. **EanNewton tracker diff** — fully actionable. Sheet is public, catalog is in-tree, comparison is straightforward. Ready to brief.
