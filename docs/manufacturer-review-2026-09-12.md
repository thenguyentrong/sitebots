# Manufacturer review — 12 September 2026

Reviewed all 269 manufacturer records. The public catalogue lists 185 distinct commercial or developing companies, with 117 visually reviewed official logos. The remaining visible companies use initials until a suitable logo is verified.

Record-level decisions: 133 developing, 65 commercial, 33 research, 33 unverified, 5 inactive. Duplicate names are grouped into canonical manufacturer pages; underlying robot records and historical sources are preserved. Commercial supplier status is not a promise that every individual model is available in every region.

The reviewed policy in [review.json](../data/manufacturers/review.json) contains a decision, reason, review date, checked URLs and evidence for every record. Logo attribution is in [logos.json](../data/manufacturers/logos.json). The policy applies to manufacturer browsing, robot browsing, the matcher, homepage counts and sitemap. Hidden records remain accessible as noindex reference pages. New unreviewed manufacturers default to hidden.

Unverified means insufficient reliable evidence; it does not mean the company does not exist. Research institutions and software-only records are excluded. Announced commercial product programmes remain visible as In development.

## Official galleries and logo sizing

The resumed gallery review is complete: 676 official images added across 111 robot records, including 38 photos for NEO. See the [gallery audit](gallery-audit-2026-09-12.md) for coverage, sources and verification. Fixed shared logo sizing so tall and square logos fit inside their frames.

## Checks

142 unit tests, TypeScript and production build passed. Manufacturer browser tests cover status filters, research exclusions and alias redirects. Two existing build warnings concern broad tracing in the admin scraper.
