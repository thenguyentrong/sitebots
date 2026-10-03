import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadMarket, type MarketRobot } from './load';

// Server-side only. Connects market records with catalogue robot pages (scripts/market-links.ts).

let cached: Record<string, string> | null = null;
/** Records that are a different robot from the page the name rule found (data/market/catalogue-separate.json). */
export function separateRecords(): Set<string> {
  const file = join(process.cwd(), 'data', 'market', 'catalogue-separate.json');
  return new Set(existsSync(file) ? Object.keys(JSON.parse(readFileSync(file, 'utf8')).separate ?? {}) : []);
}
function links(): Record<string, string> {
  if (cached) return cached;
  const file = join(process.cwd(), 'data', 'market', 'catalogue-links.json');
  const all: Record<string, string> = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).links : {};
  // One page, one robot: a different body or size class keeps its own market page.
  const separate = separateRecords();
  cached = Object.fromEntries(Object.entries(all).filter(([id]) => !separate.has(id)));
  return cached;
}

export const cataloguePathFor = (marketId: string): string | null => links()[marketId] ?? null;

/** The one page of a robot: its catalogue page where the catalogue has it, else its market page. */
export function robotHref(marketId: string): string {
  const linked = cataloguePathFor(marketId);
  return linked ? linked + '#germany' : '/market/' + marketId;
}

/** The market records sold under one catalogue page, for example G1 base and G1 EDU under /robots/unitree/g1. */
export function marketForCatalogue(manufacturer: string, slug: string): MarketRobot[] {
  const path = '/robots/' + manufacturer + '/' + slug;
  const ids = new Set(Object.entries(links()).filter(([, target]) => target === path).map(([id]) => id));
  return loadMarket().filter((robot) => ids.has(robot.id));
}

/** Market records by catalogue page ("maker/slug"). */
export function marketByPath(): Map<string, MarketRobot[]> {
  const market = new Map(loadMarket().map((robot) => [robot.id, robot]));
  const out = new Map<string, MarketRobot[]>();
  for (const [id, path] of Object.entries(links())) {
    const robot = market.get(id);
    if (!robot) continue;
    const key = path.replace(/^[/]robots[/]/, '');
    out.set(key, [...(out.get(key) ?? []), robot]);
  }
  return out;
}

function reviewLinks(): Record<string, string> {
  const file = join(process.cwd(), 'data', 'market', 'review-links.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).links : {};
}

/** False when a reviewed configuration's robot is known not to be sold in Germany. */
export function reviewSoldInGermany(reviewId: string): boolean {
  const marketId = reviewLinks()[reviewId];
  if (!marketId) return true;
  return loadMarket().find((robot) => robot.id === marketId)?.germany.status !== 'not_sold';
}
