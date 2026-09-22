# Task 57 — Packet share a human will actually use

## Context

Repo root is `artifacts/all-knowing/`. Read `src/lib/packet.ts`, `src/lib/vault.ts`,
`src/QoL.tsx`, `src/App.tsx`, and `docs/SCOPE.md` (profiles / packet section).

PS5 play is on a TV. Reckoning is on a phone. PC extract is another box. File-in-Downloads
packets die.

Do not run in parallel with Task 56 if both edit `App.tsx` / `QoL.tsx`.

If you need to write any scratch file, save it to `./.scratch/` (gitignored), never `/tmp` /
`%TEMP%`. This is a personal, non-commercial project — no license-gating on data/code.

## Objective

Make export / import survivable across phone and PC without an account.

## Requirements

1. Keep `*.all-knowing.json` as source of truth. No screenshot blobs (existing packet tests must
   still pass).
2. Add a compact share path:
   - Primary: copy-to-clipboard "All-Knowing packet" button with a visible toast.
   - Secondary: download file (already exists — keep it).
   - QR only if the payload fits. If the JSON is too large for a QR, QR a hash + filename
     instruction and still offer copy-json + download. Do not truncate facts to fit a QR and
     call it a packet.
3. Import: paste JSON or drop file. Do not add a camera QR scanner or a new dependency in this
   task. Clipboard paste of the JSON is the mobile path.
4. PacketBar on mobile lives in the character sheet (Task 26), not a fat top bar.
5. Diff-before-import already exists (Task 32). Keep it. After import, show a one-line
   "merged N facts".

## Explicit exclusions

- No accounts, no server, no iCloud.
- No new npm dependency unless it is tiny and already justified; prefer browser APIs.
- Do not store packets in URL query strings if they blow the length limit.

## Acceptance criteria

- Packet tests still: no shots in export; vault round-trip; `diffPacket` still works.
- `npx tsc -b`, `npm run lint`, `npm test`, `npm run build` all pass.
