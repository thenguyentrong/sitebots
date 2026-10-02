# Mobile-platform capability profiles

Checked 2026-10-01. Six exact existing reviews are covered in `data/discovery-capabilities/mobile-platforms.json`. Every capability and lifecycle source ID resolves to that review's existing directly read source ledger. Absence means not established, not proof that a feature is physically impossible.

## Classification audit

The visible hospital task `research:hospital-supply-runs` links to **`diligent-moxi-2-hospital-delivery`**, in `data/discovery-opportunities/loop-02.json`. There is no LEJU, Legion or X2 configuration in that reviewed-task link. The user's approximate spoken model name may refer to Diligent Moxi 2.0, but that identity cannot be concluded from wording alone.

The [exact-generation manufacturer release](https://www.diligentrobots.com/blog/diligent-robotics-a-serve-robotics-company-begins-rolling-out-moxi-20) supports hospital logistics and a US rollout, not hotel delivery. It calls Moxi a mobile-manipulation platform but does not specify exact-generation gripper transfer, general tool use, bimanual or dexterous-hand capabilities. Consequently its profile has `manipulation: []` and is restricted to the existing hospital supply task. The archive and legitimate hospital source relationship are preserved; general manual-work matching must exclude it.

## Profile boundaries

| Exact review | Capability retained | Restriction |
| --- | --- | --- |
| Okibo EG7 | Level wheeled travel; configured coating/sanding tools | Only the reviewed wall/ceiling coating and drywall-joint-finishing task IDs. No general gripper, drilling or floor-grinding inference. |
| Canvas 1200CX | Level self-drive; configured joint-compound/sanding tools | Only the reviewed drywall-joint-finishing task ID. No general painting, gripping or arbitrary-tool inference. |
| Moxi 2.0 | Hospital corridor travel; commercial inquiry route | Hospital supply task only; no generalized manipulation feature inferred. |
| TRON 1 EDU + TRON1-AP-YG | Level sole/wheeled travel; single-arm gripper manipulation | Research-order status. No bimanual/dexterous/tool-use or loaded stair capability inferred. |
| TRON 2 mobile kit | Level travel; one configured gripper arm | Optional BrainCo Revo 2 Basic hand is `requires_tooling`, not the standard configuration. No tabletop dual-arm transfer. |
| Spot + Arm | Level and uneven/step mobility; one configured gripper arm | Capability belongs only to the arm-equipped configuration. Payload, route stability and supervision need qualification. |

Spot's [arm page](https://bostondynamics.com/products/spot/arm/) explicitly supports grasp/lift/carry/place and whole-body mobility with the arm. Its [base page](https://bostondynamics.com/products/spot/) publishes slope/step capability. The profile retains that category with a configured-load caveat; it does not promise the maximum arm load on every stair. Gripper-based valve/door interaction is not promoted to a dexterous hand or arbitrary powered-tool capability.

For TRON kits, bare-base terrain ratings were deliberately not used as evidence of loaded arm-kit terrain performance. The 1.5 kg single-arm figure is kept separate from peak load, base carrying capacity and tabletop dual-arm marketing. TRON 2's optional hand is supported by the directly read mobile-operation specification tab; exact hand supply, integration and demonstrated dexterity remain open.

Finishing and Moxi sources were re-opened during this bounded audit. The [Okibo exact-model page](https://okibo.com/our-robot/) describes coating/sanding tooling and omnidirectional movement; the [JLG 1200CX page](https://www.jlg.com/en/canvas/1200cx) describes self-drive, while its previously reviewed manufacturer launch describes compound application and sanding. These specialized processes must not become generalized arm capabilities.

## Integration and validation

- JSON shape and all source references were checked locally before atomic publication.
- `allowedTaskIds` is deliberately more restrictive than an entire finishing family: coating, sanding and floor grinding need different tools and evidence.
- Capabilities support provisional platform comparisons only. They are not new task-evidence links or performance validation.
- Parent owns shared schema, matching, UI and tests. No existing review, archive, catalogue, DB or purchasing record was removed or edited by this profile batch.
