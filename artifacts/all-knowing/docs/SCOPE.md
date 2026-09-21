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

### 1. Three-state facts

Today a grace is either on a list or not. That collapses “never been there” and “we have not asked.”

```
FactState = true | false | unknown
```

- Save flag set → `true`
- Save flag unset *and* parser trusted → `false` for that flag
- Interview / screenshot silent → `unknown`
- “Missing only” on the atlas means `unknown | false`, never `true`

Without this, a PS5 player who has not photographed Caelid looks the same as someone who skipped it.

### 2. Alias plane

```
engineId   grace:10000800
slug       grace:elleh
fmgName    Church of Elleh
aliases    elleh, church of elleh
```

One generated `aliases.json` after extract. Every other plane keys off the slug. This is the last real blocker between Reckoning and the live map.

### 3. Profiles

A household is more than one Tarnished.

```
Profile { id, label, character, regulation: '1.17' | 'sote' | 'tarnished-pack', slot? }
```

PS5: profiles are named by the player.  
PC: profiles are save-slot index + character name from the header.

localStorage today is one blob. That will collide the moment someone tests a second run.

### 4. Export packet

PS5 play is on a TV. Reckoning is on a phone. PC extract is on another box.

```
all-knowing.packet.json
  version, regulation, profile, character (no screenshot blobs)
```

QR or file share, local only. This is how a living-room player gets state onto the PC that ran Setup.bat. Not an account.

### 5. Conflict rules

Same fact, two sources.

| Winner | When |
|---|---|
| save flag | PC parser trusted |
| later screenshot + matching name | PS5, no save |
| explicit answer | user overrides inference |
| inference | never beats a direct source |

Record the loser on `evidence[]`. Do not silently drop it.

### 6. Regulation stamp

Character and catalog both carry `regulation: '1.17-tarnished-pack'`.  
Clark AR, marker extract, and FMG dump must be the same stamp or the lab lies.

Tarnished Pack is not a campaign tag on three weapons. It is a regulation overlay.

### 7. Quest edges, not quest prose

```
Step { id, requires[], grants[], lockouts[], flag? }
```

Lockout is an edge to a forbidden later step, not a warning paragraph.  
Alexander in the Limgrave hole and Leda’s Enir-Ilim invitations are the test cases.

### 8. Enemy absorb table

Build lab question 2 (“what should I hit this with?”) needs a boss row: absorb, stance, resistances, status.  
Source: ERDB `NpcParam` + a hand table for legendary fights.  
Zullie player-model sheet is not this table.

## Explicitly out of v1

- Nightreign (different save, different map, different regulation)
- Seamless Co-op / randomizers as first-class worlds (regulation overlays later)
- Save editor, item spawn, flag writer
- Hosted tiles, hosted icon CDN
- Accounts, cloud sync, “login with PSN”
- Live memory on a machine running EAC
- Auto-play / overlay that injects into the game
- Crowdsourced marker edits as truth

## Feature ideas that look like scope but are not architecture

These can wait until 1–8 exist. They do not change the kernel.

- Soft-cap graphs, fashion tab, transmog
- Voice interview
- “What if I give Seluvis the blade”
- Build codes / shareable loadouts
- Wiki-style lore pages
- Achievement checklist as its own module (it is just more facts)

## What “done” for the MVP actually is

A PS5 player can, on a phone, in one sitting:

1. Answer four questions
2. Photograph a warp list and a Great Rune page
3. See a thread from an item to a boss to a quest lockout
4. Export a packet
5. Open that packet on a PC that already ran extract and see the same ticks on the real map

A PC player can skip 1–4 and drop a save / run the engine and land in the same place.

If a new idea does not serve that sitting, it is not v1.
