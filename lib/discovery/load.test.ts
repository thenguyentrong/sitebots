import { describe, expect, it } from 'vitest';
import { loadContent } from '@/lib/content/load';
import { taskCards } from '@/lib/tasks/cards';
import { loadSolutionReviews } from '@/lib/solutions/load';
import { WORKFLOWS } from '@/lib/solutions/workflows';
import { filterOpportunities, OPPORTUNITY_CLUSTERS } from './model';
import { loadDiscoveryPoints, reviewIdsForTask, INDUSTRY_TEMPLATES } from './load';

const cards = taskCards(loadContent());
const reviews = loadSolutionReviews();
const points = loadDiscoveryPoints();


describe('real discovery opportunities', () => {
  it('includes each detailed task exactly once and only supported industry workflow variants', () => {
    const tasks = points.filter((point) => point.kind === 'task');
    const templates = points.filter((point) => point.kind === 'workflow');
    expect(tasks.map((point) => point.id).sort()).toEqual(cards.map((card) => card.id).sort());
    expect(templates).toHaveLength(INDUSTRY_TEMPLATES.length);
    expect(points).toHaveLength(cards.length + templates.length + points.filter((point) => point.kind === 'researched').length);
    expect(new Set(points.map((point) => point.id)).size).toBe(points.length);
    expect(new Set(templates.map((point) => point.title)).size).toBe(templates.length);
    for (const variant of INDUSTRY_TEMPLATES) {
      const workflow = WORKFLOWS.find((entry) => entry.id === variant.workflow)!;
      const industry = variant.industry;
      const point = templates.find((item) => item.id === 'workflow:' + workflow.id + ':' + industry);
      expect(point).toMatchObject({ industries: [industry], family: workflow.family, href: '/workflows/' + workflow.id + '?industry=' + industry });
    }
    for (const industry of ['manufacturing', 'warehousing', 'energy', 'facilities', 'retail_hospitality']) expect(filterOpportunities(templates, { industry }).length).toBeGreaterThan(0);
  });

  it('produces finite, stable, distinct coordinates within explicit family clusters', () => {
    expect(loadDiscoveryPoints()).toEqual(points);
    expect(new Set(points.map(({ x, y }) => x + ':' + y)).size).toBe(points.length);
    const clusters = new Set(OPPORTUNITY_CLUSTERS.map((cluster) => cluster.id));
    for (const point of points) {
      expect(clusters.has(point.clusterId)).toBe(true);
      for (const coordinate of [point.x, point.y]) {
        expect(Number.isFinite(coordinate)).toBe(true);
        expect(coordinate).toBeGreaterThanOrEqual(0);
        expect(coordinate).toBeLessThanOrEqual(100);
      }
      expect(point.href).toMatch(/^\/(use-cases|workflows|solutions)\//);
    }
  });

  it('keeps all real task marks visually separate at the map projection aspect ratio', () => {
    // The similarity map uses these SVG units; the ordinary marker diameter is 9.6.
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const distance = Math.hypot((points[i].x - points[j].x) * 8.96, (points[i].y - points[j].y) * 4.1);
      expect(distance, points[i].id + ' / ' + points[j].id).toBeGreaterThan(11);
    }
  });

  it('keeps every candidate reference in the reviewed registry and the related workflow family', () => {
    const byId = new Map(reviews.map((review) => [review.id, review]));
    for (const point of points) for (const id of point.reviewIds) {
      const review = byId.get(id);
      expect(review).toBeDefined();
      const family = WORKFLOWS.find((workflow) => workflow.id === review?.workflowId)?.family;
      if (point.reviewLinks?.some((link) => link.reviewId === id)) continue;
      if (point.family === 'monitoring_safety_patrol') expect(family).toBe('inspection_qa_documentation');
      else expect(family).toBe(point.family);
    }
    expect(points.some((point) => point.reviewIds.length === 0)).toBe(true);
  });

  it('keeps indoor route inspection separate from sewer crawling and preserves unique candidate IDs', () => {
    for (const point of points) expect(new Set(point.reviewIds).size).toBe(point.reviewIds.length);
    const plant = points.find(point => point.id === 'facility_operation/plant-room-rounds')!;
    expect(plant.reviewIds).toContain('unitree-b2-legged-inspection');
    expect(plant.reviewIds).toContain('deep-robotics-x30-pro-inspection');
    expect(plant.reviewIds.every(id => reviews.find(review => review.id === id)?.robotClass === 'quadruped' || id === 'boston-dynamics-spot-arm-inspection')).toBe(true);
    const factory = points.find(point => point.id === 'workflow:transport:manufacturing')!;
    expect(factory.reviewIds.every(id => reviews.find(review => review.id === id)?.industries.includes('manufacturing'))).toBe(true);
    const hospitalOnly = reviews.filter(review => review.industries.includes('healthcare_logistics') && !review.industries.includes('manufacturing'));
    expect(hospitalOnly.length).toBeGreaterThan(0);
    for (const review of hospitalOnly) expect(factory.reviewIds).not.toContain(review.id);
  });

  it('requires explicit task evidence for each humanoid map candidate', () => {
    const humanoids = reviews.filter(review => review.robotClass === 'humanoid');
    expect(humanoids.length).toBeGreaterThan(0);
    for (const review of humanoids) {
      const linked = points.filter(point => point.reviewIds.includes(review.id));
      expect(linked.length, review.id).toBeGreaterThan(0);
      for (const point of linked) {
        const link = point.reviewLinks?.find(link => link.reviewId === review.id);
        expect(link, point.id + ' / ' + review.id).toBeDefined();
        expect(link!.sourceIds.length).toBeGreaterThan(0);
        expect(link!.limitations.length).toBeGreaterThan(0);
      }
    }
    expect(points.find(point => point.id === 'prefab_timber/machine-tending-clean-zone')?.reviewIds.some(id => humanoids.some(review => review.id === id))).toBe(false);
  });

  it('never maps scrubbers to debris clearing, tool cleaning, glazing or consumable replenishment', () => {
    const cleaning = cards.filter((card) => card.family === 'cleaning_housekeeping_replenishment');
    for (const card of cleaning) {
      const candidates = reviewIdsForTask(card, reviews);
      if (card.id === 'facility_operation/floor-scrubbing') expect(candidates.length).toBeGreaterThan(0);
      else expect(candidates).toEqual([]);
    }
    for (const id of ['site_electrical/initial-verification', 'site_sewers/sewer-camera-inspection', 'site_screed/cm-moisture-test', 'asset_inspection_infrastructure/bridge-inspection']) {
      const card = cards.find((item) => item.id === id)!;
      expect(reviewIdsForTask(card, reviews)).toEqual([]);
    }
    expect(reviewIdsForTask(cards.find((card) => card.id === 'facility_operation/plant-room-rounds')!, reviews).length).toBeGreaterThan(0);
  });
});
