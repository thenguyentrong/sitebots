import type { TaskCard } from '@/lib/tasks/types';
import type { SolutionReview } from '@/lib/solutions/schema';
import type { WorkflowId } from '@/lib/solutions/workflows';

// These routes share an observation/patrol workflow with the reviewed platforms.
// The other inspection tasks include testing, dimensions and regulated acceptance;
// a broad inspection family alone cannot establish a relevant sensing application.
const ROUTE_INSPECTION_TASKS = new Set([
  'asset_inspection_infrastructure/cable-tunnel-inspection',
  'asset_inspection_infrastructure/parking-deck-condition-survey',
  'asset_inspection_infrastructure/substation-rounds',
  'facility_operation/night-security-patrol',
  'facility_operation/plant-room-rounds',
]);

const LEGACY_ROUTE_INSPECTION_REVIEWS = new Set([
  'boston-dynamics-spot-base-inspection', 'boston-dynamics-spot-arm-inspection',
  'anybotics-anymal-d-inspection', 'anybotics-anymal-x-inspection',
 ]);
export const ROUTE_INSPECTION_REVIEWS = new Set([...LEGACY_ROUTE_INSPECTION_REVIEWS,
  'unitree-b2-legged-inspection', 'deep-robotics-x30-pro-inspection',
]);

/** Related-work research leads only; never a claim that a configuration performs the full task. */
export function reviewIdsForTask(task: Pick<TaskCard, 'id' | 'family'>, reviews: readonly SolutionReview[]): string[] {
  let workflow: WorkflowId | undefined;
  if (task.id === 'prefab_timber/machine-tending-clean-zone') workflow = 'machine_tending';
  else if ((task.family === 'inspection_qa_documentation' || task.family === 'monitoring_safety_patrol') && ROUTE_INSPECTION_TASKS.has(task.id)) workflow = 'inspection';
  // Scrubbing a floor is narrower than cleaning tools, windows, rubble or packaging.
  else if (task.family === 'cleaning_housekeeping_replenishment' && task.id === 'facility_operation/floor-scrubbing') workflow = 'floor_cleaning';
  // Humanoid pilots require an explicit task/source link; a shared workflow is insufficient.
  return workflow ? reviews.filter((review) => review.robotClass !== 'humanoid' && review.workflowId === workflow && (workflow !== 'inspection' || LEGACY_ROUTE_INSPECTION_REVIEWS.has(review.id))).map((review) => review.id).sort() : [];
}

