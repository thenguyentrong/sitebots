import { canonicalManufacturerSlug, manufacturerLogo, type ManufacturerLogo } from '@/lib/manufacturers';
import { cataloguePathFor } from './links';
import { loadMarket, type MarketRobot } from './load';
import { reviewsFor } from './reviews';
import { JOB_LABELS } from './vocab';
import { loadUseCases, REGIONS, countryName } from './use-cases';

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
};

const TYPE_WORD: Record<string, [string, string]> = {
  humanoid: ['humanoid', 'humanoids'], quadruped: ['robot dog', 'robot dogs'], mobile_manipulator: ['mobile manipulator', 'mobile manipulators'], specialised: ['job-specific construction robot', 'job-specific construction robots'],
};
const plural = (n: number, [one, many]: [string, string]) => n + ' ' + (n === 1 ? one : many);
const list = (items: string[]) => items.length <= 1 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items.at(-1);

/** What the records say about a company, in plain lines. Every line is counted from the records, none is an opinion. */
export function companyInsight(robots: MarketRobot[]): CompanyInsight {
  const ids = new Set(robots.map((robot) => robot.id));
  const byType = new Map<string, number>();
  for (const robot of robots) byType.set(robot.robotType, (byType.get(robot.robotType) ?? 0) + 1);
  const jobs = [...new Set(robots.flatMap((robot) => robot.specialisedFor ?? []).flatMap((job) => JOB_LABELS[job] ? [JOB_LABELS[job].toLowerCase()] : []))].slice(0, 4);
  const doesWhat = 'Makes ' + list([...byType].sort((a, b) => b[1] - a[1]).map(([type, n]) => plural(n, TYPE_WORD[type] ?? [type, type]))) + (jobs.length ? ', for ' + list(jobs) : '') + '.';

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
  if (sold.length) strengths.push(`${sold.length} of ${robots.length} robot${robots.length === 1 ? '' : 's'} can be ordered in Germany${cart.length ? `, ${cart.length} with a shop cart` : ''}${sellers.length ? `: ${sellers.slice(0, 3).join(' · ')}${sellers.length > 3 ? ' and others' : ''}` : ''}.`);
  if (priced.length) strengths.push(`Published price for ${priced.length} of ${robots.length} robot${robots.length === 1 ? '' : 's'}.`);
  if (uses.length) strengths.push(`${uses.length} documented use${uses.length === 1 ? '' : 's'} on real projects or demonstrations${daily ? `, ${daily} in daily use` : ''}${countries.length ? `, in ${list(countries.slice(0, 4).map(countryName))}${countries.length > 4 ? ' and more' : ''}` : ''}.`);
  if (positive) strengths.push(`${positive} positive independent review${positive === 1 ? '' : 's'} or user report${positive === 1 ? '' : 's'}.`);
  if (notSold.length) weaknesses.push(`${notSold.length} of ${robots.length} robots have no German or EU sales route we could find.`);
  if (!priced.length) weaknesses.push('No published price: every robot is on request.');
  else if (priced.length < robots.length) weaknesses.push(`${robots.length - priced.length} robots without a published price.`);
  if (!uses.length) weaknesses.push('No named project or demonstration found yet: only the maker\'s own claims.');
  if (early.length) weaknesses.push(`${early.length} of ${robots.length} robots are not yet on general sale (prototype, pilot or pre-order).`);
  if (critical) weaknesses.push(`${critical} critical review${critical === 1 ? '' : 's'} or bug report${critical === 1 ? '' : 's'} from users.`);

  const regionCount = new Map<string, number>();
  for (const use of uses) regionCount.set(use.region, (regionCount.get(use.region) ?? 0) + 1);
  return {
    doesWhat, strengths, weaknesses,
    uses: { total: uses.length, daily, regions: REGIONS.filter((r) => regionCount.get(r.id)).map((r) => ({ label: r.label, count: regionCount.get(r.id)! })), countries },
    reviews: { total: reviews.length, positive, mixed: reviews.filter((review) => review.stance === 'mixed').length, critical },
  };
}
