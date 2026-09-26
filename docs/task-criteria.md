# Task criteria

How a piece of work becomes a task in the library, what each task records, and
where every value comes from. The screen (five hard tests, five advisory) is in
`lib/screen`; this file is about what goes into it.

## Where a task sits

Construction-site work is grouped the way a Leistungsverzeichnis groups it: by
STLB-Bau Leistungsbereich (LB, list as of April 2024) and the VOB/C ATV that
governs the trade (DIN 18300 to DIN 18459, VOB 2019 contents). Each trade is a
setting (`data/settings/site_*.yaml`, with `section` and `lv: { lb, atv }`). The
seven sections are our grouping of the Leistungsbereiche, in LV order: site setup
and logistics, structure (Rohbau), envelope, interior (Ausbau), building services
(TGA), civil works, demolition and repair.

Surveying, setting out and site documentation are not LV trades. They sit in
`site_survey_documentation` with an empty LV reference and say so.

Factories, yards and building operation keep their settings by kind of plant or
asset.

## Which work becomes a task

1. **LV anchor.** On site, the task belongs to an LV position type of one
   Leistungsbereich (`lv.lb`, `lv.atv`, `lv.position`, `lv.unit`), so a contractor
   finds it in their own LV. Work outside the LV says so in `lv.position`.
2. **It repeats.** It recurs on most projects of that trade, not once per building.
3. **Physical and bounded.** One kind of object, one place, a clear start and end:
   "fix CW studs into UW tracks", not "build the drywall".
4. **Done by people today,** or by a machine whose place is the question.
5. **Sourced.** Every value below comes from a norm, a manufacturer datasheet, a
   trade body or a published study, or it is marked as an assumption with the
   reason. A value that cannot be sourced stays `null` with a note.

## What each task records

| Requirement | Field | Typical source |
|---|---|---|
| Heaviest single object | `attributes.object_mass_kg` | manufacturer datasheet (mass per piece, or per m² × standard format) |
| Largest object dimension | `requirements.object_size_m` | datasheet or product standard formats |
| Working height | `attributes.reach_height_m` | where the work is: floor, wall, ceiling; storey heights from the drawings or ASR A1.2 minimums |
| Tolerance the result must meet | `requirements.tolerance_mm` | DIN 18202 or the product's installation rules, from a page that states it |
| Force the work takes | `requirements.force_n` | manufacturer data (drilling, pressing, pulling) |
| Error cost, safety relevance | `error_tolerance`, `safety_criticality` | structural, fire or life safety per the norm or building regulation |
| Dust | `attributes.dust` | TRGS 559 (quartz), TRGS 553 (wood), TRGS 519 (asbestos) and the work step |
| Indoor or outdoor, wet, floor | `environment`, `wet`, `floor` | where the trade works |
| Machines that already do it | `incumbent_automation` | manufacturer product pages |
| Variability | `variability` | analyst judgement from the variants per LV position; always marked as judgement |

Confidence follows the curated layer: `confirmed` when the linked page states the
value, `likely` when it is derived from one (for example kg/m² × board format),
`assumed` when no source exists; the note says which.

## What the numbers on the page mean

The number next to a trade or setting is how many screened tasks the library holds
for it. It is not a score.
