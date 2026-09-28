## Missables & lockouts review (Task 140 §2)

Every gate (`src/knowledge/gates.ts`), missable (`src/knowledge/missables.ts`) and storyline
lock condition (`src/knowledge/storylines.ts`; the planner consuming them is
`src/lib/lockWarnings.ts`) was checked against the quest's Fandom page in
`data/raw/er-mcp.db`. **Result: 21 checked, 2 wrong (fixed), 3 well-known lockouts added.**
All losses are permanent for the run and recoverable on NG+ (Elden Ring resets quest flags on
journey 2), so the "permanence" column records what a single run loses, not an unrecoverable
save.

### Gates

| gate | trigger verified | lockout correct? | permanence | action |
| --- | --- | --- | --- | --- |
| gate:forge | burn flag `quest:erdtree-burned`; Fire Giant / Forge grace = approaching | yes — Bolt of Gransax, Sanctified Whetblade, Golden Order Principia, Blessed Dew, Sword of Milos, Weathered Dagger all Royal-Capital-only | permanent run / NG+ | verified |
| gate:maliketh | `boss:maliketh` | yes — living Leyndell gone in the ash | permanent run / NG+ | verified |
| gate:sealing-tree | `quest:leda:invitations-locked` (burning the tree) | yes — Leda/Freyja/Ansbach/Thiollier alliances freeze | permanent run / NG+ | verified |
| gate:ranni-ending | **was** `quest:ranni:ring` (too late) | Seluvis stock closes | permanent run / NG+ | **fixed**: trigger now the Fingerslayer hand-in; added Magic Scorpion Charm |
| gate:frenzy | `quest:frenzy:taken` | yes — every other ending until Miquella's Needle | permanent run / NG+ | verified |
| gate:dung-eater-curse | `quest:dungeater:potioned` | yes — Mending Rune of the Fell Curse forfeited | permanent run / NG+ | verified |
| gate:seluvis-potion | `quest:nepheli:potioned` | yes — Nepheli's rule + Stormhawk and Kenneth's coronation closed | permanent run / NG+ | verified |
| gate:volcano-host | `boss:rykard` | contracts + Rya's amnion close | permanent run / NG+ | **fixed**: removed false locks on Rya's resolution and Tanith's "devour the god" (both are post-Rykard steps per the wiki) |
| gate:millicent-choice | `millicent:aid` / `betrayed` / killed | yes — the two Elphael signs are mutually exclusive, so one of needle / insignia / prosthesis is lost | permanent run / NG+ | verified |
| gate:varre-ignore | `quest:varre:killed` | yes — Pureblood medal, cloth step, Lord of Blood's Favor | permanent run / NG+ | verified |

### Missables

| missable id | trigger checked | action |
| --- | --- | --- |
| weapon-ruins-greatsword | Radahn Festival activation replaces the Redmane duo | verified |
| weapon-bolt-of-gransax | Erdtree burn | verified |
| whetblade-sanctified-whetblade | Erdtree burn | verified |
| key-item-golden-order-principia | Erdtree burn | verified |
| talisman-blessed-dew-talisman | Erdtree burn | verified |
| weapon-sword-of-milos | Erdtree burn (Dung Eater moat invasion) | verified |
| key-item-weathered-dagger | Erdtree burn (Fia's line) | verified |
| talisman-rotten-winged-sword-insignia | Elphael betray path | verified |
| key-item-miquella-s-needle | Elphael betray / incomplete Millicent | verified |
| talisman-millicent-s-prosthesis | Elphael aid path | verified |
| talisman-flock-s-canvas-talisman | Millicent line not concluded | verified |
| talisman-magic-scorpion-charm | Fingerslayer hand-in closes Seluvis | **added** |
| spirit-ancient-dragon-florissax | approaching Shadow Keep before starting Thiollier | **added** |
| item-black-syrup | Miquella's Great Rune breaking before Moore/Thiollier hand-in | **added** |

### Storyline lock conditions

| line | condition | verdict |
| --- | --- | --- |
| ranni (endings `stars`) | locks if `quest:seluvis-blade`; a used Mending Rune after the Beast blocks it | verified |
| seluvis | locks once `quest:ranni:nokron` (Fingerslayer hand-in) | verified |
| millicent | locks on `quest:millicent-killed` | verified |
| leda / freyja / igon / thiollier / ansbach | lock until `region:shadow` | verified |
| rya / tanith | amnion + contracts close at `boss:rykard`; resolutions stay open | verified |

### Notes

- `lockWarnings.ts` is a pure planner over these edges (it does not hold data of its own), so the
  fixes land in the source gate/storyline arrays it consumes.
- The two false locks removed from `gate:volcano-host` were the highest-severity findings: a
  warning that Rykard's death "closes" his and Rya's post-fight resolutions would have told a
  player to finish a step the game only unlocks *after* that fight.
