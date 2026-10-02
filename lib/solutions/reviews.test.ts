import { RESEARCHED_TASKS } from '@/lib/discovery/researched-tasks';
import { REVIEWED_TASK_LINKS } from '@/lib/discovery/task-links';
import { loadContent } from '@/lib/content/load';
import { taskCards } from '@/lib/tasks/cards';
import { snapshotFromCard } from '@/lib/plan/from-task';
import { describe, expect, it } from 'vitest';
import { loadSolutionReviews } from './load';
import { optionFromReview, reviewsForProject } from './plan';
import { SolutionReviewSchema } from './schema';
import { WORKFLOWS } from './workflows';
import { EMPTY_WORKSPACE, newProject, WorkspaceSchema } from '@/lib/plan/model';
import { emptyFacts } from '@/lib/screen/facts';

const reviews = loadSolutionReviews();
const record = () => structuredClone(reviews[0]);

describe('configuration evidence publication', () => {
  it('covers the expanded workflows with exact, independently identified configurations', () => {
    expect(reviews.length).toBeGreaterThanOrEqual(20);
    expect(new Set(reviews.map((review) => review.id)).size).toBe(reviews.length);
    for (const workflow of WORKFLOWS) expect(reviews.some((review) => review.workflowId === workflow.id)).toBe(true);
    for (const review of reviews) {
      expect(review.exactConfiguration.length).toBeGreaterThan(20);
      expect(review.unknowns.length).toBeGreaterThan(0);
      expect(review.sources.some((source) => source.kind === 'manufacturer' && source.retrievalMode === 'direct')).toBe(true);
    }
  });

  it('rejects orphaned citations, duplicate spec keys and a divergent source URL index', () => {
    const orphan = record();
    orphan.specs[0].sourceIds = ['missing-source'];
    expect(SolutionReviewSchema.safeParse(orphan).success).toBe(false);
    const duplicate = record();
    duplicate.specs.push({ ...duplicate.specs[0] });
    expect(SolutionReviewSchema.safeParse(duplicate).success).toBe(false);
    const missingURL = record();
    missingURL.sourceURLs = [];
    expect(SolutionReviewSchema.safeParse(missingURL).success).toBe(false);
  });

  it('does not promote a seller or an indexed manufacturer claim to directly supported evidence', () => {
    for (const change of ['seller', 'indexed_only'] as const) {
      const review = record();
      if (change === 'seller') review.sources.forEach((source) => { source.kind = 'seller'; });
      else review.sources.forEach((source) => { source.retrievalMode = 'indexed_only'; });
      expect(SolutionReviewSchema.safeParse(review).success).toBe(false);
      review.specs.forEach((spec) => { if (spec.value !== null) spec.verification = 'reported'; });
      expect(SolutionReviewSchema.safeParse(review).success).toBe(true);
    }
  });

  it('rejects invented values for unknown specifications, unsupported evidence stages and invalid dates', () => {
    const review = record();
    review.specs[0].verification = 'unknown';
    expect(SolutionReviewSchema.safeParse(review).success).toBe(false);
    review.specs[0].value = null;
    expect(SolutionReviewSchema.safeParse(review).success).toBe(true);
    review.taskEvidence[0].sourceIds = [];
    expect(SolutionReviewSchema.safeParse(review).success).toBe(false);
    const badDate = record();
    badDate.checkedAt = '2026-02-30';
    expect(SolutionReviewSchema.safeParse(badDate).success).toBe(false);
  });
});

describe('reviewed options in a saved company assessment', () => {
  it('retains exact configuration, sources, conflicts and unknowns across a workspace round trip', () => {
    for (const review of reviews) {
      const project = newProject('00000000-0000-4000-8000-000000000001');
      const workflow = WORKFLOWS.find((entry) => entry.id === review.workflowId)!;
      project.task = { kind: 'custom', family: workflow.family, workflowId: workflow.id, industry: review.industries?.[0], facts: emptyFacts() };
      project.options = [optionFromReview(review)];
      const saved = WorkspaceSchema.parse(JSON.parse(JSON.stringify({ ...EMPTY_WORKSPACE, projects: [project] }))).projects[0];
      expect(saved.task).toEqual(project.task);
      expect(saved.gate).toBe('unknown');
      expect(saved.options[0]).toMatchObject({ solutionReviewId: review.id, package: review.exactConfiguration, kind: 'custom', href: '/solutions/' + review.id });
      for (const source of review.sources) expect(saved.options[0].evidence).toContain(source.url);
      for (const gap of [...review.unknowns, ...review.conflicts]) expect(saved.options[0].evidence).toContain(gap);
      expect(Object.values(saved.options[0].costs).every((value) => value === '')).toBe(true);
      expect(reviewsForProject(reviews, saved)).toContainEqual(review);
      expect(reviewsForProject(reviews, saved).every((entry) => entry.workflowId === workflow.id && (!review.industries?.[0] || entry.industries?.includes(review.industries[0])))).toBe(true);
    }
  });

  it('keeps each researched use case scoped and retains its source boundaries after saving', () => {
    for (const point of RESEARCHED_TASKS) {
      const project = newProject('00000000-0000-4000-8000-000000000001');
      project.task = { kind: 'custom', opportunityId: point.id, industry: point.industries[0], family: point.family, facts: emptyFacts() };
      const saved = WorkspaceSchema.parse(JSON.parse(JSON.stringify({ ...EMPTY_WORKSPACE, projects: [project] }))).projects[0];
      const related = reviewsForProject(reviews, saved);
      expect(related.map(review => review.id).sort()).toEqual(point.reviewLinks!.map(link => link.reviewId).sort());
      for (const link of point.reviewLinks!) {
        const option = optionFromReview(related.find(review => review.id === link.reviewId)!, point.id);
        expect(option.evidence).toContain(link.rationale);
        for (const limit of link.limitations) expect(option.evidence).toContain(limit);
      }
    }
  });

  it('keeps partial-task boundaries when a sourced configuration is saved', () => {
    for (const link of REVIEWED_TASK_LINKS.filter((entry) => entry.relationship === 'partial_task')) {
      const review = reviews.find((entry) => entry.id === link.reviewId)!;
      const option = optionFromReview(review, link.taskId);
      expect(option.evidence).toContain('PARTIAL TASK SUPPORT:');
      expect(option.evidence).toContain(link.rationale);
      for (const limit of link.limitations) expect(option.evidence).toContain(limit);
    }
  });

  it('does not recommend small-part arms or warehouse bases for unsupported construction tasks', () => {
    const cards = taskCards(loadContent());
    for (const taskId of ['steel_fabrication/load-beam-drill-saw-line', 'mep_prefab/cut-large-bore-pipe-bars', 'site_plaster/plaster-bag-feeding', 'site_masonry/unit-staging-at-wall']) {
      const project = newProject('00000000-0000-4000-8000-000000000001');
      const card = cards.find((entry) => entry.id === taskId)!;
      expect(card).toBeDefined();
      project.task = { kind: 'library', snapshot: snapshotFromCard(card) };
      expect(reviewsForProject(reviews, project)).toEqual([]);
    }
  });

  it('fails oversized evidence imports instead of silently cutting a source link or condition', () => {
    const review = record();
    review.unknowns = ['Unresolved '.repeat(1000)];
    expect(() => optionFromReview(review)).toThrow();
  });
});
