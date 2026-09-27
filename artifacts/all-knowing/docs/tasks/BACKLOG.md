# QoL / connections backlog (post Tasks 91–100)

Each item is small-to-medium and judged against `docs/USAGE-MODEL.md`. Batch into task briefs 101+.

## Getting data in (less typing)
1. **Voice log** — hold-to-talk on the Quick log button (Web Speech API, guarded) → omnibox classifier.
2. **PS5 share-to-app** — PWA Web Share Target so PS App / phone gallery screenshots can be "Shared to
   All-Knowing" straight into Setup/Reckon.
3. **Batch screenshot drop** — drop 20 shots at once; auto-detect screen type per image; one review list.
4. **Rune count & level-up calc** — type current runes → "you can afford N levels; put them in X"
   (advisor), rune cost per level table.
5. **"I'm at <grace>" one tap** from the Area hub → sets currentArea + marks grace.

## Planning & decisions
6. **Goal stack** — multiple goals (e.g. "Moonveil", "Ranni ending", "Mimic Tear"), ordered; Now shows
   the next step of the top goal plus "on the way" items for the others along the same route.
7. **Route optimiser** — order open to-dos by region adjacency so one trip clears several things.
8. **Ending chooser** — compare the endings: what each requires from here, what each locks, steps left.
9. **NG+ planner** — what carries over, what to do differently, missed-this-cycle list.
10. **"Before I leave" check** on every region exit / big boss: missables in this area not done.
11. **Level-band pacing** — "you're under-levelled for Caelid; farm here (spot) or go Liurnia first".

## Combat helpers
12. **Boss prep card** — one screen: weakness, status that works, my best weapon from inventory vs
    it, suggested spirit ash I own, buffs/talismans I own that help, flask split suggestion.
13. **Damage calculator** — my weapon vs a chosen enemy's negations (AR engine + NpcParam).
14. **Status build-up table** — bleed/frost/rot procs to trigger per boss.
15. **Summon / co-op availability** per boss (sign spots, NPC summons, Spirit ash allowed).

## Map
16. **Pin the answer** — every Gideon/search answer that has a location drops a temporary "result" pin.
17. **Custom pins & notes** — long-press map to drop a note ("come back with a stonesword key").
18. **Route line** — draw the route-optimiser path on the map.
19. **Heatmap of undone** — density of not-done things per area on the map.
20. **Follow mode** — map auto-centres on currentArea (and on the live dot on PC).

## Build lab
21. **Loadout presets** — save named loadouts (PvE boss, PvP, co-op), switch in one tap; equip load
    and AR shown per preset.
22. **Stat allocation planner** — drag sliders to plan the next 20 levels; shows AR/HP/FP/stamina
    curves and soft caps live.
23. **Affinity advisor** — best affinity + ash for each owned weapon at my stats.
24. **Upgrade material tracker** — how many smithing/somber stones I need to take a weapon to +N,
    how many I have (from inventory OCR), where to farm the rest.
25. **"What can I use right now"** filter — everything owned and requirement-met, sorted by AR.

## Knowledge
26. **Mechanics cards** — poise, soft caps, flask upgrades, stance break, scadutree blessing, great
    runes activation, weight classes; each short, linked from anywhere the term appears (auto-link
    glossary terms in text).
27. **Glossary auto-linking** — any known term in Gideon answers / lore becomes an EntityLink.
28. **Patch-aware notes** — flag builds/tips that depend on a regulation version (we stamp 1.17).
29. **Spoiler control** — per-category spoiler levels (lore, endings, boss names ahead of progress);
    blur not-yet-reached entities.

## Interaction polish
30. **History & back stack** — breadcrumbs across entity hops; swipe back on phone.
31. **Favourites / watchlist** — star anything; a Watchlist sub-view; starred items get map pins.
32. **Recently viewed + recently logged** unified timeline with undo on logged entries.
33. **Offline badge & data freshness** — show which datasets are cached; download-all for offline.
34. **Skeleton loaders** for lazy sections; no layout jumps.
35. **Haptics** (navigator.vibrate) on log/mark on phone.
36. **Settings page** — theme, text size, spoiler levels, default section, LLM key status/test button.
37. **Export journal** — a readable "my playthrough so far" (timeline of logged facts with dates).
38. **Multiple playthroughs compare** — two profiles side by side.

## Gideon
39. **Proactive nudges** — when a log trips something ("you just killed Radahn — Nokron is open, and
    Alexander is waiting at Jarburg"), Gideon posts it without being asked.
40. **Clarifying chips** — ambiguous queries return 2–4 tap options instead of guessing.
41. **Context carry** — "where is it?" after asking about an item resolves "it"; "and the armor?".
42. **Answer cards** — structured answers (boss prep card, item verdict, route) rather than prose.
