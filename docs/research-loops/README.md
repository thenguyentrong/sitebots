# Research expansion — 1 October 2026

## Current scope

The public site includes humanoids, robot dogs and mobile manipulators, with Map and List views. Mobile transport (AMR/AGV) was removed from public browsing at the user's request; its research data is retained. Mobile platforms were briefly hidden by an overly narrow browsing filter and have been restored; no research records were deleted. The wider research below remains archived; its counts do not describe currently visible results. The ten requested loops completed 29 configurations and 236 specification fields; see ten-loops-progress.json and loop-01.md through loop-10.md. Public scoping is centralized in lib/browse-scope.ts.

## Earlier expansion baseline

The local app now has 43 configuration reviews across 13 workflows, up from 20 across four. Three parallel research batches added 23 exact configurations; a follow-up pass added 30 manufacturer-supported specification fields to five existing reviews and expanded sourced imagery from eight to 37 configurations.

## Published coverage

| Measure | Result |
| --- | ---: |
| Visual opportunities | 201 |
| Opportunities with reviewed candidates | 42 |
| Explicit task-to-configuration links | 45 |
| Reviewed configurations | 43 |
| Recorded specification fields | 253 |
| Manufacturer-supported fields | 220 |
| Seller-reported fields | 2 |
| Explicit unknown fields | 31 |
| Buying/contact routes | 61 |
| Organizations in canonical contact registry | 42 |
| Distinct review source URLs | 141 |
| Configuration image references | 37 |
| Recorded source conflicts | 70 |
| Open research questions | 128 |

The three added map opportunities cover bridge-deck rebar placement, prepared-carton palletizing and warehouse bin picking. They extend the existing 189 assessed bilingual tasks and nine industry workflow variants. They do not acquire a suitability verdict merely by being plotted.

## Research and verification passes

1. Construction assembly: Jaibot, FieldPrinter2, SitePrint, TyBOT, IronBOT, LIFTBOT and Hadrian. See construction-assembly.md.
2. Construction finishing/demolition: ConBotics2.0, separate NOVA-S wall/ceiling configurations, OkiboEG7, Canvas1200CX, Brokk110/300 and DXR145. See construction-finishing.md.
3. Production/handling: AX20, IRB460, FEEDBOT F-500/W-500, WALLTEQ M-300, ROBOT-Drive650, an exact ArcWorld CS configuration and Nomagic Pick. See production-handling.md.
4. Existing-model enrichment: sourced eight additional core photos and30 manufacturer fields covering dimensions, mass, temperature, clearance, charging, standby, mounting, repeatability and tool speed. Values retain units, conditions and manufacturer citations.
5. Photo follow-up: exact LIFTBOT, GoFa5 and Nomagic Pick references; rejected uncertain sibling/generation imagery. See media-follow-up.md.
6. Resumable source loop: all141 ledger URLs processed in40/60/40/1 batches.118 were retrieved or available from the compliant cache;23 were unavailable or refused. Redirects include the historical KUKA600-S page now targeting600P; configurations remain separate.
7. Image loop: all37 remote image references checked.21 decoded through the compliant crawler;16 were refused or inaccessible through that route. This is not a claim that16 images are broken in browsers. Real-page rendering confirmed both layout robot photos, three painting photos and the AX20 photo; one ABB card used its explicit fallback.

## Matching and interface corrections

The discovery cards show task-specific candidate/partial-task reasons and source links. Details expose every recorded specification. Main card metrics now follow the workflow: layout accuracy for layout robots, working height for finishing, reach/mass for demolition, and appropriate payload/dimensions for handling.

Broad family matching was removed for unsupported long-bar feeding, pipe/beam loading, plaster-bag emptying and unfinished-site transport. Small-part machine-tending arms remain linked to the clean prefabrication station; the two indoor AMR transfer tasks explicitly cover only travel, with loading, shelf retrieval and handoff limits retained. Saved library assessments use exact links and preserve partial-task exclusions in comparison evidence and printed briefs.

Product photos now appear in discovery, the reviewed configuration list and full reviews. Missing or failed photos visibly use class illustrations. Published buying routes include the original source, checked date, exact package, market and availability caveats. No supplier enquiry was sent.

## Repeatable commands

- `npm run audit:discovery` regenerates coverage, configuration gaps, unmatched tasks, source queue and legacy inventory queue under `.out/research-coverage/`.
- `npm run research:refresh -- --limit 40` processes the next unobserved source batch and checkpoints every result. Repeating the command continues until the source queue is exhausted; it does not retry refusals or automatically approve extracted claims.
- `npm run research:refresh -- --images --limit 100` checks newly added image references.
- `npm run audit:solutions` validates identities, citations, semantic fields and every task-context saved-plan conversion.

No research command connects to a database. The guarded legacy scraper pipeline remains a separate staged workflow. All automated source/asset retrieval uses the repository's robots-aware, paced, cached fetch layer.

## Validation and remaining work

369 unit tests,23 browser journey checks,189 pinned task records and production build passed. Desktop1440px and mobile390px renders reported no page errors or horizontal overflow. The required G1 page rendered successfully.

159 map opportunities still have no reviewed candidate. Six reviewed configurations lack a confirmed model-specific photograph; the progress JSON lists them. The broader572-record inventory remains an unverified research queue, with533 records missing core data in the stored audit. The inventory audit counts363 without their own image assets; the earlier351 missing-image issue count excludes12 records using borrowed imagery. These are different definitions, not newly lost images.

The tracked catalogue snapshot remains unchanged: SHA256 `f6d8fd59972c791ce8b20ec8ba3f6a56765db26b53bf7d703098aee5db112d06`. Changes are local and have not been deployed.
