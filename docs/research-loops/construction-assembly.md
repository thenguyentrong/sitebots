# Construction research loops — batch A

Checked 2026-10-01. Seven configuration reviews, 39 specification fields (29 manufacturer-supported statements, two seller-reported fields, eight explicit unknowns), nine public contact routes, seven links covering six existing tasks, and six manufacturer-page image references.

This is a bounded research batch, not an exhaustive market catalogue or site-suitability approval. Manufacturer-supported means a directly read manufacturer statement; it does not mean independently tested performance. Historical deployment configuration and current offered configuration are kept separate.

## Pass 1 — discover and check exact products

- [Hilti Jaibot](https://www.hilti.de/content/landing-page/local/jaibot-semi-automated-drilling-robot): German application/enquiry page, two dated feature releases, US endurance statement and a named production case reviewed. Current orderable SKU and complete tooling envelope remain unconfirmed.
- [Dusty FieldPrinter 2](https://support.dustyrobotics.com/hc/en-us/articles/52682349645851-FieldPrinter-Specs): current FP2 support specification, platform overview, application page and sales/support routes reviewed. German procurement is not established.
- [HP SitePrint](https://www.hp.com/de-de/printers/site-print/layout-robot.html): German manufacturer pages, project reports and [NESTLE listing](https://g-nestle.de/en/products/markierroboter/26101000) reviewed. Optional precision hardware is not silently included in the base system.
- [ACR TyBOT](https://www.constructionrobots.com/tybot) and [IronBOT](https://www.constructionrobots.com/ironbot): current product pages, supervisor responsibilities, published project records and quote route reviewed. Tying and bar placement are distinct configurations.
- [KEWAZO LIFTBOT](https://www.kewazo.com/product): current product/FAQ, German corporate contact and [BASF use report](https://www.kewazo.com/blog/liftbot-replaced-a-crane-at-basf) reviewed. Transport is only part of scaffold erection/dismantling.
- [FBR Hadrian](https://www.fbr.com.au/view/hadrian): the current offer uses this name. Historical Hadrian X demonstration references are retained with a revision-equivalence gap; they are not relabeled as current-version routine production.

## Pass 2 — resolve conflicts and separate measurements

The JSON preserves Jaibot's differing minimum-height statements, FP2 resolution disagreement and ingress-equivalence wording, HP's contradictory obstacle guidance and conditional precision package, and inconsistent aggregate figures on the ACR case page. Unresolved values remain null. Material-throughput figures are never substituted for lifting capacity; active production rates are not shift output.

The HP and ACR linked specification PDFs could not be read through the web reader; these ledger entries are unavailable and support no verified value. Dusty support content was read through web retrieval before a later metadata request through politeFetch returned HTTP 403; the refusal was respected. The supported product-domain application page supplied the FP2 image reference. No blocked endpoint was retried through an alternate fetch path.

## Pass 3 — audit task links and buying routes

The explicit links cover overhead installation-hole drilling, slab layout, horizontal mat tying, scaffold erection/dismantling transport, and masonry wall placement. LIFTBOT links are partial_task and spell out the remaining human work.

IronBOT has no link: the existing tasks cover slab tying and cage construction, not its bridge-deck bar-placement operation. We also declined to generalize Jaibot into lift-shaft access or insulation-anchor setting, layout printers into unprepared road stakeout, and Hadrian into arbitrary masonry-saw work.

German enquiries are available for Hilti, HP/NESTLE and KEWAZO. ACR, Dusty and FBR have public manufacturer contacts but no confirmed German delivery/service route in this batch. NESTLE's own service-point statement is kept separate from manufacturer authorization. No enquiries were sent.

## Images and remaining gaps

Six metadata entries point to identified official product-page assets. They do not establish a reuse licence, delivered options, availability or deployment evidence. LIFTBOT's unlabeled asset was left out pending visual identification. Media render/download validation is separate from source-page identification.

Next useful checks: exact quotations/manuals and current revision identifiers; German conformity and project acceptance documents; platform-specific lifting limits; comparable complete-process productivity; local service/trial terms; and an explicit bar-placement use case for IronBOT.

## Validation

ReviewBatchSchema passed for all seven records. Every new link resolves to an existing task and review, and every link source resolves within that review. All six media source pages are present in their configuration's source ledger. No database, existing contact registry, shared workflow/schema, application code or live deployment was changed by this batch.