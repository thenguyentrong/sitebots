import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import costs from '@/data/costs/trade-shares.json';
import { TYPE_LABELS } from './market/cards';
import { loadMarket } from './market/load';
import { ROBOT_TYPES, type RobotType } from './market/schema';
import { scenePicture, settingTiles, type ScenePicture, type SettingTile } from './market/use-case-views';
import { loadUseCases, useCaseStats, type UseCaseStats } from './market/use-cases';

// Server-side only. What the start page shows: checked figures on German construction, where labour is most of
// the price, the robots already at work and the robots a German buyer can order.

export type Figure = {
  id: string; value: string; unit?: string; label: string; context: string; year: string;
  source: { publisher: string; title: string; url: string; quote: string };
  /** A second source for a number named in the context. */
  also?: { publisher: string; url: string; quote: string };
};

/** The checked figures in data/industry/germany.json, each with the sentence it was read from. */
export function industryFigures(): Figure[] {
  try {
    const file = JSON.parse(readFileSync(join(process.cwd(), 'data', 'industry', 'germany.json'), 'utf8')) as { figures: Figure[] };
    return file.figures;
  } catch {
    return [];
  }
}

// Short names for the trades in the Destatis cost-structure table.
const TRADE: Record<string, string> = {
  '43.34': 'Painting and glazing', '42.21': 'Pipelines and sewage works', '43.32': 'Joinery installation', '43.31': 'Plastering',
  '43.22': 'Plumbing, heating, ventilation', '43.33': 'Floor and wall covering', '43.13': 'Test drilling', '43.29': 'Other installation',
  '43.21': 'Electrical installation', '43.91': 'Roofing and carpentry', '43.99': 'Other specialist work', '42.11': 'Roads',
  '42.99': 'Other civil works', '43.39': 'Other finishing', '42.12': 'Railways', '42.91': 'Water engineering', '43.11': 'Demolition',
  '43.12': 'Site preparation', '42.22': 'Cable networks', '42.13': 'Bridges and tunnels', '41.20': 'Building construction', '41.10': 'Property development',
};

export type LabourShare = { wz: string; label: string; value: number };
/** Personnel costs as a share of production value per trade, highest first, with building construction for scale. */
export function labourShares(): { top: LabourShare[]; building: LabourShare | null; source: { title: string; publisher: string; url: string }; hourly: { value: number; year: number } | null; ecklohn: { value: number; group: string } | null } {
  const rows = costs.labour.map((row) => ({ wz: row.wz, label: TRADE[row.wz] ?? row.en, value: row.value }));
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
export function buyGroups(): BuyGroup[] {
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
    return { type, label: TYPE_LABELS[type], count: list.length, priced: prices.length, from: prices.length ? Math.min(...prices) : null, picture };
  }).filter((group) => group.count);
}

export function useCaseOverview(): { stats: UseCaseStats; tiles: SettingTile[] } {
  const all = loadUseCases();
  return { stats: useCaseStats(all), tiles: settingTiles(all) };
}
