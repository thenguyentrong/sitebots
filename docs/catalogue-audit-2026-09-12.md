# Catalogue audit — 12 September 2026

The local Sitebots catalogue was refreshed and audited in full. It contains **572 entries** (560 base robots and 12 variants), **269 manufacturers**, **5,012 specification observations**, **823 price observations** and **208 availability observations**. The production snapshot was regenerated; no deployment was made.

The searchable report and CSV exports are in [`.out/catalogue-scan-20260912/report.html`](../.out/catalogue-scan-20260912/report.html). Each robot includes current values, provenance, conflicts and missing-data flags. Raw JSON exports are under `after/` in the same folder. This is an automated structural audit with targeted manufacturer and visual verification, not manual certification of every third-party value.

## Changes

- **35 new approved manufacturer photos.** The full scan revisited 478 candidates after skipping 84 already-approved entries; 63 proposed images were visually reviewed. CL1 and the corrected CASBOT identities were reviewed separately. Final browser checks withheld three MagicLab images that redirect to HTML and one S10 image whose transfer repeatedly stalled. LimX OLI, Luna and TRON 1 use tested manufacturer CDN images. Photos remain credited and hotlinked.
- **Three new LimX models**, pinned to upstream commits with Apache licence text and notices: [TRON 1](https://github.com/limxdynamics/tron1-robot-description/tree/5b97add1f3b461c9ed26ff2ff2f5025cc6ee4316), [OLI](https://github.com/limxdynamics/humanoid-description/tree/97b2174054103f9f7085ec1e3533972e4d0f2a50), and [Luna](https://github.com/limx-luna/luna-description/tree/1f4798c753d8290d7fc123215f2315be27b0ad2e). TRON 1 shows the sole-foot configuration, OLI excludes optional hands, and Luna uses the serial URDF approximation. Joint controls pose the geometry; they do not simulate closed-loop mechanisms or train robots.
- Added configuration-aware manufacturer parsing for [OLI](https://www.limxdynamics.com/en/products/oli/spec), [Luna](https://www.limxdynamics.com/en/products/luna/spec), and [TRON 1](https://www.limxdynamics.com/en/products/tron1/spec). Upper bounds and foot-dependent motion limits retain their qualifiers.
- Corrected BRUCE's preferred weight from a third-party 48 kg claim to the manufacturer's **4.8 kg**. The new Westwood adapter preserves the competing claim as a conflict. [Westwood product specification](https://store.westwoodrobotics.io/product/bruce-humanoid-open-platform-16-dof-kid-size-biped-robot/)
- Merged the two CASBOT 02/W1 rows mistakenly filed under Zerith into their existing CASBOT identities, preserving fact and price history. Old URLs redirect. Corrected [Zerith](https://www.zerith.com/) and [CASBOT](https://casbot.tech/) websites and the TARS company site linked by [HSG](https://www.hsgcap.com/companies/tars/); the unrelated UPV rover team is no longer its maker website.
- Current-value selection now uses the latest observation per source URL, field and qualifier. Genuine source disagreements and the historical ledger remain intact. Index failures become recorded partial runs rather than interrupting the pipeline without a completion result.

## Remaining gaps

| Check | Before | After |
|---|---:|---:|
| Entries | 574 | 572 |
| No approved image | 447 | 415 |
| No approved 3D model | 535 | 530 |
| Rows supported by a model | 39 | 42 |
| No tier-1 specification observations | 552 | 546 |
| Conflicting specifications | 83 | 84 |
| No manufacturer website | 203 | 199 |

There are 66 entries with no spec observations, 533 missing at least one of height, weight, total DoF, runtime or IP rating, and 12 possible duplicate-name entries requiring identity review. Core-field applicability varies by robot. The baseline audit's qualified-runtime and curated-source URL checks were corrected, so their old counts are not comparable. Broad numeric checks do not detect every plausible-looking error, as the BRUCE weight illustrates.

All 14 existing source adapters were attempted; HumanoidHub's sitemap timed out after four attempts and its prior data was retained. LimX and Westwood subsequently completed successfully, for 16 attempted adapters overall. Fresh unresolved source identities remain in `.cache/unresolved.jsonl` for review.

The model search queried **271 manufacturer names** from both alias files, including two without catalogue rows. It retained 57 repository leads. Of these, 25 have permissive repository-level licence metadata and 22 also match an owner-name heuristic. Neither flag proves ownership or mesh redistribution rights. Search coverage is bounded by GitHub indexing and per-query candidate limits.

- [ALLEX mesh licence](https://github.com/wirobotics-rih/allex_model/blob/main/MESHES-LICENSE) prohibits mesh redistribution despite BSD repository metadata; it was not copied.
- [TRON 2 asset notes](https://github.com/limxdynamics/tron2-robot-description/blob/main/ASSETS.md) and [third-party notices](https://github.com/limxdynamics/tron2-robot-description/blob/main/THIRD_PARTY_NOTICES.md) leave STL provenance unresolved.
- VinRobotics VR_M3_1 was not assigned to District 1 without a verified identity match.
- A [BRUCE-OP simulation source](https://github.com/Westwood-Robotics/BRUCE_simulation_models) was found but not converted in this pass. Other leads include existing supported models, unrelated robots and packages awaiting asset review.

The existing-image check tested 298 remote URLs: 264 passed, 33 were unverified because robots.txt returned 403, and one timed out. Those 34 are not confirmed broken images. New photos were tested separately in a browser; M20 passed a longer retry. See `media-health.json`, `new-image-browser-check.json`, `image-retry.json` and `final-image-corrections.json` for evidence.

## Verification and recovery

- `npm test`: **138 tests passed** across 18 files.
- `npm run build`: passed. Two existing file-tracing warnings remain in the admin scraper dependency graph.
- Browser geometry audit: **35 model entries and 91 poses passed**. Prior viewer interaction tests cover zoom, rotate, pan, reset, preset views, joint sliders, expansion, retries and touch controls.
- The G1 page was rendered after the viewer changes. Final LimX page/photo and CASBOT redirect checks are recorded in `browser-verification.json`.
- The searchable report was browser-checked: all 572 rows, robot search, the 415-row missing-image filter and no JavaScript errors.

The original database is preserved at `C:\dev\sitebots\.out\catalogue-before-20260912-db`. The scan workspace is `.out/catalogue-scan-20260912-db`; `.pglite` and `data/snapshot/pglite.tar.gz` contain the final local catalogue. Never open one PGlite directory from two processes. Stop the dev server before auditing the live directory, or use a separate `LOCAL_DB_DIR`.

Reusable commands: `npm run audit:catalogue` and `npm run audit:media`. Database-writing scripts still require `--commit`. All scraping uses the shared robots, pacing and caching helpers.
