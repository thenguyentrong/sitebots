import type { MetadataRoute } from 'next';
import { listManufacturers } from '@/lib/queries/manufacturers';
import { listRobotPaths } from '@/lib/queries/robots';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [robots, makers] = await Promise.all([listRobotPaths(), listManufacturers()]);
  return [
    { url: `${SITE.url}/`, changeFrequency: 'weekly', priority: 1 },
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
