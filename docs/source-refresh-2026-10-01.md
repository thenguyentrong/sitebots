# Sitebots source refresh and import rehearsal

The first automated refresh ran on 1 October 2026 in Europe/Berlin (30 September in the UTC timestamps stored by the scraper). It exercised the existing official-source and seller adapters and all 18 approved generic specification pages. Results are staged locally; the published catalogue and database were not changed.

## Coverage

| Adapter | Successful page or endpoint fetches | Raw records | Raw specification fields | Raw price observations |
| --- | ---: | ---: | ---: | ---: |
| Unitree manufacturer | 4 | 9 | 124 | 4 |
| Unitree store | 1 | 30 | 4 | 21 |
| Boston Dynamics | 1 | 1 | 14 | 0 |
| Deep Robotics | 1 | 2 | 22 | 0 |
| LimX | 3 | 3 | 33 | 0 |
| Westwood | 1 | 1 | 3 | 0 |
| 1X | 1 | 1 | 19 | 1 |
| PAL | 1 | 1 | 5 | 0 |
| Approved manufacturer specification pages | 18 | 17 | 51 | 0 |
| QUADRUPED Robotics Germany | 1 | 2 | 0 | 23 |
| Génération Robots | 13 | 13 | 0 | 13 |
| OpenELAB | 1 | 1 | 0 | 1 |
| Total | 46 | 81 | 275 | 63 |

The batch also extracted 38 raw availability observations. A record is a source/model/configuration observation, not a unique robot; several records can refer to one configuration. Fetch counts include the store JSON endpoint and repeated pages handled by distinct adapters, and exclude robots.txt requests. All 46 counted fetches were fresh, not cache hits. The adapters reported no fetch errors.

Successful fetching does not establish correctness. One approved page, Galaxea Kengo, yielded zero parsed records. Its source format and approved field mapping need review. Seller adapters collect seller terms; they do not verify technical specifications.

## Import rehearsal

The pipeline was run without the commit flag against the in-memory, read-only committed snapshot. It attempted no effective database changes; the guard skipped 2,215 write statements. Adapters reported zero normalization warnings, but eight source records did not resolve to a known identity:

| Source | Unresolved subject | Required action |
| --- | --- | --- |
| Unitree store | Aliengo | Check exact family/variant aliases against official product identity |
| Unitree store | Unitree B1 | Check existing inventory and lifecycle before adding or mapping |
| Unitree store | Unitree Go | Determine whether this is a product, package or accessory; do not guess |
| Unitree store | Go1 Air | Map the exact variant only after review |
| Unitree store | Go1 pro | Map the exact variant only after review |
| Unitree store JSON | Go1 | Distinguish base/family record from named variants |
| Génération Robots | Unitree Go2X | Confirm relationship to Go2-X and exact options |
| Génération Robots | Unitree G-D | Confirm manufacturer model identity and configuration |

The rehearsal counted 274 normalized specification fields and 57 price observations for resolved records. These are would-write counts, not imported facts, new unique claims, or validated production results. Identity resolution and normalization are necessary checks but cannot replace source review.

## Immediate evidence findings

The fresh Unitree manufacturer parser returns approximately 2 kg arm maximum for G1 base and 3 kg for G1 EDU. The existing parser labels these peak values; the manufacturer's posture caveat must also be preserved before deployment assessment. Both runtime observations have an unstated operating basis. Neither establishes a six-kilogram continuous bilateral carry capacity or loaded shift endurance.

The separate [first source verification batch](source-verification-2026-10-01.md) reviews those configuration boundaries plus Spot, ANYmal and MiR250, deployment evidence, and German/EU contacts. It distinguishes directly readable pages from indexed-only leads and includes unresolved official-source conflicts.

Do not bulk-import this staging batch until the identity and interpretation issues are reviewed. In particular, a global store offer must not become German delivery evidence, seller configurations must not be merged by similar names, and newly fetched claims must not silently replace a reviewed lifecycle correction.

## Reproduce and continue

Use npm and the repository's existing scraper. The following commands use the approved fetch layer and write source records to the ignored .cache directory:

    npm run scrape -- --adapter unitree,unitree-shop,boston-dynamics,deep-robotics,limx,westwood,onex,pal --fresh
    npm run scrape -- --adapter quadruped-de,generation-robots,openelab --fresh
    npm run scrape -- --adapter maker-pages --fresh

Before a dry-run pipeline, set USE_LOCAL_DB=1 and NODE_ENV=production, leave DATABASE_URL and LOCAL_DB_DIR unset, and verify the committed snapshot is present. This boots the read-only snapshot. Do not add the commit flag to the rehearsal.

    npm run pipeline -- --adapter unitree,unitree-shop,boston-dynamics,deep-robotics,limx,westwood,onex,pal,maker-pages,quadruped-de,generation-robots,openelab

The local evidence is in .cache/records/<adapter>/2026-09-30.jsonl, the corresponding fetched-page cache, and .out/source-refresh-*.log. [Refresh metadata](reviews/2026-10-01/source-refresh.json) records source URLs, times and counts. The generic maker-pages adapter only covers its approved list; this run did not visit the official websites of all 269 manufacturers.

Next: resolve the eight identities, investigate the zero-record page, preserve source caveats and conflicting values, then compare a staged projection against the baseline before any publication.

