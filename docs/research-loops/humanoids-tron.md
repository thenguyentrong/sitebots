# TRON identity and mobile research kits

Checked 2026-10-01. This batch adds two exact arm-equipped research configurations, four research opportunities, five explicit task links and two manufacturer renders. It does not establish production readiness.

## Identity decisions

- **TRON / Tron:** treated as a search or series term, not an invented third product. Official current product pages name **TRON 1** and **TRON 2**.
- **TRON 1:** a modular research biped with point-foot, sole and wheeled options. The base is not a full-body humanoid. The reviewed configuration is **TRON 1 EDU + TRON1-AP-YG Arm Expansion Kit**, in sole or wheeled mode. The EDU edition table supports secondary development/SDK; the Standard column does not.
- **TRON 2:** a modular embodied research platform. Its tabletop dual-arm, sole and wheeled forms are distinct. The reviewed configuration adds the **Autonomous Mobile Manipulation Expansion Kit**, which has **one 6-DoF arm rated by the kit page at 1.5 kg**, rather than the separate tabletop configuration's 7-DoF arms and advertised combined 10 kg capacity. The 30 kg base carrying figure is also a different measure.
- Both reviewed configurations genuinely fit `mobile_manipulator`; neither base biped was forced into the humanoid class. `research_education` industry and the root-added `robotics_research` workflow/family keep experiments separate from industrial buying claims.

## Sources and exact specifications

TRON 1:

- [Official overview](https://www.limxdynamics.com/en/products/tron1): arm-kit identity, research purposes and published manufacturer order route.
- [Current edition specifications](https://www.limxdynamics.com/en/products/tron1/spec): base-only dimensions, mass, battery, compute and EDU/Standard feature differences. HTML was read with `politeFetch`; embedded rendered table data retained column identity.
- [TRON1-AP-YG datasheet](https://limx-video-oss.limxdynamics.com/limx-website/products/tron1/kits/Mobile%20Manipulation%20Extension%20Kit%20Page.pdf): inspected PDF page 2 visually after downloading with `politeAsset`. Exact kit: 6 arm DoF, 647 mm reach, 0–1500 mm working height, 3.5 kg arm mass, 1.5 kg rated / 3.5 kg maximum payload, 1 m/s wheeled and 0.5 m/s sole speed. Those kit speeds take precedence over base-only speed figures for this configuration.
- Current overview advertises three modes per purchase, but current EDU table marks foot-end accessories optional. This discrepancy is retained; the quote must establish the delivered foot hardware.
- Older indexed base-runtime PDF wording was not imported: a direct fetch timed out, and no loaded arm-kit runtime was reviewed. Loaded runtime remains null.

TRON 2:

- [Official overview](https://www.limxdynamics.com/en/products/tron2): exact mobile-kit section and research applications, including floor pickup, switches/buttons and arm-leg coordination. The manufacturer’s scene is an illustration, not deployment evidence.
- [Dedicated specification tabs](https://www.limxdynamics.com/en/products/tron2/spec): the initial visible table is the base/dual-arm comparison. The **mobile-operation** tab has different hardware. Its official server-rendered tab payload was read directly and saved locally for audit: 6 DoF, 1.5 kg arm payload, 626.75 mm arm reach, ±0.1 mm arm repeatability, 0–70 mm gripper opening, 40 N rated grip force and D405 end-effector camera.
- Navigation accuracy (±20 cm) is not arm repeatability (±0.1 mm). The 90% mapping-session claim is retained with missing trial denominator/benchmark conditions. Maximum mapping area (4000 m²) is a mapping-session measure, not productive inspection coverage. Detailed compute/sensing fields are from the mobile-kit tab, not the tabletop dual-arm package.
- Kit configuration supports sole or wheeled-biped operation. PS4 teleoperation is listed; VR integration support does not imply an included headset. The word “Autonomous” in the product name is not treated as proof of autonomous completion of the selected research tasks.

All numeric published fields are labelled manufacturer-supported only where directly read official manufacturer material supports the value. Four fields remain unknown: loaded runtime and complete configured mass for each kit. There are 38 manufacturer-supported fields; no seller technical value was promoted to manufacturer-supported.

## Buying evidence

- [LimX sales form](https://www.limxdynamics.com/en/order), `bd@limxdynamics.com`, and the published WhatsApp order route `+86 180 2538 4639` were confirmed from the official website. This is an inquiry route, not German stock, delivery or price confirmation. Existing central contacts/status records remain untouched.
- [MegaRobotics TRON 1](https://www.megarobotics.de/de/products/limx-tron1) names the EDU/Standard versions and arm expansion kits, with procurement on request. [Public contact](https://www.megarobotics.de/de/contact) publishes `info@megarobotics.de` and a Kaarst, Germany address. The listing self-identifies as an official distributor; independent manufacturer authorization was not reviewed, so authorization is not asserted as verified.
- [reichelt TRON2 2-in-1](https://www.reichelt.com/de/en/shop/product/limx_dynamics_tron2_2-in-1-429867) explicitly lists core, wheel/sole hardware, sensors, battery and charger. It does **not** list the mobile manipulation kit. The review labels this as a base-only procurement route. The storefront states Germany, publishes Sande business contact `info@reichelt.de` / `+49 4422 955333`, and labels special-order delivery. No kit price or current lead time is inferred.
- Reichelt content was directly readable through the web tool. A later automated request through `politeFetch` was refused because robots.txt returned 503; there was no bypass or retry via another scraper. That limited refresh is recorded in the buying caveat.
- Reichelt's older Intel i7 description differs from current official EDU base Core Ultra and the mobile kit's separately described NVIDIA computing module. These are preserved as a bill-of-materials/revision question rather than merged into one specification.
- MegaRobotics also has a TRON2 family listing, but it does not substantiate the exact mobile-kit offer. It was checked as a lead and not added as a redundant complete-kit route.

## Task evidence and media

All task evidence remains **manufacturer_claim**: product material supports the named research applications but does not give accepted output, trial counts, supervision rates or production acceptance. Opportunities are:

1. Coordinate arm-and-leg control — both reviewed arm kits.
2. Research floor-level pickup — TRON 2 mobile kit.
3. Research switch/button reach — TRON 2 mobile kit.
4. Validate mapping and navigation — TRON 2 mobile kit sensors and software.

The two image URLs occur on the corresponding official product pages and were visually inspected with `politeAsset`: TRON 1's exact single-arm sole configuration and TRON 2's mobile-kit research scene. Both are explicitly labelled manufacturer renders. They do not establish shipped package contents or actual field deployments.

## Validation

- `ReviewBatchSchema`, local opportunity/media shapes and `validateTaskReviewLinks` passed before publication.
- JSON was assembled under `.out/tron-research`, parsed and validated, then renamed atomically into each owned data path. No partial live JSON was exposed.
- Saved-plan base evidence lengths were 1437 and 1897 characters; every associated task-context estimate remained below 4000 without dropping source URLs or material limits.
- No shared manifest, central purchasing/status record, database, deployment or external communication was changed by this batch.
