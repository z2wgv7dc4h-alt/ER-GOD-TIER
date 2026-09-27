# Task 118 — Fix the transparent tour, shorten Builds, update audit steps

1. **First-run tour renders transparently** over the page (phone screenshot: "STEP 1 OF 5 · TARNISHED · Your
   character and setup… · SKIP · NEXT" drawn straight over the character card text). Make each coach mark an
   opaque card (`var(--panel)` background, border, shadow) with a dim scrim behind it, anchored just above the
   bottom tab it describes (phone) / below the section tab (desktop), with a small pointer arrow. Nothing else is
   clickable while it shows except Skip/Next/Back. Escape = skip.
2. **Audit harness**: step 1 must screenshot the tour (so its styling is audited as a modal: its own content
   must have zero overlap/transparent issues), then click Skip and continue. Replace the old `library-kit` and
   `library-reference` steps with **library-pvp** (open the PvP sub-view, expand the first build card) and
   **library-guides**. Add **library-builds-kits** (expand an OP kit's level plan).
3. **Library › Builds is ~12 phone screens** after the OP kits moved in. Every section on Builds is a collapsible
   card; only "Your build" and "Stronger for your build" are open by default; OP kits list shows collapsed
   one-line cards (name · tag · level) that expand. Target ≤ 4 screens with defaults. Same treatment for PvP
   (build cards collapsed; matchups and tech as collapsible groups).

Acceptance: `npm run audit:ui` (dev server on :5173 is running; don't start/stop it) — phone and desktop zero
overlap/covered/transparent/text-overflow/dev-text/did-not-reach/console; no page over 4 screens except
Guides. Look at the phone screenshots for the tour, Builds, PvP (expanded card) and Guides and describe them.
`npx tsc -b`, `npm test`, `npm run lint`, `npm run build` pass; `git add -A` and commit.
