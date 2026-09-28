## Quest walk-through (Task 140 §3)

Every authored line in `src/knowledge/storylines.ts` was walked beat-by-beat against the Fandom
wiki DB `quests` table (`data/raw/er-mcp.db`) and, for the DLC lines, the character pages. The
brief says "16 authored questlines"; the tree now authors **32** (`kind: 'story'`), and all were
checked. The new `src/knowledge/questlineOrder.test.ts` pins an acyclic ordering invariant for
every line plus the explicit order of the lines that were fixed.

**Result: 32 checked, 4 fixed (5 beats added, 2 beats reordered, 1 trigger corrected).**

| line | wiki order checked | finding | fix |
| --- | --- | --- | --- |
| millicent | O'Neil → Plague → Altus → **prosthesis** → **Dominula** → **Mountaintops** → Elphael → choice | prosthesis was after the Godskin fight (reversed), and the Mountaintops and Elphael Prayer Room beats were missing | reordered; added `quest:millicent:mountains` and `quest:millicent:elphael` |
| sellen | free → Azur → Lusat → report → **Witchbane Ruins** → **Three Sisters puppet** → Jerren choice | jumped from the report straight to Jerren; the true-body and Primal Glintstone beats were missing | added `quest:sellen:witchbane` and `quest:sellen:primal-glintstone`; the Jerren beat now requires the Primal Glintstone |
| yura | Nerijus → Nagakiba → **Second Church of Marika** → Shabriri | the Altus meeting was missing | added `quest:yura:altus`; Shabriri now requires it |
| gurranq | deathroot turn-ins → sanctum attack (after the 4th) → stone + vanish (after the 9th) | said he turns hostile after the ninth; the wiki attacks him after the fourth | corrected the trigger detail on `gu2`/`gu3` |
| ranni / fia / dung-eater / tanith / rya / leda / alexander / boc / nepheli / hyetta / gowry / corhyn / thops / irina / seluvis / kenneth / rogier / latenna / freyja / igon / thiollier / ansbach / ymir / patches / roderika-hewg / diallos / d-hunter / varre | matches the DB step order | no ordering error | — |

### Notes

- The `questlineOrder.test.ts` "no forward reference" check is the mechanical guard: a beat may
  require a global fact (a boss, a region), but never a fact that only a later beat of the same
  line produces. That is what would have caught the Sellen jump had the missing beats existed.
- `Millicent`'s choice steps are still terminal and mutually exclusive; the aid/betray pair is
  looked up by fact id, not by step id, so future re-numbering cannot silently swap them.
- `Gowry` remains a three-beat summary line (the wiki's own "optional" Gowry visits are folded
  into Millicent's beats); it is intentionally shorter than six.
