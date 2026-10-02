# Bounded exact-model photo follow-up

Checked 2026-10-01. Scope: KEWAZO LIFTBOT, ABB GoFa 5, ANYmal Generation D, ANYmal X and OMRON MD-900. The first pass added two source-attributed image references in `data/discovery-media/follow-up.json`. Three model-photo gaps remain. No specifications, task links, shared registry code or contact entries were changed.

## Accepted references

| Configuration | Identity evidence | Retrieval and limits |
| --- | --- | --- |
| KEWAZO LIFTBOT | The [BASF case study](https://www.kewazo.com/blog/liftbot-replaced-a-crane-at-basf) explicitly captions the selected image as LIFTBOT with its general-material platform at BASF. | Source page read through web retrieval and politeFetch (HTTP 200). The selected asset is the image beside that caption, not the unrelated news teaser or an unlabeled product-page asset. The alt text preserves the application-specific platform. |
| ABB GoFa 5 / CRB 15000 | The [manufacturer's February 2021 launch](https://new.abb.com/news/detail/74323/prsrl-abb-launches-gofa-higher-payload-cobot-for-collaborative-tasks-up-to-5kg) explicitly describes the 5 kg CRB 15000 and links the selected CRB-15000 gallery image. | Article and linked image URL read through web retrieval. A subsequent politeFetch metadata attempt stopped because robots.txt was unavailable due to a network error; there was no alternate automated retry. This historical exact-configuration image is not a claim about today's controller, tooling or delivery. |

Image identity is established by source-page context, caption and asset association. A photo does not establish performance, suitability, stock, current delivered revision or reuse permission. Browser loading/pixel inspection remains a separate integration check.

## Unfilled gaps and rejected candidates

- **OMRON MD-900:** the [MD-900 ordering-code listing](https://industrial.omron.co.uk/en/products/37370-10002) was read through web retrieval and politeFetch (HTTP 200), but its image path and alt text identify **37350-10000**, the MD-650 ordering code. The [series launch](https://industrial.omron.eu/en/news-discover/news/omron-introduces-new-md-series-autonomous-mobile-robots-for-medium-payload-range) also labels its illustration MD-650. These are not accepted as exact MD-900 photos. The current reviewed MD-900 base is 37370-10000; charger variants do not resolve the image identity conflict.
- **ANYmal Generation D:** no direct request was made after the parent reported ANYbotics HTTP 403. Indexed [case-study listings](https://www.anybotics.com/news/category/case-studies/) contain D-labelled candidates, but no unambiguous image asset for the reviewed standard inspection configuration was established in this pass. The manufacturer's [Generation D URDF repository](https://github.com/ANYbotics/anymal_d_simple_description) was also read; its README describes the model but supplies no qualifying product photograph. No Generation C or unlabelled current ANYmal asset was substituted.
- **ANYmal X:** indexed [current product evidence](https://www.anybotics.com/robotics/anymal-x/) still states that 2026 specifications are forthcoming. Its exact delivered revision remains unresolved. A [2022 specification PDF](https://www.anybotics.com/anymal-x-technical-specifications.pdf) has older imagery; that was not silently attached to the current review. The reported HTTP 403 was respected and no direct page/asset retry was made.

Next bounded actions: obtain an exact MD-900 base image with manufacturer identification; receive a readable official Generation D image reference; and reconcile the current ANYmal X revision before adding its asset. No supplier outreach was performed.

## Proposed missing IronBOT opportunity

Recommendation: add a distinct task, subject to normal catalogue review.

- Proposed task ID: `site_concrete/rebar-placement-decks`.
- English title: **Place reinforcing bars on bridge decks**.
- German title: **Bewehrungsstaebe auf Brueckenfahrbahnen verlegen**.
- Workflow: `material_handling`; industry: construction; setting: bridge-deck reinforcement.
- Suggested summary: **Lift, carry and place transverse and longitudinal reinforcing bars at the specified spacing on a prepared bridge deck. A supervisor sets the first position and spacing, separates bars for feeding, and oversees placement.**
- Candidate: `acr-ironbot-rebar-placement`, relationship `task_candidate`.
- Boundaries: tying remains a separate operation; this is not cage fabrication or evidence for every slab/site. Rail/support setup, access, bar geometry, crew responsibilities and Germany delivery need project-specific confirmation.

The [IronBOT product page and FAQ](https://www.constructionrobots.com/ironbot) explicitly distinguish automated placement from supervisor setup and bar singulation. The [Port St. Lucie project report](https://www.constructionrobots.com/news/port-st-lucie-bridge) identifies IronBOT and TyBOT working with a five-person crew in February 2023. This supports a manufacturer-reported task deployment; it does not establish unmanned operation, current German availability or universal productivity. Shared discovery/task code was not changed here.

## Validation

Both metadata entries use existing review IDs, have checked dates and absolute HTTPS image/source URLs, and their source pages already exist in their reviews' source ledgers. They introduce no duplicate IDs among the JSON media batches. The read-only solution audit passed after all parallel batch files were complete: 43 configuration reviews, 253 specification entries, 140 unique source URLs and 61 buying routes. Scoped whitespace checks passed.


## Final pass — new production and finishing records

Checked 2026-10-01. The four remaining photo gaps in these batches were Nomagic Pick, ConBotics MalerRoboter 2.0, Hundegger ROBOT-Drive 650 and Yaskawa ArcWorld CS V2-500 Y3 L1300. ABB IRB 460 and both FEEDBOT configurations already had image references and were not duplicated.

**Added Nomagic Pick.** The [manufacturer homepage](https://nomagic.ai/) has a solution card headed Pick, the image alt text "A Nomagic picking robot", and a link to the reviewed Pick product page. Both web retrieval and politeFetch (HTTP 200) confirm this association. The selected asset is `Pick@2x-768x946.jpg`; the product-page Open Graph logo was rejected. This new source URL is recorded in the photo metadata, independently of the earlier technical review ledger. The alt text preserves the existing limitation that hardware BOM, gripper and installed station configuration are project-specific. No photograph of Pack, Sort or Shoebox Picker was substituted.

No new image was attached for these three records:

| Configuration | Checked source and reason |
| --- | --- |
| ConBotics MalerRoboter 2.0 | [Current German homepage](https://www.conbotics.com/de/home), read through web retrieval and cached politeFetch (HTTP 200). It names 2.0 but its image assets lack model-specific captions, and older 2024 video/poster material also appears. The hero asset named MR Bild 2 does not by itself establish revision 2.0. The linked image could not be inspected through the web reader. Preserve the revision gap. |
| Hundegger ROBOT-Drive 650 | [Current product family page](https://www.hundegger.com/de/maschinen/abbundmaschinen/robot-drive), read through cached politeFetch (HTTP 200). The hero is labelled only ROBOT-Drive and covers 450/650/1300; layout drawings are jointly labelled 450/650. The [July 2024 brochure](https://www.hundegger.com/fileadmin/user_upload/Prospekte/ROBOT_Drive/ROBOT-Drive_DT_16_07_2024/page.pdf) was discovered in indexed evidence with a 650 caption, but no corresponding exact-model image URL was established. No family photo was promoted to a 650 identity. |
| Yaskawa ArcWorld CS V2-500 Y3 L1300 | The [2021 CS release](https://www.yaskawa.eu.com/header-meta/news-events/article/new-arcworld-cs-robot-welding-cell_n11415), read through web retrieval and cached politeFetch (HTTP 200), supplies CS/YRC1000 photos and identifies AR1440. It does not identify the reviewed V2-500 Y3 positioner and L1300 variant in those photos. The generic CS image remains a candidate, not an exact-configuration reference. |

No known ANYbotics or MD-900 blocked/conflicted candidate was retried. The follow-up JSON now contains three entries: the original LIFTBOT and GoFa 5 references plus Nomagic Pick. It was replaced atomically. All three review IDs resolve, URL/date fields are valid and there are no duplicate review IDs across the JSON media batches. The two original image source pages remain in their technical review ledgers; Nomagic's newly reviewed homepage is documented above and in its image record. No shared code or technical review was changed by this final pass.
