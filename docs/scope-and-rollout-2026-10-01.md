# Sitebots scope and phased update plan

Sitebots will help a company discover physical tasks that could benefit from automation, define its own version of a task, and compare complete solutions using current evidence and purchasing routes. The approved scope is physical work across industries and robot types.

The starting experience is a broad task library. A company can browse without registering or completing a long questionnaire, filter progressively, and supply detailed requirements only after finding a relevant task. The result is a shortlist and a pilot brief with reasons, sources, missing evidence and supplier contacts.

Scope agreed on 1 October 2026. This document defines the next product release and its implementation sequence. The scope/audit foundation and the Phase 1 and Phase 2 local releases are complete; see their dated implementation records below. The full catalogue review, further industry coverage and production release remain outstanding.

## Two connected product goals

1. **Discover and define an opportunity.** Show the range of physical work, help the company narrow it, and turn a general example into its own task with workload, environment, objectives and constraints.
2. **Choose an evidence backed solution.** Compare suitable robot configurations and simpler alternatives for that task, check what has actually been demonstrated, and identify who can supply, integrate and support it in Germany.

A catalogue entry, a technical specification, a sales listing and a successful deployment answer different questions. Sitebots must retain that distinction throughout the journey.

## Scope and boundaries

Include humanoids, mobile manipulators, quadrupeds, AMRs and AGVs, industrial arms, cobots, dedicated task robots and integrated cells. Keep manual work and process changes as comparison options. Describe an integrated solution through its platform, tools, sensors, software, interfaces, operator responsibilities and service package.

Industry, task, environment and robot type are separate dimensions. Construction remains a detailed industry section with its existing STLB-Bau and LV references. These references must not become requirements for a warehouse, hospital or farm task.

Start the industry taxonomy with construction and infrastructure; manufacturing and assembly; warehousing and logistics; facilities and commercial buildings; energy and utilities; agriculture and food production; retail and hospitality; healthcare logistics and laboratory support; waste and recycling; mining and heavy industry. These are proposed editorial groups, not claims of verified coverage. Industries may share the same canonical task. Aerial or marine inspection can be added as a specialized platform class when there is configuration-specific evidence; the schema must not force it into a humanoid category.

Physical work means sensing, moving, handling or processing things in the real world. Software-only AI assistants are outside this release. Clinical procedures, public-road operation, explosive atmospheres and other specialized environments require dedicated assessment modules; the generic screen cannot establish suitability for them.

“All use cases” means all published task families and examples remain discoverable, including those suited to established machines and those still exploratory. It cannot honestly mean every possible task in the world has already been enumerated. Publish coverage by industry and family, show gaps, and provide “Describe my own task.” Do not manufacture hundreds of verified-looking examples to fill a grid.

## The company journey

| Step | What the visitor sees | What Sitebots asks or explains |
| --- | --- | --- |
| Explore | A welcoming overview of physical work, with task families, useful examples and an optional industry filter | No account or mandatory company form. Suggested headline: “Find work that robots could help with.” |
| Narrow | Industry, work family, process step and environment filters with counts | Filters may be applied in any order. Explain excluded results; keep a visible clear/reset action. |
| Understand the cluster | Groups such as moving materials, inspecting assets, tending machines or cleaning surfaces | State why tasks are grouped. Show documented deployments, pilots, demonstrations and exploratory ideas separately. |
| Choose a task | A concrete action, object, start/end state, context and alternatives | Show requirements and evidence without presenting a humanoid verdict as a verdict for all automation. |
| Make it mine | A short company-specific assessment | Ask only questions that can change this task's solution fit. Allow “Unknown” and ranges. Save each answer with its source. |
| Compare solutions | Complete configurations, the current process, advantages, blockers and evidence gaps | Compare the same outcome. Explain whether each requirement is supported, blocked or unconfirmed. |
| Plan the pilot | Shortlist, rough costs, supplier contacts, open questions and measurement plan | Make the next action clear: collect a measurement, request a quote, test a configuration or select an alternative. |

Use a deterministic taxonomy and filters for the first release. This avoids an API call on every interaction and makes clustering explainable. Later semantic search may help map a company's wording to known tasks; it must not generate specifications or certify a task.

Keep public library data separate from private company inputs. Begin with the existing browser-local workspace and export/import. Before adding team accounts or uploads, define access rules, retention, sharing and deletion. Saving a company estimate must never add it to the public library.

## Task library and clustering

Use one canonical task archetype plus context-specific examples. “Move loaded totes between workstations” can have manufacturing, warehouse and construction examples with different floors, routes and handoffs. Preserve the differences instead of duplicating an identical record or inheriting favorable conditions.

Proposed families are transport and delivery; picking and kitting; loading and unloading; machine tending; assembly and fastening; inspection and measurement; mapping and documentation; cleaning and sanitation; surface processing; sorting and recycling; cultivation and harvesting; and assistance and handling. Reconcile these with the existing twelve families before adding IDs.

Progressive facets should include industry, process/family, object/material, indoor/outdoor, floor and route, workload and load range, human interaction, desired operator mode, evidence maturity, and purchase/support market. Robot shape is an optional later facet. Unknown requirements remain visible.

Clusters are based on named shared properties. Start with task family and environment, then offer mass versus variability or value versus deployment readiness when sufficient inputs exist. Show the underlying tasks and counts, and provide a list/table equivalent. Do not use an unexplained numerical score or an attractive robot picture as a readiness signal.

A task record needs: action and outcome; object/presentation; process boundaries; applicability; baseline; dimensions/mass; route or reach; force/tolerance where relevant; cycle time and volume; environment; error consequences; human involvement; plausible solution classes; evidence; unknowns; and the next measurement. Every assumed value remains labelled.

## Company specific questions

Collect optional company context once: industry, country/sites, broad objectives and timing. Then ask a small task-dependent set.

- Transport: loaded mass and dimensions, trips per shift, route distance/width, floor/ramps/stairs, handoff height, doors/lifts, traffic and exceptions.
- Inspection: what must be measured, detection quality, sensor access, route conditions, frequency, reporting interfaces and who responds to findings.
- Manipulation: object variation and presentation, gripper/tool, required force/reach/precision, cycle time, machine interfaces, exception handling and operator involvement.
- Cleaning or surface work: material/contaminant, area and finish, contact forces, water/chemicals/dust, obstacles, work windows and acceptable residuals.

Do not ask the visitor to specify a robot before understanding the job. Budget and timing narrow feasible delivery options; neither proves technical fit. Existing equipment establishes the baseline and opportunity cost.

## Evidence and catalogue policy

Keep four independent assessments: technical fit for the stated requirements; demonstrated performance for that task/configuration; commercial access in the relevant market; and integration/support readiness. A failure in a critical requirement cannot be averaged away.

Evidence stages should include idea/analyst hypothesis, manufacturer claim, controlled demonstration, site pilot and routine operation. Add source independence, operating conditions, period/cycles, success/intervention denominators and known limitations. Manufacturer case studies remain manufacturer-published evidence. Missing measured outcomes stay missing.

Maintain exact platform generation, SKU, base/EDU variant, hands, payload module, battery, software and operating mode. For each specification, retain raw text, normalized value/unit, meaning, conditions, source, publication/revision date when known, observation date and reviewer decision. One-arm peak, two-arm continuous, mounted payload, towing and carrying while walking are different quantities.

Show useful default views:
- **Solutions to investigate:** documented applications with visible gaps and local buying routes where sourced.
- **Research and emerging platforms:** prototypes, research kits, preorders and demonstrations.
- **All catalogue records:** the full inventory, with evidence status and conflicts.

These are browsing modes, not universal usability verdicts. A research platform can be purchasable; a commercial product can still be unsuitable for a particular job. Preserve historical claims and invalidation reasons instead of deleting inconvenient evidence.

Replace misleading universal scores with requirement coverage, for example “1 supported, 5 unconfirmed.” Display the applicable configuration and conditions beside every value. Card, profile, comparison, matcher and export must use the same selection and labelling rules.

## Source refresh and German purchasing

Use this source order: exact manufacturer's product page/manual/datasheet or official repository; official store; German/EU seller listing for that seller's terms; integrator/customer deployment evidence; comparison sites as discovery leads only.

Every automated request must use the existing polite fetch layer with its robots rules, cache, rate limits and refusal handling. Save retrieval failures and do not circumvent access restrictions. A fetched page with zero extracted fields is a parser/coverage gap, not a successful specification verification. Image-based or PDF-only specifications go through reviewed curation.

For every buying route record the legal seller, country and served markets, exact SKU/package, net/gross price and currency, tax/shipping basis, restrictions, published stock and lead-time text, source/check date, sales contact, integration contact and service route. Separate those claims from confirmed quotation terms. Authorization requires its own evidence.

Use public business email, phone or contact forms only. No inquiry is sent automatically. The generated brief should contain precise questions the company can review and send: configuration, price breakdown, German delivery, setup, service/warranty, supported task, operator requirements and trial conditions.

Refresh changed or old sources in batches. Proposed review intervals are 30 days for price/availability, 90 days for active shortlisted technical records and contacts, and 180 days for long-tail research records; these are editorial policies to implement, not existing guarantees. Source changes should reopen dependent assessments. Store last attempted and last successful checks separately.

## Phased implementation

Each phase ends in a small reviewable change with its own acceptance evidence. Data research can run alongside product work, but publishing recommendations depends on the evidence gates.

| Phase | Deliverable and scope | Completion gate |
| --- | --- | --- |
| 0 Scope and baseline | This plan, full snapshot audit, per-configuration review queue, staged source refresh and first research batch | Every existing record accounted for; agreed cross-industry/all-type scope; no claim that automated checks verify all facts |
| 1 Correct decision semantics | Version the legacy humanoid screen; separate discovery from solution-class assessment; remove universal mass/variability/existing-machine/error-rate exclusions; preserve source URLs in saved task snapshots; align payload semantics and coverage displays | Heavy transport remains discoverable for an AMR; fixed cells can qualify for repetitive work; G1 base/EDU values stay distinct; missing evidence never passes a hard requirement |
| 2 Extend taxonomy and data model | Add industries and task applicability; add AMR/AGV, arms/cobots, dedicated robots and cells; introduce solution configuration and deployment evidence; additive SQL and backward-compatible loaders | Existing IDs/URLs and 189 tasks still load; catalogue accepts new classes; configuration evidence cannot leak into another variant |
| 3 Build progressive discovery | Broad landing/library, useful filters, shareable URLs, explainable clusters and coverage states; retain old deep links | Counts agree across filters/list/clusters; accessible mobile and keyboard flows; no mandatory intake before browsing; unknown/empty states offer a useful next step |
| 4 Build the company assessment | Short task-dependent questions, explicit overrides and unknowns, multiple task projects, preserved evidence and migration of existing saved work | Company conditions recompute only affected assessments; source links and user overrides survive migration; no private inputs leak into public data |
| 5 Compare practical solutions | Requirement heatmap, complete configurations, actual task evidence, Germany purchasing/service routes, cost ranges and pilot brief | A reviewer can trace every recommendation and cost assumption; unresolved blockers stay visible; no global listing implies German delivery; no automatic supplier contact |
| 6 Expand and maintain coverage | Resolve the entire review queue in batches, add verified task examples and product types, review contributions and changed sources | Every row has a dated review disposition, including unknown/inaccessible/conflicting; coverage dashboard separates fetched, parsed, reviewed and published counts |

Phase 1 is the next implementation slice. Phases 2 and 3 follow after its semantics are tested; adding a larger discovery interface before this would spread the old humanoid assumptions.

For each data batch, process 20–30 configurations as a reviewable unit. Start with public conflicts and configurations relevant to the first task examples, then remaining public records, then nonpublic/placeholder/discontinued inventory. All records stay in the queue. Missing 3D models and photos are presentation work and must not outrank incorrect specifications.

## First representative release

Use a small verified set to exercise the breadth before expanding all industry content:

| Scenario | Alternatives to compare | Evidence or measurement that changes the decision |
| --- | --- | --- |
| Move totes within a factory | Manual/cart, AMR with cart/top module, mobile manipulator, humanoid | Loaded mass, route and handoffs, throughput, interventions, integration; MiR250 is a researched lead, not an automatic selection |
| Inspect plant rooms or industrial assets | Human rounds, fixed sensors, quadruped inspection system | Actual sensor package and detection task, obstacles, environment, operator mode; ANYmal and Spot require configuration-specific assessment |
| Tend a machine | Current process, fixed arm/cobot cell, mobile manipulation | Fixturing, interface, cycle time, force/reach and exceptions; low variability may favor a fixed cell |
| Clean a commercial floor | Existing cleaning machine, dedicated autonomous scrubber, manual process | Surface, water/chemicals, area, traffic and demonstrated cleaning quality |
| Deliver tools on a construction floor | Human/cart, AMR/cart, wheeled manipulation, legged alternative | Lift access, thresholds/stairs, clutter, tote handling and real installer waiting time |
| Pick kits in a warehouse | Process redesign, fixed picking cell, mobile manipulation | Object presentation and variation, picking accuracy, replenishment and handoff |

The first source batch covers G1/base-EDU, Spot, ANYmal and MiR250. It does not yet supply every solution in this table. Add missing products only after exact sources and configurations are reviewed. G1 remains a research/demonstration lead unless task-specific operational evidence supports a stronger label.

## Implementation map

- Discovery and content: data/taxonomy, data/settings, data/tasks; lib/content/schema.ts, vocab.ts and load.ts; app/use-cases; components/journey/UseCaseCard.tsx and VerdictMap.tsx.
- Assessment: lib/screen/rules.ts, thresholds.ts and record.ts; lib/plan/screen.ts and from-task.ts; lib/match/criteria.ts and requirements.ts. The current saved-project screen hardcodes the humanoid class.
- Data and product classes: lib/spec/enums.ts and fields.ts; db/schema.sql and views.sql; lib/ingest; scripts/scrape/adapters. Update SQL constraints and TypeScript vocabularies together.
- Workspace and evidence: lib/plan/model.ts, migrate.ts and store.ts; preserve attribute evidence URLs that current task snapshots drop. Transfer continuous-runtime, required certifications and needed-by context into matching without treating nominal runtime as loaded runtime.
- Purchasing: data/purchasing/contacts.json, data/robots/status-reviews.json and their loaders/panels. Keep reviewed lifecycle corrections through later imports.
- Publication: rebuild projections and the committed snapshot only after staged import and review; compare before/after counts, run checks and deploy a preview before production.

The existing provenance ledger, polite scraper, bilingual task data, local workspace, comparison and pilot components are reusable. A rewrite would discard useful work and make evidence migration harder.

## Validation and release gates

1. Schema/content: all existing records validate; new industries/classes have explicit applicability; every claim carries its source or assumption; placeholders do not become public products.
2. Evidence: regression tests cover G1 base versus EDU, peak versus continuous and mounted versus arm/towing payload, nominal versus loaded runtime, source conflicts and missing fields.
3. Assessment: known blockers are explicit; unknown critical values remain open; existing machines and low variability are comparison inputs; claims do not cross configuration boundaries.
4. Purchasing: missing stock, German delivery, local service or authorization stays unknown. Seller technical copy cannot acquire a manufacturer badge.
5. Journey: saved work migrates, URLs remain valid, company inputs remain separate, context survives library → task → solution → brief.
6. User interface: test filters, counts, empty states, comparisons and exports on desktop/mobile; keyboard and accessibility checks; render and inspect screenshots as required by AGENTS.md.
7. Publication: inspect staged diffs and snapshot changes; retain rollback artifact and schema/assessment versions; publish counts of verified coverage and remaining gaps.

Run focused tests, the content validator and relevant browser journeys for each change. A successful scraper run or green schema check is not a claim that the dataset is factually correct.

## Work completed for this plan

- Located and cloned thenguyentrong/sitebots into a separate local workspace and review branch.
- Audited the committed snapshot: 572 configurations from 269 makers, 493 public configurations, 5,081 fact rows including 35 invalidations.
- Recorded 529 configurations with no active manufacturer-tier facts and 87 with recorded specification conflicts across the full inventory. These are ledger metrics, not claims that manufacturers publish nothing or that every conflicting number is false.
- Validated 189 task records and 56 settings with the existing content checker.
- Refreshed the configured manufacturer, approved specification-page and seller adapters into local staging; see the refresh report for exact coverage and failures.
- Researched four representative product families, including German/EU buying and contact routes, with access limitations labelled.
- Prepared a repeatable review queue covering every configuration: 97 P0, 396 P1 and 79 P2. Its status starts at unreviewed; automated triage does not close a source review.
- Verification passed: 301 unit tests across 36 files, the content validator, and TypeScript checking. The queue JSON and CSV both contain 572 unique configuration identities. UI acceptance and deployment remain part of later phases.

Related artifacts: [catalogue review summary](reviews/2026-10-01/summary.json), [full review queue](reviews/2026-10-01/queue.csv), [source refresh report](source-refresh-2026-10-01.md), and [first source verification batch](source-verification-2026-10-01.md).

The production site and catalogue have not been changed by this planning batch.



## Phase 1 implementation — local preview, 2026-10-01

Implemented in the local review branch, with the preview at http://localhost:3000:

- The homepage and task library start from physical work. All 189 recorded opportunities remain discoverable and can be narrowed by setting and task family. Counts and cards use the same filtered records. Current coverage is stated explicitly; the site does not claim to contain every industry yet.
- A separate opportunity-v1 review records all 12 task requirements, their origins and source links, missing information, comparison approaches and configuration-specific evidence questions. Heavy loads, low variability, adverse conditions and existing equipment do not reject an opportunity across all robot types.
- Historical humanoid verdicts and pinned task data remain available for reference but no longer control discovery, shortlisting or business-priority ranking.
- An explicit “not sure” can replace an inherited task value, persists across reloads, and remains unknown. Older saved work migrates without turning synthetic null defaults into user answers.
- Payload selection is consistent across catalogue cards, detail pages, comparisons and matching. A preferred manufacturer peak value is not converted into a fictional continuous payload, and weaker reported specifications do not establish a working-load pass.
- Loaded-runtime evidence is required to cover a working period. Nominal endurance and a swappable battery alone do not establish shift coverage.
- Handling profiles show supported, reported and unconfirmed capability counts. Incomplete handling evidence leaves a gap in the radar instead of a perfect score.
- Task requirements and sources carry through the solution comparison and printable decision brief. Missing task information remains an open item at the final decision step.

The preview uses an isolated copy of the committed catalogue (572 configurations; 493 public). No production database, committed snapshot or deployment has been changed.

At the Phase 1 checkpoint, the full industry taxonomy, additional catalogue robot classes, complete configuration modelling and per-robot source review remained in later phases; the Phase 2 record below describes the next completed increment. The 572-entry review queue remains explicitly unreviewed: fixing presentation and matching semantics does not certify the underlying inventory.


Final Phase 1 verification: 336 unit tests across 42 files passed; 10 browser journey tests passed; all 189 task records and 56 settings validated; the production build (including TypeScript) passed. Desktop/mobile home, library, task review, shortlist, G1 evidence views and comparison screenshots were rendered and inspected. Saved-family changes, source links, explicit unknowns, runtime transfer and printable brief persistence have browser coverage. The original snapshot SHA-256 remains f6d8fd59972c791ce8b20ec8ba3f6a56765db26b53bf7d703098aee5db112d06. The local server remains running on port 3000.


## Phase 2 implementation — local preview, 2026-10-01

The cross-industry schema and first configuration-review batch are implemented locally. This increment also connects the first four workflow guides to progressive discovery and saved company assessments.

- Ten industry facets have shareable URLs. Existing task IDs and all 189 records remain intact, with explicit editorial applicability. Empty industries show coverage gaps and a custom-task route.
- Four guides cover material transport, machine tending, inspection and floor cleaning. They seed a task name, work family, intended outcome and pilot questions; all twelve measurable site requirements remain unknown until provided. Industry and guide identity survive saving and reload.
- Five additional robot classes are accepted throughout the schema, filters, comparison, ingestion and display: AMR/AGV, industrial arm, cobot, dedicated robot and integrated cell. Existing classes retain their IDs. Single-arm joint counts and mobile-platform payloads cannot silently inherit humanoid semantics.
- The validated file-backed review registry contains 20 exact configurations: six transport, six machine-tending, four inspection and four cleaning reviews. They are available at /solutions and on the relevant workflow and comparison pages. These records have not been merged into the legacy database inventory or its numeric matcher.
- The registry retains 103 specification entries (95 manufacturer-supported claims and eight explicitly unknown values), 88 source entries representing 66 unique source URLs, 34 configuration-specific buying/contact routes, 29 conflicts and 61 open questions. These counts measure reviewed publications, not field-proven suitability.
- Task evidence distinguishes supplier application claims, demonstrations, pilots and reported routine operation. Publication source, exact setup, operator mode and limitations remain visible. German supplier/seller checks retain uncertain stock, delivery, authorization and variant identity.
- A reviewed configuration can enter the comparison as a custom option with exact package, operating responsibilities, source links, unresolved conflicts and unknowns. It receives no automatic match score, approval or invented price. Cost assumptions and the printable brief keep those sources.
- The read-only command npm run audit:solutions validates the registry, citation integrity and saved-plan compatibility. Invalid references, duplicate configuration/spec identities, source-index drift, invented unknown values and oversized evidence imports fail instead of silently losing information.
- Shared purchasing contacts now contain 21 published organizations (16 added), with source/check dates. Only two existing manufacturer identities were mapped; missing email/phone fields do not create empty links. Exact-configuration delivery and authorization caveats remain in each review.
- New detail pages carry their own metadata/canonicals. Deployment file traces include both review JSON batches for solutions, workflows and the saved-plan journey.

### Validation and release boundary

354 unit tests across 46 files and 18 browser journey tests passed; TypeScript, the production build and content validation passed. The 189 legacy tasks and 56 settings still validate. Browser coverage includes all four workflow-to-brief journeys, saved industry and workflow identity, URL facets, mobile layouts, source/condition/contact rendering and persistent unknowns. The required G1 screenshot and the new desktop/mobile views were rendered and inspected.

The local preview continues at http://localhost:3000. The committed catalogue snapshot SHA-256 remains f6d8fd59972c791ce8b20ec8ba3f6a56765db26b53bf7d703098aee5db112d06. No production deployment or shared database write was performed. The additive SQL class migration must be applied to the target database before new-class ingestion.

All 20 reviews remain reviewed_with_gaps. The 572-entry legacy review queue has not been marked verified: mapping exact reviewed configurations into that inventory, resolving the remaining high-priority records, expanding industry examples and production publication are subsequent work. No automatic outreach or recurring source-refresh job has been enabled.

Research notes: [transport and inspection](phase2-transport-inspection.md), [machine tending and cleaning](phase2-tending-cleaning.md), [class and browser validation](reviews/2026-10-01/phase2-class-validation.md).

## Revised product direction — visual discovery, 2026-10-01

The user's subsequent clarification supersedes the text-led homepage approach: show the existing robot lineup, then a clustered map with one point per use case, filters directly underneath, and same-page robot comparison and published supplier contacts. This visual flow is implemented in the local preview. The detailed assessment remains optional. See [visual discovery implementation](visual-discovery-2026-10-01.md).
