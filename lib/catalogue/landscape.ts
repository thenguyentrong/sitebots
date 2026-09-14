import type { FormFactor, Trust } from '@/lib/spec/enums';

export const USE_CASES = [
  { id: 'logistics', label: 'Logistics', hint: 'Carry, deliver & hand over', tasks: ['carry_payload', 'fetch_and_deliver', 'shelf_pick', 'tool_handoff'] },
  { id: 'inspection', label: 'Inspection', hint: 'Inspect, scan & monitor', tasks: ['site_inspection', 'progress_scan_360', 'lidar_scan', 'patrol_monitoring'] },
  { id: 'production', label: 'Production & site work', hint: 'Handle, assemble & finish', tasks: ['teleoperated_manipulation', 'drilling', 'screwing', 'material_sorting', 'layout_marking', 'cleaning_sweep'] },
] as const;
export const ROBOT_GROUPS = [
  { id: 'humanoid', label: 'Humanoids', hint: 'Bipedal platforms' },
  { id: 'quadruped', label: 'Quadrupeds', hint: 'Four-legged platforms' },
  { id: 'mobile_manipulator', label: 'Mobile manipulators', hint: 'Mobile bases with arms' },
] as const;
export const MARKET_STAGES = [
  { id: 'commercial', label: 'Commercial', hint: 'Sales or enterprise access' },
  { id: 'upcoming', label: 'Upcoming', hint: 'Development & pre-orders' },
  { id: 'unconfirmed', label: 'Unconfirmed', hint: 'Availability needs evidence' },
] as const;export type UseCase = typeof USE_CASES[number]['id'];
export type MarketStage = typeof MARKET_STAGES[number]['id'];
export type ClusterRobot = {
  id: string; name: string; variant: string; href: string;
  maker: string; makerSlug: string; image: string | null; form: FormFactor;
  groups: UseCase[]; stage: MarketStage | null; stageLabel: string;
  tasks: { id: string; label: string }[]; trust: Trust;
  taskSource: string | null; taskDate: string | null;
  stageSource: string | null; stageDate: string | null; unmappedReason: string | null;
};
export function clusterMembers(robots: ClusterRobot[], selection: string): ClusterRobot[] {
  if (selection === 'unmapped') return robots.filter((robot) => robot.unmappedReason !== null);
  const [group, stage] = selection.split(':');
  return robots.filter((robot) => robot.stage === stage && (ROBOT_GROUPS.some((item) => item.id === group) ? robot.form === group : robot.groups.some((item) => item === group)));
}
export function selectedTasks(robot: ClusterRobot, selection: string) {
  const group = USE_CASES.find((item) => item.id === selection.split(':')[0]);
  return group ? robot.tasks.filter((task) => (group.tasks as readonly string[]).includes(task.id)) : robot.tasks;
}