import type { PlatformMatch } from './platform-types';
import type { TaskReviewLink } from './links';
import { INDUSTRIES, type IndustryId } from '@/lib/content/industries';
import type { FamilyId } from '@/lib/content/vocab';

export type OpportunityPoint = {
  id: string; title: string; summary: string; industries: IndustryId[]; family: FamilyId;
  clusterId: string; setting: string; href: string; x: number; y: number; reviewIds: string[];
  kind: 'task' | 'workflow' | 'researched'; reviewLinks?: TaskReviewLink[]; platformMatches?: PlatformMatch[]; reviewAvailability?: Record<string, PlatformMatch['availability']>;
};
export const candidateReviewIds = (point: OpportunityPoint): string[] => [...new Set([...point.reviewIds, ...(point.platformMatches ?? []).map(match => match.reviewId)])];
export const hasTaskEvidence = (point: OpportunityPoint): boolean => !!point.reviewLinks?.some(link => point.reviewIds.includes(link.reviewId) && link.sourceIds.length > 0);
export type OpportunityCluster = { id: string; label: string; color: string };
export const OPPORTUNITY_CLUSTERS: readonly OpportunityCluster[] = [
  { id: 'research', label: 'Research & learning', color: '#64748b' },
  { id: 'transport', label: 'Transport', color: '#2563eb' },
  { id: 'handling', label: 'Pick, sort & handle', color: '#ea580c' },
  { id: 'machines', label: 'Machine work', color: '#7c3aed' },
  { id: 'assembly', label: 'Assembly & fastening', color: '#e11d48' },
  { id: 'inspection', label: 'Inspection & monitoring', color: '#0891b2' },
  { id: 'finishing', label: 'Surface finishing', color: '#c026d3' },
  { id: 'cleaning', label: 'Cleaning & replenishment', color: '#16a34a' },
];

export const DISCOVERY_LAYOUT_DESCRIPTION = 'Task-family clusters with a deterministic 2D similarity layout inside each cluster, using recorded task wording and metadata. Overlapping points are spread for readability. Position is not an ROI, readiness or suitability score; reviewed configurations are candidates for related work.';
export const CLUSTER_FOR_FAMILY: Record<FamilyId, string> = {
  robotics_research: 'research',
  intralogistics_transport: 'transport', kitting_picking_sorting: 'handling',
  heavy_element_handling: 'handling', packaging_palletising_loading: 'handling',
  machine_tending: 'machines', machine_operation_dedicated: 'machines',
  assembly_fastening: 'assembly', inspection_qa_documentation: 'inspection',
  monitoring_safety_patrol: 'inspection', layout_marking_surveying: 'inspection',
  surface_finishing: 'finishing', cleaning_housekeeping_replenishment: 'cleaning',
};

export type OpportunitySeed = Omit<OpportunityPoint, 'x' | 'y'> & {
  capabilities?: readonly string[];
  solutionClasses?: readonly string[];
};
export type OpportunityFilters = { industry?: string; cluster?: string; query?: string; reviewedOnly?: boolean };
const normalized = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[_\W]+/g, ' ').trim();

/** Filtering never recomputes positions, so the same task stays in place while narrowing the map. */
export function filterOpportunities(points: readonly OpportunityPoint[], filters: OpportunityFilters = {}): OpportunityPoint[] {
  const terms = normalized(filters.query ?? '').split(/\s+/).filter(Boolean);
  return points.filter((point) => {
    if (filters.industry && !point.industries.some((id) => id === filters.industry)) return false;
    if (filters.cluster && point.clusterId !== filters.cluster) return false;
    if (filters.reviewedOnly && !hasTaskEvidence(point)) return false;
    const searchable = normalized([point.title, point.summary, point.setting, point.family,
      OPPORTUNITY_CLUSTERS.find((cluster) => cluster.id === point.clusterId)?.label ?? '',
      ...point.industries.flatMap((id) => [id, INDUSTRIES[id].en, INDUSTRIES[id].de]),
    ].join(' '));
    return terms.every((term) => searchable.includes(term));
  });
}

// These centres organize the editorial families. Only local distances arise
// from PCA; distances between cluster centres have no quantitative interpretation.
const REGIONS: Record<string, { x: number; y: number; rx: number; ry: number }> = {
  research: { x: 50, y: 10, rx: 16, ry: 7 },
  transport: { x: 13, y: 24, rx: 11, ry: 13 },
  handling: { x: 24, y: 78, rx: 16, ry: 14 },
  machines: { x: 52, y: 84, rx: 12, ry: 10 },
  assembly: { x: 50, y: 44, rx: 18, ry: 22 },
  inspection: { x: 86, y: 26, rx: 12, ry: 16 },
  finishing: { x: 85, y: 72, rx: 13, ry: 18 },
  cleaning: { x: 15, y: 52, rx: 10, ry: 10 },
};
const STOP_WORDS = new Set('the and for from with into onto each this that their then they them its are before after through between over under along out off work task site all every where which when what have has one'.split(' '));
const compareIds = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const magnitude = (values: readonly number[]) => Math.sqrt(dot(values, values));

function featureRows(points: readonly OpportunitySeed[]): number[][] {
  const words = points.map((point) => new Set(normalized(point.title + ' ' + point.summary).split(' ').filter((word) => word.length > 2 && !/^\d+$/.test(word) && !STOP_WORDS.has(word))));
  const frequency = new Map<string, number>();
  for (const row of words) for (const word of row) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  const rows = points.map((point, index) => {
    const features = new Map<string, number>();
    features.set('family:' + point.family, 1.8);
    features.set('setting:' + point.setting, 1);
    for (const industry of point.industries) features.set('industry:' + industry, 0.8);
    for (const capability of point.capabilities ?? []) features.set('capability:' + capability, 0.7);
    for (const solutionClass of point.solutionClasses ?? []) features.set('approach:' + solutionClass, 0.45);
    const weighted = [...words[index]].map((word) => [word, Math.log((1 + points.length) / (1 + frequency.get(word)!)) + 1] as const);
    const length = Math.sqrt(weighted.reduce((sum, [, value]) => sum + value * value, 0)) || 1;
    for (const [word, value] of weighted) features.set('word:' + word, 1.4 * value / length);
    return features;
  });
  const columns = [...new Set(rows.flatMap((row) => [...row.keys()]))].sort();
  const dense = rows.map((row) => columns.map((column) => row.get(column) ?? 0));
  const means = columns.map((_, index) => dense.reduce((sum, row) => sum + row[index], 0) / dense.length);
  return dense.map((row) => row.map((value, index) => value - means[index]));
}

/** Power iteration over X^T X, with orthogonal deflation for the second component. */
function principalAxis(rows: readonly number[][], previous?: readonly number[]): number[] {
  const dimensions = rows[0]?.length ?? 0;
  const orthogonal = (values: number[]) => {
    if (!previous) return values;
    const projection = dot(values, previous);
    return values.map((value, index) => value - projection * previous[index]);
  };
  let vector = orthogonal(Array.from({ length: dimensions }, (_, index) => Math.sin((index + 1) * 1.61803398875)));
  let length = magnitude(vector);
  if (length < 1e-12) return Array(dimensions).fill(0);
  vector = vector.map((value) => value / length);
  for (let iteration = 0; iteration < 96; iteration++) {
    const scores = rows.map((row) => dot(row, vector));
    const next = orthogonal(Array.from({ length: dimensions }, (_, index) => rows.reduce((sum, row, rowIndex) => sum + row[index] * scores[rowIndex], 0)));
    length = magnitude(next);
    if (length < 1e-12) return Array(dimensions).fill(0);
    const normalizedNext = next.map((value) => value / length);
    const aligned = Math.abs(dot(vector, normalizedNext)) > 1 - 1e-10;
    vector = normalizedNext;
    if (aligned) break;
  }
  // Eigenvectors have arbitrary signs. Orient the largest loading consistently.
  const anchor = vector.reduce((best, value, index) => Math.abs(value) > Math.abs(vector[best]) ? index : best, 0);
  return vector[anchor] < 0 ? vector.map((value) => -value) : vector;
}

function localProjection(points: readonly OpportunitySeed[]): { x: number; y: number }[] {
  if (points.length < 2) return points.map(() => ({ x: 0, y: 0 }));
  const rows = featureRows(points);
  const first = principalAxis(rows);
  const second = principalAxis(rows, first);
  const coordinates = rows.map((row) => ({ x: dot(row, first), y: dot(row, second) }));
  const extentX = Math.max(...coordinates.map((point) => Math.abs(point.x))) || 1;
  const extentY = Math.max(...coordinates.map((point) => Math.abs(point.y))) || 1;
  return coordinates.map(({ x, y }) => ({ x: x / extentX, y: y / extentY }));
}

/** Separate coincident marks without adding synthetic opportunities or evidence. */
function spread(points: { x: number; y: number }[], region: typeof REGIONS[string]) {
  // The map projects x at 8.96 and y at 4.1 SVG units per percentage point.
  // Resolve collisions in that visual space, preserving the local PCA arrangement.
  const aspect = 8.96 / 4.1;
  const minimum = 2.8;
  for (let iteration = 0; iteration < 96; iteration++) {
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const dx = (points[j].x - points[i].x) * aspect, dy = points[j].y - points[i].y;
      const distance = Math.hypot(dx, dy);
      if (distance >= minimum) continue;
      const angle = ((i + 1) * 2.39996322973 + (j + 1) * 0.754877666) % (2 * Math.PI);
      const ux = distance > 1e-10 ? dx / distance : Math.cos(angle);
      const uy = distance > 1e-10 ? dy / distance : Math.sin(angle);
      const push = (minimum - distance) * 0.28;
      points[i].x -= ux * push / aspect; points[i].y -= uy * push;
      points[j].x += ux * push / aspect; points[j].y += uy * push;
    }
    for (const point of points) {
      point.x = Math.max(region.x - region.rx, Math.min(region.x + region.rx, point.x));
      point.y = Math.max(region.y - region.ry, Math.min(region.y + region.ry, point.y));
    }
  }
}

/** Stable input ordering, feature vocabulary and PCA signs make this layout reproducible. */
export function buildSimilarityLayout(seeds: readonly OpportunitySeed[]): OpportunityPoint[] {
  const ids = new Set<string>();
  for (const point of seeds) {
    if (ids.has(point.id)) throw new Error('Duplicate opportunity: ' + point.id);
    if (!REGIONS[point.clusterId]) throw new Error('Unknown opportunity cluster: ' + point.clusterId);
    ids.add(point.id);
  }
  const result: OpportunityPoint[] = [];
  for (const cluster of OPPORTUNITY_CLUSTERS) {
    const members = seeds.filter((point) => point.clusterId === cluster.id).sort(compareIds);
    if (!members.length) continue;
    const region = REGIONS[cluster.id];
    const coordinates = localProjection(members).map(({ x, y }) => ({ x: region.x + x * region.rx * 0.88, y: region.y + y * region.ry * 0.88 }));
    spread(coordinates, region);
    members.forEach(({ capabilities: _capabilities, solutionClasses: _solutionClasses, ...point }, index) => {
      result.push({ ...point, industries: [...new Set(point.industries)].sort(), reviewIds: [...new Set(point.reviewIds)].sort(), x: Number(coordinates[index].x.toFixed(4)), y: Number(coordinates[index].y.toFixed(4)) });
    });
  }
  return result.sort(compareIds);
}
