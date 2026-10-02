// Client-safe words and the requirement map layout. No file system access here.

export const WHERE = [
  { id: 'site', label: 'Construction site' },
  { id: 'factory', label: 'Factory & workshop' },
  { id: 'yard', label: 'Warehouse & yard' },
  { id: 'building', label: 'Buildings & plants' },
  { id: 'lab', label: 'Lab & research' },
  { id: 'other', label: 'Farms & recycling' },
] as const;
export type WhereId = (typeof WHERE)[number]['id'];

export const CONDITIONS = [
  { id: 'indoor', label: 'Indoors' },
  { id: 'outdoor', label: 'Outdoors' },
  { id: 'rough', label: 'Rough ground or stairs' },
  { id: 'dust', label: 'Dusty' },
  { id: 'wet', label: 'Damp or wet' },
] as const;
export type ConditionId = (typeof CONDITIONS)[number]['id'];

export const MOVEMENT_LABELS = { stationary: 'At one spot', level_floors: 'Level floors', rough_ground: 'Rough ground', stairs_ladders: 'Stairs & ladders' } as const;
export const HAND_LABELS = { none: 'No hands', simple_grip: 'Pick & place', two_arm: 'Two arms', dexterous: 'Fine finger work', tool: 'Power tool' } as const;
export const JOB_LABELS: Record<string, string> = {
  layout_marking: 'Layout marking', drilling_anchoring: 'Drilling and anchors', demolition: 'Demolition', surface_spraying: 'Spraying and painting',
  drywall_finishing: 'Drywall finishing', floor_grinding: 'Floor grinding', concrete_finishing: 'Concrete finishing', rebar_tying: 'Rebar tying',
  rebar_placement: 'Rebar placement', bricklaying: 'Bricklaying', printing_3d: '3D printing', material_lifting: 'Material lifting', welding: 'Welding',
  facade_cleaning: 'Facade cleaning', glazing_installation: 'Glazing installation', scanning_documentation: 'Scanning and documentation',
  excavation: 'Excavation', tunnelling: 'Tunnelling', other: 'Other jobs',
};
export const STAGE_LABELS = { claim: 'Maker says it can', demo: 'Shown in a demo', pilot: 'Tested in a pilot', deployment: 'In daily use' } as const;

export const AXES = {
  movement: { label: 'Movement needed', levels: Object.entries(MOVEMENT_LABELS).map(([id, label]) => ({ id, label })) },
  handWork: { label: 'Hand work needed', levels: Object.entries(HAND_LABELS).map(([id, label]) => ({ id, label })) },
  robots: { label: 'Robots you can buy', levels: [{ id: '0', label: 'None yet' }, { id: '1', label: '1–2' }, { id: '3', label: '3–5' }, { id: '6', label: '6–10' }, { id: '11', label: '11 or more' }] },
  proof: { label: 'Best proof', levels: [{ id: 'none', label: 'No proof yet' }, { id: 'claim', label: 'Maker says' }, { id: 'demo', label: 'Demo' }, { id: 'pilot', label: 'Pilot' }, { id: 'deployment', label: 'In daily use' }] },
} as const;
export type AxisId = keyof typeof AXES;
export const AXIS_IDS = Object.keys(AXES) as AxisId[];
export const isAxis = (value: string | undefined): value is AxisId => !!value && value in AXES;

export const robotBin = (count: number) => (count >= 11 ? '11' : count >= 6 ? '6' : count >= 3 ? '3' : count >= 1 ? '1' : '0');

export type Placed = { x: number; y: number };
/** Places every point in its requirement cell, spread on a small grid so each dot stays clickable. x and y are 0–100. */
export function cellLayout<T extends { id: string; clusterId: string }>(points: readonly T[], xAxis: AxisId, yAxis: AxisId, value: (point: T, axis: AxisId) => string, aspect = 2.2): Map<string, Placed> {
  const xs = AXES[xAxis].levels.map((level) => level.id as string), ys = AXES[yAxis].levels.map((level) => level.id as string);
  const cells = new Map<string, T[]>();
  for (const point of points) {
    const key = value(point, xAxis) + '|' + value(point, yAxis);
    cells.set(key, [...(cells.get(key) ?? []), point]);
  }
  const cellW = 100 / xs.length, cellH = 100 / ys.length;
  const placed = new Map<string, Placed>();
  for (const [key, members] of cells) {
    const [xv, yv] = key.split('|');
    const ix = Math.max(0, xs.indexOf(xv)), iy = Math.max(0, ys.indexOf(yv));
    members.sort((a, b) => a.clusterId.localeCompare(b.clusterId) || a.id.localeCompare(b.id));
    const columns = Math.max(1, Math.ceil(Math.sqrt(members.length * aspect)));
    const rows = Math.ceil(members.length / columns);
    const dx = Math.min(cellW * 0.8 / Math.max(columns - 1, 1), 2.4), dy = Math.min(cellH * 0.74 / Math.max(rows - 1, 1), 5.2);
    const cx = (ix + 0.5) * cellW, cy = (iy + 0.5) * cellH;
    members.forEach((point, index) => {
      const col = index % columns, row = Math.floor(index / columns);
      const rowCount = row === rows - 1 ? members.length - row * columns : columns;
      placed.set(point.id, { x: cx + (col - (rowCount - 1) / 2) * dx, y: cy + (row - (rows - 1) / 2) * dy });
    });
  }
  return placed;
}
