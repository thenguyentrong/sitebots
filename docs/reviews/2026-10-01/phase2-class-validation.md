# Phase 2 catalogue-class validation

Implemented classes: `amr_agv`, `industrial_arm`, `cobot`, `dedicated_robot`, `integrated_cell`. Existing IDs remain unchanged. `FORM_FACTORS` drives seed, alias, requirements, filter and saved model-pose schema validation. Class labels are exhaustive.

The append-only SQL migration expands `robots_form_factor_check`. The existing `robot_cards` view already carries arbitrary validated class values, so no view migration is necessary. No catalogue or remote database migration was executed. An isolated PGlite `memory://` regression test applies the old schema, inserts distinct base/EDU records, applies the updated schema twice, inserts every new class, reads them through the actual view and rejects unsupported class values. Existing identities remain unchanged.

Missing walking/hand/battery fields are not shown as humanoid requirements on stationary arm/cell pages. Explicitly recorded fields remain visible. Mixed comparisons use all selected classes rather than a humanoid fallback. New classes have neutral glyphs and only their recorded 3D presets. A class label does not establish working payload, runtime, task capability or application safety. The existing loaded-runtime evidence rule is unchanged and tested for all new classes.

Future ingestion must preserve measurement meaning: `reach_m` is vertical working reach from the floor, not arm radius. Generic new-class payloads stay unqualified; a single arm's DOF is not automatically doubled. Alias generation skips unclassified source records instead of defaulting them to humanoids. No scrapes or alias-data regeneration were run.

Focused command:

```text
npm test -- lib/spec/form-factors.test.ts lib/ingest/form-factors.test.ts lib/models/poses.test.ts scripts/scrape/_lib/specmap.test.ts lib/plan/solution-options.test.ts lib/catalogue/landscape.test.ts lib/jsonld.test.ts lib/match/evidence.test.ts lib/plan/intake.test.ts lib/plan/model.test.ts
```

Result: **49 tests in 10 files passed**. `npx tsc --noEmit --incremental false` passed after correcting the isolated SQL fixture row annotation. The required robot page screenshot was generated with `npm run shot -- http://localhost:3000/robots/unitree/g1 .out/phase2-g1.png`.

`npm run test:e2e -- tests/phase2.spec.ts --workers=1` passed **all 8 tests** in 23.4 seconds against localhost. The suite checks shareable industry/family filtering and uncovered selections; all four workflows through custom task, saved industry/workflow identity, related reviewed configuration, costs and printable brief; all source URLs and review links surviving reload; workflow/class/evidence-stage facets; specification conditions, contacts, conflicts and source retrieval modes; and phone-width overflow. Source-reviewed options retain unknown approval status and all 12 unanswered task requirements.

Screenshots: `.out/phase2-solutions-mobile.png`, `.out/phase2-catalogue-mobile.png`, `.out/phase2-g1.png`.
