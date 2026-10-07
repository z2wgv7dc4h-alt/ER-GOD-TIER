# PHOTO-EVAL — PS5 photo reader (web robustness set)

Generated 2026-10-07T16:10:57.983Z by `npm run eval:photos -- --web`.

No ground truth: each photo is scored with SELF-CONSISTENCY checks (screen type detected;
status level = sum of the 8 stats − 79, stats 1–99, runes/level plausible; every read item
name resolves on the alias plane; equipment slot recognised; map registration succeeds).

Overall: **37%** of checks passed over 150 photos.

## Pass rate per check

| check | correct | wrong | missed | pass rate |
| --- | ---: | ---: | ---: | ---: |
| stats 1..99 | 25 | 22 | 0 | 53% |
| slot recognised | 6 | 0 | 6 | 50% |
| screenType | 68 | 0 | 82 | 45% |
| runes plausible | 13 | 34 | 0 | 28% |
| name resolves | 2 | 8 | 0 | 20% |
| level=sum(stats)-79 | 3 | 31 | 13 | 6% |
| registration ok | 0 | 0 | 1 | 0% |

## Pass rate per guessed screen type

| guess | photos | correct | wrong | missed | pass rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| status | 42 | 59 | 43 | 21 | 48% |
| inventory | 42 | 28 | 26 | 28 | 34% |
| equipment | 34 | 29 | 26 | 21 | 38% |
| map | 32 | 1 | 0 | 32 | 3% |

