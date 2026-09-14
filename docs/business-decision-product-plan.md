# Business decisions in Sitebots

Design proposal, 14 September 2026. This extends the construction-profile product plan. It describes a proposed product, not implemented website functionality. The accompanying interactive examples use illustrative assessments and financial inputs, not measured factory results.

The client should leave with an answer to: **Which job should we investigate first, which complete solution should we compare, what could make the investment worthwhile, and what must a pilot prove?**

## What the reference deck contributes

Reference: Humanoids_in_the_Wood_Factory.pptx in the ICoM Humanoids_Wood_Factory folder.

The page printed **17** is physical PowerPoint slide **18**: “Die ganze Prüfung auf zwei Achsen.” It maps handled object mass on a logarithmic x-axis against task variability. The deck's plotting script supplies ten reference positions, including hardware kitting, inspection/documentation, machine loading and heavy construction elements. The speaker notes explicitly describe the variability axis as an ICoM judgement, not a measured quantity.

Keep this map as a way to discuss task families. Preserve the origin of each point and allow a client to replace reference masses with observed task data. A guide such as 25 kg must refer to an exact configuration, handling mode, reach and supporting evidence. It is not a general humanoid limit or proof that a task can be automated.

The preceding physical slide 17, printed 16, presents five screening questions. Some are equipment requirements; others concern the client's existing process and economics. Keep those separate. “An existing machine already performs this work” informs the comparison baseline rather than automatically eliminating an alternative. An acceptable error rate belongs to a specified process and consequence, not a universal 1% threshold. Dust suitability requires actual equipment and deployment evidence.

## Use each framework for the question it answers

BCG's original growth-share matrix uses market growth and relative market share. It is useful for product or business portfolios when that market data exists. A robot being popular, purchasable or technically mature does not make it a cash cow for a construction client.

The original GE–McKinsey nine-box uses industry attractiveness and competitive strength. Its portfolio structure is a useful inspiration, but the proposed Sitebots axes are different: **value to this client** and **readiness to deploy this solution for this job**. Call the feature “Project priorities,” and label the method as a Sitebots assessment. Do not present it as a BCG or McKinsey rating.

Sources:
- BCG, What Is the Growth Share Matrix? https://www.bcg.com/about/overview/our-history/growth-share-matrix
- McKinsey, Enduring Ideas: The GE–McKinsey nine-box matrix. https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/enduring-ideas-the-ge-and-mckinsey-nine-box-matrix

## Three connected decision levels

**Client portfolio:** Compare opportunities across logistics, inspection, finishing and factory production. A point represents a proposed project at a site, such as “Deliver loaded totes between two workstations,” not an entire robot brand.

**Job and solution:** Compare complete configurations for the same output. Include the existing process, simple process changes, specialized equipment, fixed automation, AMRs, robot arms and humanoids where relevant. The evaluated unit is the robot plus tools, software, integration, site preparation and human responsibilities.

**Operating programme:** Track what pilots actually achieve, then decide whether to adapt, expand, maintain or stop. Keep expected benefits separate from observed results. A successful demonstration is not the same as repeatable performance in the client's working conditions.

## Useful maps and visual decisions

| Client question | Visual | Inputs and what it should reveal |
| --- | --- | --- |
| Where should we look for opportunities? | Process and material-flow map | Process steps, movement, queues, handoffs, human effort and bottlenecks. Highlight the costly or constrained step rather than optimizing an isolated activity. |
| What work is physically plausible? | Task map inspired by printed slide 17 | Object mass, variability, handling mode and configuration limits. Add task-specific views for routes, reach or surface requirements when those determine fit. |
| Which projects deserve attention first? | Business value versus deployment readiness, nine boxes | Agreed client priorities, baseline, task evidence, integration and organisational preparation. Show pilot candidates, opportunities needing investigation and low-priority work. |
| Which alternative fits this exact job? | Requirements and evidence heatmap | Rows are required outcomes and conditions; columns are complete solutions. Cells show supported, blocked or unconfirmed, with source and consequence. Keep hard requirements above preferences. |
| What can we afford to pursue? | Investment versus benefit map | Comparable total investment, benefit range, timing and budget constraints. Do not add overlapping benefits from competing projects or rank by price alone. |
| What will it really cost? | Total-cost comparison | Acquisition or service fees, integration, site changes, software, maintenance, operation, downtime and exit costs over an agreed horizon. Compare purchase, lease and service on the same basis. |
| When could it pay back? | Cash-flow curve and scenario comparison | Client-supplied cash savings and costs, ramp-up, useful life and, when supplied, discount rate. Show downside, base and upside scenarios and the break-even point. |
| Which assumption changes the decision? | Sensitivity or break-even chart | Vary utilization, intervention time, integration spend and cash realization. Identify thresholds where the preferred option changes instead of disguising uncertainty in one score. |
| What should a pilot investigate first? | Decision impact versus evidence uncertainty | Each point is an unresolved assumption. High-impact unknowns become pilot questions; mandatory blockers require resolution regardless of score. |
| Can it be purchased and supported here? | Supplier coverage map and comparison | Verified business locations, delivery market, configuration, service coverage and contact channels. An office pin alone does not establish German delivery or on-site support. |
| What needs to happen before deployment? | Dependency and rollout timeline | Supplier answers, interfaces, site preparation, training, testing and approvals with owners. Distinguish estimated lead times from confirmed commitments. |
| Are we getting the promised result? | Expected-versus-observed benefit chart | Pilot and operating measurements, coverage, interventions, quality and net benefit. Show the measurement period and changes in workload or conditions. |
| How should a robotics business allocate its product investment? | Literal BCG or GE–McKinsey portfolio | Optional strategy module requiring an explicit market definition and suitable market/competitive data. Keep this separate from a factory customer's adoption decision. |

Avoid showing all these charts on every profile. Start from the decision and reveal the relevant visual. Prefer a comparison heatmap with visible evidence over a radar chart whose scores suggest precision the data cannot support.

## A transparent project-priority assessment

Use low, medium and high bands initially, with “Unassessed” as a real state. Do not manufacture a 0–100 score from robot specifications.

**Business value** should reflect the client's objectives. Ask about the current problem, its frequency and scale, and the desired outcome: cost, capacity, quality, exposure reduction or strategic capability. Define the bands with the client. A high-value task could address an important bottleneck or an agreed financial threshold; it need not be the task with the most labor hours.

**Readiness** describes this deployment: evidence for the task, equipment/software package, integration, site preparation, staffing, supplier support and remaining dependencies. A polished demonstration or a high payload is insufficient. Explain the basis for each assessment and make it editable.

Apply critical requirements first. A known blocker should lead to redesign or an alternative. Missing critical evidence should lead to a supplier question or targeted test. Neither should be averaged away by high scores elsewhere. Matrix position suggests the next investigation; it does not authorize a purchase or establish safe operation.

Suggested actions:
- High value and high readiness: scope a pilot after critical requirements are confirmed.
- High value and low readiness: investigate the costly unknowns and compare simpler approaches.
- Moderate value and moderate readiness: establish the baseline and bound the integration work.
- Low incremental value: defer new investment or maintain a working existing solution.

Store an explanation beside each placement. If multiple projects occupy a cell, group or offset the points without implying finer numerical distinctions. Preserve unknown assessments outside the ranked plot.

## Economics that clients can trust

Start with the existing process. Record workload, cycle or route time, operator involvement, quality, exceptions, maintenance and costs with period and source. Compare equivalent outputs over equivalent operating conditions.

An equipment price is only one component of initial spend. The deployed package may include tools, sensors, software, integration, interfaces, commissioning, training and site preparation. Record one-time and recurring costs separately, including costs missing from supplier quotes.

Released labor time is a capacity benefit. It becomes a cash saving only when a real cash expense is avoided or reduced. Let the client supply that conversion explicitly. Revenue from added capacity also needs demand, contribution margin and bottleneck evidence; gross revenue is not profit.

Keep quality, ergonomic and other operational benefits visible when they cannot yet be valued reliably. Avoid counting the same saved time as both labor savings and additional production. Net operator time must include supervision, interventions, replenishment and fallback work.

The interactive example uses EUR 120,000 initial spend, 1,800 net hours released annually, EUR 40/hour loaded cost, 50% cash realization and EUR 12,000 additional yearly operating cost. This produces EUR 24,000 net annual cash benefit and five-year simple payback. These are deliberately editable teaching assumptions, not a claim about any robot or client.

The first calculator can show simple undiscounted payback and five-year cash flow. Later add ramp-up, uneven annual cash flows, residual value and discounted analysis using a client-approved rate. Show “No payback under these assumptions” when annual net cash benefit is nonpositive. Zero or unknown inputs must remain visible, and missing data must not silently become zero.

## The client journey

Keep two entry paths: **Explore possible jobs** and **Assess a job**. Both can lead to:

1. Define the job, setting, current process and desired outcome.
2. Record requirements and identify plausible solution types.
3. Place the opportunity in the client portfolio, with evidence gaps.
4. Compare complete solutions for the same job.
5. Explore cost and benefit assumptions.
6. Create a pilot and decision brief.

A robot profile should show “For your job” with fit, package requirements, evidence gaps, economics inputs and comparison actions. Without a selected job, show documented applications and invite the visitor to select a context. Avoid a universal robot ROI score.

The brief should answer:
- Proposed next action and the client objective it serves.
- Baseline and alternatives considered.
- Required configuration, dependencies and human work.
- Estimated costs, benefit scenarios and unresolved assumptions.
- Pilot scope, owner, measurement plan, acceptance and stop criteria.
- Supplier questions, evidence sources and date of next decision.

No message to a supplier should be sent merely because a visitor generated a brief. Let the user review and deliberately initiate contact.

## Provenance and data structure

Keep client inputs, manufacturer evidence, third-party reports, analyst judgements and pilot measurements as different record types. Each factual claim retains its source, checked date, exact configuration and relevant conditions. Client estimates retain an owner, date and range; they must not acquire manufacturer-verification badges.

Useful records are: client/project context; baseline process; task requirements; solution configuration; deployment evidence; cost line items; benefit assumptions; assessment rationale; pilot results; and decision history. Treat an old assessment as needing review when configuration or evidence changes. Preserve the job context through robot pages, comparison and briefs.

Before exposing automated recommendations, address the existing matching problems documented in construction-profile-product-plan.md: unasked conditions becoming favorable defaults, absent task evidence becoming a negative claim, form factor implying terrain suitability, and raw specifications being treated as task success.

## Recommended first release

Build four connected pieces: **Project priorities, compare for this job, cost scenarios, and a pilot brief.** Reuse the reference task map within the fit assessment. Establish one credible construction scenario and one factory scenario before broadening the scorecards.

Use the process map for discovery and add sensitivity, supplier coverage and programme tracking as the corresponding data becomes available. Defer a literal market-share matrix until there is a separate strategy user and adequate market data.

Acceptance criteria for implementation:
- An undecided client can explore opportunities without invented requirements.
- Project placements and assumptions are explainable and editable.
- Critical unknowns and failures remain visible and cannot be averaged away.
- A manual/current-process option can be compared with complete robotic solutions.
- Package costs and human responsibilities travel with the configuration.
- Cash savings remain separate from released capacity.
- Scenarios and project totals avoid double-counted benefits and shared costs.
- A recommendation includes a bounded next step and a way to test it.
- Supplier coverage and technical claims retain their own verification evidence.
- A saved comparison or brief preserves its inputs, assumptions and source dates.