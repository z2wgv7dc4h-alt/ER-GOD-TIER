# Scope and missing architecture

v1 is **one Tarnished, three worlds** (base, SotE, Tarnished Pack), local-first, PS5-reconstructable.

Do not add a module that cannot read or write `Character`.

## Already in the kernel

- One `Character`, merge-not-replace
- Reckoning (PS5) + save/SSE (PC)
- Fact graph: requires / grants / used-in
- EldenRingMap as atlas engine
- Awesome-list as source map, not a data dump
- Refuse: uploads, save editing, shipped tiles, invented AR, Nightreign

## Architecture that is still missing (add these, in this order)

**Status pass 2026-09-22**: items 1, 3, 4 turned out to already be implemented when this batch of
task work started (verified, not built fresh). Item 7 is now done. Item 2 partially done. Item 8
is in progress. See each item below for specifics.

### 1. Three-state facts â€” âœ… already implemented (verified 2026-09-22, not built fresh:
`factState()` / `FactState` (`true | false | unknown`) already existed before this batch of task
work started)

Today a grace is either on a list or not. That collapses â€œnever been thereâ€ and â€œwe have not asked.â€

```
FactState = true | false | unknown
```

- Save flag set â†’ `true`
- Save flag unset *and* parser trusted â†’ `false` for that flag
- Interview / screenshot silent â†’ `unknown`
- â€œMissing onlyâ€ on the atlas means `unknown | false`, never `true`

Without this, a PS5 player who has not photographed Caelid looks the same as someone who skipped it.

### 2. Alias plane â€” ðŸ”„ partially done

Done for graces and bosses (`src/lib/aliases.ts`, Task 06's boss extension). Task 14 investigated
the FMG-name half of this (Elden Refs / Carian Archive) and found both redundant with
`names.json` already in-repo â€” closed as no deliverable, not because the alias plane is finished,
but because those two specific sources had nothing left to add. The generated-after-extract
`aliases.json` this section describes (param row â†’ slug, FMG name â†’ slug, fed by a real game
extract) is Task 09/17's territory, in progress.

```
engineId   grace:10000800
slug       grace:elleh
fmgName    Church of Elleh
aliases    elleh, church of elleh
```

One generated `aliases.json` after extract. Every other plane keys off the slug. This is the last real blocker between Reckoning and the live map.

### 3. Profiles â€” âœ… already implemented (verified 2026-09-22: `src/lib/vault.ts` already had a
full `Profile` type, `addProfile`/`switchProfile`/`deleteProfile`/`activeProfile`, before this
batch of task work started. Not yet surfaced in the rail UI â€” see `HANDOFF-CLAUDE.md` P3 item 30)

A household is more than one Tarnished.

```
Profile { id, label, character, regulation: '1.17' | 'sote' | 'tarnished-pack', slot? }
```

PS5: profiles are named by the player.  
PC: profiles are save-slot index + character name from the header.

localStorage today is one blob. That will collide the moment someone tests a second run.

### 4. Export packet â€” âœ… already implemented (verified 2026-09-22: `src/lib/packet.ts` /
`vault.ts` already handled this â€” Task 06's tests confirmed a packet never contains screenshot
blobs â€” before this batch of task work started)

PS5 play is on a TV. Reckoning is on a phone. PC extract is on another box.

```
all-knowing.packet.json
  version, regulation, profile, character (no screenshot blobs)
```

QR or file share, local only. This is how a living-room player gets state onto the PC that ran the one-time map setup (`npm run map:setup`). Not an account.

### 5. Conflict rules â€” âœ… done (Task 24: `src/lib/conflict.ts`, `applyFacts`/`denyFacts` now
reconcile from the full evidence list; all four winner-table rows have real tests. The loser is
kept on `evidence[]` â€” `Evidence` gained an explicit `claim: 'true' | 'false'`.)

`src/lib/infer.ts`'s `Evidence` shape already carries a confidence score (0.94 direct / 0.72
inferred, per Task 06) which is adjacent to this, but the specific winner-table below has not
been verified against the actual code path for two sources conflicting on the same fact.

Same fact, two sources.

| Winner | When |
|---|---|
| save flag | PC parser trusted |
| later screenshot + matching name | PS5, no save |
| explicit answer | user overrides inference |
| inference | never beats a direct source |

Record the loser on `evidence[]`. Do not silently drop it.

### 6. Regulation stamp â€” âœ… done (Task 24: `src/lib/regulation.ts`, `Character.regulation`,
`catalog.regulation`; packet now reads the shared constant. Task 27 fixed the mismatch.)

**Audit result (Task 24) + fix (Task 27).** Task 24 found three of four sources off the
`1.17-tarnished-pack` stamp. Task 27 diagnosed why: the machine's install *is* the 1.17 Tarnished
Pack build (its own item FMG carries the Tarnished Pack weapons), but the in-repo `names.json` was
a stale base-game Text Explorer dump and the atlas markers had not been regenerated from the
install. Both are now regenerated from the install:

- **FMG names** (`open/names.json`) â€” 6,820 base-game names â†’ 8,767 including Shadow of the Erdtree
  and Tarnished Pack (Milady, Rellana, Messmer, Idus Sword, Leontiel's Greatsword).
  Regenerate: `python scripts/extract-fmg-names.py`.
- **Atlas markers** (`vendor/elden-ring-map/data/markers.json`, gitignored) â€” 1,106 markers from the
  install's own `regulation.bin` + DLC, including Shadow of the Erdtree areas (Belurat, Shadow
  Keep, Scadutree Avatar). Regenerate: `python vendor/elden-ring-map/tools/build_markers.py`.

- **Paramdex names** (`open/paramdex/`) â€” the equipment files (`EquipParamWeapon`/`Goods`/
  `Protector`/`Accessory`/`Gem`) were topped up from the install with `scripts/extract-paramdex-names.py`
  and now include the Tarnished Pack rows (Idus Sword, Leontiel's Greatsword).

The one source still off-stamp is `open/paramdex/NpcParam.txt`: it remains the upstream
`soulsmods/Paramdex` dump, post-SotE but pre-Tarnished-Pack. Its names are DSMapStudio-resolved
(generic model/behaviour names), not an FMG row-id join, so it is not locally regeneratable.
`regulationAudit()` reports that remaining gap; it is not papered over. (The only Tarnished Pack
boss it would cover, `boss:leontiel`, is authored-only in the catalog anyway.)

Character and catalog both carry `regulation: '1.17-tarnished-pack'`.  
Clark AR, marker extract, and FMG dump must be the same stamp or the lab lies.

Tarnished Pack is not a campaign tag on three weapons. It is a regulation overlay.

### 7. Quest edges, not quest prose â€” âœ… done (Task 12: `PlanStep` now carries real `requires`/
`grants`/`lockouts` arrays, `planRoute` traverses them, both named test cases below are covered
by real tests)

```
Step { id, requires[], grants[], lockouts[], flag? }
```

Lockout is an edge to a forbidden later step, not a warning paragraph.  
Alexander in the Limgrave hole and Ledaâ€™s Enir-Ilim invitations are the test cases.

### 8. Enemy absorb table â€” ðŸ”„ in progress (Task 17, real `NpcParam` extraction via erdb against
the local game install now available on this machine)

Build lab question 2 (â€œwhat should I hit this with?â€) needs a boss row: absorb, stance, resistances, status.  
Source: ERDB `NpcParam` + a hand table for legendary fights.  
Zullie player-model sheet is not this table.

## Explicitly out of v1

- Nightreign (different save, different map, different regulation)
- Seamless Co-op / randomizers as first-class worlds (regulation overlays later)
- Save editor, item spawn, flag writer
- Hosted tiles, hosted icon CDN
- Accounts, cloud sync, â€œlogin with PSNâ€
- Live memory on a machine running EAC
- Auto-play / overlay that injects into the game
- Crowdsourced marker edits as truth

## Feature ideas that look like scope but are not architecture

These can wait until 1â€“8 exist. They do not change the kernel.

- Soft-cap graphs, fashion tab, transmog
- Voice interview
- â€œWhat if I give Seluvis the bladeâ€
- Build codes / shareable loadouts
- Wiki-style lore pages
- Achievement checklist as its own module (it is just more facts)

## What â€œdoneâ€ for the MVP actually is

A PS5 player can, on a phone, in one sitting:

1. Answer four questions
2. Photograph a warp list and a Great Rune page
3. See a thread from an item to a boss to a quest lockout
4. Export a packet
5. Open that packet on a PC that already ran extract and see the same ticks on the real map

A PC player can skip 1â€“4 and drop a save / run the engine and land in the same place.

If a new idea does not serve that sitting, it is not v1.
