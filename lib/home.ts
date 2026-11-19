import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import costs from '@/data/costs/trade-shares.json';
import type { Lang } from './i18n/config';
import { typeLabel } from './market/cards';
import { loadMarket } from './market/load';
import { ROBOT_TYPES, type RobotType } from './market/schema';
import { groupByRobot, scenePicture, settingTiles, type ScenePicture, type SettingTile } from './market/use-case-views';
import { loadUseCases, useCaseStats, type UseCaseStats } from './market/use-cases';

// Server-side only. What the start page shows: checked figures on German construction, where labour is most of
// the price, the robots already at work and the robots a German buyer can order. Each getter takes the page's
// language; English is the default, so scripts and tests read the English texts.

export type Figure = {
  id: string; value: string; unit?: string; label: string; context: string; year: string;
  /** Our German wording of label, unit, context and the second source's name. The quotes stay as published. */
  de?: { label: string; unit?: string; context: string; alsoPublisher?: string };
  source: { publisher: string; title: string; url: string; quote: string };
  /** A second source for a number named in the context. */
  also?: { publisher: string; url: string; quote: string };
};

/** The checked figures in data/industry/germany.json, each with the sentence it was read from. `value` stays
 * printed the English way ("2.58", "200,000+"); the start page's CountUp writes it the German way. */
export function industryFigures(lang: Lang = 'en'): Figure[] {
  try {
    const file = JSON.parse(readFileSync(join(process.cwd(), 'data', 'industry', 'germany.json'), 'utf8')) as { figures: Figure[] };
    if (lang === 'en') return file.figures;
    return file.figures.map((f) => f.de ? {
      ...f, label: f.de.label, unit: f.unit ? f.de.unit ?? f.unit : f.unit, context: f.de.context,
      also: f.also ? { ...f.also, publisher: f.de.alsoPublisher ?? f.also.publisher } : undefined,
    } : f);
  } catch {
    return [];
  }
}

// Short names for the trades in the Destatis cost-structure table. The German ones are the official WZ 2008
// names (the `de` column of trade-shares.json), shortened where they would not fit the bar chart.
const TRADE: Record<string, string> = {
  '43.34': 'Painting and glazing', '42.21': 'Pipelines and sewage works', '43.32': 'Joinery installation', '43.31': 'Plastering',
  '43.22': 'Plumbing, heating, ventilation', '43.33': 'Floor and wall covering', '43.13': 'Test drilling', '43.29': 'Other installation',
  '43.21': 'Electrical installation', '43.91': 'Roofing and carpentry', '43.99': 'Other specialist work', '42.11': 'Roads',
  '42.99': 'Other civil works', '43.39': 'Other finishing', '42.12': 'Railways', '42.91': 'Water engineering', '43.11': 'Demolition',
  '43.12': 'Site preparation', '42.22': 'Cable networks', '42.13': 'Bridges and tunnels', '41.20': 'Building construction', '41.10': 'Property development',
};
const TRADE_DE: Record<string, string> = {
  '43.34': 'Malerei und Glaserei', '42.21': 'Rohrleitungs- und Kläranlagenbau', '43.32': 'Bautischlerei und -schlosserei', '43.31': 'Gipserei und Verputzerei',
  '43.22': 'Sanitär, Heizung, Lüftung', '43.33': 'Fußboden- und Fliesenlegerei', '43.13': 'Test- und Suchbohrung', '43.29': 'Sonstige Bauinstallation',
  '43.21': 'Elektroinstallation', '43.91': 'Dachdeckerei und Zimmerei', '43.99': 'Sonstige spezialisierte Bautätigkeiten', '42.11': 'Straßenbau',
  '42.99': 'Sonstiger Tiefbau', '43.39': 'Sonstiger Ausbau', '42.12': 'Bahnstreckenbau', '42.91': 'Wasserbau', '43.11': 'Abbrucharbeiten',
  '43.12': 'Vorbereitende Baustellenarbeiten', '42.22': 'Kabelnetzleitungstiefbau', '42.13': 'Brücken- und Tunnelbau', '41.20': 'Bau von Gebäuden', '41.10': 'Bauträger',
};

export type LabourShare = { wz: string; label: string; value: number };
/** Personnel costs as a share of production value per trade, highest first, with building construction for scale. */
export function labourShares(lang: Lang = 'en'): { top: LabourShare[]; building: LabourShare | null; source: { title: string; publisher: string; url: string }; hourly: { value: number; year: number } | null; ecklohn: { value: number; group: string } | null } {
  const rows = costs.labour.map((row) => ({ wz: row.wz, label: lang === 'de' ? TRADE_DE[row.wz] ?? row.de : TRADE[row.wz] ?? row.en, value: row.value }));
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const f = costs.hourly.labourCost.find((row) => row.wz === 'F' && row.year === 2025) ?? null;
  const eck = costs.hourly.tariff.groups.find((group) => group.group === 'Lohngruppe 4') ?? null;
  return {
    top: sorted.slice(0, 10), building: rows.find((row) => row.wz === '41.20') ?? null,
    source: { title: costs.sources.labour.title, publisher: costs.sources.labour.publisher, url: costs.sources.labour.url },
    hourly: f ? { value: f.value, year: f.year } : null,
    ecklohn: eck ? { value: eck.gtl, group: eck.group } : null,
  };
}

export type BuyGroup = { type: RobotType; label: string; count: number; priced: number; from: number | null; picture: ScenePicture | null };
/** Robots a German buyer can order now or on request, per type, each with a photo. */
export function buyGroups(lang: Lang = 'en'): BuyGroup[] {
  const robots = loadMarket().filter((robot) => robot.germany.status === 'buy_now' || robot.germany.status === 'quote');
  const used = new Set<string>();
  return ROBOT_TYPES.map((type) => {
    const list = robots.filter((robot) => robot.robotType === type);
    const prices = list.flatMap((robot) => robot.germany.priceEur ? [robot.germany.priceEur.amount] : []);
    let picture: ScenePicture | null = null;
    // A photo of work first, from a robot with a shop price.
    for (const robot of [...list].sort((a, b) => Number(Boolean(b.germany.priceEur)) - Number(Boolean(a.germany.priceEur)))) {
      const p = scenePicture(robot, used);
      if (p && !used.has(p.src) && (p.scene || !picture)) { picture = p; if (p.scene) break; }
    }
    if (picture) used.add(picture.src);
    return { type, label: typeLabel(type, lang), count: list.length, priced: prices.length, from: prices.length ? Math.min(...prices) : null, picture };
  }).filter((group) => group.count);
}

export function useCaseOverview(lang: Lang = 'en'): { stats: UseCaseStats; tiles: SettingTile[] } {
  const all = loadUseCases();
  return { stats: useCaseStats(all), tiles: settingTiles(all, lang) };
}

export type Series = {
  id: string; label: string; unit: string; de?: { label: string; unit: string };
  points: [number, number][]; source: { publisher: string; url: string; quote: string };
};
/** The checked yearly series in data/industry/germany.json. */
export function industrySeries(lang: Lang = 'en'): Map<string, Series> {
  try {
    const file = JSON.parse(readFileSync(join(process.cwd(), 'data', 'industry', 'germany.json'), 'utf8')) as { series?: Series[] };
    return new Map((file.series ?? []).map((s) => [s.id, lang !== 'en' && s.de ? { ...s, label: s.de.label, unit: s.de.unit } : s]));
  } catch {
    return new Map();
  }
}

/** Documented robot jobs per year of their source, from the first year with one to now. */
export function useCaseYears(): ({ year: number } & Record<'deployment' | 'pilot' | 'demo', number>)[] {
  const by = new Map<number, { deployment: number; pilot: number; demo: number }>();
  for (const use of loadUseCases()) {
    const year = Number(use.date?.slice(0, 4));
    if (!year) continue;
    const row = by.get(year) ?? { deployment: 0, pilot: 0, demo: 0 };
    row[use.stage]++;
    by.set(year, row);
  }
  const years = [...by.keys()];
  if (!years.length) return [];
  const out = [];
  for (let year = Math.min(...years); year <= Math.max(...years); year++) out.push({ year, ...(by.get(year) ?? { deployment: 0, pilot: 0, demo: 0 }) });
  return out;
}

/** `label` is our caption, so it has a German version; `title` and `channel` are the maker's own and stay as published. */
export type Video = { id: string; robotId: string; label: string; de?: { label: string }; title: string; channel: string; thumb: string };
export function videos(lang: Lang = 'en'): Video[] {
  try {
    const list = (JSON.parse(readFileSync(join(process.cwd(), 'data', 'media', 'videos.json'), 'utf8')) as { videos: Video[] }).videos;
    return lang === 'en' ? list : list.map((v) => v.de ? { ...v, label: v.de.label } : v);
  } catch {
    return [];
  }
}

/** Photos of robots at work for the moving strip: one per robot, the most proven first. */
export function workPhotos(limit = 18): { src: string; alt: string; robot: string; href: string }[] {
  const seen = new Set<string>();
  return groupByRobot(loadUseCases()).flatMap((group) => group.picture?.scene && !seen.has(group.picture.src) && seen.add(group.picture.src)
    ? [{ src: group.picture.src, alt: group.picture.alt, robot: group.robot, href: group.href }] : []).slice(0, limit);
}
