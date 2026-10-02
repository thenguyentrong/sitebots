import { describe, expect, it } from 'vitest';
import type { OpportunityPoint } from './model';
import { axisOr, categoryLayout, wrapAxisLabel } from './map-layout';
const point = (id: string): OpportunityPoint => ({ id, title: id, summary: '', industries: ['manufacturing'], family: 'assembly_fastening', clusterId: 'assembly', setting: 'Factory', href: '/', x: 27, y: 43, reviewIds: ['one'], kind: 'task' });
const stationary = () => ({ movement: 'stationary' as const, handWork: 'simple_grip' as const, explanation: 'Test task assumption' });

describe('job requirement map axes', () => {
  it('labels movement and hand work from the supplied task assumptions', () => {
    const read = (item: OpportunityPoint) => item.id === 'travel'
      ? { movement: 'uneven_travel' as const, handWork: 'dexterous' as const, explanation: 'Test task assumption' }
      : stationary();
    const result = categoryLayout([point('station'), point('travel')], 'movement', 'handWork', read);
    expect(result.xTicks.map(tick => tick.label)).toEqual(['At a station', 'Travel on level floors', 'Handle steps or uneven terrain']);
    expect(result.yTicks.map(tick => tick.label)).toEqual(['No arm needed', 'Simple grip & transfer', 'Two-arm coordination', 'Dexterous hand or tool work']);
    expect(result.positions.get('station')).toMatchObject({ xLabel: 'At a station', yLabel: 'Simple grip & transfer' });
    expect(result.positions.get('travel')).toMatchObject({ xLabel: 'Handle steps or uneven terrain', yLabel: 'Dexterous hand or tool work' });
    expect(result.positions.get('travel')!.x).toBeGreaterThan(result.positions.get('station')!.x);
  });
  it('keeps missing assessments explicitly Unknown instead of inferring them from title, family or review count', () => {
    const unknown = () => ({ movement: null, handWork: null, explanation: 'No assessment' });
    const result = categoryLayout([point('transport-many-reviews')], 'movement', 'handWork', unknown);
    expect(result.positions.get('transport-many-reviews')).toMatchObject({ xLabel: 'Unknown', yLabel: 'Unknown' });
    expect(result.xTicks[0].key).toBe('unknown');
    expect(result.yTicks[0].key).toBe('unknown');
  });
  it('is deterministic under reordering, keeps shared requirements selectable and leaves similarity coordinates untouched', () => {
    const points = Array.from({ length: 12 }, (_, i) => point('task-' + i));
    const first = categoryLayout(points, 'movement', 'handWork', stationary);
    const second = categoryLayout([...points].reverse(), 'movement', 'handWork', stationary);
    expect([...first.positions]).toEqual([...second.positions]);
    expect(new Set([...first.positions.values()].map(value => value.x + ':' + value.y)).size).toBe(points.length);
    for (const value of first.positions.values()) {
      expect(Number.isFinite(value.x) && Number.isFinite(value.y)).toBe(true);
      expect(value.x).toBeGreaterThanOrEqual(0); expect(value.x).toBeLessThanOrEqual(100);
      expect(value.y).toBeGreaterThanOrEqual(0); expect(value.y).toBeLessThanOrEqual(100);
    }
    expect(points.every(item => item.x === 27 && item.y === 43)).toBe(true);
  });
  it('supports swapping axes, an empty collection and invalid old metadata axis URLs', () => {
    const result = categoryLayout([point('station')], 'handWork', 'movement', stationary);
    expect(result.positions.get('station')).toMatchObject({ xLabel: 'Simple grip & transfer', yLabel: 'At a station' });
    expect(categoryLayout([], 'movement', 'handWork', stationary).positions.size).toBe(0);
    expect(axisOr('reviews', 'movement')).toBe('movement');
    expect(axisOr('industry', 'handWork')).toBe('handWork');
    expect(axisOr('movement', 'handWork')).toBe('movement');
    expect(wrapAxisLabel('Travel on level floors')).toEqual(['Travel on level', 'floors']);
  });
});
