import { TASK_CAPABILITIES, type TaskCapability, type Trust } from '@/lib/spec/enums';
import type { Candidate } from '@/lib/match/types';

/** The 17 site tasks, grouped the way a site manager thinks about a day. Every task appears exactly once. */
export const TASK_BUCKETS: { id: string; label: string; tasks: TaskCapability[] }[] = [
  { id: 'transport', label: 'Transport', tasks: ['carry_payload', 'fetch_and_deliver', 'shelf_pick', 'tool_handoff'] },
  { id: 'inspection', label: 'Inspection & capture', tasks: ['site_inspection', 'progress_scan_360', 'lidar_scan', 'patrol_monitoring'] },
  { id: 'manipulation', label: 'Manipulation & tools', tasks: ['teleoperated_manipulation', 'drilling', 'screwing', 'material_sorting'] },
  { id: 'navigation', label: 'Navigation', tasks: ['autonomous_nav_indoor', 'autonomous_nav_outdoor', 'stair_climbing'] },
  { id: 'sitework', label: 'Site work', tasks: ['layout_marking', 'cleaning_sweep'] },
];

export const TASK_LABEL: Record<TaskCapability, string> = {
  carry_payload: 'Carry material', fetch_and_deliver: 'Fetch and deliver', shelf_pick: 'Pick from shelves', tool_handoff: 'Hand over tools',
  site_inspection: 'Site inspection', progress_scan_360: '360° progress capture', lidar_scan: 'LiDAR scanning', layout_marking: 'Layout marking',
  drilling: 'Drilling', screwing: 'Screwing', cleaning_sweep: 'Sweeping', material_sorting: 'Sorting material', patrol_monitoring: 'Patrol / monitoring',
  teleoperated_manipulation: 'Teleoperated handling', autonomous_nav_indoor: 'Navigate indoors alone', autonomous_nav_outdoor: 'Navigate outdoors alone', stair_climbing: 'Climb stairs',
};

export type TaskStatus = 'yes' | 'partial' | 'unknown' | 'no';
export type TaskRow = { id: TaskCapability; label: string; status: TaskStatus; wording: string };

/**
 * Per task: yes when the curated list names it with verified/assessed trust,
 * partial when only a third party reports it, no when a list exists and does
 * not name it, unknown when nobody has assessed the robot at all.
 */
export function taskRows(c: Candidate): { rows: TaskRow[]; trust: Trust } {
  const spec = c.card.specs?.task_capabilities;
  const listed = new Set<string>(Array.isArray(spec?.value) ? (spec.value as string[]) : c.card.task_capabilities ?? []);
  const assessed = Boolean(spec) || listed.size > 0;
  const trust: Trust = spec?.trust ?? (listed.size ? 'reported' : 'unknown');
  const rows = TASK_CAPABILITIES.map((id): TaskRow => {
    if (!assessed) return { id, label: TASK_LABEL[id], status: 'unknown', wording: 'not assessed' };
    if (listed.has(id)) return trust === 'reported' ? { id, label: TASK_LABEL[id], status: 'partial', wording: 'third-party report only' } : { id, label: TASK_LABEL[id], status: 'yes', wording: trust === 'verified' ? 'maker states it' : 'assessed with evidence' };
    return { id, label: TASK_LABEL[id], status: 'no', wording: 'no evidence' };
  });
  return { rows, trust };
}

export const TASK_SCORE: Record<TaskStatus, number | null> = { yes: 1, partial: 0.5, no: 0, unknown: null };
