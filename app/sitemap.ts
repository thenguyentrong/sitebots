import type { MetadataRoute } from 'next';
import { loadContent } from '@/lib/content/load';
import { listManufacturers } from '@/lib/queries/manufacturers';
import { listRobotPaths } from '@/lib/queries/robots';
import { loadMarket } from '@/lib/market/load';
import { cataloguePathFor } from '@/lib/market/links';
import { SITE } from '@/lib/site';
import { taskCards } from '@/lib/tasks/cards';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [robots, makers] = await Promise.all([listRobotPaths(), listManufacturers()]);
  const tasks = taskCards(loadContent());
  // Market records the catalogue carries live on their catalogue page.
  const market = loadMarket().filter((robot) => !cataloguePathFor(robot.id));
  return [
    { url: `${SITE.url}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/use-cases`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE.url}/robots`, changeFrequency: 'weekly', priority: 0.9 },
    ...market.map((robot) => ({ url: `${SITE.url}/market/${robot.id}`, lastModified: robot.checkedAt, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${SITE.url}/use-cases/criteria`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE.url}/steps`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE.url}/costs`, changeFrequency: 'monthly', priority: 0.6 },
    ...tasks.map((task) => ({
      url: `${SITE.url}/use-cases/${task.setting}/${task.slug}`,
      lastModified: task.sources_reviewed_at,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${SITE.url}/brands`, changeFrequency: 'weekly', priority: 0.6 },
    ...makers.map((m) => ({ url: `${SITE.url}/brands/${m.slug}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...robots.map((r) => ({
      url: `${SITE.url}/robots/${r.manufacturer}/${r.slug}`,
      lastModified: r.updated,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
