# Task 108 — Polish from the Task 107 screenshots

1. **Phone header must never wrap.** With a long area ("Limgrave · The First Step") the `⋯` button drops to a
   second row. Header is a single non-wrapping flex row: brand 40px · search 44px · area chip `flex: 1;
   min-width: 0` with text ellipsis · character chip · `⋯`. Add an audit check: header height ≤ 60px on phone.
2. **Search field lingers.** After picking a result (or on section change / Escape / outside tap) the phone
   search row collapses back to the icon.
3. **Gideon page layout (phone and dock):** the conversation is the focus.
   - Input box always visible, fixed at the bottom of the Gideon view (above the tab bar and clear of the
     `+` FAB — hide the FAB on the Gideon section; Gideon has its own input).
   - Quick chips (Still available, Stuck, 100% spine, Before I go, Missed here, Secrets, Upgrade advice, My
     list, Clear) and "Nearby leftover" suggestions become ONE horizontally scrollable chip row above the
     input. No wall of stacked chips.
   - Log scrolls; newest answer scrolled into view.
   - Rewrite the intro line in plain player language, e.g. "Ask me anything — where an item is, what to do
     next, how to beat a boss. Or tell me what you just did." No app jargon (Blitz, beat, atlas).
4. **Library category icons.** Replace the 1–2 letter circles (W, SH, A…) with real icons: use a
   representative item image from `image-index.json` / `fanImage` per category (e.g. Weapons → Longsword,
   Shields → Heater Shield, Armor → a helm, Talismans → a talisman, Sorceries → Glintstone Pebble,
   Incantations → Flame Sling, Ashes of War, Spirit Ashes → Mimic Tear, Items → Flask, Bosses → a boss icon,
   NPCs, Locations → grace, Recipes → cookbook, Secrets → stonesword key, Guides, Dialogue, Mechanics).
   Fallback to an inline SVG glyph set — never letters.
5. **Gideon nav buttons** labelled "Show it" must name the target ("Show Gael Tunnel on map").
6. Omnibox: show the Do / Things / Ask group headings consistently (Things grouped by kind inside).

Acceptance: `npm run audit:ui` (dev server on :5173 already running; don't start/stop it), phone and
desktop zero overlap/covered/transparent/did-not-reach/console; header ≤ 60px check passes; look at phone
screenshots for Gideon, Library search and a long-area header and describe them. `npx tsc -b`, `npm test`,
`npm run lint`, `npm run build` pass; `git add -A` and commit.
