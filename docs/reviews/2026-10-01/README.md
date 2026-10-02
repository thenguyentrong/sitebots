# Catalogue review baseline

This folder contains automated triage of the committed catalogue as of 1 October 2026. It is a work queue, not a certificate that the records are accurate or current.

## Files

- [summary.json](summary.json) pins the source commit, catalogue snapshot hash and audit-input hashes, with scope definitions.
- [queue.csv](queue.csv) is the spreadsheet view of every configuration.
- [queue.json](queue.json) retains structured issue details, source links and next actions.
- [source-refresh.json](source-refresh.json) reports a separate, staged first source refresh. Those fetched records have not been imported into this baseline.

Every configuration starts with reviewStatus unreviewed. The CSV and JSON contain 572 unique configurations: 493 public and 79 hidden. Base and EDU variants remain separate.

P0 means a public record has a recorded identity, integrity or specification-conflict issue requiring early investigation. It does not mean every claim in that record is wrong. P1 covers the other public records; P2 retains nonpublic records for identity and lifecycle review. Counts for missing photos or 3D models do not determine evidence priority.

Manufacturer-tier counts describe the ledger metadata. A tier-one fact still needs review for exact configuration, meaning, date and source conditions. Purchase claim regions preserve what the source record says; GLOBAL and EU are not German-delivery claims. Contacts and curated purchase listings are a separate source to review.

## Reproduce

First generate the input audit against the committed snapshot in read-only mode. In a clean shell, set USE_LOCAL_DB=1 and NODE_ENV=production; leave DATABASE_URL and LOCAL_DB_DIR unset. Then run:

    npm run audit:catalogue
    npm run audit:review-queue -- --input .out/catalogue-audit --output .out/review-queue --as-of 2026-10-01

The helper reads local audit JSON, validates record identities and coverage, and writes reports only. It performs no network requests or database writes. The as-of date is a planning date; it does not recreate historical database state. The generated hashes identify the exact input.

Use a new output directory for later batches. Keep reviewer decisions in a separate durable review ledger rather than editing generated JSON that a future run will overwrite. A reviewed disposition must include configuration, sources, check date, findings, unresolved issues and the rationale for publication or exclusion.

See the [scope and rollout plan](../../scope-and-rollout-2026-10-01.md) for the review process and the [refresh report](../../source-refresh-2026-10-01.md) for the initial source batch.

