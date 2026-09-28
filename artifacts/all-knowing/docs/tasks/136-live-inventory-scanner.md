# Task 136 — Live inventory scanner (phone camera → every item, no icon guessing)

Elden Ring prints ONLY the highlighted item's name (list header + right panel title) and its "No. Held". So the
robust PS5 method is: the player steps the cursor through a page with the D-pad while the phone camera watches;
every frame yields one item name + count. A test video from the user (arrived compressed to 480×360, so unreadable
— the scanner must work on the camera's native resolution) showed ~7 distinct items in 9 s, e.g. "Flask of Crimson
Tears +4", "Flask of Cerulean Tears +4", "Cuckoo Glintstone", "Shield Grease", "Remembrance of the Starscourge".
This inventory display mode also shows a Character Status column (Level, Runes Held, attributes) on the right.

## 1. HTTPS on the LAN (camera needs a secure context on phones)
- `scripts/make-dev-cert.mjs` (`npm run cert`): generate a self-signed cert for `localhost` + the PC's LAN IPs using
  the `openssl` binary if present (Git for Windows ships it), else Node's `crypto` (no new npm deps). Output to
  `.cert/` (gitignored).
- `vite.config.ts`: if `.cert/key.pem` + `.cert/cert.pem` exist, enable `server.https` (and `preview.https`);
  otherwise plain http as today. Document the one-time "accept the certificate" step in README + in-app help.

## 2. Scanner engine (`src/lib/ps5Scanner.ts`, pure + testable)
- Input: a stream of frames (ImageData) from a `<video>` element — either `getUserMedia({video:{facingMode:
  'environment', width:{ideal:1920}}})` or a user-picked video file (`<input type=file accept="video/*">`, played
  muted, stepped via `requestVideoFrameCallback`/seek).
- Per frame (throttle ~4–6 fps): locate the menu (reuse the Task 134 label-anchoring / tab-title detection), crop the
  highlighted-item name line + "No. Held" row (+ tab title), preprocess (the winning Task 134 path), OCR (reuse the
  shared Tesseract worker; keep ONE worker alive).
- Stabilise: accept a name only after it's read identically (or fuzzy-equal, then catalogue-matched) in ≥ 2 frames;
  resolve through the alias plane / entity index restricted to the tab's category; dedupe; keep the max "No. Held".
- Also parse the Character Status column when visible (level, runes held, attributes) and reuse Task 134's stat
  correction.
- Output: `{ items: [{factId, name, category, held, confidence, frames}], status?: {...} }`.

## 3. UI — Tarnished › Setup "Scan with camera"
- Full-screen camera view with a guide overlay ("fit the menu inside the frame"), live counter ("23 items found"),
  a scrolling list of recognised items (✓ with name + count), torch toggle if supported, Stop.
- "Or pick a recorded video" for the same pipeline on a file.
- Review screen: grouped by category; low-confidence rows need a tap; **Add to my Tarnished** → `collectedItems`
  via the normal confirm + inference path. Inferences: remembrance ⇒ boss defeated (not yet traded); Great Rune ⇒
  shardbearer defeated; cookbook ⇒ recipes; key items ⇒ access (existing rules).
- Tips inline: step one item at a time with the D-pad (not L2/R2 page jumps), hold the phone steady, avoid glare.

## 4. Tests
- Unit tests for the stabiliser/dedupe/category resolution with synthetic OCR streams.
- Fixture test: run the frame pipeline on the still photos in `src/lib/__fixtures__/ps5/` treated as single frames
  (the highlighted-item name must be recovered for the inventory fixtures: Putrid Corpse Ashes, Grave Glovewort [1],
  Holy-Shrouding Cracked Tear, Ambush Shard, Ash of War: Spinning Slash, Blue Cipher Ring).
- `.MOV` fixtures are too large to commit; don't add the compressed test video.

NEVER read .env files. No dev servers started, no installs. `npx tsc -b`, `npm test`, `npm run lint`,
`npm run build` pass; commit after each numbered section.
