import { describe, expect, it } from 'vitest';
import { loadSolutionReviews } from '@/lib/solutions/load';
import { loadDiscoveryPoints } from './load';
import { loadCapabilityProfiles, matchPlatforms } from './capabilities';
import { candidateReviewIds } from './model';
import { focusedDiscoveryPoints } from '@/lib/browse-scope';
const reviews = loadSolutionReviews();
const points = loadDiscoveryPoints();
const find = (id: string) => points.find(point => point.id === id)!;
describe('many-to-many job and platform matching', () => {
  it('offers multiple sourced alternatives for picking without rewriting task evidence', () => {
    const picking = find('research:humanoid-sort-flow-rack-components');
    expect(picking.reviewIds).toEqual(['ubtech-walker-s2-industrial']);
    expect(candidateReviewIds(picking)).toEqual(expect.arrayContaining(['unitree-h2-plus-sharpa-research', 'unitree-g1-edu-dex3-research', 'limx-tron-2-mobile-manipulation']));
    expect(candidateReviewIds(picking).length).toBeGreaterThanOrEqual(6);
    expect(picking.platformMatches!.every(match => match.sourceIds.length && match.limitations.length)).toBe(true);
    const plus = picking.platformMatches!.find(match => match.reviewId === 'unitree-h2-plus-sharpa-research')!;
    expect(plus.availability).toBe('announced');
    expect(points.filter(point => candidateReviewIds(point).includes(plus.reviewId)).length).toBeGreaterThan(5);
  });
  it('does not substitute delivery systems, paint heads, tote grippers or armless dogs for general picking', () => {
    const ids = candidateReviewIds(find('research:humanoid-sort-flow-rack-components'));
    for (const id of ['diligent-moxi-2-hospital-delivery', 'okibo-eg7-surface-finishing', 'canvas-1200cx-surface-finishing', 'agility-digit-4-tote-handling', 'boston-dynamics-spot-base-inspection']) expect(ids).not.toContain(id);
    expect(find('research:hospital-supply-runs').reviewIds).toContain('diligent-moxi-2-hospital-delivery');
  });
  it('respects known load limits, missing end effectors and historical generations', () => {
    const tending = candidateReviewIds(find('prefab_timber/machine-tending-clean-zone'));
    expect(tending).not.toContain('limx-tron-2-mobile-manipulation');
    expect(tending).not.toContain('unitree-g1-edu-dex3-research');
    const picking = find('research:humanoid-sort-flow-rack-components');
    expect(picking.platformMatches!.find(match => match.reviewId === 'unitree-h2-edu-research')!.requiresTooling).toBe(true);
    for (const point of points) for (const match of point.platformMatches ?? []) expect(match.availability).not.toBe('historical');
    expect(find('research:humanoid-load-sheet-metal-fixtures').reviewAvailability?.['figure-02-bmw-sheet-metal']).toBe('historical');
  });
  it('keeps conditional jobs visible and never expands unsupported or hazardous task scopes', () => {
    const profiles = loadCapabilityProfiles(reviews);
    expect(matchPlatforms(find('site_sewers/sewer-camera-inspection'), reviews, profiles)).toEqual([]);
    expect(matchPlatforms(find('facility_operation/floor-scrubbing'), reviews, profiles)).toEqual([]);
    expect(matchPlatforms(find('research:humanoid-force-controlled-handling-research'), reviews, profiles)).toEqual([]);
    const publicPoints = focusedDiscoveryPoints(points, reviews);
    expect(publicPoints.some(point => point.id === 'prefab_timber/fittings-kitting' && point.reviewIds.length === 0 && point.platformMatches!.length > 1)).toBe(true);
  });
});
