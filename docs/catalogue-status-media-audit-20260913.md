# Official status and media audit — 13 September 2026

This pass checked all 572 catalogue records for availability/lifecycle contradictions, searched official sources for all 305 public base records without photos, and inspected all 79 public manufacturers without a logo. It does not establish that every specification or company is independently verified.

## Applied changes

- 143 image attachments (108 distinct source pictures); 22 records gained their first approved gallery. Existing aliases may share the same official product gallery.
- 17 official manufacturer logos added, including Ghost Robotics, Hanson Robotics, Mentee, Digit and VinRobotics. Marks were reviewed visually and trimmed for consistent sizing.
- 35 lifecycle corrections relative to the earlier saved catalogue audit, including the previously reviewed TRON 2 correction. B2 is available to order; NEO is a preorder; Luna has an official purchase-consultation route. Figure 02 has a retirement notice.
- Refreshed official Unitree, 1X, Boston Dynamics, Deep Robotics, LimX and PAL data. Official AGIBOT store prices were added for A2 Lite, X2 and D1 Ultra; quote placeholders were excluded.
- The availability projection now prefers official evidence, records source provenance, and reconciles robot lifecycle automatically. Same-day corrections update the observation.
- Third-party availability remains explicitly Reported. A checkout flag does not imply physical stock; a refundable deposit is not the full robot price. Structured offers cannot borrow stock from another seller or region.

## Image verification and repairs

All 108 new distinct photos and 17 added logos decode in Chromium (125/125). The first browser pass exposed 28 Magiclab image failures: its root image URLs redirect browsers to an English HTML page. Reviewed previews are now cached locally with original URLs and product-page credits retained in `data/assets/previews.json`. The English official page identifies the full-size gallery as MagicBot Gen1, so it is attached to that exact record.

The new photos include AGIBOT A2 Lite/A2 Ultra/A3/X2 Ultra/D1 Ultra, AIDOL, AlphaBot 2, LYNX S10, Kuavo MY, NIX S3, MagicBot Gen1/X1/Z1, Nori A3, IGRIS-C, Memo, CRUZR Y1, Omni and NAVIAI I3. NEO retains its previously expanded 38-photo gallery.

## Remaining gaps

- 283 public robot records still have no approved photo. This includes blocked or unavailable official sites, galleries not discoverable from accessible static pages, and model names that could not be matched confidently.
- 62 public manufacturers still lack an approved official logo. Some publish logos on CDNs whose robots/access responses prevent this scraper from retrieving them.
- 53 records contain reported third-party availability; these claims are labeled rather than promoted to manufacturer confirmation.
- 529 of 572 records have no manufacturer-sourced technical facts in the ledger. Official availability or an official image alone does not verify their specifications.
- 87 records retain specification conflicts for review.
- Zero fresh official lifecycle/availability contradictions remain in the final audit.
- MagicBot Gen1, X1 and Z1 now reflect their official purchase-consultation routes; public stock and delivery to Germany remain unconfirmed.

The complete per-record scan outcomes, logo errors, reviewed decisions, source URLs, lifecycle changes and image checks are in `data/audits/status-media-20260913.json`. Robots without a distributable 3D model remain valid photo-only catalogue entries.

## Verification

- Production build passed.
- 158 unit tests passed, including real PGlite projection, same-day availability correction and structured-offer regression checks.
- 16 browser tests passed. All 22 newly illustrated robot pages loaded their galleries with no page errors; the checked mobile layout had no horizontal overflow. The three Magiclab purchase statuses were also checked after the final import.
- Required G1 rendered screenshot captured at `.out/g1.png`.
- Tracked PGlite snapshot refreshed with the final data; development website runs locally on port 3000. Changes are not pushed or deployed.

## Primary evidence examples

- [Unitree B2 official store](https://shop.unitree.com/products/unitree-b2)
- [1X NEO ordering](https://www.1x.tech/order)
- [LimX Luna product and Buy Now route](https://www.limxdynamics.com/en/products/luna)
- [AGIBOT A2 Lite official store](https://store.agibot.com/products/a2-lite)
- [MagicBot Gen1 official English product page](https://www.magiclab.top/en/human)
- [Ghost Robotics official page and embedded brand mark](https://www.ghostrobotics.io/vision-60)
