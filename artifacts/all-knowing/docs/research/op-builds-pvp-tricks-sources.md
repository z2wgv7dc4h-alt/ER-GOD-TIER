# OP builds / PvP / tips — sources and patch currency

Task 40. This records where the authored knowledge in `src/knowledge/builds.ts`,
`src/knowledge/pvp.ts` and `src/knowledge/tech.ts` came from, so it can be
re-checked after a balance patch.

## Patch context

- **Game / regulation version: 1.17**, released **27 August 2026**, adding the
  **Tarnished Pack** DLC (App Ver. 1.17 / Regulation Ver. 1.17).
- This matches the project's regulation stamp (`1.17-tarnished-pack`,
  `src/lib/regulation.ts`) and Clark's `regulation-vanilla-v1.17` AR data.
- Source: <https://eldenring.wiki.fextralife.com/Patch+Notes> (1.17 section).

## What is sourced vs authored

| Data | Status |
|---|---|
| Weapon / Ash of War / talisman names | Real; cross-checked against Fextralife pages. |
| Build stat spreads and levels | **Recommended target spreads**, authored — not extracted numbers. |
| Stance / buff / cost numbers in `tech.ts` | Quoted only where a Fextralife page states them; otherwise described qualitatively. |
| PvP matchup counter-tech | Grounded in the mechanics cited per entry (parry flags, Cragblade, Eternal Darkness, PvP status scaling). |
| Two PvP entries (`build:pvp-bleed-katana`, `build:pvp-colossal`) | Community-standard archetypes, author-encoded; marked `source` accordingly, **not** wiki-tagged PvP builds. |

## Source list

PvE builds (`opBuilds`):

- Builds index: <https://eldenring.wiki.fextralife.com/Builds>
- Lion's Claw: <https://eldenring.wiki.fextralife.com/Lion%27s+Claw>
- Dark Moon Greatsword / Moonveil / Black Flame / Dragon Communion / Bolt of
  Gransax / Godskin Peeler — general Elden Ring item knowledge plus the Fextralife
  weapon and skill pages.

PvP (`pvpBuilds`, `pvpMatchups`):

- PvP Builds index (the four wiki-tagged PvP builds):
  <https://eldenring.wiki.fextralife.com/PvP_Builds>
- St. Trina's Confessor:
  <https://eldenring.wiki.fextralife.com/Level_60_St._Trina%27s_Confessor_Build>
- Sanguine Lightning Assassin:
  <https://eldenring.wiki.fextralife.com/Level_75_Sanguine_Lightning_Assassin_Build>
- Sorcerer Duelist:
  <https://eldenring.wiki.fextralife.com/Level_80-90_Sorcerer_Duelist_Build>
- PvP rules / exclusive scaling: <https://eldenring.wiki.fextralife.com/PvP>
- Poise: <https://eldenring.wiki.fextralife.com/Poise>

Tips / tech (`techTips`):

- Lion's Claw, Giant Hunt, Royal Knight's Resolve, Cragblade, Seppuku, Comet Azur,
  Night Comet, Black Knife Tiche, Mimic Tear, Sleep Pot, Ironjar Aromatic,
  Bloodflame Blade, Buffs and Debuffs, Poise — individual Fextralife pages.
- 1.17 changes (greatshield guard boost, Parry/Storm Wall/Thops's Barrier, perfume
  bottles): <https://eldenring.wiki.fextralife.com/Patch+Notes>

## Known limitations

- **Reddit and YouTube were not reachable** during research, so no community
  consensus or creator build is cited. Where a widely-known community technique
  is included (`tech:powerstance-jump`, the two community-standard PvP
  archetypes) it is explicitly marked as author-encoded rather than sourced.
- **PvP poise breakpoints (101/89/61) could not be verified.** Only the PvE
  breakpoints 11/51/101 appear on the Fextralife Poise page; the PvP-specific
  breakpoints are therefore deliberately not stated.
- Any entry with a `patch` field is balance-sensitive and should be re-read after
  the next patch. The 1.17-specific ones are: `tech:greatshield-1-17`,
  `tech:parry-1-17`, `tech:perfume-1-17`, `tech:royal-knights-resolve`.
