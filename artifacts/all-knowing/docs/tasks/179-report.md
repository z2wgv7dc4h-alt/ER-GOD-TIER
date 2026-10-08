# Task 179 — Triage the Reddit/forum player data (READ-ONLY) — report

Read-only triage. No app files were changed. Scripts live in `.scratch/179/` (gitignored, not
committed): `classify.mjs` (corpus triage), `sample.mjs` (random samples), `placements.mjs`,
`questions.mjs`. Only `docs/tasks/179-report.md` is committed. `.env` / `.env.local` were never
opened.

Inputs: `public/sourced/open/player-knowledge.json` (5,718 rows) and
`public/sourced/open/player-questions.json` (6,581 rows), compared against
`public/sourced/entity-index.json` (5,595 records) as the app's existing page content.

---

## 1. Classifying the knowledge corpus — useful advice vs noise

**Result (all 5,718 rows):** **239 useful (4.2%)**, **5,479 noise (95.8%)**.

The classifier is a small ordered rule set (no ML). A row is first rejected on hard noise
signals, then accepted only if it carries an actionable signal for a *substantive* entity:

Noise signals (first match wins — reason shown with count):

| reason | rows | rule |
|---|---:|---|
| question | 1,678 | text contains `?` (the brief lists questions as noise) |
| other/no-advice | 1,589 | topic `other`, no advice phrasing |
| weak/undetermined | 747 | none of the accept rules fired |
| request/co-op/trade | 381 | "need help / looking for / drop me / summon / co-op …" with <2 advice cues |
| outdated/patched | 366 | `possiblyOutdated` and <1 advice cue |
| deleted/too-short | 288 | `[deleted]/[removed]/[image]` or <25 chars |
| opinion/discussion | 201 | "I think / my favourite / tier list / hot take …" and <2 cues, no imperative |
| joke/meme | 83 | git gud / lmao / praise the sun / emoji-and-no-cue … |
| complaint/meta | 64 | nerf / unpopular opinion / netcode / fps … with no advice cue |
| lore | 58 | topic `lore` (fan theory, not playable advice) |
| nightreign | 24 | Nightreign / Nightlord (different game) |

Accept rules (in order): (a) ≥1 **advice cue** + ≥1 substantive entity + ≥40 chars; (b) an
imperative first line + entity; (c) a useful topic (`farm, route, strategy, synergy, mechanic,
pvp, bug, missable`) + entity + cue. **Substantive entity** = an id whose kind is one of
`boss, enemy, hunt, invader, item, npc, merchant, mechanic, region, dungeon, quest, build, grace`,
excluding resolution artefacts (`damage:*`, `line:*`, `item:wait`, `item:rest`, `item:note-*`,
`item:about-*`, `item:no-skill`, `item:torrent`, `item:the-ring`). The advice regex is deliberately
specific (`make sure`, `you should`, `weak to`, `cheese`, `stacks with`, `guard counter`, `time
your`, `+N poise`, …), not generic verbs, which is what keeps precision out of the single digits.

### Hand-check (100 random predicted-useful rows) — precision

I drew two independent random samples (seed `179`) and read 100 predicted-useful rows:

- **53 / 100 were genuinely useful advice** → **precision ≈ 53%** (measured on the final rule set).
- A further **4–6 were borderline** (a real observation but not quite a tip) → **≈ 57–59% lenient**.
- Typical false positives: "I beat X today" stories, "rate my build" posts, lore essays, PvP
  anecdotes, and questions phrased without a `?` ("Best fun build for NG+", "please help").

**Interpretation:** the conservative rule set yields ~4.2% of the corpus as high-confidence advice,
about half of which survives human review. A looser threshold (advice cue + entity, cue≥1) gives
~500 rows but the sample precision falls. Relaxing score/short-text filters does **not** help:
useful/review rate is flat across upvote-score buckets (4.4% at <10, 5.3% at 10–50, 2.9% at
200–1000), so Reddit score is not a quality proxy here. A human (or LLM) pass over the 239-row
shortlist is the practical next step.

Method limits: topic tags are inherited from the collector; entity resolution has artefacts
(`item:wait`, `damage:*`); the 4.2% is a floor, not the total salvageable content.

---

## 2. Useful rows: NEW vs already covered by our data

Compared each useful row's distinctive content words against the matched entity-index record
(name + description + strategy + sections + stats + location + drops), ignoring words common to
>250 records, and flagging ≥0.5 containment as "already covered".

- **Lexical match: 4 / 239 (1.7%)** flagged as covered.
- **Hand review of the 100-row sample:** only ~4–6 rows restate facts already structured in the
  index (boss damage weaknesses like "weak to holy/fire", boss locations like Placidusax, drops).
- **≈ 95%+ of the useful shortlist is NEW** relative to what the app already shows.

Examples that *are* already covered (so should be dropped before import):

| snippet | matched entity | already on the page as |
|---|---|---|
| "Placidusax, you find him by lying down in a secret area in Farum Azula" | `boss:placidusax` | location/grace |
| "…they're extraordinarily weak to holy…" | death-rite-bird region | boss Negation stats |
| "boss is weak to fire, torch deals fire damage" | boss:… | boss Negation stats |

The 4 automated "covered" hits are mostly coincidental word overlap, not true duplicates. The
practical conclusion: this corpus is almost entirely additive; the covered ~5% is the standard
stats/location/drop boilerplate the index already carries.

---

## 3. Where it fits — proposed placements

Counts are useful rows (new/covered) mapped by topic + entity kind. 5 real examples each.

### Ranked verdict

| # | placement | count | worth it? |
|---|---|---:|---|
| 1 | Item page — **"How players use it"** | 97 (94 new) | **Yes** — biggest, mostly concrete build/combo/synergy notes |
| 2 | Mechanic page — **"Player notes / advanced mechanics"** | 39 | **Yes** (small) |
| 3 | Boss page — **"Player tips"** | 35 | **Yes after manual filter** — noisiest bucket (anecdotes leak in) |
| 4 | PvP build/guide — **"Counters & tech"** | 23 | **Yes** — high-value, self-contained |
| 5 | Journey/region — **"Before you go"** | 21 | **Yes** (small) |
| 6 | Bug page — **"Known issues / patched-out"** | 15 | **Marginal** — churns with every patch |
| 7 | PvP build — "Counters" (build-specific) | 3 | **No** — too few |
| 8 | Quest page — **"Missable warning"** | 3 | **No** — corpus has essentially no missable warnings |
| 9 | Quest page — "Notes" | 3 | **No** — too few, low quality |

A better home for most of it than any single page: use the 239-row (or a reviewed subset) as a
**grounded retrieval corpus for Gideon** and as a source of "player tip" callouts, rather than
importing every row as page text.

### 1. Item page — "How players use it" (97)
- "Nagakiba is generally better now, tho I would recommend having enough stats to cast bloodflame blade." — `item:nagakiba` · https://www.reddit.com/r/EldenRingBuilds/comments/1wn06xc/nagakiba_vs_rivers_of_blood_build_which_one_is/pbb7s4n/
- "kick true combos into several weapons… keep a dagger in your first inventory slot so you can quickly unequip your weapon to break a shield." — `item:kick` · https://www.reddit.com/r/EldenRingPVP/comments/1nos6c7/
- "this thing is monstrous as a cold weapon with the Ice Spear weapon ash… with both bleed and cold you're constantly proccing big bursts." — `item:ice-spear` · https://www.reddit.com/r/EldenRingBuilds/comments/1wh6jfp/guys_i_dont_know_whats_so_special_about/p9zw763/
- "Nagakiba two handed and heavy infused would hit a lot harder with that stat spread… never use uninfused non-somber weapons outside the early game." — `item:nagakiba` · https://www.reddit.com/r/EldenRingBuilds/comments/1ti3ax1/why_is_my_damage_so_low/omrjrnn/
- "Executioner has better crit, anchor does pierce damage… For pierce + stance you can use pickaxe." — `item:pickaxe` · https://www.reddit.com/r/EldenRingBuilds/comments/1vnoskt/question_about_which_axe_is_better/p3j713d/

### 2. Mechanic page — "Player notes" (39)
- "Use jump attacks. They can't be parried." — `mechanic:jump-attacks` · https://www.reddit.com/r/Eldenring/comments/1wj6b9z/do_i_have_to_fight_mr_i_dont_miss_a_parry_help/pag5ku2/
- "You do significantly less damage when out of MP and using L2 attacks. You're better off just doing a jump heavy, light attack or regular heavy." — `boss:fallingstar-beast` · https://www.reddit.com/r/eldenringdiscussion/comments/1w7mbnr/this_boss_took_me_way_too_fucking_long_for_that/p7wk19p/
- "Elden Ring calculates fall damage from the height you jumped to where you landed, which is why Torrent's double jump can't save you." — `mechanic:torrent` · https://www.reddit.com/r/Eldenring/comments/1wvdtg7/red_dog_suicide/pddas1j/
- "Health regen stacks with the talisman, shield, and incantations. It gets quite crazy." — `mechanic:incantation` · https://www.reddit.com/r/Eldenring/comments/1woflz8/what_do_you_guys_put_in_your_wondrous_physic_flask/pbmm051/
- "magma sorceries count as spells so Graven Mass and Godfrey's talisman stack with them for added damage." — `merchant:sorcery` · https://www.reddit.com/r/Eldenring/comments/1wipfml/i_thought_talisman_of_the_dread_was_just_another/pac6p4q/

### 3. Boss page — "Player tips" (35)
- "You can proc haemorrhage very easily on Mohg. He does get a damage boost from it… very viable strategy against him." — `boss:mohg` · https://www.reddit.com/r/Eldenring/comments/1witpgl/about_mohg_resistances_correct_me_if_im_wrong/pad416j/
- "Go get more scadutree fragments. The solitary gaol is kind of like the first Tree Sentinel — you can beat him early, or come back and dust him." — `region:scadu-altus` · https://www.reddit.com/r/Eldenring/comments/1wjocef/so_is_the_dlc_supposed_to_be_this_ball_bustingly/pak253x/
- "You can also skip DTS by acquiring 2 Great Runes and using the Deeproot Depths sending gate." — `boss:godfrey` · https://www.reddit.com/r/Eldenring/comments/1wqx6qu/it_kinda_blows_my_mind_to_think_draconic_tree/pc7qh50/
- "Parrying Consort Radahn is pretty satisfying and honestly the only way he doesn't feel like a massive pain. I do recommend it." — `boss:consort` · https://www.reddit.com/r/Eldenring/comments/1wmbrmo/tried_parry_only_run_for_the_first_time_and_here/pb5zb6n/
- "My death mage build completely cheesed [the Death Knights] with the death rancor spell." — `hunt:death-knight` · https://www.reddit.com/r/Eldenring/comments/1wjmkbl/if_you_ever_feel_useless_remember_that_the_death/pajxaf4/

### 4. PvP guide — "Counters & tech" (23)
- "Best way to counter a Leontiel gank — Sleep pots, as they take status build-up while 'dancing' in it." — `boss:leontiel` · https://www.reddit.com/r/EldenRingPVP/comments/1wk6x96/
- "These Ashes do NOT counter Leontiel's Greatsword — only if they're playing optimally… the L2 gives iframes on press then hyperarmour." — `item:leontiel-greatsword` · https://www.reddit.com/r/EldenRingPVP/comments/1w4skx5/
- "PSA: Roll *into* these spells, it breaks their tracking. Never run away or roll away." — `item:collapsing-stars` · https://www.reddit.com/r/EldenRingPVP/comments/1rw306w/
- "PSA: On most strength builds, Heavy Knight is now the optimal starting class [level table]." — `item:idus-sword` · https://www.reddit.com/r/EldenRingBuilds/comments/1w28kyz/
- "Kick the shield or use something with shield pierce (scythes, Sword of Night AoW, piercing fang)." — `item:kick` · https://www.reddit.com/r/EldenRingPVP/comments/1otfc7b/if_youre_just_gonna_block_im_just_gonna_spam_the/no476h5/

### 5. Journey/region — "Before you go" (21)
- "roll forward into the pit, not backwards." — `region:the-pit` · https://www.reddit.com/r/Eldenring/comments/1wjs4hc/my_first_time_attempting_this_fight_any_tips/pakyvdd/
- "Once you enter Limgrave, the Golden Knight on horseback is waiting… Be sure to talk to him." — `region:limgrave` · https://www.reddit.com/r/Eldenring/comments/1wsd491/finally_bought_my_first_souls_game/pck9fvc/
- "Use Icerind Hatchet to kill DTS early and get the Dragon Greatclaw (it's the only dragon-slaying weapon you don't have to kill anything for)." — `hunt:flying-dragon-greyll` · https://www.reddit.com/r/EldenRingBuilds/comments/1wf068g/
- "Mohg Palace xp loop: with Sacred Relic Sword, 30-second 50k runes." — `grace:prayer-room` · https://www.reddit.com/r/Eldenring/comments/1wkzhde/
- "You can get a weapon to +9, several to +7, and two unique spirit ashes to max before hitting Altus (Ranni's quest)." — `grace:altus-plateau` · https://www.reddit.com/r/Eldenring/comments/1wpqhva/rannis_quest_realisation/pbzpj6b/

### 6. Bug page — "Known issues / patched-out" (15) — marginal
- "Cool bug with Leontiel's Greatsword: equip it left hand, talisman right, two-hand and use the AoW — the talisman sticks to the tip." — https://www.reddit.com/r/Eldenring/comments/1wkk5r0/
- "Equipping and hiding a helm in the status menu leaves a floating head and underwear." — `item:gold-tattoo-arm` · https://www.reddit.com/r/Eldenring/comments/1wxspos/
- "Incantation combo exploit (not sure if it's intended) — 'ryandarkballs of cheese'." — `mechanic:incantation` · https://www.reddit.com/r/EldenRingPVP/comments/1p04m4h/
- "Howl of Shabriri isn't self-proccing madness properly with a +10 Dragon Communion Seal." — https://www.reddit.com/r/eldenringdiscussion/comments/1ux89s6/
- "New tumblebuff applies status to weapons that normally can't and procs almost instantly — spam anyone with an infusable bow." — https://www.reddit.com/r/EldenRingPVP/comments/1wy541c/

### Not worth a placement
- **Quest "Missable warning" (3):** only three hits, mostly false positives (a lore post and a
  duplicate "where to find the 8 new weapons"); the corpus simply doesn't warn about missables.
- **PvP build "Counters" (3)** and **Quest "Notes" (3):** too few and low quality.

---

## 4. `player-questions.json` — questions the app CAN'T answer

Of 6,581 questions, **3,310 are app-answerable** lookups (resolved entity + supported intent) and
**3,271 the app can't answer**. The top 30 clusters (keyword rules; `type:*` = the collector's own
intent label with no stronger match). "Worth filling" = a real content gap; "out of scope" = a
social/technical request the app should not try to answer.

| # | cluster | count | verdict |
|---|---|---:|---|
| 1 | co-op / summon help request | 712 | out of scope |
| 2 | `type:other` (untagged help requests, mostly co-op) | 560 | out of scope |
| 3 | item drop / trade request | 451 | out of scope |
| 4 | build theory-crafting ("best X for my build") | 325 | **worth filling** (build pages + recommender) |
| 5 | PvP meta (invasion levels / RL ranges) | 175 | **worth filling** (matchmaking reference) |
| 6 | platform / version / technical setup | 138 | out of scope |
| 7 | new player / how to play | 126 | **worth filling** (beginner primer) |
| 8 | bug / performance / patch | 108 | out of scope (churns) |
| 9 | rune / level-boost help | 105 | out of scope |
| 10 | offering co-op help (not a question) | 100 | out of scope |
| 11 | lore / story | 79 | **maybe** (fan-theory, no single answer) |
| 12 | `type:multi-part` | 57 | mixed |
| 13 | `type:bug-glitch` | 48 | out of scope |
| 14 | boss help / stuck (no resolved entity) | 34 | **worth filling** (coverage gap) |
| 15 | quest / NPC step | 33 | **worth filling** (quest-order tool) |
| 16 | exploration / how to reach | 29 | **worth filling** |
| 17 | PvP etiquette / behaviour | 27 | out of scope |
| 18 | `type:level` | 26 | mixed |
| 19 | other games / media (off-topic) | 24 | out of scope |
| 20 | `type:navigation` | 18 | mixed |
| 21 | `type:build-advice` | 17 | **worth filling** |
| 22 | level / progression pacing | 15 | **worth filling** (region levels) |
| 23 | `type:drops` | 13 | mixed |
| 24 | `type:ending` | 12 | **worth filling** |
| 25 | `type:compare` | 8 | maybe |
| 26 | `type:mechanics` | 8 | **worth filling** |
| 27 | `type:how-to-beat` | 7 | **worth filling** |
| 28 | `type:co-op` | 4 | out of scope |
| 29 | `type:class-build` | 4 | **worth filling** |
| 30 | `type:what-next` | 3 | maybe |

**Conclusion:** ~60% of unanswerable questions are social/technical (co-op, drops, runes, crashes,
platform) and should stay out of scope. The genuine gaps worth building are, in order:
**build recommender / "what weapon for X"**, **PvP matchmaking level reference**, **beginner
"how to play" primer**, **"what should I do next / what level" pacing**, **quest-order guidance**,
and **boss/route answers where entity resolution currently fails**. Examples:
"Best Level for PvP in 2026?", "What's the best way to build a Heavy Knight?",
"[ps5] First time back in five years… what do I do next?", "Which NG+ does the game get harder?",
"What ending should I choose?", "Where do I go from here?".

---

## Recommendations (ranked)

1. Add an **"owner-reviewed" import step**: hand/LLM-vet the 239-row shortlist (≈53% precision) →
   ~120 genuinely useful tips and drop the covered ~5%.
2. Ship the four strongest placements first: **item "How players use it" (97)**, **PvP "Counters &
   tech" (23)**, **mechanic "Player notes" (39)**, **boss "Player tips" (35)**.
3. Feed the reviewed set to **Gideon** as grounded retrieval snippets (its best use).
4. Skip quest "missable warning"/"notes" and bug pages from this corpus — the data isn't there or
   is too volatile.
5. Close the question gaps, in order: build recommender, PvP level reference, beginner primer,
   progression pacing, quest order.

---

## ASSUMPTIONS

- `entity-index.json` is treated as the app's existing page content ("what the page already says").
  Guides/`src/knowledge` are not separately diffed; the index aggregates the wiki/Fextra sections
  that back those pages, so this is a fair proxy.
- "Question = noise" is taken literally from the brief (any `?`), which costs some tips phrased as
  questions but keeps precision explainable.
- Entity-resolution artefacts (`item:wait`, `item:rest`, `damage:*`, `line:*`, `item:note-*`,
  `item:about-*`) are excluded from the "substantive entity" test; they are a collector defect, not
  real facts.
- `possiblyOutdated` rows are noise unless they carry ≥1 advice cue (a dated tip can still be valid
  if it's a mechanic, not a patched exploit).
- Precision (53%) is measured only on predicted-useful rows; recall was not measured (no full
  hand-labelled corpus), so the true salvageable total is ≥239.
- "Worth filling" vs "out of scope" for questions is my judgement; counts are keyword-cluster
  counts, so clusters overlap slightly at their boundaries.
- Nightreign rows are excluded as a different game, matching `docs/DATA-CATALOG.md`.

## Not done
- No app code or generated data changed (READ-ONLY per the brief); nothing imported.
- No recall measurement and no full 5,718-row hand-label (only the 100-row precision sample).
- The `.scratch/179/` scripts and raw outputs are not committed (gitignored).

## Brief checklist

- [x] Item 1 — every knowledge row classified (useful 239 / noise 5,479) with explainable rules; 100-row hand-check, precision ≈ 53% (≈58% lenient)
- [x] Item 2 — NEW vs covered: ≈95%+ new; only ~5% restates index facts (boss weaknesses/locations/drops)
- [x] Item 3 — placements with counts + 5 real examples each, ranked, and marked worth-it vs not
- [x] Item 4 — top 30 unanswerable question clusters with counts, split into "worth filling" vs "out of scope"
- [x] Item 5 — this report, with assumptions, not-done, and checklist

ALL ITEMS DONE
