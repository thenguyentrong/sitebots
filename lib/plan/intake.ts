import { JOBS } from './jobs';
import { newProject, type Project } from './model';

export type ProjectIdea = {
  id: string; title: string; jobId: string; settings: Project['setting'][]; humanoid: boolean;
  situation: string; outcome: string; trial: string; measure: string; alternative: string; costDrivers: string;
  reference?: { label: string; url: string };
};
export const PROJECT_IDEAS: ProjectIdea[] = [
  { id: 'totes', title: 'Bring parts to assembly', jobId: 'transport', settings: ['factory', 'yard'], humanoid: true,
    situation: 'Our team repeatedly moves loaded totes from storage to assembly stations. We want to reduce walking and keep parts available.',
    outcome: 'Fewer manual trips without delaying assembly.', trial: 'Start with one tote type, two agreed handoff points and a supervised route. Test grasping and unloading separately from carrying.',
    measure: 'Measure completed trips, human minutes per trip, interventions and damaged loads. Agree acceptance thresholds before the trial.',
    alternative: 'AMR with carts or a better replenishment route', costDrivers: 'Load carrier or grippers, navigation, handoff integration and supervision',
    reference: { label: 'Related deployment: Agility / GXO tote handling', url: 'https://www.agilityrobotics.com/content/gxo-signs-industry-first-multi-year-agreement-with-agility-robotics' } },
  { id: 'wood-parts', title: 'Sort timber parts into kits', jobId: 'sorting', settings: ['factory'], humanoid: true,
    situation: 'In our wood factory, people sort finished timber parts into kits for the next production step. Part shapes and surface finishes vary.',
    outcome: 'Correct kits with less repetitive handling.', trial: 'Start with one family of finished parts on a prepared table. Check grip, recognition, placement and surface damage before expanding the range.',
    measure: 'Measure correct placements, surface damage, cycle time and operator interventions. Agree thresholds with production.',
    alternative: 'Fixed robot arm with vision and organized part presentation', costDrivers: 'Grippers, vision, part fixtures, task programming and integration' },
  { id: 'machine', title: 'Prepare a machine-loading pilot', jobId: 'custom', settings: ['factory'], humanoid: true,
    situation: 'We want to explore a humanoid transferring blanks between a staging table and a machine-loading position.',
    outcome: 'Learn whether flexible handling can reduce repetitive loading work.', trial: 'Begin at a mock loading station with the machine inactive. Confirm reach, grip and repeatability. Machine interfaces and protective measures need a separate review before a live trial.',
    measure: 'Measure accepted placements, cycle time and interventions at the mock station. Agree stop criteria before testing.',
    alternative: 'Fixed loading cell or collaborative arm with fixtures', costDrivers: 'End effector, fixtures, machine interface, integration and operator training' },
  { id: 'site-delivery', title: 'Deliver tools to a work zone', jobId: 'transport', settings: ['site', 'yard'], humanoid: true,
    situation: 'People carry tools and consumables between a storage area and a work zone. Routes and handoff locations can change.',
    outcome: 'Reduce time spent walking for supplies.', trial: 'Choose one load and an agreed route. Record ground conditions, obstacles, access and who loads and unloads. Start with supervised deliveries.',
    measure: 'Measure completed deliveries, operator time, route interruptions and load damage.',
    alternative: 'Delivery carts, an AMR or repositioned storage', costDrivers: 'Load securing, navigation, changing routes and supervision' },
  { id: 'inspection-round', title: 'Repeat an inspection round', jobId: 'inspection', settings: ['site', 'factory', 'yard'], humanoid: false,
    situation: 'Our team walks the same route to inspect equipment. We want consistent observations for a person to review.',
    outcome: 'Repeatable observations with less routine travel.', trial: 'Choose a short route and a few agreed observation points. Specify the camera or sensor and have a person assess every result.',
    measure: 'Measure usable observations, missed points and total capture plus review time.',
    alternative: 'Fixed sensors or a handheld inspection workflow', costDrivers: 'Sensors, reporting software, navigation and human review' },
  { id: 'site-progress', title: 'Document site progress', jobId: 'progress', settings: ['site'], humanoid: false,
    situation: 'We need repeatable 360-degree images of construction progress, with less manual capture time and a usable report.',
    outcome: 'Comparable site imagery at agreed locations.', trial: 'Capture one accessible area repeatedly. Compare coverage, image quality and reporting effort with the current method.',
    measure: 'Measure usable coverage, repeated capture positions and total reporting time.',
    alternative: 'Handheld 360-degree capture with a consistent route', costDrivers: 'Camera, mount, capture software and reporting integration',
    reference: { label: 'Related application: Boston Dynamics site documentation', url: 'https://bostondynamics.com/solutions/digital-twin/site-documentation/' } },
  { id: 'floor-cleaning', title: 'Clean a defined work area', jobId: 'cleaning', settings: ['site', 'factory', 'yard'], humanoid: false,
    situation: 'We want to reduce repetitive floor cleaning in a defined work area. Debris, access and the required finish need to be agreed.',
    outcome: 'An accepted level of cleanliness with less total labor.', trial: 'Test one prepared area with representative debris. Include preparation, waste handling and cleanup in the comparison.',
    measure: 'Measure accepted area per hour, total human time and missed areas.',
    alternative: 'Dedicated cleaning machine or improved housekeeping process', costDrivers: 'Cleaning equipment, consumables, maintenance and waste handling' },
  { id: 'layout-marks', title: 'Transfer plans onto the floor', jobId: 'layout', settings: ['site'], humanoid: false,
    situation: 'Our team manually transfers digital layout information onto prepared floors. We want to reduce setting-out time and rework.',
    outcome: 'Accepted layout marks with less setup and rework.', trial: 'Use one prepared floor area and an agreed drawing. Check marks against an independent reference before using them for installation.',
    measure: 'Measure position error, accepted area, setup time and rework.',
    alternative: 'Surveying tools and an improved manual layout workflow', costDrivers: 'Marking system, drawing preparation, surveying and operator checks' },
];
export function ideasFor(setting: Project['setting'], focus: Project['focus']) {
  return PROJECT_IDEAS.filter((idea) => (!setting || idea.settings.includes(setting)) && (focus !== 'humanoid' || idea.humanoid));
}
const signals: Record<string, RegExp> = {
  transport: /\b(deliver\w*|carry\w*|carrying|transport\w*|totes?|logistics|replenish\w*|liefer\w*|tragen|kisten|logistik)\b/i,
  inspection: /\b(inspect\w*|inspection|equipment checks?|sensor readings?|inspek\w*|pr[uü]fen|kontroll\w*)\b/i,
  progress: /\b(progress|360|document\w*|photo\w*|bauforschritt|baufortschritt|dokument\w*)\b/i,
  monitoring: /\b(patrol\w*|monitor\w*|surveillance|[uü]berwach\w*)\b/i,
  layout: /\b(layout|marking|mark out|setting.out|absteck\w*|markier\w*)\b/i,
  cleaning: /\b(clean\w*|sweep\w*|scrub\w*|reinig\w*|putzen|kehren)\b/i,
  sorting: /\b(sort\w*|sorting|kits?|kitting|kommissionier\w*)\b/i,
};
/** Keyword suggestions select a question set; only confirmed form fields become technical constraints. */
export function suggestJobs(description: string) {
  const clauses = description.split(/[.!?;,]|\b(?:but|instead|aber|sondern)\b/i)
    .filter((clause) => !/\b(no|not|never|don't|do not|kein\w*|nicht)\b/i.test(clause));
  return JOBS.flatMap((job) => {
    const match = clauses.map((clause) => signals[job.id]?.exec(clause)?.[0]).find(Boolean);
    return match ? [{ job, reason: 'Suggested from “' + match + '” in your description.' }] : [];
  });
}
export function projectFromIdea(id: string, idea: ProjectIdea, setting: Project['setting'], focus: Project['focus']): Project {
  const project = newProject(id, idea.jobId, setting || (idea.settings.length === 1 ? idea.settings[0] : ''));
  return { ...project, title: idea.title, description: idea.situation, objective: idea.outcome, focus, ideaId: idea.id,
    pilot: { ...project.pilot, scope: idea.trial, success: idea.measure } };
}
export function alternativesFor(project: Project) {
  const idea = PROJECT_IDEAS.find((item) => item.id === project.ideaId && item.jobId === project.jobId);
  return idea?.alternative ?? ({ transport: 'AMR with carts or improved delivery routes', inspection: 'Fixed sensors or handheld inspection', progress: 'Handheld 360-degree capture', sorting: 'Fixed robot arm with organized part presentation', cleaning: 'Dedicated cleaning machine', layout: 'Surveying tools and manual layout', monitoring: 'Fixed sensors with human review' }[project.jobId] ?? 'Fixed automation or an improved manual process');
}
