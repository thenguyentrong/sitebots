# Germany robot market: research brief

Sitebots answers a buyer in Germany: which robots exist for my job, can I actually buy them here, what can they do, which one should I choose, and who sells it. Your records feed the use-case map and the robot choices directly. Wrong data is worse than missing data: a robot that cannot be bought in Germany must never look buyable.

Today is 2026-10-02. Use it for every `checkedAt`.

## Deliverable

One JSON file per exact robot configuration: `data/market/de/<id>.json`, where `<id>` is kebab-case `maker-model[-variant]` (e.g. `unitree-g1-edu`, `boston-dynamics-spot-arm`). The schema is `lib/market/schema.ts`; a complete example is `docs/research-loops/de-market/example-record.json`. Validate every file you write (run from the repository root `C:\Users\Vinh Nguyen\sitebots-scope-update`):

    node --import tsx scripts/check-market.ts data/market/de/<id>.json

A file is done only when it validates. Only write the files you were assigned; never edit or delete someone else's file.

Split variants only when buyers choose between them and they differ in what matters (hands, arms, payload, price, sold vs. not sold), e.g. G1 base vs G1 EDU, Spot vs Spot with Arm. Colour or battery options stay inside one record as notes.

## Germany status (`germany.status`)

- `buy_now`: a seller you can name lists this exact model for customers in Germany (shop page with price or order button, or the manufacturer's own EU shop or delivery to DE). The seller's `productUrl` is required.
- `quote`: sold into Germany on request. Evidence needed: a German/EU sales office, an authorised distributor or integrator for DE/EU, or documented customers in DE/EU, plus a contact route. No public price is fine.
- `preorder`: reservation, waitlist or pre-order only; deliveries to Germany not yet started.
- `not_sold`: no route for a German buyer (US-only, pilot partners only, not commercial, discontinued). Say why in `statusNote`.

A global "contact sales" form alone counts as `quote` only if the maker also shows it sells into Europe; otherwise use `not_sold` or `preorder` with the reason. When unsure between two, pick the less available one and explain in `statusNote`.

## Sources

- Every value comes from a page you actually opened (WebFetch, curl, or a search result you then opened). Never write a value from memory.
- Prefer, in order: manufacturer product page, datasheet or manual; manufacturer EU/DE shop; German/EU seller listing; integrator or customer report; trade press. Comparison sites and wikis are leads, not sources.
- `sources[].id` are `s1`, `s2`, ...; every `sourceId` you cite must exist in `sources`. HTTPS only.
- Unknown stays unknown: use `null`, never guess. Put what is missing in `openQuestions`.
- Prices: `germany.priceEur` only for a euro price a seller shows for Germany/EU (state net or gross). A USD/CNY list price goes to `priceOther`. Never convert currencies.
- Sellers: company name, country, role, the product page that lists this model, and the public business contact route (contact page, generic sales email or phone). No personal names, no personal email addresses.

## Specs (`specs[]`)

Use these keys where a source states them (add others in the same style if useful):
`height_m`, `weight_kg`, `dof_total`, `dof_per_arm`, `dof_per_hand`, `arm_payload_kg` (per arm; peak vs rated goes in `conditions`), `both_arms_payload_kg`, `carry_payload_kg` (on back/body), `max_speed_ms`, `runtime_h`, `battery_wh`, `swappable_battery`, `charging_time_h`, `ip_rating`, `operating_temp_c`, `reach_m`, `max_step_cm`, `max_slope_deg`, `stairs`, `compute`, `sensors`, `sdk`.
Write the conditions that change the meaning (per arm, peak, EDU only, standing, at 0.5 m extension).

## Capabilities (`capabilities`)

What this exact configuration can physically do, from the sources: legs/wheels/tracks; `levelFloors`; `roughGround`, `stairs`, `outdoor` (true/false, or null when no source says); number of `arms`; `hands`: `none` | `gripper` | `dexterous` (multi-finger) | `tool` (process tool such as a printer, drill or spray head) | `optional` (hands sold separately); `handsIncluded` in the sold configuration; `armPayloadKg` per arm (rated if given, else peak with a note); `carryPayloadKg`; `runtimeH`; `ipRating`; `sdk`. `notes` hold the limits a buyer must know.

## Images (`images[]`)

At least one official product image of this exact model: a direct image file URL (jpg/png/webp) from the manufacturer site or press kit, plus the page it appears on, credit (e.g. "Unitree Robotics") and alt text. Check the URL returns an image (`curl -sI <url>` shows content-type image/*). No AI images, no renders of other models, no stock photos. `kind: in_use` for photos of the robot at work.

## Evidence (`evidence[]`)

Real jobs this robot has done or is offered for: `stage` = `claim` (maker or seller says it can), `demo` (shown at a fair, in a video or lab), `pilot` (trial at a named customer), `deployment` (routine use at a named customer). Name `where` (customer/site/country) and `date`. Tag `taskIds` with matching ids from `data/market/use-case-index.json` (224 use cases: construction tasks by trade plus industrial and research jobs); leave `[]` when none fits. Do not stretch: "walks on a construction site" is not "drywall installation".

## Specialised robots

`robotType: specialised` covers machines built for one construction job (layout printing, drilling, demolition, finishing, lifting, bricklaying, rebar, 3D printing). List the use-case ids or plain job names in `specialisedFor`.

## Style

English, plain words, no marketing adjectives. `summary` is one sentence a site manager understands. Keep `statusNote` short and factual.

## Job keys

Use these keys in `specialisedFor` (and add use-case ids from the index where a specific task fits): `layout_marking`, `drilling_anchoring`, `demolition`, `surface_spraying`, `drywall_finishing`, `floor_grinding`, `concrete_finishing`, `rebar_tying`, `rebar_placement`, `bricklaying`, `printing_3d`, `material_lifting`, `welding`, `facade_cleaning`, `glazing_installation`, `scanning_documentation`, `excavation`, `tunnelling`, `other`.

## Robot type

- `humanoid`: human-like upper body with two arms and a head, on legs or on a wheeled base. Wheeled humanoids (for example AgiBot G2, Galbot G1, Rainbow RB-Y1) are humanoids with `wheels: true`.
- `quadruped`: four-legged robot, with or without wheels on the feet or an arm on its back.
- `mobile_manipulator`: one or more arms on a mobile base without a humanoid upper body (for example Hello Robot Stretch, PAL TIAGo, KUKA KMR iiwa, Omron MoMa). Plain transport robots without an arm are out of scope.
- `specialised`: a machine built for one construction job (see above).

Before writing `data/market/de/<id>.json`, check whether the file already exists. If another group wrote it, leave it alone and mention it in your notes.
