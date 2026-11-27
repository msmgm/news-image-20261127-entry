[![make.fun](https://make.fun/badge/news-image-20261127.svg)](https://make.fun/bounty/news-image-20261127)
[![rank](https://make.fun/badge/news-image-20261127/msmgm/news-image-20261127-entry/rank.svg)](https://make.fun/bounty/news-image-20261127)
[![reward](https://make.fun/badge/news-image-20261127/msmgm/news-image-20261127-entry/reward.svg)](https://make.fun/bounty/news-image-20261127)

# The World in One Day — 27 November 2026 (make.fun Competition Entry)

This repository is the entry for the `news-image-20261127` bounty at [https://make.fun/bounty/news-image-20261127](https://make.fun/bounty/news-image-20261127) on make.fun. The goal of the competition is to sum up the world news of Friday 27 November 2026 in one newspaper front-page image.

## Entry Overview
* **Newspaper Title:** `THE WORLD IN ONE DAY`
* **Dateline:** `FRIDAY 27 NOVEMBER 2026`
* **Layout Structure:**
  * **Lead Panel:** Kuwait drone attack (with illustration).
  * **Grid of 8 Panels:** Covering Ukraine, EU summit, US Thanksgiving storms, New Zealand coalition, Britain veterans readiness, Congo Ebola outbreak, US tariff pushback, and AFP cyberattack.
  * **World-Map Strip:** Featuring exactly 6 city labels (Kuwait City, Kyiv, Brussels, London, New York, Wellington).
  * **Also on 27 November List:** 5 additional major news briefs (Niger attack, Gaza strikes, Cairo tanker fire driver detention, ECB presidency, Sanofi-Insmed buyout).

## Documentation
* **[NEWS.md](./NEWS.md):** Complete research and sourced documentation for all 14 stories, cross-referenced with multiple independent sources and including a checked and cut summary.
* **[IMAGE.md](./IMAGE.md):** Full design specification detailing canvas dimensions, aesthetic guidelines, exact text strings, and layout constraints.

## Execution (`main.ts`)
The entry script `main.ts` runs on Node 22 using standard library modules only. It copies the repository-held front-page image (`entry.png`) to `/output/entry.png` and validates that the output is a valid, well-formed PNG or JPEG image before completing.
