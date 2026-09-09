# Curated construction layer

One YAML per model. No public source says whether a humanoid may work outdoors,
climbs stairs, or carries a CE mark — these files do, and every entry says how
sure we are:

| confidence | meaning | needs |
|---|---|---|
| `confirmed` | the evidence URL states it | `evidence_url` |
| `likely` | inferred; the note says from what | a note |
| `assumed` | working assumption a buyer must check | a note |

Entries become tier-0 facts and show on the page as **Assessed** (or
**Verified** when a manufacturer fact agrees), with the note next to the value.
A `null` value is a documented gap: it stays in `curated_entries` with its note
but produces no fact — say what the gap implies in the entry that matters
(`outdoor_rated: false`), not by inventing an IP code.

Fields: `ip_rating`, `operating_temp_c {min_c,max_c}`, `stair_capable`,
`max_slope_deg`, `step_height_m`, `outdoor_rated`, `certifications[]`,
`task_capabilities[]`, `requires_operator`, `deployment_evidence[]`, `trl`,
`noise_db`, `reach_m`, `hot_swap`, `collaborative`. Vocabularies are in
`lib/spec/enums.ts`; `npm run curated -- --check` validates without a database.

## Parts and equipment

The same files can say what ships inside a robot and what can be bolted on.
Scalar parts fields: `hand_type` (one of `lib/spec/enums.ts` HAND_TYPES),
`hand_model`, `finger_count`, `compute_module`, `compute_tops`, `has_lidar`,
`lidar_model`, `cameras`, `force_torque`, `connectivity`, `battery_wh`.

Four structured fields hold lists; the shapes are in `lib/spec/parts.ts`:

| field | items | example |
|---|---|---|
| `sensors` | `{type, model?, count?, location?, note?}` | `{type: lidar, model: Livox Mid-360}` |
| `actuators` | `{group, type?, model?, count?, peak_torque_nm?, note?}` | `{group: leg, count: 12, peak_torque_nm: 139}` |
| `battery_pack` | `{chemistry?, voltage_v?, capacity_ah?, energy_wh?, cells_series?, packs?, model?, swappable?, note?}` | `{energy_wh: 564, swappable: true}` |
| `equipment_options` | `{type, name, maker?, url?, included?, note?}` | `{type: arm, name: Spot Arm, maker: Boston Dynamics, url: …}` |

`type` and `group` are closed vocabularies (EQUIPMENT_TYPES, SENSOR_TYPES,
ACTUATOR_GROUPS in `parts.ts`); an unknown value fails `--check`. Equipment lists
from different sources are merged (union on type + name), so a curated list and a
shop feed can both contribute. Only list what a maker or a partner actually sells
for that robot, with the page as `url` — see `boston-dynamics/spot.yaml`.
Actuator torques for robots with a 3D model come from the URDF limits via
`scripts/models/parts-from-model.ts`; no need to type those by hand.

Locally the files are applied on every `next dev` start. On Neon:
`npm run curated -- --commit`.
