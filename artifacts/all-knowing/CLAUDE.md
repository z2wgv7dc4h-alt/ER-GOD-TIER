# All-Knowing — instructions for Claude (read fully; keep this file short)

Elden Ring companion PWA (React + TS + Vite) at `artifacts/all-knowing/` in repo
`C:\Users\RIGGUSPIG\Desktop\ER MASTER TOOL` (remote `z2wgv7dc4h-alt/ER-GOD-TIER`, branch `master`).
The owner plays on **PS5** and uses the app on a phone: no save access; the app learns from phone photos
of the TV, quick logs and inference. Judge every feature by whether it works for a PS5 player.

## Your role: orchestrator, not implementer
- **DeepSeek (opencode) does all building, extraction, audits and investigation.** You write short briefs,
  queue them, verify results, merge. Read `docs/ORCHESTRATION.md` before starting any work.
- Minimise your own tokens: one-line status checks (`bash scripts/orchestration/status.sh <ids>`),
  read reports and checklists rather than logs/diffs, sample real output only to verify. Short replies.
- Current state, queue and next steps: `docs/STATUS.md` (update it whenever something merges).

## Hard rules (owner's standing instructions)
- NEVER read, list or open `.env` / `.env.local` (private API keys). Tell every agent the same.
- **Never open visible windows** on the owner's PC (gaming PC): no scheduled tasks, no bash/PowerShell
  launchers for background work. Background runs only via `scripts/orchestration/supervisor.mjs`
  (Node, `windowsHide`), started hidden once. Test any new launch method for windows before relying on it.
- Ask before adding scope: answer questions, propose work, wait for "yes". Do what was asked, no tangents.
- Never remove, relabel or edit the owner's builds (`build:*`, PvP builds) — presentation changes only.
- Only advice viable on the current game patch; outdated tips are flagged, never shown as current.
- All Elden Ring data is already scraped and on disk — check `docs/DATA-CATALOG.md`, `DATA.md` and the
  wiki dump `.scratch/er-mcp.db` before calling anything missing. Personal project: web data is fine.
- No invented game text: every value comes from a file on disk; empty beats fake.
- Verify by reading real pages/data (and the browser preview for UI), not just test counts.
- Merge only after the gates pass on the merged result: `npx tsc -b`, `npx vitest run`, `npm run lint`,
  `npm run build`, `npx vitest run src/lib/bundleBudget.test.ts` (plus `npm run index:entities` if data
  changed). Never loosen a test. Commit messages end with the Claude co-author line.
- If DeepSeek reports "Insufficient Balance", tell the owner immediately; don't work around it.

## Map of the code (details in HANDOFF.md and docs/ARCHITECTURE.md)
- Sections: Tarnished / Journey / Library / Gideon (`src/App.tsx`, `src/shell/`).
- Entity data: generated `public/sourced/entity-index.json` ← `src/lib/entityIndexBuild.ts`.
- Names/aliases: `scripts/gen-aliases.mjs`, `src/lib/aliases.ts`, `src/lib/canonicalNames.ts`.
- Pages: `src/library/` (`pageModel.ts`, `EntityPanel.tsx`, `EntityKinds.tsx`); search `src/lib/search.ts`.
- Inference: `src/lib/infer.ts`, `src/knowledge/catalog.ts`, `src/knowledge/inferChains.ts`.
- Map: `src/Atlas.tsx` (live engine iframe + static fallback), `src/map/focusTarget.ts`, `itemSources.ts`.
- Gideon: `src/lib/gideon*.ts` (offline router + DeepSeek path; `npm run eval:gideon` scores offline).
- PS5 photos: `src/lib/ps5Capture*.ts`, `src/lib/ps5Map*`, fixtures `src/lib/__fixtures__/ps5/`.
- Audits: `npm run audit:pages|links|inference|progress`, `coverage:entities`, `data:catalog`.
