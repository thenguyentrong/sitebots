import { canonicalManufacturerSlug, manufacturerLogo, type ManufacturerLogo } from '@/lib/manufacturers';
import { cataloguePathFor } from './links';
import { loadMarket, type MarketRobot } from './load';
import { reviewsFor } from './reviews';
import { JOB_LABELS, jobLabel } from './vocab';
import { loadUseCases, REGIONS, countryName, regionLabel } from './use-cases';
import type { Lang } from '@/lib/i18n/config';
import { INSIGHT_TEXT } from '@/lib/i18n/brands';
import { formatNumber } from '@/lib/i18n/format';

// Server-side only. The companies behind the market records: one slug per maker, the same slug the catalogue uses
// where the catalogue has the maker, so /brands/<slug> is the one company page either way.

const LEGAL = /\b(gmbh|mbh|ag|kg|se|ab|as|a\/s|aps|oy|bv|b\.v\.|nv|sa|s\.a\.|sas|s\.r\.l\.|srl|spa|s\.p\.a\.|ltd|ltd\.|limited|inc|inc\.|llc|corp|corp\.|corporation|co|co\.|company|plc|pte|pty|k\.k\.)\b\.?/gi;
export function slugifyMaker(name: string): string {
  return name.replace(/\(.*?\)/g, ' ').replace(/&/g, ' and ').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(LEGAL, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'unknown';
}

let makerSlugs: Map<string, string> | null = null;
/** Maker name to catalogue slug, learnt from the records that are linked to a catalogue page. */
function catalogueSlugs(): Map<string, string> {
  if (makerSlugs) return makerSlugs;
  makerSlugs = new Map();
  for (const robot of loadMarket()) {
    const path = cataloguePathFor(robot.id);
    const slug = path?.split('/')[2];
    if (slug && !makerSlugs.has(robot.maker)) makerSlugs.set(robot.maker, canonicalManufacturerSlug(slug));
  }
  return makerSlugs;
}

export function companySlugFor(robot: Pick<MarketRobot, 'id' | 'maker'>): string {
  const path = cataloguePathFor(robot.id);
  if (path) return canonicalManufacturerSlug(path.split('/')[2]);
  return catalogueSlugs().get(robot.maker) ?? canonicalManufacturerSlug(slugifyMaker(robot.maker));
}

export type MarketCompany = { slug: string; name: string; country: string | null; logo: ManufacturerLogo | null; robots: MarketRobot[] };

let companies: Map<string, MarketCompany> | null = null;
export function marketCompanies(): Map<string, MarketCompany> {
  if (companies) return companies;
  companies = new Map();
  for (const robot of loadMarket()) {
    const slug = companySlugFor(robot);
    const known = companies.get(slug);
    if (known) { known.robots.push(robot); known.country ??= robot.makerCountry ?? null; continue; }
    companies.set(slug, { slug, name: robot.maker.replace(/\s*\(.*?\)\s*/g, ' ').trim(), country: robot.makerCountry ?? null, logo: manufacturerLogo(slug), robots: [robot] });
  }
  return companies;
}
export const marketCompany = (slug: string): MarketCompany | null => marketCompanies().get(canonicalManufacturerSlug(slug)) ?? null;

export type CompanyInsight = {
  doesWhat: string;
  strengths: string[];
  weaknesses: string[];
  uses: { total: number; daily: number; regions: { label: string; count: number }[]; countries: string[] };
  reviews: { total: number; positive: number; mixed: number; critical: number };
  /** The same facts as numbers, for the scorecard. */
  facts: { robots: number; orderable: number; cart: number; sellers: string[]; priced: number; onSale: number };
};

/** What the records say about a company, in plain lines in the page's language (English by default, for the
 * adviser's tools and the tests). Every line is counted from the records, none is an opinion. */
export function companyInsight(robots: MarketRobot[], lang: Lang = 'en'): CompanyInsight {
  const t = INSIGHT_TEXT[lang];
  const count = (n: number) => ({ n, text: formatNumber(n, lang) });
  const plural = (n: number, [one, many]: [string, string]) => count(n).text + ' ' + (n === 1 ? one : many);
  const list = (items: string[]) => items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + t.and + items.at(-1);
  const ids = new Set(robots.map((robot) => robot.id));
  const byType = new Map<string, number>();
  for (const robot of robots) byType.set(robot.robotType, (byType.get(robot.robotType) ?? 0) + 1);
  const jobs = [...new Set(robots.flatMap((robot) => robot.specialisedFor ?? []).flatMap((job) => JOB_LABELS[job] ? [t.jobWord(jobLabel(job, lang))] : []))].slice(0, 4);
  const doesWhat = t.doesWhat(list([...byType].sort((a, b) => b[1] - a[1]).map(([type, n]) => plural(n, t.type[type] ?? [type, type]))), jobs.length ? list(jobs) : '');

  const sold = robots.filter((robot) => robot.germany.status === 'buy_now' || robot.germany.status === 'quote');
  const cart = robots.filter((robot) => robot.germany.status === 'buy_now');
  const sellers = [...new Set(sold.flatMap((robot) => robot.germany.sellers.map((seller) => seller.name.replace(/\s*\(.*$/, ''))))];
  const priced = robots.filter((robot) => robot.germany.priceEur || robot.germany.priceOther);
  const notSold = robots.filter((robot) => robot.germany.status === 'not_sold');
  const early = robots.filter((robot) => robot.lifecycle !== 'shipping' && robot.lifecycle !== 'discontinued');
  const uses = loadUseCases().filter((use) => ids.has(use.robotId));
  const daily = uses.filter((use) => use.stage === 'deployment').length;
  const countries = [...new Set(uses.flatMap((use) => use.countries))];
  const reviews = reviewsFor([...ids]).filter((review) => review.kind !== 'maker_testimonial');
  const positive = reviews.filter((review) => review.stance === 'positive').length;
  const critical = reviews.filter((review) => review.stance === 'negative').length;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const total = count(robots.length);
  if (sold.length) strengths.push(t.orderable(count(sold.length), total, cart.length ? count(cart.length) : null, sellers.slice(0, 3).join(' · '), sellers.length > 3));
  if (priced.length) strengths.push(t.priced(count(priced.length), total));
  if (uses.length) strengths.push(t.uses(count(uses.length), daily ? count(daily) : null, countries.length ? list(countries.slice(0, 4).map((code) => countryName(code, lang))) : '', Math.min(countries.length, 4), countries.length > 4));
  if (positive) strengths.push(t.positive(count(positive)));
  if (notSold.length) weaknesses.push(t.notSold(count(notSold.length), total));
  if (!priced.length) weaknesses.push(t.noPrice);
  else if (priced.length < robots.length) weaknesses.push(t.somePrices(count(robots.length - priced.length)));
  if (!uses.length) weaknesses.push(t.noUses);
  if (early.length) weaknesses.push(t.early(count(early.length), total));
  if (critical) weaknesses.push(t.critical(count(critical)));

  const regionCount = new Map<string, number>();
  for (const use of uses) regionCount.set(use.region, (regionCount.get(use.region) ?? 0) + 1);
  return {
    doesWhat, strengths, weaknesses,
    uses: { total: uses.length, daily, regions: REGIONS.filter((r) => regionCount.get(r.id)).map((r) => ({ label: regionLabel(r.id, lang), count: regionCount.get(r.id)! })), countries },
    reviews: { total: reviews.length, positive, mixed: reviews.filter((review) => review.stance === 'mixed').length, critical },
    facts: { robots: robots.length, orderable: sold.length, cart: cart.length, sellers, priced: priced.length, onSale: robots.filter((robot) => robot.lifecycle === 'shipping').length },
  };
}
