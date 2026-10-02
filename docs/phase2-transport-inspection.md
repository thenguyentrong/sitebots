# Phase 2: transport and inspection evidence review

Checked **2026-10-01**. The machine-readable result is [research-transport-inspection.json](../data/solutions/research-transport-inspection.json): **10 configurations**, all `reviewed_with_gaps`. This is a bounded public-source review, not an exhaustive market survey or a supplier quotation.

Technical support, task evidence and buying availability are separate. A manufacturer-supported specification is not proof of a working application. “Routine operation” below means a source describes ongoing customer use; none of these reports was independently audited. All records preserve exact configuration limits, source URLs, retrieval mode, checked date, public contacts, conflicts and unknowns.

| Configuration | Strongest reviewed task evidence | Important boundary |
| --- | --- | --- |
| MiR250 base | Reported routine transport at DENSO | Deployment uses a shelf lifter and ROEQ carts; base capacity does not certify the whole cart solution. |
| MiR600 base | Reported routine operation at Cours, Germany | Mixed-fleet evidence; exact attachment and per-model duty cycle unreported. |
| MiR1350 base | Reported routine operation at Cours, Germany | Regional official specifications conflict on mass and route space. |
| OMRON MD-650 | Manufacturer application claim | No named exact-model routine deployment established in this batch. |
| OMRON MD-900 | Manufacturer application claim | Evidence for other OMRON families was not transferred. |
| KUKA KMP 600-S diffDrive, 2023 generation | ProMat demonstration | Current historical URL displays KMP 600P. Current 600-S orderability remains unresolved. |
| Spot without Arm | Reported routine inspection at BMW Hams Hall | Case uses added inspection sensors and site integration; bare hardware is not the documented solution. |
| Spot + Arm | Capability claim and remote-control demonstration | Human intervention and semi-autonomous actions are distinct from unattended work. |
| ANYmal Generation D + inspection payload | Reported routine use in Outokumpu's inspection fleet | Exact site and currently delivered hardware revisions remain unreported. |
| ANYmal X + inspection payload | BASF site pilot | Pilot-era performance is not proof of final 2026 configuration or general availability. |

## Corrections and gaps to preserve in the product

- Keep loaded and unloaded runtime separate. The [MiR250](https://mobile-industrial-robots.com/products/robots/mir250/specifications), [MiR600](https://mobile-industrial-robots.com/products/robots/mir600/specifications), [MiR1350](https://mobile-industrial-robots.com/products/robots/mir1350/specifications) and [OMRON MD](https://www.ia.omron.com/products/family/3951/specification.html) specification pages support this distinction. Docking and charging do not prove uninterrupted inspection or transport.
- MiR1350's [German page](https://mobile-industrial-robots.com/de/produkte/roboter/mir1350/spezifikationen) and English page disagree on mass and default aisle dimensions. The registry withholds a definitive corridor value and asks for version-specific requirements.
- The [KUKA historical product route](https://www.kuka.com/de-de/produkte-leistungen/amr-autonome-mobile-roboter/mobile-plattformen/kmp-600-s-diffdrive) now describes a different product. Retain the 600-S as a historical reviewed configuration; do not silently rename it or declare discontinuation without confirmation.
- [Spot Arm technical documentation](https://dev.bostondynamics.com/docs/concepts/arm/arm_specification.html) distinguishes continuous lift from maximum lift. Combined system runtime and ingress protection remain unknown. The [AIRA example](https://www.reply.com/en/newsroom/news/aira-challenge-2024-prize-awarded-to-roboverse-reply) is a remotely controlled demonstration.
- The available [ANYmal Gen D specification](https://www.anybotics.com/anymal-technical-specifications.pdf) is dated May 2022. Its historical conditions are retained. The [current ANYmal X page](https://www.anybotics.com/robotics/anymal-x/) says 2026 specifications are forthcoming. No base ANYmal runtime, payload or mass is copied into X.
- Ex-zone marketing is not a reviewed certificate package. ANYmal X still needs the delivered version, certificate annex, temperature class, special conditions and accessory scope checked against the installation.

## German buying and service routes

[OMRON Germany](https://industrial.omron.de/de/contact) provides a manufacturer contact and a robotics/support route. [SPIE AUTOMATION](https://www.spie-automation.com/leistungen/robotik/transportroboter/) publishes MiR integration contacts in Dormagen; its technical inconsistencies and self-described partner status remain visible. [Roboverse Reply](https://www.reply.com/roboverse-reply/en) offers integration from German offices and a public inquiry route for Spot projects.

KUKA's German sales and service phone details were available in indexed official contact content, while the directly opened pages did not expose the dynamic list. These contacts are marked `indexed_only`. The reviewed [ANYbotics partner list](https://www.anybotics.com/partners/) did not identify a German reseller, so the registry uses the [manufacturer inquiry route](https://www.anybotics.com/contact-sales/) and explicitly leaves German service assignment unresolved.

No contact proves stock, authorization, delivered price or lead time. No inquiries were sent. Contact details were not copied into the existing live purchasing registry.

## Review method and next evidence requests

Research used web search and direct page/PDF reading. No shell network scraper, database write or production update was used. An indexed source is labelled separately; the Spot support page's direct 404 is retained as a conflict rather than silently treating its indexed higher payload as current truth.

Request supplier confirmation of: exact hardware/software bill of materials; current manuals and certificate annexes; attachment-adjusted working payload; loaded task endurance; site route/clearance limits; intervention and failure rates; German delivery and service terms. Review those responses before upgrading any record to a stronger configuration or deployment claim.

The JSON was parsed and checked for ten unique IDs, source references and provenance on all non-null specifications. Schema validation is run against `lib/solutions/schema.ts` as part of integration.
