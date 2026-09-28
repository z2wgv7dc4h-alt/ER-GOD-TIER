# Task 139 — Game patch audit: version, patch-sensitive advice, update detection

Everything is stamped regulation "1.17". Nothing verifies that matches the user's game, and much advice (OP/PvP
builds, cheese/tech tips, wiki numbers) is patch-sensitive. Research is allowed (official patch notes, Fextralife /
Fandom patch pages); cite sources. Commit after each section.

1. **Installed version**: extend the engine tooling (`erlib`, `vendor/elden-ring-map/tools/`) to read the installed
   game's regulation version / `regulation.bin` hash and the game exe version (read-only). Record it in
   `public/sourced/game-version.json` and compare with every dataset's stamp; list datasets built from another version.
2. **Patch history table**: `src/knowledge/patches.ts` — every Elden Ring patch 1.02 → latest (incl. Shadow of the
   Erdtree era) with date and the balance changes that matter to players (weapons, skills, spells, spirit ashes,
   status effects, PvP-only changes, Scadutree/Revered Spirit Ash), each with a source URL.
3. **Audit every OP build, PvP build, matchup counter and tech/cheese tip** (`knowledge/builds.ts`, `pvp.ts`,
   `pvpTech.ts`, `tech.ts`, community builds): mark `status: 'current' | 'nerfed' | 'dead' | 'unverified'`, the patch
   that changed it and what changed; update numbers/recommendations where a newer patch changed them. Show a badge on
   build/tip cards ("Nerfed in 1.10: …"). Tests: every build/tip has a status; no `dead` item is recommended by the
   advisor or Gideon.
4. **Update detection**: on start (PC with the engine) or on demand, compare the recorded version with the installed
   one; if it changed, show a banner "Game updated to X — some advice may be out of date" with a re-extract command.
   For PS5 players: Settings lets the player enter their game version; advice flags patch-mismatched items.

NEVER read .env files. No dev servers, no installs. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
Report: installed version found, datasets out of date, count of builds/tips per status with the notable nerfs.
