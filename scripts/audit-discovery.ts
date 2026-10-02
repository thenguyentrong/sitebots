import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { FOCUSED_FORM_FACTORS, focusedDiscoveryPoints, isFocusedReview } from '../lib/browse-scope';
import { loadDiscoveryPoints } from '../lib/discovery/load';
import { candidateReviewIds, type OpportunityPoint } from '../lib/discovery/model';
import { REVIEW_IMAGES } from '../lib/discovery/media';
import { requirementsForOpportunity } from '../lib/discovery/requirements';
import { loadSolutionReviews } from '../lib/solutions/load';
import { optionFromReview } from '../lib/solutions/plan';

const output = '.out/research-coverage';
mkdirSync(output, { recursive: true });
const reviews = loadSolutionReviews();
const points = loadDiscoveryPoints();
for (const review of reviews) optionFromReview(review);
const photoSchema = z.object({ url: z.url().startsWith('https://'), sourceUrl: z.url().startsWith('https://'), alt: z.string().min(10) });
for (const [id, photo] of Object.entries(REVIEW_IMAGES)) {
  photoSchema.parse(photo);
  if (!reviews.some(review => review.id === id)) throw new Error('Orphaned review image: ' + id);
}

const unique = (ids: string[]) => [...new Set(ids)];
function matchCounts(collection: OpportunityPoint[]) {
  return {
    opportunities: collection.length,
    opportunitiesWithCandidates: collection.filter(point => candidateReviewIds(point).length > 0).length,
    opportunitiesWithTaskLinkedReviews: collection.filter(point => point.reviewIds.length > 0).length,
    opportunitiesWithExplicitTaskLinks: collection.filter(point => point.reviewLinks?.length).length,
    opportunitiesWithoutExplicitTaskLinks: collection.filter(point => !point.reviewLinks?.length).length,
    opportunitiesWithPotentialMatches: collection.filter(point => point.platformMatches?.length).length,
    opportunitiesWithOnlyPotentialMatches: collection.filter(point => !point.reviewIds.length && point.platformMatches?.length).length,
    opportunitiesWithoutCandidates: collection.filter(point => !candidateReviewIds(point).length).length,
    taskReviewMatches: collection.reduce((sum, point) => sum + unique(point.reviewIds).length, 0),
    explicitTaskLinks: collection.reduce((sum, point) => sum + (point.reviewLinks?.length ?? 0), 0),
    relatedWorkMatchesWithoutExplicitTaskLink: collection.reduce((sum, point) => sum + unique(point.reviewIds).filter(id => !point.reviewLinks?.some(link => link.reviewId === id)).length, 0),
    potentialCapabilityMatches: collection.reduce((sum, point) => sum + unique((point.platformMatches ?? []).map(match => match.reviewId)).length, 0),
    candidateMatches: collection.reduce((sum, point) => sum + candidateReviewIds(point).length, 0),
  };
}

const publicReviews = reviews.filter(isFocusedReview);
const publicPoints = focusedDiscoveryPoints(points, publicReviews);
// Match the explorer's type control: an arm-equipped Spot is still a robot dog.
const publicForm = (review: typeof reviews[number]) => review.id === 'boston-dynamics-spot-arm-inspection' ? 'quadruped' : review.robotClass;
const typeLabels = { humanoid: 'Humanoids', quadruped: 'Robot dogs', mobile_manipulator: 'Mobile manipulators' };
const publicByFormFactor = Object.fromEntries(FOCUSED_FORM_FACTORS.map(form => {
  const scopedReviews = publicReviews.filter(review => publicForm(review) === form);
  const ids = new Set(scopedReviews.map(review => review.id));
  const scopedPoints = publicPoints.map(point => ({
    ...point,
    reviewIds: point.reviewIds.filter(id => ids.has(id)),
    reviewLinks: point.reviewLinks?.filter(link => ids.has(link.reviewId)),
    platformMatches: point.platformMatches?.filter(match => ids.has(match.reviewId)),
  })).filter(point => candidateReviewIds(point).length > 0);
  return [form, { label: typeLabels[form], configurationReviews: scopedReviews.length, ...matchCounts(scopedPoints) }];
}));

const sourceQueue = [...new Set(reviews.flatMap(review => review.sources.map(source => source.url)))].map(url => ({
  url, reviews: reviews.filter(review => review.sourceURLs.includes(url)).map(review => review.id),
  kinds: [...new Set(reviews.flatMap(review => review.sources.filter(source => source.url === url).map(source => source.kind)))],
}));
const gaps = reviews.map(review => ({
  id: review.id, name: review.name, hasImage: !!REVIEW_IMAGES[review.id],
  // Retain the old tasks field's reviewIds meaning; new fields distinguish the association types.
  tasks: points.filter(point => point.reviewIds.includes(review.id)).map(point => point.id),
  sourceLinkedTasks: points.filter(point => point.reviewLinks?.some(link => link.reviewId === review.id)).map(point => point.id),
  relatedWorkTasks: points.filter(point => point.reviewIds.includes(review.id) && !point.reviewLinks?.some(link => link.reviewId === review.id)).map(point => point.id),
  potentialTasks: points.filter(point => point.platformMatches?.some(match => match.reviewId === review.id)).map(point => point.id),
  candidateTasks: points.filter(point => candidateReviewIds(point).includes(review.id)).map(point => point.id),
  supportedFields: review.specs.filter(spec => spec.verification === 'manufacturer_supported').length,
  missingFields: review.specs.filter(spec => spec.value === null).map(spec => spec.key),
  buyingRoutes: review.buyingRoutes.length, conflicts: review.conflicts, openQuestions: review.unknowns,
  nextAction: !REVIEW_IMAGES[review.id] ? 'Find and confirm an exact-model product photograph' : review.unknowns[0],
}));
const unmatchedTasks = points.filter(point => !candidateReviewIds(point).length).map(({ id, title, industries, family }) => ({ id, title, industries, family, status: 'research_needed' }));
const taskEvidenceGaps = points.filter(point => !point.reviewLinks?.length).map(point => ({
  id: point.id, title: point.title, industries: point.industries, family: point.family,
  relatedWorkReviewIds: unique(point.reviewIds),
  potentialReviewIds: unique((point.platformMatches ?? []).map(match => match.reviewId)),
  status: candidateReviewIds(point).length ? 'candidate_options_task_evidence_needed' : 'research_needed',
}));
const cataloguePath = '.out/catalogue-audit/catalogue.json';
const catalogue = existsSync(cataloguePath) ? JSON.parse(readFileSync(cataloguePath, 'utf8')) as { key: string; name: string; public: boolean; images: number; missingCore: string[]; verified_fields: string[]; website: string | null; sourceUrls: string[] }[] : null;
const summary = {
  checkedAt: new Date().toISOString(), metricVersion: 2,
  ...matchCounts(points),
  configurationReviews: reviews.length, configurationsWithImages: Object.keys(REVIEW_IMAGES).length,
  specificationFields: reviews.reduce((sum, review) => sum + review.specs.length, 0),
  manufacturerSupportedFields: gaps.reduce((sum, review) => sum + review.supportedFields, 0),
  buyingRoutes: gaps.reduce((sum, review) => sum + review.buyingRoutes, 0), uniqueSourceURLs: sourceQueue.length,
  conflicts: gaps.reduce((sum, review) => sum + review.conflicts.length, 0), openQuestions: gaps.reduce((sum, review) => sum + review.openQuestions.length, 0),
  publicDiscovery: {
    formFactors: FOCUSED_FORM_FACTORS, configurationReviews: publicReviews.length, ...matchCounts(publicPoints),
    opportunitiesWithRecordedRequirements: publicPoints.filter(point => { const requirements = requirementsForOpportunity(point); return requirements.movement !== null && requirements.handWork !== null; }).length,
    byFormFactor: publicByFormFactor,
  },
  metricDefinitions: {
    scope: 'Top-level counts cover the retained research collection. publicDiscovery covers the current humanoid, robot-dog and mobile-manipulator browsing scope.',
    opportunitiesWithCandidates: 'Distinct opportunities with at least one ID in candidateReviewIds: the union of reviewIds and platformMatches.reviewId. This legacy key now includes potential capability matches; earlier audit outputs counted only reviewIds.',
    opportunitiesWithTaskLinkedReviews: 'Distinct opportunities with reviewIds. This preserves the former opportunitiesWithCandidates calculation. It includes explicit citations and older related-work leads; it does not establish exact-task performance.',
    explicitTaskLinks: 'Count of validated reviewLinks entries, each carrying task/source IDs, task_candidate or partial_task relationship, rationale and limitations. These are source-linked associations, not approvals.',
    taskReviewMatches: 'Distinct opportunity/reviewId pairs in reviewIds, including explicit task links and derived related-work leads.',
    relatedWorkMatchesWithoutExplicitTaskLink: 'Pairs in reviewIds without a matching reviewLinks entry, such as constrained legacy task/workflow associations. They are not counted as source-linked task citations.',
    potentialCapabilityMatches: 'Distinct opportunity/configuration pairs in platformMatches. Source-backed platform properties overlap editorial job requirements; the whole task remains unestablished.',
    candidateMatches: 'Distinct opportunity/configuration pairs across both association kinds, deduplicated per opportunity.',
    byFormFactor: 'Counts follow the robot-type filter, with Spot Arm treated as a robot dog. A job may appear under several types; per-type opportunity totals must not be summed.',
    configurationTasks: 'configurations.json tasks retains its reviewIds-only meaning. sourceLinkedTasks, relatedWorkTasks and potentialTasks split the associations; candidateTasks is their union.',
    unmatchedTasks: 'unmatched-tasks.json has no candidate of either kind. task-evidence-gaps.json contains opportunities without explicit reviewLinks, including related-work leads and conditional platform options.',
  },
  limitations: [
    'This command validates and counts local records. It makes no network requests and performs no source refresh, deployment verification or supplier enquiry.',
    'Task assumptions and capability overlap do not establish successful automation, safe operation, delivery, stock or German availability.',
    'Historical task evidence can remain visible; the capability matcher excludes historical platforms from new potential matches. Published lifecycle restrictions still apply.',
  ],
  broaderCatalogue: catalogue ? { configurations: catalogue.length, missingImage: catalogue.filter(robot => !robot.images).length, missingCoreSpecs: catalogue.filter(robot => robot.missingCore.length).length, status: 'Stored inventory audit; separate from these configuration reviews. Not refreshed or source-verified by this command.' } : null,
};
for (const [name, value] of Object.entries({ summary, configurations: gaps, 'unmatched-tasks': unmatchedTasks, 'task-evidence-gaps': taskEvidenceGaps, 'source-queue': sourceQueue, 'catalogue-queue': catalogue?.map(robot => ({ key: robot.key, name: robot.name, public: robot.public, website: robot.website, missingCore: robot.missingCore, missingImage: !robot.images, sourceUrls: robot.sourceUrls, reviewStatus: 'not_reviewed_here' })) ?? [] })) {
  writeFileSync(output + '/' + name + '.json', JSON.stringify(value, null, 2) + '\n');
}
console.log(JSON.stringify(summary, null, 2));
