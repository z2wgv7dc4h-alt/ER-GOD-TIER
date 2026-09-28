# Task 124 — Close every remaining entity coverage gap (target 100%)

`docs/ENTITY-COVERAGE.md` → "Remaining misses" lists the bosses, weapons, armor, talismans, spells, ashes,
spirits and items still missing guard fields. Close all of them.

1. **Matching first** — many misses are name mismatches, not missing data: source typos ("Godksin Noble Robe" →
   Godskin, "Great Horned Targoth" → Tragoth, "Ekzyke's Decay" → Ekzykes's), casing ("Prince Of Death's Star"),
   and names that exist in the datasets under a different form (Misericorde, Great Epee, Winged Spear, Nox Monk
   pieces, Champion Gauntlets, Old Sorcerer Legwraps, Two-Headed Turtle Talisman). Add normalisation rules (typo
   table in `src/data/entity-overrides.json`, case/apostrophe folding) so they join the data already in the repo.
2. **Research the rest** — for anything truly absent from the repo datasets (e.g. multi-boss encounters like
   "Fia's Champions", "Millicent's Sisters", NPC-invader bosses like Bols / Knight Leontiel / Frenzied Duelist,
   "Unarmed", DLC shields), fetch the facts from the Elden Ring wikis (Fextralife / fandom; research is allowed —
   personal project). Store them in `public/sourced/open/gapfill.json` with one record per entity: the fields
   needed (HP, negations, drops, location, requirements, scaling, weight, description, strategy excerpt ≤ 600
   chars) and a `source` URL per record. For multi-boss encounters, aggregate the members (list each member's
   HP; negation of the primary). "Unarmed" gets a hand-written honest record (no requirements, fist scaling from
   regulation if present).
3. Fold `gapfill.json` into `scripts/build-entity-index.mjs` (lowest priority source) and rebuild the index.
4. Raise the coverage guards to **100%** for every listed metric. Update `docs/ENTITY-COVERAGE.md`; the
   "Remaining misses" section should be empty.
5. Also: the audit's 9 phone Tap<40 hits on inline `.term` tooltip chips — give them a ≥40px hit area via
   padding/pseudo-element without changing text size.

NEVER read .env files. `npm run audit:ui` (dev server on :5173 running; don't start/stop it) zero issues.
`npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit. Report: each previous
miss and how it was resolved (alias vs gapfill + source URL).
