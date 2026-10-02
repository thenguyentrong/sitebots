import { withPlatformMatches } from './capabilities';
import { loadResearchedOpportunities } from './opportunities';
import { reviewIdsForTask, ROUTE_INSPECTION_REVIEWS } from './matching';
export { reviewIdsForTask } from './matching';
import { RESEARCHED_OPPORTUNITIES } from './researched';
import { validateTaskReviewLinks, loadTaskReviewLinks } from './links';
import { INDUSTRIES, type IndustryId } from '@/lib/content/industries';
import { loadContent } from '@/lib/content/load';
import { taskCards } from '@/lib/tasks/cards';
import { loadSolutionReviews } from '@/lib/solutions/load';
import { WORKFLOWS, type WorkflowId } from '@/lib/solutions/workflows';
import { buildSimilarityLayout, CLUSTER_FOR_FAMILY, type OpportunityPoint, type OpportunitySeed } from './model';

export const INDUSTRY_TEMPLATES: { workflow: WorkflowId; industry: IndustryId; title: string; summary: string }[] = [
  { workflow: 'transport', industry: 'manufacturing', title: 'Move work-in-progress between factory stations', summary: 'Move loaded carts or containers between production stations. Loading, unloading and exceptions need their own setup.' },
  { workflow: 'transport', industry: 'warehousing', title: 'Move loaded carriers between warehouse handoffs', summary: 'Carry loaded shelves or containers between warehouse handoff points. Docking, loading and unloading depend on the configured setup.' },
  { workflow: 'machine_tending', industry: 'manufacturing', title: 'Load and unload production machines', summary: 'Transfer parts between a prepared station and a production machine. Grippers, fixtures, machine interfaces and safeguards are part of the setup.' },
  { workflow: 'inspection', industry: 'energy', title: 'Inspect energy assets on a planned route', summary: 'Collect visual, thermal or acoustic observations along a route through energy assets. Sensor suitability, access and human review need confirmation.' },
  { workflow: 'inspection', industry: 'manufacturing', title: 'Inspect industrial equipment during factory rounds', summary: 'Follow a factory route to observe industrial equipment and record inspection readings. Measurement quality and human follow-up depend on the configured setup.' },
  { workflow: 'inspection', industry: 'facilities', title: 'Inspect building assets on a planned route', summary: 'Follow a route through plant rooms and building equipment to collect inspection observations. Access and responsibility for reviewing findings need confirmation.' },
  { workflow: 'floor_cleaning', industry: 'facilities', title: 'Scrub floors in commercial buildings', summary: 'Wet-clean accessible floors in commercial buildings. Preparation, edges, waste water and maintenance need an agreed human workflow.' },
  { workflow: 'floor_cleaning', industry: 'warehousing', title: 'Scrub accessible warehouse floor routes', summary: 'Scrub accessible warehouse aisles and open floor areas in agreed traffic windows. Floor compatibility, preparation and maintenance need confirmation.' },
  { workflow: 'floor_cleaning', industry: 'retail_hospitality', title: 'Scrub floors in retail and hospitality spaces', summary: 'Scrub accessible shop, lobby or hospitality floor areas during agreed cleaning windows. Public access, edges and recovery need an agreed operating plan.' },
];


export function loadDiscoveryPoints(): OpportunityPoint[] {
  const content = loadContent();
  const reviews = loadSolutionReviews();
  const settings = new Map(content.settings.map((setting) => [setting.id, setting.title.en]));
  const cards = taskCards(content);
  const links = loadTaskReviewLinks(reviews, new Set(cards.map((task) => task.id)));
  const points: OpportunitySeed[] = cards.map((task) => ({
    id: task.id, title: task.title.en, summary: task.summary.en, industries: task.industries,
    family: task.family, clusterId: CLUSTER_FOR_FAMILY[task.family], setting: settings.get(task.setting) ?? task.setting,
    href: '/use-cases/' + task.setting + '/' + task.slug, reviewIds: [...reviewIdsForTask(task, reviews), ...links.filter((link) => link.taskId === task.id).map((link) => link.reviewId)],
    reviewLinks: links.filter((link) => link.taskId === task.id), kind: 'task',
    capabilities: task.capabilities_required, solutionClasses: task.solution_classes,
  }));
  for (const variant of INDUSTRY_TEMPLATES) {
    const workflow = WORKFLOWS.find((item) => item.id === variant.workflow);
    if (!workflow || !workflow.industries.includes(variant.industry)) throw new Error('Unsupported workflow industry template: ' + variant.workflow + '/' + variant.industry);
    points.push({
      id: 'workflow:' + workflow.id + ':' + variant.industry, title: variant.title, summary: variant.summary,
      industries: [variant.industry], family: workflow.family, clusterId: CLUSTER_FOR_FAMILY[workflow.family], setting: INDUSTRIES[variant.industry].en,
      href: '/workflows/' + workflow.id + '?industry=' + variant.industry,
      // New humanoid evidence belongs to exact linked tasks, not every industry template.
      reviewIds: reviews.filter((review) => review.robotClass !== 'humanoid' && review.workflowId === workflow.id && review.industries?.includes(variant.industry) && (workflow.id !== 'inspection' || ROUTE_INSPECTION_REVIEWS.has(review.id))).map((review) => review.id), kind: 'workflow',
      solutionClasses: workflow.alternatives,
    });
  }
  points.push(...[...RESEARCHED_OPPORTUNITIES, ...loadResearchedOpportunities(reviews)].map(point => ({ ...point, href: '/use-cases/custom?opportunity=' + encodeURIComponent(point.id) })));
  validateTaskReviewLinks(points.flatMap((point) => point.reviewLinks ?? []), reviews, new Set(points.map((point) => point.id)));
  return withPlatformMatches(buildSimilarityLayout(points), reviews);
}
