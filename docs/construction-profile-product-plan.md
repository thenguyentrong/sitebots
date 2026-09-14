# Construction profile: client inquiry and decision brief

Proposal prepared 13 September 2026 after reviewing the current profile, requirements form, matcher and comparison code, and official product examples.

The intended client outcome is a short, shareable answer to: “Which part of our work could this automate, what would we need to deploy it, and what should we test before committing?” A robot catalogue becomes useful to construction clients when it connects a job to a complete, evidenced solution and a next step.

**Two starting points**

“Show me what is possible” opens a guided overview. “I have a job in mind” opens a short inquiry. Both use the same job definitions and evidence, and both lead to a shortlist that can be compared for the same job. A visitor entering directly through a robot page can use the overview immediately and optionally select a project context.

Begin with the work setting: active construction site, factory/prefabrication, or warehouse/material yard. Allow multiple settings and “Not sure yet.” Then offer job families. Optional trade and project-stage filters can refine these later.

| Job family | Client question | Specific jobs to explore | Useful client output |
| --- | --- | --- | --- |
| Logistics | Where could we reduce carrying and repeated trips? | Deliver loaded tool boxes, transport carts or pallets, supply workstations, move waste | Route and load assessment, loading/unloading responsibilities, suitable solution types, throughput questions |
| Inspection and documentation | Can we document progress or check equipment more consistently? | Repeat photographs, 360 capture, 3D scans, visual/thermal inspection | Required sensor and software package, resulting report, coverage and data-quality checks |
| Safety support and monitoring | Can we reduce exposure or support routine checks? | Remote observation, environmental measurements, observations of access routes | Specific sensing task, detection evidence, human review and escalation process; do not imply general safety approval |
| Layout and installation | Can we transfer plans and perform repetitive installation work? | Layout marking, overhead drilling, fastening | Digital-plan and surveying prerequisites, tooling, accuracy and operator requirements |
| Finishing and cleaning | Where could repetitive surface work be assisted? | Drywall sanding/finishing, painting, floor cleaning | Exact material, surface and finish requirements, preparation, tooling, quality acceptance and cleanup |
| Factory production | Which recurring production steps are candidates? | Kitting, sorting, tending machines, moving parts, repetitive assembly | Object variability, fixtures, handling process, interfaces, cycle requirements and supervision |

These are discovery categories, not claims that every listed robot can perform the jobs. Show when the catalogue lacks an evidenced solution and preserve that inquiry for research. The catalogue will need representation for AMRs, stationary arms and specialized construction machines alongside its current form factors.

**The overview path**

After choosing a setting, show practical job cards. Each card explains the task in ordinary language, the output the client receives, the person’s remaining work, typical prerequisites, the kind of evidence available, and the questions to ask next. Show commercial solutions, demonstrated applications and ideas needing development as distinct categories. Offer “Explore this job” and “Use this in my inquiry.” Browsing should work without providing payload, budget or a robot name.

For example, “Document the same locations every day” explains repeat capture, camera/scanner choices, route setup, software outputs and review responsibilities. “Move parts between workstations” explains loaded transport and separately asks who loads and unloads. The latter distinction prevents carrying payload from being presented as autonomous picking and delivery.

**The specific-job path**

Accept a plain-language description such as “We carry tool boxes from a storage area to the installation team.” Also offer structured choices. Any interpretation of free text must be shown as an editable summary before applying requirements.

Ask only the next questions that can change the answer, initially around four to six:

- Logistics: what is moved, load/size, origin and destination, route obstacles, frequency, and who loads/unloads.
- Inspection: what must be observed, required output and frequency, route/site access, and who reviews the findings.
- Finishing: material and surface, working height, area, finish requirement, preparation and existing process.
- Factory work: object variability, repetitive step, handoff/interface, cycle requirement and tolerated operator involvement.

Then ask region, timing, purchase/rental/service preference and budget if known. Make “Not sure” a real value. An unanswered ground or environment question must not silently mean an indoor paved floor. Keep required conditions separate from preferences and never assume that a missing critical value passed.

**What every robot profile should answer**

Keep the title “Construction profile” with a contextual subtitle such as “For material delivery on your site.” Without a selected job, show “Explore documented applications.” The section should contain:

1. A short conclusion for this job: candidate for assessment, needs a specified integration, demonstrated only, insufficient evidence, or unsuitable because of a documented constraint. A recommendation is an assessment and carries its reasoning.
2. Two to four relevant jobs, each with its own evidence and exact configuration. State whether the evidence is a manufacturer claim, demonstration, pilot or documented deployment, and where it was demonstrated. Keep evidence type separate from technical fit and commercial availability.
3. The complete solution: robot, mount/tool/sensor, software, setup/integration, charging, and operator responsibilities. Include package components in payload and price comparisons where known.
4. Job requirements: meets the published requirement, fails a documented limit, or needs confirmation. Explain the consequence in a sentence, and link the underlying source and checked date.
5. Purchasing and deployment: exact configuration, package versus base price, Germany delivery evidence, supplier/integrator contact, lead time and service evidence. Unknown items remain explicit.
6. A suggested pilot: scope, measurable acceptance criteria, required inputs and open supplier questions.
7. Actions: “Compare for this job,” “Create a pilot brief” and “Save client overview.” Keep an add-to-compare control near the summary as well.

The existing radar can remain an optional technical detail. A score such as “Manipulation 75” does not establish that a robot can perform drilling or finishing. Show the task evidence and actual constraints before any aggregate score.

**Worked example: Unitree B2**

Illustrative client inquiry: “Could we use B2 to document a construction site each day?”

Suggested conclusion: “Candidate for an inspection setup; the exact capture workflow and site route need confirmation.” Unitree describes industrial inspection, infrared scanning and 3D mapping, and explicitly says that functions can require human operation or secondary development and vary by configuration. That supports further assessment; it does not establish a complete unattended construction-documentation workflow.

The profile should ask whether the client needs photographs, 360 imagery, thermal readings or a registered point cloud; how the route changes; and where the result should go. It should identify the specific sensor, mounting, mission software, output format, charging and operator arrangement as confirmed, required or unknown.

A proposed pilot could cover one representative route and an agreed set of capture points. Measure completed capture points, usable data, operator time, interventions and repeatability against the client’s existing process. Set the thresholds with the client; do not invent a productivity improvement.

For a transport inquiry, verify the carried load and mounting arrangement and separately assess loading/unloading. A walking-load specification alone does not establish autonomous material handling. For drilling or painting, show that a validated tool and task workflow have not been established by the evidence reviewed here, and lead into specialized solutions.

Source: https://www.unitree.com/b2/

**Comparison at the end**

Carry the setting, task and requirements into comparison automatically. Default to two or three relevant alternatives, while allowing the visitor to choose others. Compare complete configurations for the same output. Include an existing/manual method when the client supplies a baseline.

The first rows should be: task fit and reason; evidence in a comparable setting; included/required hardware and software; operator involvement; unmet or unknown requirements; package price and recurring costs if published; German supply/support evidence; and a proposed pilot. Put detailed specifications below. Highlight meeting the client’s threshold, rather than the largest raw number. Do not choose a universal winner when task evidence, cost or required conditions are missing.

End with a client-ready conclusion: “Investigate A for these reasons; compare B if this condition changes; confirm these points with the supplier; run this pilot before the purchase decision.” A useful research result can also be “No evidenced solution in our current catalogue; these are the unresolved questions and the next research targets.”

**Evidence and matching changes needed**

The current implementation was inspected and probed with isolated fixtures:

- `lib/profile/tasks.ts` converts a task missing from a nonempty list into `no`. This should remain unconfirmed unless there is explicit contrary evidence.
- `lib/match/criteria.ts` passes quadrupeds for rubble/mud and fails other form factors based on category alone. Replace that inference with exact-model, condition-specific evidence.
- `lib/match/requirements.ts` defaults unanswered questions to indoor, paved, dry and no stairs. Separate unasked values from user-confirmed requirements.
- `lib/profile/axes.ts` derives manipulation partly from hand type and total DOF. This must not be used as evidence of a completed trade task.
- `components/compare/CompareTable.tsx` highlights some larger specifications as best. Job comparison needs threshold satisfaction and relevant evidence instead.

Store evidence per robot configuration and job: task, setting, statement, source URL, checked date, evidence type, tested conditions, hardware/software dependencies and human involvement. Keep commercial status and evidence confidence separate. A missing downloadable 3D model has no bearing on whether a real robot can perform a job.

**Recommended implementation order**

First build the two entry paths, six discovery categories and a reusable job-context record. In the same first release, correct the unsupported matching inferences and replace the profile’s leading radar with a short evidence-backed job assessment. Reuse the existing shareable URL inputs, source records, purchasing panels and comparison selection.

Develop and review a small initial set of specific scenarios thoroughly: progress capture, visual inspection, loaded tool transport, factory material transfer and layout. Show finishing and production opportunities with an explicit coverage boundary while their specialized equipment and evidence are added. Then add contextual comparison and a printable/shareable client-and-pilot brief. Use real inquiries to choose the next scenarios and questions.

Acceptance checks should cover: an undecided visitor receiving an overview without invented requirements; task-specific follow-up questions; unknown task evidence remaining unknown; payload not implying picking; a missing critical requirement preventing an unconditional recommendation; identical job context carried into robot and comparison pages; package-level cost comparison; mobile accessibility; and a sourced outcome or explicit research gap for every result.

**Official examples informing this proposal**

- Boston Dynamics describes construction progress capture, laser scanning, software integration and remote visibility with Spot: https://bostondynamics.com/industry/construction/
- Hilti describes the Jaibot BIM-to-field drilling workflow, illustrating why tools, digital inputs and the operator belong in a profile: https://www.hilti.com/content/hilti/W1/US/en/business/business/trends/bim.html
- Dusty explains the FieldPrinter workflow and supporting system. Its main site currently lists North American availability, which must not be treated as confirmed German supply: https://support.dustyrobotics.com/hc/en-us/articles/53228299459355-What-Is-the-Dusty-FieldPrinter-An-Overview-of-the-Layout-Printing-Robot-and-System and https://www.dustyrobotics.com/

These examples inform the product design. They are not a supplier shortlist for an unspecified client project.
