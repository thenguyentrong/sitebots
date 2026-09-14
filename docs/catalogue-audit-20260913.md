# Catalogue audit — 13 September 2026

The audit covered **572 robot records (560 base models and 12 variants), 269 manufacturer records, every stored specification, 823 price observations and 208 availability observations**. Official-page media discovery ran for all 560 base models. Each record's coverage, sources, conflicts and remaining gaps are saved in [the machine-readable audit](../data/audits/catalogue-20260913.json).

This is a completed coverage scan, not a claim that every catalogue specification, model identity or current purchase offer has been independently confirmed. Third-party values remain labelled Reported; missing evidence remains Unknown.

## Changes

- Added **66 official images across 11 previously imageless robot records**: CloudMinds XR-4, Ginger and Cloud Ginger XR-1; DroidUp Walker 2; Galaxea Kengo; LG CLOiD; Maxtronics NAO6; STEP SYNDA R1; and HCFA YOLO-01, YOLO-02 and Mini Loong. The approved gallery catalogue now contains **1,053 images**. All new images retain their official source-page attribution.
- Added **11 reviewed manufacturer logos**. Canonical public manufacturers now have 128 logos; 79 still have no approved logo.
- Researched all **33 previously unverified manufacturer identities**. Updated 24 records, including canonical-brand relationships for ELU/Infiforce and Boshi/BoshiAC. Nine identities remain hidden pending adequate evidence. The public Manufacturers page now contains **207 canonical companies: 79 commercial suppliers and 128 developing products**.
- Hid the two unnamed Simplexity `TBD` records from browsing, matching, manufacturer counts and sitemaps. Their direct reference pages remain available with `noindex`.
- Added the country map, zoom/reset controls, desktop dragging and country filters. The map shows country-level positions; **74 companies still have no recorded country**.
- Added a manufacturer suggestion form. It prepares a GitHub issue draft for the visitor to review and submit; it does not claim to save a submission before GitHub confirms it. A GitHub account is required.
- Marked **35 incorrect fact rows invalid**, preserving their values and the reason in the evidence ledger. These rows no longer influence current specifications or verification badges.
- Corrected unit-family validation, thousands separators, kWh conversion, component-versus-total DOF, rated-versus-peak payload labels, warranty units and unsupported hot-swap claims. Corrected the matcher's mismatched payload value/measurement-basis labels and made reported or estimated payload bases explicit.
- Separated approved specification pages from gallery pages to prevent nearby product variants from supplying the wrong model's specifications. Imported reviewed HCFA specification-sheet values and registered their official sources.
- Updated manufacturer metadata in the local database and regenerated the deployment snapshot. This audit does not itself publish a deployment.

## Coverage after the audit

| Measure | All records | Public catalogue |
| --- | ---: | ---: |
| Robot records | 572 | 493 |
| Missing approved images, including base-image inheritance | 373 | 305 |
| No supported 3D model | 530 | 451 |
| At least one current manufacturer-verified specification | 43 | 43 |
| No current manufacturer-verified specification | 529 | 450 |
| Current verified specification values | 320 | 320 |

Missing images fell from **384 to 373** across the complete database. Public missing-image counts rose because the company-identity review admitted additional legitimate manufacturers and their still-incomplete models. Images were not removed merely because a robot has no 3D model.

Verified values increased from **274 to 320**. There are **87 records with conflicting claims** and **533 records missing at least one of height, weight, total DOF, runtime or IP rating**. Conflicts are preserved and shown rather than silently averaged. Twelve records have possibly duplicate names; variants and distinct source identities are retained until a safe merge is established.

The full scan found 171 base-model entries with image candidates, 333 with no usable images from their discovered pages, and 56 with no official product page located. Existing and new candidates were screened for generic site art, icons, unrelated products and mismatched variants; discovery is not approval.

## Remaining evidence gaps

[Manufacturer research decisions](../data/manufacturers/research-20260913.json) include the precise evidence and reasoning. The unresolved identities are BYD/XiaoDi, Fujian Humanoid, Fujian Newton, Huazhijian/ZERO, Jiuguang, Moon Dynamics/Lanyue Dynamics, Qihan, VLAI and West Lake Interactive.

Qihan's Robo-C2 entry is misattributed: [Promobot's official product page](https://promo-bot.ru/production/robo-c/) identifies its manufacturer. The erroneous catalogue entry remains hidden pending a proper identity migration. Moon Dynamics L1 must not borrow LimX Luna or Livsyn L1 images. A commercial manufacturer classification does not confirm every robot under its name is available to buy.

Examples of primary sources used:

- [HCFA YOLO-01](https://www.hcfa.cn/product/detail/id/152.html), [YOLO-02](https://www.hcfa.cn/product/detail/id/153.html) and [Mini Loong](https://www.hcfa.cn/product/detail/id/154.html): model-specific specification sheets and photography.
- [LG's Korean newsroom](https://www.lge.co.kr/story/newsroom/234937): five CLOiD press photos. The earlier global-newsroom image failed Chromium embedding and was replaced after visual and browser checks.
- [DroidUp Walker 2](https://www.droidup.com/product/2): official product photography.
- [CloudMinds Cloud Ginger XR-1](https://www.dataarobotics.com/zh/product-44.html): exact model imagery and identity.
- [Infiforce's ELU announcement](https://infiforce.cn/news-detail?id=1950444978815766529): company/brand relationship.

## Image access limits

Of **970 distinct pre-existing remote image URLs**, **937 decoded successfully** through the approved crawler; a transient timeout succeeded on retry. **33 remain unverified because the current crawler stops on access-denied robots.txt responses**. They have not been marked broken or removed based only on that refusal.

A proposed RFC 9309 robots.txt handling change was **rejected by automatic approval review** because it could weaken the repository's stop-on-403 policy. No such change was applied; explicit approval is still pending. The full unresolved URL list is in the machine-readable audit.

## Validation and reproduction

- Unit suite: **149 tests passed**.
- Production build and TypeScript check passed. Next.js still emits broad file-tracing warnings for the existing administration/scraper import graph; they do not fail the build.
- Browser suite: **21 tests passed**, covering the catalogue, trust/source display, variants, hidden placeholders, matching, map interaction, filters, draft submissions and indexing.
- **All 66 newly approved gallery images decoded in Chromium**, with no page errors in the final gallery/map pass. Desktop/mobile/light/dark screenshots and browser error logs are retained locally.
- Required G1 render: `npm run shot -- http://localhost:3000/robots/unitree/g1 .out/g1.png`.

Local evidence is under `.out/catalogue-audit-20260913/`, with full discovery under `.out/gallery-audit-20260913/`. These working artifacts are intentionally gitignored. The record-by-record audit and source decisions are saved under `data/` for version control.

Database-write utilities require `--commit` through `scripts/_guard.ts`. Stop the local dev server before running them against PGlite. Refresh `data/snapshot/pglite.tar.gz` after approved imports. Current correction utilities are `scripts/apply-fact-corrections.ts`, `scripts/load-reviewed-specs.ts` and `scripts/sync-reviewed-manufacturers.ts`; the read-only coverage export is `scripts/audit-catalogue.ts`.
