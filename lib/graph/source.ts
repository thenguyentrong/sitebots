import { loadContent } from '@/lib/content/load';
import { canonicalManufacturerSlug } from '@/lib/manufacturers';
import { jobsForRobot, loadJobs } from '@/lib/market/jobs';
import { cataloguePathFor, robotHref } from '@/lib/market/links';
import { ORDERABLE, isStrong } from '@/lib/market/match';
import { loadPlaces } from '@/lib/market/places';
import { taskCards } from '@/lib/tasks/cards';
import type { GraphInput } from './build';

// Server-side only. Gathers what buildGraph needs through the site's own loaders, so the graph can
// never disagree with the pages: the same matcher verdicts, the same links, the same evidence.

export function loadGraphInput(): GraphInput {
  const { jobs, marketRobots } = loadJobs();
  const content = loadContent();
  const tasks = new Map(taskCards(content).map((task) => [task.id, task]));
  const families = new Map(content.families.map((family) => [family.id as string, family.title]));
  const homeOf = new Map(content.settings.map((setting) => [setting.title.en, setting.id]));

  const brandHrefs: GraphInput['brandHrefs'] = {};
  for (const robot of marketRobots) {
    const path = cataloguePathFor(robot.id)?.split('/');
    if (path?.[2]) brandHrefs[robot.id] = '/brands/' + canonicalManufacturerSlug(path[2]);
  }

  return {
    robots: marketRobots,
    jobs: jobs.map((job) => {
      const task = tasks.get(job.id);
      const family = families.get(job.family);
      return {
        id: job.id, title: job.title, titleDe: task?.title.de ?? null, href: job.href, where: job.where, family: job.family, familyTerms: family ? [family.en, family.de] : [],
        settingId: task?.setting ?? homeOf.get(job.setting) ?? null, settingText: job.setting, alsoIn: task?.also_in_settings ?? [], rules: task?.compliance_flags ?? [],
      };
    }),
    settings: content.settings.filter((setting) => setting.status === 'published').map((setting) => ({
      id: setting.id, title: setting.title.en, titleDe: setting.title.de, group: setting.group, section: setting.section ?? null,
      aliases: [...setting.aliases.en, ...setting.aliases.de],
    })),
    rules: content.compliance.map((rule) => ({
      id: rule.id, title: rule.term_en, titleDe: rule.term_de, reference: rule.official_reference, url: rule.url, kind: rule.kind, jurisdiction: rule.jurisdiction, status: rule.status, triggers: rule.triggers,
    })),
    // jobsForRobot asks the same matcher as optionsForJob and also returns robots not sold here. The
    // filter is the one optionsForJob applies: a robot you cannot order is named only where it really
    // fits. Such a robot stays in the graph, marked by its status, because "all robots" means all.
    fits: marketRobots.flatMap((robot) => jobsForRobot(robot.id)
      .filter((job) => ORDERABLE.includes(robot.germany.status) || isStrong(job.fit))
      .map((job) => ({ robotId: robot.id, jobId: job.id, verdict: job.fit.verdict }))),
    places: loadPlaces(),
    robotHrefs: Object.fromEntries(marketRobots.map((robot) => [robot.id, robotHref(robot.id)])),
    brandHrefs,
  };
}
