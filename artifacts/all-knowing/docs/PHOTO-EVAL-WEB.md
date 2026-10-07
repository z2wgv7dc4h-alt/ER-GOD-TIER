# PHOTO-EVAL — PS5 photo reader (web robustness set)

Generated 2026-10-07T16:26:32.274Z by `npm run eval:photos -- --web`.

No ground truth: each photo is scored with SELF-CONSISTENCY checks (screen type detected;
status level = sum of the 8 stats − 79, stats 1–99, runes/level plausible; every read item
name resolves on the alias plane; equipment slot recognised; map registration succeeds).

Overall: **39%** of checks passed over 150 photos.

## Pass rate per check

| check | correct | wrong | missed | pass rate |
| --- | ---: | ---: | ---: | ---: |
| stats 1..99 | 25 | 24 | 0 | 51% |
| screenType | 68 | 0 | 82 | 45% |
| slot recognised | 3 | 0 | 5 | 38% |
| runes plausible | 18 | 31 | 0 | 37% |
| name resolves | 2 | 10 | 0 | 17% |
| level=sum(stats)-79 | 8 | 27 | 14 | 16% |
| registration ok | 0 | 0 | 1 | 0% |

## Pass rate per guessed screen type

| guess | photos | correct | wrong | missed | pass rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| status | 42 | 65 | 37 | 21 | 53% |
| inventory | 42 | 30 | 25 | 29 | 36% |
| equipment | 34 | 28 | 30 | 20 | 36% |
| map | 32 | 1 | 0 | 32 | 3% |

## Common failure patterns

| first failing check | photos | examples |
| --- | ---: | --- |
| screenType | 82 | unknown 1080x607 001-status.png; unknown 1505x638 003-status.png; unknown 800x450 006-status.jpg |
| level=sum(stats)-79 | 41 | status 1080x929 002-status.png; status 3840x2160 012-status.png; status 3024x4032 014-status.jpg |
| name resolves | 9 | inventory 1266x711 042-inventory.jpg; inventory 3024x4032 057-inventory.jpg; inventory 3024x4032 061-inventory.jpg |
| runes plausible | 5 | status 640x1413 000-status.jpg; status 1080x1843 007-status.jpg; status 2560x1440 048-inventory.png |
| slot recognised | 5 | equipment 1080x1920 077-equipment.jpg; equipment 1080x1440 078-equipment.jpg; equipment 1080x701 080-equipment.jpg |
| registration ok | 1 | world-map 3840x2160 133-map.jpg |

- Unclassified (screen type undetected): **82** of 150
- Read names that did not resolve on the alias plane: **10** — e.g. "found ty with in some the world.", "hed Bn a", "I “=v La IN saE—y ean", "(8 Ib (94 - LN +4 SIE 1", "Suet", "Assassin's Effect: hits Cerulea restore", "‘Ada ga ‘BAMA a", "Equipped Armaments Cross-Naginata"

