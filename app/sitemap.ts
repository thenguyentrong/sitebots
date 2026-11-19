import type { MetadataRoute } from 'next';
import { localePath } from '@/lib/i18n/config';
import { listManufacturers } from '@/lib/queries/manufacturers';
import { listRobotPaths } from '@/lib/queries/robots';
import { loadMarket } from '@/lib/market/load';
import { cataloguePathFor } from '@/lib/market/links';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

type Entry = MetadataRoute.Sitemap[number];

/** Each page twice, once per language, and each entry names both versions (hreflang), English being the
 *  default for everyone else. */
function bothLanguages(entry: Omit<Entry, 'url' | 'alternates'> & { path: string }): Entry[] {
  const { path, ...rest } = entry;
  const en = SITE.url + localePath(path, 'en');
  const de = SITE.url + localePath(path, 'de');
  const alternates = { languages: { en, de, 'x-default': en } };
  return [{ url: en, ...rest, alternates }, { url: de, ...rest, alternates }];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [robots, makers] = await Promise.all([listRobotPaths(), listManufacturers()]);
  // Market records the catalogue carries live on their catalogue page.
  const market = loadMarket().filter((robot) => !cataloguePathFor(robot.id));
  return [
    { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/robots', changeFrequency: 'weekly' as const, priority: 0.9 },
    { path: '/use-cases', changeFrequency: 'weekly' as const, priority: 0.8 },
    { path: '/advisor', changeFrequency: 'monthly' as const, priority: 0.7 },
    ...market.map((robot) => ({ path: `/market/${robot.id}`, lastModified: robot.checkedAt, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { path: '/brands', changeFrequency: 'weekly' as const, priority: 0.6 },
    ...makers.map((m) => ({ path: `/brands/${m.slug}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...robots.map((r) => ({
      path: `/robots/${r.manufacturer}/${r.slug}`,
      lastModified: r.updated,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ].flatMap(bothLanguages);
}
