# Manufacturer review — 12 September 2026

Reviewed all 269 manufacturer records. The public catalogue lists 185 distinct commercial or developing companies, with 117 visually reviewed official logos. The remaining visible companies use initials until a suitable logo is verified.

Record-level decisions: 133 developing, 65 commercial, 33 research, 33 unverified, 5 inactive. Duplicate names are grouped into canonical manufacturer pages; underlying robot records and historical sources are preserved. Commercial supplier status is not a promise that every individual model is available in every region.

The reviewed policy in [review.json](../data/manufacturers/review.json) contains a decision, reason, review date, checked URLs and evidence for every record. Logo attribution is in [logos.json](../data/manufacturers/logos.json). The policy applies to manufacturer browsing, robot browsing, the matcher, homepage counts and sitemap. Hidden records remain accessible as noindex reference pages. New unreviewed manufacturers default to hidden.

Unverified means insufficient reliable evidence; it does not mean the company does not exist. Research institutions and software-only records are excluded. Announced commercial product programmes remain visible as In development.

## Gallery work paused for the requested push

The new gallery scan has saved 305 robot results and 1003 candidate images locally in .out/gallery-audit-20260912/scan.json. NEO has 36 candidates, including duplicates, accessories and video poster images. These new candidates have not been published or imported. The earlier reviewed photo additions are included in this commit.

Resume with node --import tsx .out/scan-official-galleries.ts, inspect contact sheets, approve only correct model images, deduplicate resized copies and verify browser embedding before importing. Keep source URLs and attribution.

## Checks

142 unit tests, TypeScript and production build passed. Manufacturer browser tests cover status filters, research exclusions and alias redirects. Two existing build warnings concern broad tracing in the admin scraper.
