# Visual discovery release — 1 October 2026

The homepage now follows the user's clarified product flow:

**Robot lineup → use-case map → industry/work filters → robot options → comparison → supplier contact.**

The map sits directly below the existing scale lineup. Long introductory sections and workflow-card explanations were removed from the homepage. The detailed task library, configuration sources and company assessment remain available as secondary routes.

## Implemented interaction

- 198 actual opportunity points: the existing 189 task records plus nine industry-specific examples of the four researched workflows.
- Seven colored work clusters. Task-family grouping uses a stable two-dimensional similarity projection inside each cluster and collision spreading. Positions are not ROI, readiness or usability scores.
- Clicking or keyboard-selecting a point shows the specific task and location. A list view provides the same selection without needing to use the chart.
- Industry, work type, search and reviewed-robot filters sit directly below the chart. The URL preserves filters and selected task. Map zoom and dragging help inspect dense areas.
- Filled dots have related configuration reviews; outlined dots are tasks still needing a robot review. Currently 26 opportunities link to the 20 reviewed configurations. Unrelated tasks do not inherit candidates solely to fill the page.
- Robot cards use short specification summaries, sourced exact-model photos where confirmed, and task-evidence indicators. Eight configurations have sourced product imagery; other cards use a clearly labeled class illustration, also used if a remote image fails. Source details and measurement caveats are expandable.
- Visitors can compare two to four configurations, jump to the comparison and choose a preferred configuration directly. Nominal and loaded runtime or different reach definitions remain separate measures.
- Choosing a configuration reveals the recorded manufacturer, reseller, integrator or service contacts, with published contact links, email and phone where available. Source dates, exact setup, delivery and authorization limitations remain accessible.
- Changing the selected task clears robot selections; a preference is not transferred into a different task as an implied match.

No account or requirements questionnaire is needed for this discovery-to-contact flow. No outreach is sent by the site. Existing directory organizations are not described as Sitebots partners without evidence of that relationship.

## Verification

The unit suite and final discovery regression checks passed (364 tests across 48 files). Four new browser tests exercise actual point counts, filter/list equivalence, keyboard selection, zoom, comparison limits, exact supplier routes, selection reset and mobile overflow. All 18 existing journey browser tests also passed. Desktop and 390-pixel mobile map, cards, comparison and contacts were rendered and visually inspected. The production build passed.

This is a local review branch and preview. The source-review registry remains limited to the first 20 configurations; the underlying catalogue has not been fully verified or republished.
