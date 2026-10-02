import { describe, expect, it } from 'vitest';
import { buildSimilarityLayout, filterOpportunities, OPPORTUNITY_CLUSTERS, type OpportunitySeed } from './model';

const seed = (id: string, patch: Partial<OpportunitySeed> = {}): OpportunitySeed => ({
  id, title: 'Move loaded carriers', summary: 'Deliver warehouse loads to an agreed handoff point.',
  industries: ['warehousing'], family: 'intralogistics_transport', clusterId: 'transport',
  setting: 'Warehouse', href: '/use-cases/example/' + id, reviewIds: [], kind: 'task',
  capabilities: ['carry_payload'], solutionClasses: ['amr_carts'], ...patch,
});
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('clustered similarity layout', () => {
  it('uses content similarity within a family, with stable order and no evidence-score axes', () => {
    const seeds = [seed('a'), seed('b'), seed('c', { title: 'Bring tools to assembly', summary: 'Deliver tools to factory workstations.', industries: ['manufacturing'], setting: 'Factory', capabilities: ['tool_handoff'] }), seed('d', { title: 'Bring tools to assembly', summary: 'Deliver tools to factory workstations.', industries: ['manufacturing'], setting: 'Factory', capabilities: ['tool_handoff'] })];
    const points = buildSimilarityLayout(seeds);
    expect(buildSimilarityLayout([...seeds].reverse())).toEqual(points);
    const [a, b, c, d] = points;
    expect(distance(a, b)).toBeLessThan(distance(a, c));
    expect(distance(c, d)).toBeLessThan(distance(a, c));
    const withReviews = buildSimilarityLayout(seeds.map((point) => ({ ...point, reviewIds: ['new-related-candidate'] })));
    expect(withReviews.map(({ x, y }) => [x, y])).toEqual(points.map(({ x, y }) => [x, y]));
    expect(points[0]).not.toHaveProperty('capabilities');
    expect(points[0]).not.toHaveProperty('readiness');
    expect(points[0]).not.toHaveProperty('score');
  });

  it('handles empty, single and identical metadata without NaN or fabricated extra points', () => {
    expect(buildSimilarityLayout([])).toEqual([]);
    for (const seeds of [[seed('one')], Array.from({ length: 12 }, (_, index) => seed('same-' + index))]) {
      const result = buildSimilarityLayout(seeds);
      expect(result).toHaveLength(seeds.length);
      expect(new Set(result.map(({ x, y }) => x + ':' + y)).size).toBe(result.length);
      for (const point of result) for (const coordinate of [point.x, point.y]) {
        expect(Number.isFinite(coordinate)).toBe(true);
        expect(coordinate).toBeGreaterThanOrEqual(0);
        expect(coordinate).toBeLessThanOrEqual(100);
      }
    }
  });

  it('rejects duplicate identities and unknown cluster names instead of inflating the map', () => {
    expect(() => buildSimilarityLayout([seed('same'), seed('same')])).toThrow('Duplicate opportunity');
    expect(() => buildSimilarityLayout([seed('one', { clusterId: 'invented' })])).toThrow('Unknown opportunity cluster');
    expect(new Set(OPPORTUNITY_CLUSTERS.map((cluster) => cluster.color)).size).toBe(OPPORTUNITY_CLUSTERS.length);
  });
});

describe('discovery filters', () => {
  const points = buildSimilarityLayout([
    seed('a'), seed('b', { reviewIds: ['review-1'], reviewLinks: [{ taskId: 'b', reviewId: 'review-1', relationship: 'task_candidate', rationale: 'The source describes the selected task.', sourceIds: ['source-1'], limitations: ['Site-specific fit remains to be tested.'] }] }),
    seed('c', { title: 'Inspect power equipment', summary: 'Observe temperature on an equipment route.', industries: ['energy'], family: 'inspection_qa_documentation', clusterId: 'inspection', setting: 'Plant room', reviewIds: ['review-2'] }),
  ]);
  it('combines all filters and preserves coordinates and references', () => {
    expect(filterOpportunities(points, { industry: 'warehousing', cluster: 'transport', query: 'warehouse carriers', reviewedOnly: true })).toEqual([points[1]]);
    // Related-work review IDs alone do not establish task-specific evidence.
    expect(filterOpportunities(points, { reviewedOnly: true })).toEqual([points[1]]);
    expect(filterOpportunities(points, { industry: 'energy' })[0]).toBe(points[2]);
    expect(filterOpportunities(points, {})).toEqual(points);
  });
  it('searches industry labels and wording, and leaves unsupported selections empty', () => {
    expect(filterOpportunities(points, { query: 'ENERGIE equipment' })).toEqual([points[2]]);
    expect(filterOpportunities(points, { industry: 'not-a-real-industry' })).toEqual([]);
    expect(filterOpportunities(points, { cluster: 'not-a-real-cluster' })).toEqual([]);
    expect(filterOpportunities(points, { query: 'no such application' })).toEqual([]);
  });
});
