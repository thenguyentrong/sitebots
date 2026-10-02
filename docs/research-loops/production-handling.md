# Production and handling evidence loop — 2026-10-01

This batch adds eight named configurations, thirteen explicit links to twelve existing tasks, and five attributed product images. A candidate link means the published application supports a useful comparison; it is not site acceptance or a purchasing recommendation. Seven links cover only part of the recorded task.

| Configuration | Supported scope | Main unresolved question |
| --- | --- | --- |
| Robotiq AX20 | Prepared-carton palletizing with a seventh axis | The German module listing excludes the UR arm and contains conflicting payload, rate and pattern counts. |
| ABB IRB 460-110/2.4 | Fixed palletizing; optional claw application for bags | Controller generation, complete cell, mixed-product recognition and actual grip cycle. |
| FEEDBOT F-500 | Inserting prepared studs/plates into a framing station | Product-page and indexed brochure cross-section envelopes disagree. |
| FEEDBOT W-500 | Sheathing placement/fixing with a WALLTEQ M-300 | Public page gives no complete board mass/material envelope; adhesive application is not evidenced. |
| WALLTEQ M-300 | Nailing/stapling and selected cutting/trimming | Installed heads, approved fastener pattern, material and tool-specific depth limits. |
| ROBOT-Drive 650 | Factory CNC timber cutting, drilling and jointing | Tooling, stock handling, accepted tolerances; 450/1300 figures and optional spindle ratings remain separate. |
| ArcWorld CS V2-500 Y3 L1300 | Welding prepared, clamped subassemblies | Current package revision, fit/fixture and procedure; it does not place loose attachments. |
| Nomagic Pick | Presented-bin piece picking; supplier-reported Fiege batch-picking application | Exact arm/gripper/software BOM is unpublished; kit completeness and small-fastener handling remain unproven. |

The records contain 21 source entries, 44 specification entries, nine published buying routes, and explicit conditions and gaps. Saved comparison evidence is 696–1169 characters per record, below the existing 4000-character limit. The checked date is the observation date, not a document publication date or a delivery commitment.

## Retrieval and identity controls

Official HTML was read through the repository’s robots-aware, cached `politeFetch`. The ABB product and German contact pages were read through the research browser; the local crawler stopped when its robots fetch was unavailable. No refusal was bypassed. The Robotiq September 2025 product sheet and Yaskawa June 2023 brochure were read through the research browser. The larger FEEDBOT brochure exceeded the research tool’s size limit: its differing section dimensions remain an **indexed-only** conflict, never upgraded to directly verified specifications.

The German AX20 seller was checked against its [exact article 5GREL136](https://jk.de/Robotiq-Palletizer-AX20/5GREL136) and legal identity. Its headline/body/table disagree, and its download list includes a different PE10 sheet; this review instead uses the [manufacturer AX20 comparison column](https://robotiq.com/hubfs/PAL_Product_Sheet_EN_Recto_Verso_WEB.pdf). The seller’s photo may include an arm although the offered module excludes it. Authorization was not independently established. Manufacturer contacts were recorded for Germany where published; Robotiq’s own European contact is in France and does not alone establish German delivery.

Five image URLs were taken from exact product pages/listings with attribution. Generic logos, mixed ROBOT-Drive size illustrations, and family-level ArcWorld photos were omitted because they do not establish the selected variant. Images stay on their original host; no media files were downloaded.

## Task boundaries

The timber records map only to the named factory operations. They are not attached to on-site timber screws, glulam transport, whole-wall lifting, arbitrary debris clearing or complete window installation. Bag palletizing only partially addresses mixed bagged-goods picking. Welding only partially addresses fitting/tacking, with the small cell envelope visible. Nomagic picking does not establish counting, sealing, labelling or final kit verification.

## Validation and next evidence

`ReviewBatchSchema`, every linked task ID and every per-review source reference passed. Each record converts through `optionFromReview`; the shared `audit:solutions` passed with all records available at validation time. No database, snapshot, company outreach, order or deployment was performed.

Next loop: obtain the current F-500 signed technical sheet; freeze AX20 complete BOM/software and reconcile seller specifications; request exact W-500 board limits; obtain current L1300 installation drawings; and test representative kits/bags/boards with recorded failure counts, recovery labour and acceptance criteria. Stock, installed price and commissioning dates require quotations and remain unknown.
