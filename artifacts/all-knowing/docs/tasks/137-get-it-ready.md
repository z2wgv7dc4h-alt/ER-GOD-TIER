# Task 137 — Get it ready: fix list, offline wiki, data accuracy, perf, docs

Read `docs/USAGE-MODEL.md` and `docs/DATA-CATALOG.md` first. Commit after EACH numbered item.

1. **Crawl fix list** (from `npm run crawl:ui`):
   - Tarnished › Gear: tapping an equipped item row (e.g. "Carian Knight Shield +12", "White Reed Set") does
     nothing → open its entity panel (the slot's "Change" button keeps opening the picker).
   - Journey › Map side panel: "Unknown" / "Not there" chips and "Follow into workspace" do nothing → make them work
     (mark state / navigate) or remove them if they have no purpose.
   - Library › Search: categories with 0 records (Dialogue 0, Guides 0) must not render as empty categories — either
     wire them to their data (dialogue lines, guides corpus) or hide them.
   - Area picker: "Chamber Outside the Plaza" still listed twice — dedupe by grace id AND display name.
   - Settings: Reduce motion / Haptics / text size / Co-op / Spoilers toggles — verify each changes something
     observable (class on root, stored value, UI) and that the control reflects its state (aria-pressed/checked);
     fix any that don't.
2. **Offline wiki + data**: Settings › Data & offline gets **"Download everything for offline"**: fetches every file
   under `sourced/**` (entity index, wiki pages + search index, open dumps) into a dedicated Cache Storage bucket
   with a progress bar (files + MB), resumable, with "Remove offline data". The service worker (vite-plugin-pwa
   `runtimeCaching`) serves `sourced/**` cache-first from that bucket so the wiki, search and Gideon's wiki answers
   work with no connection. Show storage used / quota (`navigator.storage.estimate`) and request
   `navigator.storage.persist()`. Tests for the manifest of files to download and the cache strategy config.
3. **Data accuracy**:
   - Boss HP is NpcParam base HP, not what the player faces (area/NG scaling). Label it clearly ("base HP") everywhere
     it shows, and where the area scaling (SpEffect/`npc-combat` area multipliers, if present in the data) is known,
     show the scaled value for NG and NG+; never present base HP as the real number without the label.
   - Quest steps: the wiki-step → authored-beat matcher is a token heuristic; tighten it (require NPC + location or
     item overlap, else keep as separate ordered step) and add tests with Sellen, Ranni, Millicent, Alexander.
4. **Performance**: `ar` chunk is 767 KB. Split the attack-rating tables so the calculator data loads lazily (only
   when Builds/Library AR views open); main entry must not import it. Report chunk sizes before/after.
5. **Test robustness**: `bundleBudget.test.ts` reads `dist/` if present — make it build-independent (skip when
   `dist` is older than the sources, or compute from the Vite manifest in a dedicated `npm run test:bundle`).
6. **Docs**: bring README.md, HANDOFF-CLAUDE.md, docs/ARCHITECTURE.md (create if missing) up to date with the
   current app: four sections, entity graph + index, wiki corpus, advisor, PS5 capture (status OCR, camera scanner,
   map reader), map engine served at /engine, HTTPS cert for the phone camera, offline download, data catalog,
   audit/crawl tooling, how to run on the phone.

NEVER read .env files. No dev servers, no installs. `npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass.
