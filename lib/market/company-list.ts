import type { ManufacturerStatus } from '@/lib/manufacturers';
import { listManufacturers, type ManufacturerRow } from '@/lib/queries/manufacturers';
import { marketCompanies } from './companies';

// Server-side only. Every company the site knows: the catalogue's manufacturers plus the makers that only the
// German buying guide has (most job-specific construction machines), each with one country code (GB, not UK).

export type CompanyRow = ManufacturerRow & { status: ManufacturerStatus; inGuide: number };

export async function allCompanies(): Promise<CompanyRow[]> {
  const catalogue = await listManufacturers();
  const market = marketCompanies();
  const rows: CompanyRow[] = catalogue.map((m) => ({ ...m, country: m.country === 'UK' ? 'GB' : m.country, status: m.review?.status ?? 'unverified', inGuide: market.get(m.slug)?.robots.length ?? 0 }));
  const known = new Set(rows.map((row) => row.slug));
  for (const company of market.values()) {
    if (known.has(company.slug)) continue;
    const sold = company.robots.some((robot) => robot.lifecycle === 'shipping' || robot.germany.status === 'buy_now' || robot.germany.status === 'quote');
    rows.push({
      id: 'market:' + company.slug, slug: company.slug, name: company.name, country: company.country === 'UK' ? 'GB' : company.country,
      website_url: company.robots.find((robot) => robot.officialUrl)?.officialUrl ?? null, description: null,
      robots: company.robots.length, models: company.robots.length, humanoids: company.robots.filter((r) => r.robotType === 'humanoid').length,
      quadrupeds: company.robots.filter((r) => r.robotType === 'quadruped').length, verified_values: 0, review: null, logo: company.logo,
      status: sold ? 'commercial' : 'developing', inGuide: company.robots.length,
    });
  }
  return rows.sort((a, b) => b.robots - a.robots || a.name.localeCompare(b.name));
}
