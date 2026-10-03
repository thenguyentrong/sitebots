# Existing robot data and evidence profile — 3 October 2026

Completed locally on branch codex/sitebots-scope-and-evidence, based on 32f57a0. No new robot records, database changes, commits, pushes or deployment.

## New data in this pass

- MagicLab MagicBot D1: manufacturer maximum payload of 5 kg per arm; 4 h runtime with mode/load unstated; whole-robot IP42; included two-finger gripper. The separate arm-only IP50 is not used as the whole-robot rating.
- UniX AI Wanda 2.0: manufacturer explicitly states 12 kg dual-arm capacity. The existing 6 kg per-arm figure is also explicitly stated elsewhere on the same page.
- Added 38 further MagicBot D1 specification rows: dimensions, mass, degrees of freedom, reach, sensors, compute editions, battery/charging, interfaces and development support. Each retains exact manufacturer text and a source link. Conflicting sensor counts, RGB/RGB-D labels and TOPS/TFLOPS units are called out rather than reconciled by guessing.
- Corrected D1's end-effector classification from optional to gripper based on its published included two-finger gripper. Reconciled stale Booster T1/T2 Edu payload questions.
- Added a QUADRUPED-specific H2-D Flagship bundle note to that seller. The global hands-included capability remains unknown because the dossier covers other configurations too.

The five new missing values passed the importer before writing and again after the importer was strengthened. Including the earlier batch 1, 15 missing values have been filled since 32f57a0. No nonempty value in the nine protected research fields was overwritten.

## Source coverage and limitations

The frozen inventory contains 388 existing robots and 934 normalized source URLs. Processed all 893 selected URLs: 696 readable with relevant text, 54 with no useful readable specification data, 110 refused/failed, 25 PDFs requiring manual review, and 8 unsupported responses. There are 9 excluded boilerplate sources and 32 Unitree URLs delegated to the separate Unitree review.

Saved 750 readable page snapshots, 5,030 table rows and 7,485 labelled facts for review. These extracted observations are not automatically verified robot facts. This was a pass over the existing source inventory, supplemented by focused Unitree research; it is not a claim that every fact on the web was found.

The Unitree review covered 33 existing records and 65 URLs (overlaps with the main inventory, so counts are not added). All 108 initially missing fields remain unresolved for the global capability records. Twelve image-manual entries are queued with exact manual/page/asset references, including approximately two-hour H1 and H1-2 runtime statements. The HTML quote importer cannot verify image-only text. A seller-bundle inclusion claim is recorded only in the seller note.

Rivet's approximately five-hour seller runtime was deferred because the page mixes Core/Pro/Heavy arm configurations without binding the measurement to the dossier's two-Pro configuration.

After import, 1773 tracked capability gaps remain across all 388 records. The Germany buying/preorder worklist has 768 gaps. Unpublished or unverified values remain unknown.

## Robot evidence profile

Catalogue and market-only detail pages now expose configuration specifications, source kind, links, dates, operating conditions and exact quotes. The catalogue profile has expandable axis evidence, named missing data and practical questions; task evidence shows visible support status and provenance. Configuration claims, demos, pilots and deployments remain distinct. Keyboard-accessible tabs and mobile layouts were checked.

Catalogue chart scores continue to use the catalogue record; imported configuration values are shown separately, with scope stated on the page. Different variants are not merged into one score. Equal numeric values with conflicting known measurement modes are rejected by the importer, and additional sources remain separately attributed.

## Verification

- 388/388 dossiers validate.
- Full unit suite passed; focused tests additionally cover measurement bounds, conflict atomicity and source separation.
- TypeScript check passed.
- Eight focused browser regressions passed (one market-only fixture URL was corrected and rerun).
- Final desktop/mobile checks confirmed imported MagicBot D1 values, component-vs-whole-robot IP scope, preserved payload conditions, manufacturer conflicts and corrected Booster questions. No page errors or horizontal mobile overflow in those checks.

## Local review files

- .cache/research/existing-refresh/robots.csv — every existing robot and source outcomes.
- .cache/research/existing-refresh/missing-fields.csv — all 1,773 remaining tracked gaps.
- .cache/research/existing-refresh/reviewed-found.csv — five accepted new values.
- .cache/research/existing-refresh/magicbot-d1-supplementary-specs.json — reviewed supplementary table details.
- .cache/research/existing-refresh/semantic-review.json — accepted and deferred decisions.
- .cache/research/existing-refresh/manual-review-queue.csv — source failures, PDFs and unreadable pages.
- .cache/research/expanded-unitree-not-found.csv and expanded-unitree-pdf.csv — Unitree gaps and image-manual queue.
- .cache/research/expanded-data-audit.json — unchanged inventory and protected-field audit.
- .cache/research/expanded-final-ui-check.json — final rendering checks.
