import type { OpportunityPoint } from './model';
import { MOVEMENT_LEVELS, HAND_WORK_LEVELS, requirementsForOpportunity, type JobRequirements } from './requirements';

export const MAP_AXES = [
  { id: 'movement', label: 'Movement needed' },
  { id: 'handWork', label: 'Hand work needed' },
] as const;
export type MapAxis = typeof MAP_AXES[number]['id'];
export type MapLayout = 'similarity' | 'axes';
export const axisOr = (value: string | undefined, fallback: MapAxis): MapAxis => MAP_AXES.some(axis => axis.id === value) ? value as MapAxis : fallback;
export type AxisTick = { key: string; label: string; position: number };
export type AxisPosition = { x: number; y: number; xLabel: string; yLabel: string };
export type CategoryLayout = { positions: Map<string, AxisPosition>; xTicks: AxisTick[]; yTicks: AxisTick[] };
type RequirementsReader = (point: OpportunityPoint) => Pick<JobRequirements, 'movement' | 'handWork'>;
const levelsFor = (axis: MapAxis) => axis === 'movement' ? MOVEMENT_LEVELS : HAND_WORK_LEVELS;

function category(point: OpportunityPoint, axis: MapAxis, read: RequirementsReader): { key: string; label: string } {
  const value = read(point)[axis];
  const level = levelsFor(axis).find(item => item.id === value);
  return level ? { key: level.id, label: level.label } : { key: 'unknown', label: 'Unknown' };
}
function axisTicks(points: readonly OpportunityPoint[], axis: MapAxis, read: RequirementsReader): AxisTick[] {
  const levels: { id: string; label: string }[] = [...levelsFor(axis)];
  // Unknown is explicitly separated from assessed task requirements; it is not the lowest capability level.
  if (points.some(point => category(point, axis, read).key === 'unknown')) levels.unshift({ id: 'unknown', label: 'Unknown' });
  return levels.map((level, index) => ({ key: level.id, label: level.label, position: 100 * (index + .5) / levels.length }));
}

/** Positions express editorial task requirements, not robot capability ratings. Small within-cell offsets only keep jobs with the same requirements selectable. */
export function categoryLayout(points: readonly OpportunityPoint[], xAxis: MapAxis, yAxis: MapAxis, read: RequirementsReader = requirementsForOpportunity): CategoryLayout {
  const xTicks = axisTicks(points, xAxis, read), yTicks = axisTicks(points, yAxis, read);
  const values = points.map(point => ({ point, x: category(point, xAxis, read), y: category(point, yAxis, read) }));
  const center = (key: string, ticks: AxisTick[]) => ticks.find(tick => tick.key === key)!.position;
  const groups = new Map<string, typeof values>();
  for (const value of values) {
    const key = value.x.key + ':' + value.y.key;
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  const positions = new Map<string, AxisPosition>();
  // The drawing area is 730 x 320; account for that aspect ratio when spreading shared positions.
  const cellWidth = 730 / xTicks.length, cellHeight = 320 / yTicks.length;
  for (const group of groups.values()) {
    group.sort((a, b) => a.point.id.localeCompare(b.point.id));
    const columns = Math.min(group.length, Math.max(1, Math.ceil(Math.sqrt(group.length * cellWidth / cellHeight))));
    const rows = Math.ceil(group.length / columns);
    const dx = Math.min(16, cellWidth * .62 / Math.max(columns - 1, 1)) / 7.3;
    const dy = Math.min(16, cellHeight * .62 / Math.max(rows - 1, 1)) / 3.2;
    const startX = center(group[0].x.key, xTicks) - (columns - 1) * dx / 2;
    const startY = center(group[0].y.key, yTicks) - (rows - 1) * dy / 2;
    for (const [index, value] of group.entries()) {
      positions.set(value.point.id, {
        x: startX + (index % columns) * dx, y: startY + Math.floor(index / columns) * dy,
        xLabel: value.x.label, yLabel: value.y.label,
      });
    }
  }
  return { positions, xTicks, yTicks };
}

export function wrapAxisLabel(label: string, width = 18): string[] {
  const lines: string[] = [];
  for (const word of label.split(' ')) {
    const last = lines.at(-1);
    if (last && last.length + word.length + 1 <= width) lines[lines.length - 1] += ' ' + word;
    else lines.push(word);
  }
  return lines;
}
