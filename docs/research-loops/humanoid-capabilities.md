# Humanoid potential-platform capability audit

Checked 2026-10-01. This is a bounded synthesis of the four existing humanoid review batches, not new task evidence or a fresh product-source crawl. All profile source IDs resolve to directly read sources in the exact review. The original reviews retain their source URLs, retrieval dates, specifications, stages and conflicts.

## Meaning and matching boundaries

- Nine profiles enumerate hardware/development capabilities. A match must be labelled potential and must retain the selected capability limitations, exact configuration and lifecycle. It is not evidence that the robot has performed the selected task.
- Stationary means work at a fixed position with appropriate balance/control, not a fixed-base robot or a guarantee of safe unsupported standing. Level travel is limited to the documented development/workcell context. No uneven-or-steps capability was added because these exact reviewed sources do not establish a useful loaded work envelope for it.
- Configured means the reviewed exact configuration has the relevant hands or grippers; it does not mean a task controller is provided. Requires-tooling means the end effector and its integration remain an explicit condition. No generic hand-tool capability was inferred just because a robot has fingers.
- H2 EDU has no included hands in this review: all manipulation entries require tooling. H2 Plus is the specific dual-Sharpa reference; handless Smart packages must not inherit it. G1 EDU uses two three-finger Dex3-1 hands, not five-finger hands. Digit 4 has tote grippers, with no general dexterity or tool-use entry. TALOS grippers/tools are project-specific and remain conditional.
- Platform load values are not interchangeable with hand grip force, per-arm rated load, peak load or loaded-route limits. These profiles contain no copied payload numbers, so downstream matching must read the exact spec semantics and leave unknown requirements unresolved.

## Lifecycle decisions

| Exact review | State | Boundary |
| --- | --- | --- |
| H2 EDU | research_order | Quote route only; optional hands, stock and delivery unconfirmed. |
| H2 Plus Sharpa reference | announced | Late-2026 reference target and seller Q1-2027 expectation; precise package and supply unconfirmed. |
| G1 EDU with Dex3-1 | research_order | Exact-package quotation; seller describes a research prototype. |
| Digit 4 | commercial_enquiry | Existing commercial project evidence; new German supply and application acceptance unconfirmed. |
| Original Apollo biped | historical | Exact original generation's pilot evidence; later Apollo versions remain separate. This does not claim every Apollo is discontinued. |
| Figure 02 | historical | Fleet retirement explicitly announced; historical BMW loading evidence retained. |
| Figure 03 | pilot_access | Current customer project and manufacturer enquiry, not proof of a public access programme or ready-made application. |
| Industrial Walker S2 | commercial_enquiry | Manufacturer reports deliveries; exact German allocation/support unconfirmed. |
| TALOS | research_order | Current platform quotation; historical Memmo tool setup is not a current turnkey package. |

Historical reviews should be excluded from broad default potential matches while remaining available as labelled direct task evidence. Announced H2 Plus may appear among potential choices only with its announcement/delivery limits visible and after more obtainable platforms; root owns ordering and lifecycle UI. Research-order, pilot-access and commercial-enquiry are evidence-based access descriptions, not availability guarantees.

## Source lineage and validation

Profiles draw only from data/solutions/research-humanoids-h2.json, research-humanoids-logistics.json, research-humanoids-production.json and research-humanoids-research.json. Source IDs are intentionally scoped to their review, because generic IDs such as product refer to different manufacturers. No new external claims, contacts, task evidence or shared manifests were added.

Validated with a strict local Zod schema, nine unique existing humanoid review IDs, unique capabilities per profile and 104 resolvable directly read source references. Focused assertions enforce H2 EDU tooling conditions, Digit gripper limitations, H2 Plus announced state, Figure 02/original-Apollo historical state and current TALOS research-order state. Root will validate the final shared capability schema and matcher behaviour.
