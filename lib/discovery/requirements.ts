import type { OpportunityPoint } from './model';
export const MOVEMENT_LEVELS = [
  { id: 'stationary', label: 'At a station' },
  { id: 'level_travel', label: 'Travel on level floors' },
  { id: 'uneven_travel', label: 'Handle steps or uneven terrain' },
] as const;
export const HAND_WORK_LEVELS = [
  { id: 'none', label: 'No arm needed' },
  { id: 'simple_grip', label: 'Simple grip & transfer' },
  { id: 'two_arm', label: 'Two-arm coordination' },
  { id: 'dexterous', label: 'Dexterous hand or tool work' },
] as const;
export type MovementId = typeof MOVEMENT_LEVELS[number]['id'];
export type HandWorkId = typeof HAND_WORK_LEVELS[number]['id'];
export type JobRequirements = { movement: MovementId | null; handWork: HandWorkId | null; explanation: string; allowPlatforms: boolean; capability?: 'tool_use'; maxObjectMassKg?: number };
// Editorial task assumptions derived from the named job. They describe a proposed scope, not measured robot performance.
const RECORDED: Record<string, JobRequirements> = {
  "research:hospital-supply-runs": {
    "movement": "level_travel",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Compare prepared-package handling only; hospital access, hygiene, staff handoff and clinical workflows need separate integration."
  },
  "research:humanoid-assembly-kit-delivery": {
    "movement": "level_travel",
    "handWork": "two_arm",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-check-assembly-kit-completeness": {
    "movement": "stationary",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-component-precheck": {
    "movement": "stationary",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Handling is a potential subtask. Vision accuracy and quality acceptance are not established by having arms."
  },
  "research:humanoid-empty-tote-return": {
    "movement": "level_travel",
    "handWork": "two_arm",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-force-controlled-handling-research": {
    "movement": "stationary",
    "handWork": "dexterous",
    "allowPlatforms": false,
    "explanation": "Joint torque feedback and whole-body controller access are required; dexterous hands alone do not establish force-control support."
  },
  "research:humanoid-handle-stacked-totes": {
    "movement": "stationary",
    "handWork": "two_arm",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-load-sheet-metal-fixtures": {
    "movement": "stationary",
    "handWork": "two_arm",
    "allowPlatforms": true,
    "explanation": "Fixture loading only; welding, part geometry, sharp edges and machine interlocks require separate qualification."
  },
  "research:humanoid-record-manipulation-demonstrations": {
    "movement": "stationary",
    "handWork": "dexterous",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-sequence-components-into-trolleys": {
    "movement": "level_travel",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-sort-flow-rack-components": {
    "movement": "stationary",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-tactile-contact-experiments": {
    "movement": "stationary",
    "handWork": "dexterous",
    "allowPlatforms": false,
    "explanation": "Tactile sensing is required; dexterous hands alone do not establish tactile sensing."
  },
  "research:humanoid-test-learned-manipulation": {
    "movement": "stationary",
    "handWork": "dexterous",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-tote-conveyor-handoff": {
    "movement": "stationary",
    "handWork": "two_arm",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:humanoid-trial-aircraft-drilling": {
    "movement": "stationary",
    "handWork": "dexterous",
    "allowPlatforms": true,
    "explanation": "Requires an integrated drilling tool, process feedback and fixtures; tool holding alone is insufficient.",
    "capability": "tool_use"
  },
  "research:humanoid-whole-body-balance": {
    "movement": "level_travel",
    "handWork": "none",
    "allowPlatforms": true,
    "explanation": "Legged whole-body control experiments; exclude platforms only documented for wheeled travel."
  },
  "research:tron-coordinate-arm-leg-control": {
    "movement": "level_travel",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Requires access to coordinated leg and arm control; documentation and the delivered SDK must be confirmed."
  },
  "research:tron-floor-level-pickup": {
    "movement": "level_travel",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Floor reach, load and gripper geometry must be confirmed; arms alone do not establish floor pickup."
  },
  "research:tron-mapping-navigation-validation": {
    "movement": "level_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "research:tron-reach-switches-buttons": {
    "movement": "level_travel",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Needs controlled contact, usable height and external access permission; button pressing is a proposed integration task."
  },
  "asset_inspection_infrastructure/cable-tunnel-inspection": {
    "movement": "uneven_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "asset_inspection_infrastructure/parking-deck-condition-survey": {
    "movement": "level_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "asset_inspection_infrastructure/substation-rounds": {
    "movement": "uneven_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "facility_operation/night-security-patrol": {
    "movement": "uneven_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "facility_operation/plant-room-rounds": {
    "movement": "level_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "site_drywall/drywall-joint-finishing": {
    "movement": "level_travel",
    "handWork": "dexterous",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "site_painting/wall-ceiling-painting": {
    "movement": "level_travel",
    "handWork": "dexterous",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "workflow:inspection:energy": {
    "movement": "uneven_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "workflow:inspection:facilities": {
    "movement": "level_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "workflow:inspection:manufacturing": {
    "movement": "level_travel",
    "handWork": "none",
    "allowPlatforms": false,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site."
  },
  "construction_logistics_hub/kitting-per-crew": {
    "movement": "level_travel",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site.",
    "maxObjectMassKg": 12
  },
  "material_yard_warehouse/tote-handling": {
    "movement": "level_travel",
    "handWork": "two_arm",
    "allowPlatforms": true,
    "explanation": "Task assumptions: confirm the route, grasp, object weight and workspace for your site.",
    "maxObjectMassKg": 12
  },
  "prefab_timber/fittings-kitting": {
    "movement": "stationary",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "A clean, controlled picking station is assumed; dust protection, part recognition and presentation need confirmation.",
    "maxObjectMassKg": 2
  },
  "prefab_timber/intralogistics-between-stations": {
    "movement": "level_travel",
    "handWork": "two_arm",
    "allowPlatforms": true,
    "explanation": "Clean travel lanes and compatible prepared kit boxes are assumed; site dust and loaded reach need validation.",
    "maxObjectMassKg": 12
  },
  "prefab_timber/machine-tending-clean-zone": {
    "movement": "stationary",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Potential handling platform only; machine safety, fixture precision, tooling and interfaces are not supplied by a generic robot.",
    "maxObjectMassKg": 8
  },
  "prefab_timber/consumable-replenishment-housekeeping": {
    "movement": "level_travel",
    "handWork": "simple_grip",
    "allowPlatforms": true,
    "explanation": "Potential support for restocking and light packaging; magazine loading, sweeping and full housekeeping are separate tasks.",
    "maxObjectMassKg": 5
  },
  "facade_prefab/tape-airtight-window-connections": {
    "movement": "stationary",
    "handWork": "dexterous",
    "allowPlatforms": true,
    "explanation": "Research candidate for a prepared workbench. Flexible tape feeding, surface adhesion and accepted sealing quality need new development.",
    "maxObjectMassKg": 1
  },
  "joinery_windows_doors/fit-sash-hardware": {
    "movement": "stationary",
    "handWork": "dexterous",
    "allowPlatforms": true,
    "explanation": "Research candidate for light hardware at a prepared station. Screwdriving, alignment, torque and dust conditions need integration.",
    "capability": "tool_use",
    "maxObjectMassKg": 3
  },
  "site_joinery/door-hardware-fitting": {
    "movement": "level_travel",
    "handWork": "dexterous",
    "allowPlatforms": true,
    "explanation": "Research candidate for light lever-handle fitting; tool control, door geometry and fastening quality require validation.",
    "capability": "tool_use",
    "maxObjectMassKg": 1.5
  },
  "prefab_timber/insulation-batt-insertion": {
    "movement": "stationary",
    "handWork": "two_arm",
    "allowPlatforms": true,
    "explanation": "Potential manipulation platform for a controlled trial; deformable-material control and dust protection remain open.",
    "maxObjectMassKg": 5
  }
};
export function requirementsForOpportunity(point: Pick<OpportunityPoint, 'id'>): JobRequirements {
  return RECORDED[point.id] ?? { movement: null, handWork: null, explanation: 'Job requirements have not yet been described.', allowPlatforms: false };
}
